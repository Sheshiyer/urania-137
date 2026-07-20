/**
 * T-050 — V3 per-user isolation across two dev identities (live local server).
 *
 *   node scripts/verify/t050-isolation.mjs [base] --seed-a <mark>
 *   node scripts/verify/t050-isolation.mjs [base] --as-b <mark> <aReadingId>
 *   node scripts/verify/t050-isolation.mjs [base] --verify-a <mark> <aReadingId>
 *
 * Flow: server runs as user A (seed) → server restarts as user B via
 * `--binding DEV_IDENTITY_EMAIL=dev-b@urania.local` (isolation probes) →
 * server restarts as A (post-condition). Per the shipped contract decision,
 * cross-user PATCH/DELETE return a UNIFORM 404 {error:'NOT_FOUND'} (no
 * existence leak), indistinguishable from an unknown id.
 */
import { req, expect, eq, log, main } from './p3-folio-helpers.mjs'

const base = process.argv[2] ?? 'http://localhost:8789'
const B_ID = 'dev:dev-b@urania.local'

async function me() {
  const r = await req(base, 'GET', '/api/me')
  eq(r.status, 200, 'GET /api/me status')
  return r.json.id
}

async function seedA(mark) {
  const id = await me()
  expect(id === 'dev:dev@urania.local', `expected user A, got ${id}`)
  const r = await req(base, 'POST', '/api/folio', {
    nodeId: 'mars', nodeLabel: 'Mars', mode: 'natal',
    title: `${mark} user-A private`, content: `${mark} A-only content — must never leak to B`,
  })
  eq(r.status, 201, 'A seed POST status')
  eq(r.json.favorite, false, 'A seed favorite=false (baseline for tamper check)')
  log(`A_READING ${r.json.id}`)
  log('T-050 SEED-A: PASS')
}

async function asB(mark, aId) {
  const id = await me()
  eq(id, B_ID, '--binding DEV_IDENTITY_EMAIL override must yield user B')

  // B's list must never contain A's reading (by id OR by marker).
  const list0 = await req(base, 'GET', '/api/folio')
  eq(list0.status, 200, 'B list status')
  const leak = list0.json.readings.filter((r) => r.id === aId || r.title.startsWith(mark))
  eq(leak, [], 'B list contains zero A readings')
  log(`B initial list: ${list0.json.readings.length} own rows, 0 of A's`)

  // B can still use their own folio normally.
  const own = await req(base, 'POST', '/api/folio', {
    nodeId: 'venus', nodeLabel: 'Venus', mode: 'daily',
    title: `${mark} user-B own`, content: `${mark} B content`,
  })
  eq(own.status, 201, 'B own POST status')

  // Cross-user mutation probes → uniform 404 NOT_FOUND (shipped contract decision).
  const patch = await req(base, 'PATCH', `/api/folio/${aId}`, { favorite: true })
  eq(patch.status, 404, 'B PATCH A-id status')
  eq(patch.json, { error: 'NOT_FOUND', message: 'reading not found' }, 'B PATCH A-id body')
  const del = await req(base, 'DELETE', `/api/folio/${aId}`)
  eq(del.status, 404, 'B DELETE A-id status')
  eq(del.json, { error: 'NOT_FOUND', message: 'reading not found' }, 'B DELETE A-id body')
  const get = await req(base, 'GET', `/api/folio/${aId}`)
  eq(get.status, 404, 'B GET A-id status')
  eq(get.json.error, 'NOT_FOUND', 'B GET A-id error')

  // Unknown id and cross-user id are INDISTINGUISHABLE (no existence leak).
  const unknown = await req(base, 'PATCH', `/api/folio/00000000-0000-0000-0000-000000000000`, { favorite: true })
  eq(unknown.status, patch.status, 'unknown-id PATCH status identical to cross-user')
  eq(unknown.json, patch.json, 'unknown-id PATCH body identical to cross-user')

  // B's search cannot reach A's content either.
  const search = await req(base, 'GET', `/api/folio?search=${encodeURIComponent('A-only content')}`)
  eq(search.json.readings, [], 'B search over A content → empty')

  const listB = await req(base, 'GET', '/api/folio')
  const bMine = listB.json.readings.filter((r) => r.title.startsWith(mark))
  eq(bMine.map((r) => r.id), [own.json.id], 'B list = exactly B own reading')
  log('cross-user GET/PATCH/DELETE → uniform 404 NOT_FOUND; unknown-id indistinguishable; search isolated')
  log('T-050 AS-B: PASS')
}

async function verifyA(mark, aId) {
  const id = await me()
  expect(id === 'dev:dev@urania.local', `expected user A, got ${id}`)
  const list = await req(base, 'GET', '/api/folio')
  const a = list.json.readings.find((r) => r.id === aId)
  expect(a, 'A reading still present after B tamper attempts')
  eq(a.favorite, false, 'A reading favorite UNCHANGED (B PATCH had no effect)')
  const aMine = list.json.readings.filter((r) => r.title.startsWith(mark))
  eq(aMine.length, 1, "A's marked rows intact; none of B's rows visible to A")
  log(`A row ${aId} unchanged (favorite=false), B rows invisible to A`)
  log('T-050 VERIFY-A: PASS')
}

await main(async () => {
  const args = process.argv
  if (args.includes('--seed-a')) await seedA(args[args.indexOf('--seed-a') + 1])
  else if (args.includes('--as-b')) await asB(args[args.indexOf('--as-b') + 1], args[args.indexOf('--as-b') + 2])
  else if (args.includes('--verify-a')) await verifyA(args[args.indexOf('--verify-a') + 1], args[args.indexOf('--verify-a') + 2])
  else throw new Error('usage: --seed-a <mark> | --as-b <mark> <aId> | --verify-a <mark> <aId>')
})
