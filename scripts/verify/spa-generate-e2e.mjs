/**
 * T-036 — SPA generate path through the Worker (browser e2e).
 *
 * Drives the REAL UI served by `wrangler pages dev` (port 8788): Noesis Reading →
 * Integrated Kundali → WitnessForm → Generate, and asserts the rendered reading
 * content is identical to the pre-migration baseline (the recorded engine fixture
 * captured from the prod Vercel-proxy path — the app's pre-migration route).
 *
 *   node scripts/verify/spa-generate-e2e.mjs [--base http://localhost:8788] [--fixtures /tmp/p2-fixtures]
 *
 * Proves: SPA bundle loads from the Worker · the exact request body the app sends
 * resolves through /api/selemene/* (fixture hit ⇒ byte-identical body) · the
 * response renders to completion · rendered content == baseline-derived content.
 */
import { chromium } from 'playwright'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : dflt
}
const BASE = arg('base', 'http://localhost:8788').replace(/\/+$/, '')
const FIXTURES = arg('fixtures', '/tmp/p2-fixtures')

// The exact subject the form is driven with (defaults untouched: empty location
// query, lat/lon 0, Asia/Kolkata — the form submits these as-is).
const SPA_BODY = JSON.stringify({
  mode: 'integrated-kundali-l0', report_level: 'L0', language: 'en', consciousness_level: 2,
  subjects: [{ role: 'primary', name: 'goldenwitness', birth_date: '1990-05-15', birth_time: '08:30', birth_time_confidence: 'exact', birth_location_query: '', normalized_location: { display_name: '', latitude: 0, longitude: 0, timezone: 'Asia/Kolkata', provider: 'manual', confidence: 'manual' } }],
  options: { output_format: 'markdown', include_rubric: true, include_pattern_extraction: true },
})
const keyFor = (method, path, rawBody) => createHash('sha256').update(`${method} ${path}\n${rawBody}`).digest('hex')

// Mirror useReportGenerator's content derivation exactly (src/hooks/useReportGenerator.ts:29-33).
const deriveContent = (raw) => {
  const content = raw.assembled?.trim() || (raw.passes || []).map((p) => `## ${p.title}\n\n${p.output}`).join('\n\n') || 'No content returned.'
  const engines = raw.engines_used?.length ? `\n\n---\n_Engines: ${raw.engines_used.join(', ')} · register ${raw.register}_` : ''
  return content + engines
}

const main = async () => {
  const fixture = JSON.parse(readFileSync(join(FIXTURES, `${keyFor('POST', '/api/v1/assets/generate', SPA_BODY)}.json`), 'utf8'))
  const expected = deriveContent(JSON.parse(fixture.body))
  console.log(`Baseline fixture ${fixture.status} · ${fixture.body.length}B → expected rendered content ${expected.length} chars`)

  const browser = await chromium.launch()
  const page = await browser.newPage()
  let generateStatus = null
  let generateBodyHash = null
  page.on('response', (r) => { if (r.url().includes('/api/selemene/api/v1/assets/generate')) generateStatus = r.status() })
  page.on('request', (r) => { if (r.url().includes('/api/selemene/api/v1/assets/generate')) generateBodyHash = createHash('sha256').update(r.postData() || '').digest('hex').slice(0, 16) })

  await page.goto(`${BASE}/#/node/witness`, { waitUntil: 'networkidle' })
  // Orbital labels render uppercase without spaces (INTEGRATEDKUNDALI).
  await page.getByText(/INTEGRATED\s*KUNDALI/i).first().click()
  await page.getByPlaceholder('Name').fill('goldenwitness')
  await page.locator('input[type="date"]').fill('1990-05-15')
  await page.locator('input[type="time"]').fill('08:30')
  await page.getByRole('button', { name: 'Generate Integrated Kundali' }).click()
  await page.getByText('complete', { exact: true }).waitFor({ timeout: 60_000 })
  const rendered = await page.locator('pre').first().innerText()
  await browser.close()

  const checks = [
    ['generate POST reached the engine through the Worker (200)', generateStatus === 200],
    ['app request body byte-identical to baseline capture', generateBodyHash === createHash('sha256').update(SPA_BODY).digest('hex').slice(0, 16)],
    ['rendered content identical to pre-migration baseline', rendered === expected],
  ]
  let failed = 0
  for (const [name, ok] of checks) {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`)
    if (!ok) failed++
  }
  console.log(`\n  rendered ${rendered.length} chars · first line: ${rendered.split('\n')[0]?.slice(0, 80)}`)
  if (failed) {
    console.log(`\nSPA generate e2e: FAIL (${failed})`)
    if (rendered !== expected) {
      console.log(`  expected sha ${createHash('sha256').update(expected).digest('hex').slice(0, 16)} · rendered sha ${createHash('sha256').update(rendered).digest('hex').slice(0, 16)}`)
    }
    process.exit(1)
  }
  console.log('\nSPA generate e2e: PASS — reading generated through the Worker, content identical to pre-migration app')
}
main()
