/**
 * T-051 — V6 import idempotency + edge cases against the live local endpoint.
 *
 *   node scripts/verify/t051-import-idempotency.mjs [base] --as-a <mark>
 *   node scripts/verify/t051-import-idempotency.mjs [base] --as-b <mark> <aId1,aId2,...>
 *
 * The SAME legacy payload (derived from <mark>) is imported: twice as user A
 * (second run must be {imported:0} with a stable row count), then once as
 * user B ({imported:N} — per-user namespacing; ids are server-derived
 * imp_<sha256(user_id+dedupeKey)>, so B's ids must differ from A's and must
 * never equal the legacy client ids). Malformed/empty payloads are handled
 * without error.
 */
import { req, expect, eq, expectKeys, log, main } from './p3-folio-helpers.mjs'

const base = process.argv[2] ?? 'http://localhost:8789'

function legacyPayload(mark) {
  const entry = (id, n) => ({
    ...(id ? { id } : {}),
    nodeId: `node-${n}`, nodeLabel: `Node ${n}`, mode: 'legacy',
    title: `${mark} legacy ${n}`, content: `${mark} legacy content ${n}`,
    createdAt: 1700000000000 + n, favorite: n % 2 === 0,
  })
  return {
    entries: [
      entry(`${mark}-legacy-1`, 1),
      entry(`${mark}-legacy-2`, 2),
      entry(`${mark}-legacy-3`, 3),
      entry(undefined, 4), // no legacy id → content-hash dedupe key
      // malformed entries — skipped, never fatal (T-051 edge cases)
      { id: 42, nodeId: 'x' },
      'not-an-object',
      null,
    ],
  }
}

const VALID = 4

async function importOnce(payload) {
  const r = await req(base, 'POST', '/api/folio/import', payload)
  return r
}

async function listMarked(mark) {
  const r = await req(base, 'GET', '/api/folio')
  eq(r.status, 200, 'list status')
  return r.json.readings.filter((x) => x.title.startsWith(mark))
}

async function edgeCases() {
  const empty = await importOnce({ entries: [] })
  eq(empty.status, 200, 'empty entries status')
  eq(empty.json, { imported: 0 }, 'empty entries → {imported:0}')
  const noField = await importOnce({})
  eq(noField.status, 400, 'missing entries → 400')
  eq(noField.json.error, 'BAD_REQUEST', 'missing entries error')
  expect(noField.json.message.includes('entries'), `400 message carries field name "entries": ${noField.json.message}`)
  const wrongType = await importOnce({ entries: 'nope' })
  eq(wrongType.status, 400, 'non-array entries → 400')
  expect(wrongType.json.message.includes('entries'), 'non-array 400 message carries field name')
  const malformed = await importOnce({ entries: [{ bogus: true }, 7, null] })
  eq(malformed.status, 200, 'all-malformed entries → 200 (skipped, not fatal)')
  eq(malformed.json, { imported: 0 }, 'all-malformed → {imported:0}')
  log('edge cases: empty/missing/non-array/all-malformed all handled')
}

async function asA(mark) {
  const payload = legacyPayload(mark)

  const first = await importOnce(payload)
  eq(first.status, 200, 'first import status')
  expectKeys(first.json, ['imported'], 'ImportResponse is {imported} ONLY')
  eq(first.json.imported, VALID, 'first import imported == 4 (3 malformed skipped)')

  const second = await importOnce(payload)
  eq(second.status, 200, 'second import status')
  eq(second.json, { imported: 0 }, 'SECOND import of same payload → {imported:0} (idempotent)')

  const third = await importOnce(payload)
  eq(third.json, { imported: 0 }, 'third import still {imported:0}')

  await edgeCases()

  const mine = await listMarked(mark)
  eq(mine.length, VALID, 'list shows exactly the 4 imported rows (no duplicates)')
  const legacyIds = payload.entries.filter((e) => typeof e === 'object' && e && typeof e.id === 'string').map((e) => e.id)
  for (const r of mine) {
    expect(r.id.startsWith('imp_'), `server-derived id has imp_ prefix: ${r.id}`)
    expect(!legacyIds.includes(r.id), `row id ${r.id} must NOT equal a legacy client id`)
  }
  // favorite flags preserved from the legacy payload
  eq(mine.filter((r) => r.favorite).length, 2, 'legacy favorite flags preserved (2 of 4)')
  for (const r of mine) log(`AIMP ${r.id}`)
  log('T-051 AS-A: PASS')
}

async function asB(mark, aIdsCsv) {
  const aIds = aIdsCsv.split(',').filter(Boolean)
  const payload = legacyPayload(mark) // SAME payload as user A

  const first = await importOnce(payload)
  eq(first.status, 200, 'B first import status')
  eq(first.json, { imported: VALID }, 'B importing the SAME payload → {imported:4} (per-user namespacing)')

  const second = await importOnce(payload)
  eq(second.json, { imported: 0 }, 'B second import → {imported:0}')

  const mine = await listMarked(mark)
  eq(mine.length, VALID, 'B list shows exactly 4 imported rows')
  const overlap = mine.filter((r) => aIds.includes(r.id))
  eq(overlap, [], "B's imported ids share NOTHING with A's (imp_<sha256(user_id+dedupeKey)> per-user)")
  for (const r of mine) expect(r.id.startsWith('imp_'), `B row id imp_ prefixed: ${r.id}`)
  log(`B ids all distinct from A's ${aIds.length} ids`)
  log('T-051 AS-B: PASS')
}

await main(async () => {
  const args = process.argv
  if (args.includes('--as-a')) await asA(args[args.indexOf('--as-a') + 1])
  else if (args.includes('--as-b')) await asB(args[args.indexOf('--as-b') + 1], args[args.indexOf('--as-b') + 2])
  else throw new Error('usage: --as-a <mark> | --as-b <mark> <aIdsCsv>')
})
