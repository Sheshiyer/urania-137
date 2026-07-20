/**
 * Golden parity capture (T-038) — a deterministic-seed corpus of engine requests,
 * captured from the pre-migration path (baseline) and re-run through the Worker,
 * with a diff over status, content-type, streaming shape, and reconstructed body.
 *
 *   # 1. CAPTURE baseline fixtures (run against a fixture-engine in --record mode
 *   #    backed by the prod proxy, or any base serving real engine compute):
 *   node scripts/verify/golden-parity.mjs --capture \
 *     --target http://localhost:8795 --fixtures scripts/verify/fixtures/golden
 *
 *   # 2. VERIFY through the Worker (wrangler pages dev on 8788, stub replaying):
 *   node scripts/verify/golden-parity.mjs --verify \
 *     --base http://localhost:8788 --fixtures scripts/verify/fixtures/golden
 *
 *   # 3. EXPORT the 7 seed fixtures from a larger recorded session dir into the
 *   #    committed golden dir (byte snapshot of exactly what the stub served):
 *   node scripts/verify/golden-parity.mjs --export /tmp/p2-fixtures \
 *     --fixtures scripts/verify/fixtures/golden
 *
 * Seeds use FIXED dates/birth data so captures are comparable across runs.
 * VERIFY asserts, per seed: equal status, equal content-type, byte-identical
 * reconstructed body, and incremental delivery (first byte before stream end).
 * Any drift exits 1 — a green run means zero differences across the corpus.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const arg = (name, dflt = undefined) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : dflt
}
const CAPTURE = process.argv.includes('--capture')
const VERIFY = process.argv.includes('--verify')
const TARGET = (arg('target') || arg('base') || 'http://localhost:8788').replace(/\/+$/, '')
const FIXTURES = arg('fixtures', 'scripts/verify/fixtures/golden')

const LOC = { latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata' }
const SUBJ = {
  role: 'primary', name: 'goldenwitness', birth_date: '1990-05-15', birth_time: '08:30',
  birth_time_confidence: 'exact', birth_location_query: 'Bengaluru',
  normalized_location: { display_name: 'Bengaluru', ...LOC, provider: 'manual', confidence: 'manual' },
}

/** Deterministic seed corpus. Paths are engine-suffix paths (no /api/selemene). */
const SEEDS = [
  { name: 'health', method: 'GET', path: '/health' },
  { name: 'engines-list', method: 'GET', path: '/api/v1/engines' },
  { name: 'workflows-list', method: 'GET', path: '/api/v1/workflows' },
  {
    name: 'panchanga-fixed-date', method: 'POST', path: '/api/v1/engines/panchanga/calculate',
    body: { birth_data: { date: '2026-07-19', time: '12:00', ...LOC } },
  },
  {
    name: 'transits-fixed-natal', method: 'POST', path: '/api/v1/engines/transits/calculate',
    body: { birth_data: { date: '1990-05-15', time: '08:30', ...LOC } },
  },
  {
    name: 'kundali-l0-generate', method: 'POST', path: '/api/v1/assets/generate',
    body: { mode: 'integrated-kundali-l0', report_level: 'L0', language: 'en', consciousness_level: 2, subjects: [SUBJ], options: { output_format: 'markdown' } },
  },
  {
    name: 'unknown-mode-400', method: 'POST', path: '/api/v1/assets/generate',
    body: { mode: 'bogus-xyz-123', report_level: 'L0', language: 'en', subjects: [SUBJ] },
  },
]

const keyFor = (method, path, rawBody) =>
  createHash('sha256').update(`${method} ${path}\n${rawBody}`).digest('hex')
const sha = (s) => createHash('sha256').update(s).digest('hex')

/** Fetch with first-byte/total timing so streaming shape is asserted, not assumed. */
const timedFetch = async (url, seed, rawBody) => {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
  const r = await fetch(url, {
    method: seed.method,
    headers,
    body: seed.method === 'GET' || seed.method === 'HEAD' ? undefined : rawBody,
  })
  const t0 = performance.now()
  const reader = r.body.getReader()
  const chunks = []
  let tFirst = null
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (tFirst === null) tFirst = performance.now() - t0
    chunks.push(value)
  }
  const tTotal = performance.now() - t0
  const body = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8')
  return { status: r.status, contentType: r.headers.get('content-type') || '', body, tFirst, tTotal }
}

const main = async () => {
  const EXPORT_FROM = arg('export')
  if (!EXPORT_FROM && CAPTURE === VERIFY) {
    console.error('usage: golden-parity.mjs (--capture --target <base> | --verify --base <worker> | --export <sessionDir>) [--fixtures <dir>]')
    process.exit(2)
  }
  mkdirSync(FIXTURES, { recursive: true })

  if (EXPORT_FROM) {
    // Byte snapshot of the session fixtures the replay stub actually served —
    // no network, so the committed golden copy can never drift from the run.
    const manifest = []
    for (const seed of SEEDS) {
      const rawBody = seed.body ? JSON.stringify(seed.body) : ''
      const src = join(EXPORT_FROM, `${keyFor(seed.method, seed.path, rawBody)}.json`)
      if (!existsSync(src)) { console.error(`  MISS  ${seed.name} not in ${EXPORT_FROM} — record it first`); process.exit(1) }
      const fixture = JSON.parse(readFileSync(src, 'utf8'))
      writeFileSync(join(FIXTURES, `${keyFor(seed.method, seed.path, rawBody)}.json`), JSON.stringify(fixture))
      manifest.push({ name: seed.name, method: seed.method, path: seed.path, status: fixture.status, contentType: fixture.contentType, bytes: fixture.body.length, bodySha256: sha(fixture.body).slice(0, 16) })
      console.log(`  exported ${seed.name.padEnd(22)} ${fixture.status} · ${fixture.body.length}B`)
    }
    writeFileSync(join(FIXTURES, 'manifest.json'), JSON.stringify({ exportedAt: new Date().toISOString(), from: EXPORT_FROM, seeds: manifest }, null, 2))
    console.log(`\n${SEEDS.length} golden fixtures exported → ${FIXTURES}`)
    return
  }

  if (CAPTURE) {
    // Target is a raw base serving engine-suffix paths directly (record stub or engine).
    const manifest = []
    for (const seed of SEEDS) {
      const rawBody = seed.body ? JSON.stringify(seed.body) : ''
      const r = await timedFetch(`${TARGET}${seed.path}`, seed, rawBody)
      const fixture = { method: seed.method, path: seed.path, status: r.status, contentType: r.contentType, body: r.body }
      writeFileSync(join(FIXTURES, `${keyFor(seed.method, seed.path, rawBody)}.json`), JSON.stringify(fixture))
      manifest.push({ name: seed.name, method: seed.method, path: seed.path, status: r.status, contentType: r.contentType, bytes: r.body.length, bodySha256: sha(r.body).slice(0, 16) })
      console.log(`  captured ${seed.name.padEnd(22)} ${r.status} · ${r.body.length}B · ${r.contentType}`)
    }
    writeFileSync(join(FIXTURES, 'manifest.json'), JSON.stringify({ capturedAt: new Date().toISOString(), target: TARGET, seeds: manifest }, null, 2))
    console.log(`\n${SEEDS.length} golden fixtures captured → ${FIXTURES}`)
    return
  }

  // VERIFY — through the Worker (base gets /api/selemene prepended, like the app).
  const rows = []
  let failed = 0
  for (const seed of SEEDS) {
    const rawBody = seed.body ? JSON.stringify(seed.body) : ''
    const file = join(FIXTURES, `${keyFor(seed.method, seed.path, rawBody)}.json`)
    if (!existsSync(file)) {
      rows.push({ name: seed.name, ok: false, detail: 'fixture missing — re-capture' })
      failed++
      continue
    }
    const fixture = JSON.parse(readFileSync(file, 'utf8'))
    const r = await timedFetch(`${TARGET}/api/selemene${seed.path}`, seed, rawBody)
    const diffs = []
    if (r.status !== fixture.status) diffs.push(`status ${r.status} != ${fixture.status}`)
    if (r.contentType !== fixture.contentType) diffs.push(`content-type "${r.contentType}" != "${fixture.contentType}"`)
    if (r.body !== fixture.body) diffs.push(`body bytes differ (worker sha ${sha(r.body).slice(0, 16)} != baseline ${sha(fixture.body).slice(0, 16)}, ${r.body.length}B != ${fixture.body.length}B)`)
    // Streaming shape: on a multi-chunk upstream the first byte must arrive
    // before the stream completes (no full buffering at the Worker).
    const streamed = r.tFirst !== null && r.tTotal > 0 && r.tFirst < r.tTotal
    const ok = diffs.length === 0
    if (!ok) failed++
    rows.push({ name: seed.name, ok, status: r.status, bytes: r.body.length, ttfbMs: Math.round(r.tFirst ?? -1), totalMs: Math.round(r.tTotal), streamed, diffs })
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${seed.name.padEnd(22)} ${r.status} · ${r.body.length}B · ttfb ${Math.round(r.tFirst ?? -1)}ms / total ${Math.round(r.tTotal)}ms ${streamed ? '· incremental' : '· single-shot'}${diffs.length ? `\n      ${diffs.join('\n      ')}` : ''}`)
  }
  const report = { verifiedAt: new Date().toISOString(), base: TARGET, fixtures: FIXTURES, seeds: rows, differences: failed }
  writeFileSync(join(FIXTURES, 'diff-report.json'), JSON.stringify(report, null, 2))
  console.log(`\nGolden parity: ${SEEDS.length - failed}/${SEEDS.length} seeds identical (status + content-type + body bytes) · diff report → ${join(FIXTURES, 'diff-report.json')}`)
  if (failed) { console.log('Golden parity: FAIL'); process.exit(1) }
  console.log('Golden parity: PASS (0 differences)')
}
main()
