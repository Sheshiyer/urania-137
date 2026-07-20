/**
 * T-049 — local end-to-end persistence round-trip through the REAL HTTP routes
 * against a running `wrangler pages dev` (dev identity active).
 *
 *   node scripts/verify/t049-folio-roundtrip.mjs [baseUrl]
 *   node scripts/verify/t049-folio-roundtrip.mjs [baseUrl] --check-survivor <id> <createdAt>
 *
 * Round-trip mode: save → list → search → favorite → favorites-filter → delete,
 * asserting frozen-contract shapes at every step. Prints the surviving reading
 * id + createdAt as `SURVIVOR <id> <createdAt>` for the cross-restart
 * durability check.
 *
 * Survivor mode (--check-survivor): after a full server restart, asserts the
 * reading still exists in D1 with the SAME id and createdAt (durable).
 */
import { req, expect, eq, expectReadingDTO, expectKeys, log, main } from './p3-folio-helpers.mjs'

const base = process.argv[2] ?? 'http://localhost:8789'
const MARK = `T049-${Date.now()}`

async function roundtrip() {
  // 0. identity — dev guard active
  const me = await req(base, 'GET', '/api/me')
  eq(me.status, 200, 'GET /api/me status')
  expect(typeof me.json.id === 'string' && me.json.id.startsWith('dev:'), 'dev identity active')
  log(`me: ${me.json.id}`)

  // 1. save two readings (POST /api/folio → 201 + stored ReadingDTO)
  const save1 = {
    nodeId: 'moon', nodeLabel: 'Moon', mode: 'daily',
    title: `${MARK} alpha lunar`, content: `${MARK} body alpha — waxing crescent notes`,
  }
  const r1 = await req(base, 'POST', '/api/folio', save1)
  eq(r1.status, 201, 'POST /api/folio #1 status')
  expectReadingDTO(r1.json, 'POST #1 response')
  eq(r1.json.favorite, false, 'POST #1 server-set favorite=false')
  expect(r1.json.createdAt > 0, 'POST #1 server-set createdAt')
  for (const k of Object.keys(save1)) eq(r1.json[k], save1[k], `POST #1 echoes ${k}`)

  const save2 = {
    nodeId: 'saturn', nodeLabel: 'Saturn', mode: 'transit',
    title: `${MARK} saturn return`, content: `${MARK} body beta — saturn return notes`,
  }
  const r2 = await req(base, 'POST', '/api/folio', save2)
  eq(r2.status, 201, 'POST /api/folio #2 status')
  expectReadingDTO(r2.json, 'POST #2 response')
  log(`saved: ${r1.json.id} / ${r2.json.id}`)

  // 2. list — both present, newest first
  const list = await req(base, 'GET', '/api/folio')
  eq(list.status, 200, 'GET /api/folio status')
  expectKeys(list.json, ['readings'], 'FolioListResponse')
  const mine = list.json.readings.filter((r) => r.title.startsWith(MARK))
  eq(mine.length, 2, 'list contains both saved readings')
  for (const r of mine) expectReadingDTO(r, 'list item')
  eq(mine[0].id, r2.json.id, 'list is newest-first')
  eq(mine[1].id, r1.json.id, 'list ordering [r2, r1]')

  // 3. search — server-side substring filter over title/content
  const byTitle = await req(base, 'GET', `/api/folio?search=${encodeURIComponent('saturn return')}`)
  eq(byTitle.json.readings.filter((r) => r.title.startsWith(MARK)).map((r) => r.id), [r2.json.id], 'search by title → only r2')
  const byContent = await req(base, 'GET', `/api/folio?search=${encodeURIComponent('waxing crescent')}`)
  eq(byContent.json.readings.map((r) => r.id), [r1.json.id], 'search by content → only r1')
  const noHit = await req(base, 'GET', `/api/folio?search=${encodeURIComponent(MARK + '-nohit')}`)
  eq(noHit.json.readings.length, 0, 'search miss → empty')
  log('search: title/content/miss all correct')

  // 4. favorite — PATCH {favorite:true} → 200 + updated DTO; favorites filter
  const fav = await req(base, 'PATCH', `/api/folio/${r1.json.id}`, { favorite: true })
  eq(fav.status, 200, 'PATCH status')
  expectReadingDTO(fav.json, 'PATCH response')
  eq(fav.json.favorite, true, 'PATCH set favorite=true')
  const favs = await req(base, 'GET', '/api/folio?favorites=true')
  const favMine = favs.json.readings.filter((r) => r.title.startsWith(MARK))
  eq(favMine.map((r) => r.id), [r1.json.id], 'favorites=true → only r1')
  log('favorite: PATCH + favorites filter correct')

  // 5. delete — 200 with body {} exactly; list shrinks to r2 only
  const del = await req(base, 'DELETE', `/api/folio/${r1.json.id}`)
  eq(del.status, 200, 'DELETE status')
  eq(del.json, {}, 'DELETE success body is {}')
  const after = await req(base, 'GET', '/api/folio')
  const afterMine = after.json.readings.filter((r) => r.title.startsWith(MARK))
  eq(afterMine.map((r) => r.id), [r2.json.id], 'after delete only r2 remains')
  const delAgain = await req(base, 'DELETE', `/api/folio/${r1.json.id}`)
  eq(delAgain.status, 404, 're-DELETE → 404')
  eq(delAgain.json.error, 'NOT_FOUND', 're-DELETE error NOT_FOUND')
  log('delete: removed, re-delete 404')

  log(`SURVIVOR ${r2.json.id} ${r2.json.createdAt}`)
  log('T-049 ROUND-TRIP: PASS')
}

async function checkSurvivor(id, createdAt) {
  const list = await req(base, 'GET', '/api/folio')
  eq(list.status, 200, 'GET /api/folio status (post-restart)')
  const found = list.json.readings.find((r) => r.id === id)
  expect(found, `surviving reading ${id} still listed after full server restart`)
  eq(String(found.createdAt), String(createdAt), 'survivor createdAt unchanged across restart')
  expectReadingDTO(found, 'survivor')
  log(`survivor intact: ${id} createdAt=${found.createdAt}`)
  log('T-049 DURABILITY (reload/restart): PASS')
}

await main(async () => {
  const flagIdx = process.argv.indexOf('--check-survivor')
  if (flagIdx !== -1) await checkSurvivor(process.argv[flagIdx + 1], process.argv[flagIdx + 2])
  else await roundtrip()
})
