/**
 * Asserts every child in selemeneNodes.ts hits a REAL, differentiated capability.
 *
 * The assertion that matters: a witness mode must not resolve to the engine's
 * `default: Reading` fallback. "200 + non-empty" passes for a typo'd mode, which
 * is exactly how 13 fake modes hid in plain sight.
 *
 * Runs are extracted from the source file so this can't drift from the data.
 */
import { readFileSync } from 'node:fs'

const BASE = (process.argv[2] || 'http://localhost:5191').replace(/\/+$/, '')
const P = `${BASE}/api/selemene`
import { fileURLToPath } from 'node:url'
const SRC = fileURLToPath(new URL('../../src/data/selemeneNodes.ts', import.meta.url))

const BIRTH = { name: 'witnessalchemist', date: '1991-08-13', time: '13:31', latitude: 12.97, longitude: 77.59, timezone: 'Asia/Kolkata' }
const subject = (role, name, date, time, lat, lon) => ({
  role, name, birth_date: date, birth_time: time, birth_time_confidence: 'exact', birth_location_query: 'Asia/Kolkata',
  normalized_location: { display_name: 'Asia/Kolkata', latitude: lat, longitude: lon, timezone: 'Asia/Kolkata', provider: 'manual', confidence: 'manual' },
})
const A = subject('primary', 'witnessalchemist', '1991-08-13', '13:31', 12.97, 77.59)
const B = subject('partner', 'harshita', '1987-10-15', '12:05', 12.97, 77.59)

// --- parse the taxonomy out of the source ----------------------------------
const src = readFileSync(SRC, 'utf8')
const children = []
const childRe = /\{\s*id:\s*'([^']+)',\s*label:\s*'([^']+)'[^}]*?run:\s*\{\s*kind:\s*'(workflow|engine|witness|daily)'[^}]*?\}/g
let m
while ((m = childRe.exec(src))) {
  const [full, id, label, kind] = m
  const wf = /workflowId:\s*'([^']+)'/.exec(full)?.[1]
  const en = /engineId:\s*'([^']+)'/.exec(full)?.[1]
  const mode = /mode:\s*'([^']+)'/.exec(full)?.[1]
  const min = Number(/minSubjects:\s*(\d+)/.exec(full)?.[1] ?? 1)
  const needsIntention = /needsIntention:\s*true/.test(full)
  children.push({ id, label, kind, workflowId: wf, engineId: en, mode, min, needsIntention })
}

const post = async (path, body) => {
  const r = await fetch(`${P}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const t = await r.text()
  let j = null
  try { j = JSON.parse(t) } catch {}
  return { status: r.status, json: j, text: t }
}

const INTENTION = 'clarity in the work'
const check = async (c) => {
  // Mirror the app: sigil-forge requires options.intention, and without it the
  // workflow drops it silently rather than failing.
  const opts = c.needsIntention ? { options: { intention: INTENTION } } : {}
  if (c.kind === 'workflow') {
    const { status, json } = await post(`/api/v1/workflows/${c.workflowId}`, { birth_data: BIRTH, ...opts })
    const got = Object.keys(json?.engine_outputs ?? {})
    const def = await fetch(`${P}/api/v1/workflows/${c.workflowId}`).then((r) => r.json()).catch(() => null)
    const declared = def?.engine_ids ?? []
    const missing = declared.filter((e) => !got.includes(e))
    return { ok: status === 200 && got.length > 0, status, detail: `${got.length}/${declared.length || '?'} engines${missing.length ? ` (dropped: ${missing.join(',')})` : ''}` }
  }
  if (c.kind === 'engine') {
    const { status, json } = await post(`/api/v1/engines/${c.engineId}/calculate`, { birth_data: BIRTH, ...opts })
    const keys = Object.keys(json?.result ?? {})
    return { ok: status === 200 && keys.length > 0, status, detail: `${keys.length} result fields` }
  }
  if (c.kind === 'daily') {
    // The daily reading resolves to the DailyReadingSource seam, which fetches the
    // panchanga (base) + transits (overlay) engines. Assert both are live.
    const pan = await post('/api/v1/engines/panchanga/calculate', { birth_data: BIRTH })
    const tra = await post('/api/v1/engines/transits/calculate', { birth_data: BIRTH })
    const pk = Object.keys(pan.json?.result ?? {})
    const tk = Object.keys(tra.json?.result ?? {})
    const ok = pan.status === 200 && pk.length > 0 && tra.status === 200 && tk.length > 0
    return {
      ok,
      status: `${pan.status}/${tra.status}`,
      detail: ok ? `seam → panchanga(${pk.length})+transits(${tk.length}) live` : 'panchanga/transits not both live',
    }
  }
  // witness — the one that actually needs a real assertion
  const subjects = c.min >= 2 ? [A, B] : [A]
  const { status, json } = await post('/api/v1/assets/generate', {
    mode: c.mode, report_level: 'L0', language: 'en', consciousness_level: 2, subjects,
    options: { output_format: 'markdown' },
  })
  const passes = (json?.passes ?? []).map((p) => p.id)
  const isDefault = passes.length === 1 && passes[0] === 'default'
  return {
    ok: status === 200 && passes.length > 0 && !isDefault,
    status,
    detail: isDefault ? 'FELL BACK TO default:Reading — mode not served' : `${passes.length} passes: ${passes.slice(0, 3).join(',')}${passes.length > 3 ? '…' : ''}`,
  }
}

const main = async () => {
  console.log(`Base ${BASE} · ${children.length} runnable children parsed from selemeneNodes.ts\n`)
  const rows = []
  for (const c of children) {
    let r
    try { r = await check(c) } catch (e) { r = { ok: false, status: 'ERR', detail: String(e.message).slice(0, 90) } }
    rows.push({ ...c, ...r })
    console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${c.kind.padEnd(9)} ${(c.workflowId || c.engineId || c.mode || c.id).padEnd(24)} ${String(r.status).padEnd(5)} ${r.detail}`)
  }
  const bad = rows.filter((r) => !r.ok)
  console.log(`\n${rows.length - bad.length}/${rows.length} children hit a real, differentiated capability`)
  if (bad.length) {
    console.log('\nFAILURES:')
    for (const b of bad) console.log(`  ${b.label} (${b.kind}) → ${b.detail}`)
  }
  process.exit(bad.length ? 1 : 0)
}
main()
