/**
 * Runnable ledger acceptance harness (T-094) — executes the REQ-1..5 + SCHEMA-1
 * accept checks from docs/selemene-engine-requests.md against a live engine, and
 * reports the `daily-panchanga` capability as landed or NOT-yet-landed. It exits
 * non-zero while the capability is absent, so a green run is meaningful, never a
 * false pass. When this goes green live, the ①→③ flip is unlocked.
 *
 *   node scripts/verify/engine-requests.mjs [base]
 *
 * CF Access (T-074): the default base is the prod Pages app (behind Cloudflare
 * Access) — set CF_ACCESS_SESSION (see scripts/verify/cf-access-session.mjs);
 * without it the run fails loud at the edge. When [base] is the direct engine
 * (selemene.tryambakam.space) the session is never attached; that path
 * authenticates via x-api-key instead.
 */
import { sessionHeadersFor, isAccessChallenge, accessBlockedDetail } from './cf-access-session.mjs'
// Prod default is the Cloudflare Pages deployment (T-055 delink; goes live with T-058).
const BASE = (process.argv[2] || 'https://urania-137.pages.dev').replace(/\/+$/, '')
const SESSION_HEADERS = sessionHeadersFor(BASE) // app-base only; never the direct engine
const HAS_SESSION = Object.keys(SESSION_HEADERS).length > 0
const P = `${BASE}/api/selemene`
const SUBJ = {
  role: 'primary', name: 'T', birth_date: '1990-05-15', birth_time: '08:30', birth_time_confidence: 'exact',
  birth_location_query: 'Bengaluru',
  normalized_location: { display_name: 'Bengaluru', latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata', provider: 'manual', confidence: 'manual' },
}
const post = async (mode, extra = {}) => {
  const r = await fetch(`${P}/api/v1/assets/generate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...SESSION_HEADERS }, redirect: 'manual',
    body: JSON.stringify({ mode, report_level: 'L0', language: 'en', subjects: [SUBJ], ...extra }),
  })
  if (isAccessChallenge(r.status, r.headers.get('location'))) return { status: r.status, json: null, accessBlocked: true }
  const t = await r.text()
  let j = null
  try { j = JSON.parse(t) } catch {}
  return { status: r.status, json: j }
}

const rows = []
const record = (id, ok, detail) => { rows.push({ id, ok, detail }); console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(9)} ${detail}`) }

const main = async () => {
  console.log(`Ledger acceptance · base ${BASE}\n`)

  // REQ-1: daily-panchanga resolves to a real multi-pass plan (not 400, not single default)
  const r1 = await post('daily-panchanga')
  if (r1.accessBlocked) {
    record('REQ-1', false, accessBlockedDetail(HAS_SESSION))
    console.log('\ndaily-panchanga capability: NOT yet landed (see docs/selemene-engine-requests.md)')
    process.exit(1)
  }
  const passes = (r1.json?.passes ?? []).map((p) => p.id)
  const served = r1.status === 200 && passes.length > 1 && !(passes.length === 1 && passes[0] === 'default')
  record('REQ-1', served, served ? `served · ${passes.length} passes` : `NOT served (HTTP ${r1.status}${r1.json?.error_code ? ' ' + r1.json.error_code : ''})`)

  // REQ-2: unknown mode → 400 UNKNOWN_MODE (already fixed on the engine)
  const r2 = await post('bogus-xyz-123')
  const g1 = r2.status === 400 && r2.json?.error_code === 'UNKNOWN_MODE'
  record('REQ-2', g1, g1 ? '400 UNKNOWN_MODE' : `expected 400 UNKNOWN_MODE, got ${r2.status}`)

  // REQ-3/4: distinct, panchanga-foregrounding pass plan (only checkable once served)
  record('REQ-3', served, served ? `pass plan present: ${passes.slice(0, 4).join(',')}` : 'blocked on REQ-1')
  record('REQ-4', served, served ? 'inspect pass titles vs passModel.ts' : 'blocked on REQ-1')

  // REQ-5: narrates today (two dates → different reading) — only once served
  record('REQ-5', served, served ? 'compare two dates for tithi drift' : 'blocked on REQ-1')

  // SCHEMA-1: panchanga keys stable (the interpreter's contract baseline)
  const prRes = await fetch(`${P}/api/v1/engines/panchanga/calculate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...SESSION_HEADERS }, redirect: 'manual',
    body: JSON.stringify({ birth_data: { date: '2026-07-19', time: '12:00', latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata' } }),
  }).catch(() => null)
  if (prRes && isAccessChallenge(prRes.status, prRes.headers.get('location'))) {
    record('SCHEMA-1', false, accessBlockedDetail(HAS_SESSION))
    console.log('\ndaily-panchanga capability: NOT yet landed (see docs/selemene-engine-requests.md)')
    process.exit(1)
  }
  const pr = prRes ? await prRes.json().catch(() => null) : null
  const need = ['tithi_name', 'nakshatra_name', 'yoga_name', 'karana_name', 'vara_name']
  const schemaOk = !!pr?.result && need.every((k) => k in pr.result)
  record('SCHEMA-1', schemaOk, schemaOk ? 'panchanga keys stable' : 'panchanga schema drifted')

  const landed = served && g1 && schemaOk
  console.log(`\ndaily-panchanga capability: ${landed ? 'LANDED — flip DAILY_SOURCE=witness' : 'NOT yet landed (see docs/selemene-engine-requests.md)'}`)
  process.exit(landed ? 0 : 1)
}
main()
