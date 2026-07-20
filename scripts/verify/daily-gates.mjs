/**
 * Daily-reading live gates (T-081/T-083) — the "verify the running service" bar.
 *
 *   node scripts/verify/daily-gates.mjs [base]      # default prod proxy
 *
 * G2 (live schema contract): today's live panchanga still carries every key the
 * interpreter reads — schema drift fails loud, it does not silently degrade.
 *
 * G7 (behavioral) is a Playwright check against a running app; it is authored in
 * daily-gates.behavioral.mjs and run post-deploy against the preview URL (the
 * local dev server can't serve the happy path — the local API key is expired).
 */
const BASE = (process.argv[2] || 'https://urania-137.vercel.app').replace(/\/+$/, '')
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
  const r = await fetch(`${P}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const t = await r.text()
  let j = null
  try { j = JSON.parse(t) } catch {}
  return { status: r.status, json: j }
}

const today = () => new Date().toISOString().slice(0, 10)

async function g2() {
  const { status, json } = await post('/api/v1/engines/panchanga/calculate', { birth_data: { date: today(), time: '12:00', ...LOC } })
  if (status !== 200 || !json?.result) return { ok: false, detail: `panchanga HTTP ${status}` }
  const missing = PANCHANGA_KEYS.filter((k) => !(k in json.result))
  const { status: ts, json: tj } = await post('/api/v1/engines/transits/calculate', { birth_data: { date: '1990-05-15', time: '08:30', ...LOC } })
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
