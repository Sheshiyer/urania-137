/**
 * Daily-reading live gates (T-081/T-083) — the "verify the running service" bar.
 *
 *   node scripts/verify/daily-gates.mjs [base]      # default prod proxy
 *
 * Base resolution (T-035): `URANIA_API_BASE` env > argv[2] > prod default. Point it
 * at the local `wrangler pages dev` Worker (http://localhost:8788) to gate the
 * Worker path; the Worker injects the prod-safe dev identity server-side from
 * DEV_IDENTITY_EMAIL in .dev.vars (T-017/T-026) — no client identity header exists
 * by design. The prod base stays the default / remains reachable via the same
 * env/flag. If SELEMENE_API_KEY is set it is sent as `x-api-key` (only meaningful
 * when BASE is the direct engine; dropped by any proxy — T-032).
 *
 * CF Access (T-074): prod is behind Cloudflare Access. Set CF_ACCESS_SESSION
 * (see scripts/verify/cf-access-session.mjs for the accepted token forms) and
 * it is sent as a session header on app-base requests — never to the direct
 * engine. Without it, an Access edge challenge fails loud instead of surfacing
 * as a confusing JSON-parse/status error.
 *
 * G2 (live schema contract): today's live panchanga still carries every key the
 * interpreter reads — schema drift fails loud, it does not silently degrade.
 *
 * G7 (behavioral) is a Playwright check against a running app; it is authored in
 * daily-gates.behavioral.mjs and run post-deploy against the preview URL (the
 * local dev server can't serve the happy path — the local API key is expired).
 */
// Prod default is the Cloudflare Pages deployment (T-055 delink; goes live with T-058).
import { sessionHeadersFor, isAccessChallenge, accessBlockedDetail } from './cf-access-session.mjs'
const BASE = (process.env.URANIA_API_BASE || process.argv[2] || 'https://urania-137.pages.dev').replace(/\/+$/, '')
const ENGINE_KEY = process.env.SELEMENE_API_KEY || ''
const SESSION_HEADERS = sessionHeadersFor(BASE) // app-base only; never the direct engine
const HAS_SESSION = Object.keys(SESSION_HEADERS).length > 0
const P = `${BASE}/api/selemene`
const LOC = { latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata' }

// The exact keys src/lib/daily/engine-contract.ts reads (SCHEMA-1 baseline).
const PANCHANGA_KEYS = [
  'julian_day', 'solar_longitude', 'lunar_longitude',
  'vara_index', 'vara_name',
  'tithi_index', 'tithi_name', 'tithi_value',
  'nakshatra_index', 'nakshatra_name', 'nakshatra_value',
  'yoga_index', 'yoga_name', 'yoga_value',
  'karana_index', 'karana_name', 'karana_value',
]
const ASPECT_KEYS = ['aspect_type', 'nature', 'natal_planet', 'transiting_planet', 'orb', 'is_applying']

const post = async (path, body) => {
  const headers = { 'Content-Type': 'application/json', ...SESSION_HEADERS }
  if (ENGINE_KEY) headers['x-api-key'] = ENGINE_KEY
  const r = await fetch(`${P}${path}`, { method: 'POST', headers, redirect: 'manual', body: JSON.stringify(body) })
  if (isAccessChallenge(r.status, r.headers.get('location'))) return { status: r.status, json: null, accessBlocked: true }
  const t = await r.text()
  let j = null
  try { j = JSON.parse(t) } catch {}
  return { status: r.status, json: j }
}

const today = () => new Date().toISOString().slice(0, 10)

async function g2() {
  const pan = await post('/api/v1/engines/panchanga/calculate', { birth_data: { date: today(), time: '12:00', ...LOC } })
  if (pan.accessBlocked) return { ok: false, detail: accessBlockedDetail(HAS_SESSION) }
  const { status, json } = pan
  if (status !== 200 || !json?.result) return { ok: false, detail: `panchanga HTTP ${status}` }
  const missing = PANCHANGA_KEYS.filter((k) => !(k in json.result))
  const tra = await post('/api/v1/engines/transits/calculate', { birth_data: { date: '1990-05-15', time: '08:30', ...LOC } })
  if (tra.accessBlocked) return { ok: false, detail: accessBlockedDetail(HAS_SESSION) }
  const { status: ts, json: tj } = tra
  const aspect = tj?.result?.aspects?.[0] ?? {}
  const aMissing = ASPECT_KEYS.filter((k) => !(k in aspect))
  const ok = missing.length === 0 && ts === 200 && aMissing.length === 0
  return {
    ok,
    detail: ok
      ? `panchanga carries all ${PANCHANGA_KEYS.length} keys · transits aspect carries all ${ASPECT_KEYS.length}`
      : `MISSING panchanga:[${missing.join(',')}] aspect:[${aMissing.join(',')}] (see SCHEMA-1 in docs/selemene-engine-requests.md)`,
  }
}

const main = async () => {
  console.log(`Daily live gates · base ${BASE}\n`)
  let failed = 0
  const g = await g2().catch((e) => ({ ok: false, detail: String(e.message).slice(0, 120) }))
  if (!g.ok) failed++
  console.log(`  ${g.ok ? 'PASS' : 'FAIL'}  G2 live-schema-contract  ${g.detail}`)
  console.log(`\n  note: G7 (behavioral, rendered tithi == live tithi + Folio row) runs via`)
  console.log(`        daily-gates.behavioral.mjs against the deployed preview URL.`)
  if (failed) { console.log(`\nDaily live gates: FAIL (${failed})`); process.exit(1) }
  console.log(`\nDaily live gates: PASS`)
}
main()
