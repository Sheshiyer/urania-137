/**
 * Phase 0 exit gate (T-013) — the frozen-contract surface must be real and complete.
 *
 * Law: green != done. This gate makes the Phase-0 exit contract EXECUTABLE — it
 * passes only when every frozen artifact exists, exports what it must, the enum
 * key-domains are at their ground-truth counts, the fixtures load, the ChildRun
 * carries {kind:'daily'}, the ledger is seeded, and `tsc` is green. Removing or
 * renaming any one artifact makes it exit non-zero, naming the failure.
 *
 *   node scripts/verify/daily-contracts.mjs        (or: npm run verify:daily-contracts)
 */
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const root = process.cwd()
const read = (p) => readFileSync(`${root}/${p}`, 'utf8')
const checks = []
const check = (name, fn) => checks.push({ name, fn })

const mustExist = (p) => { if (!existsSync(`${root}/${p}`)) throw new Error(`missing file: ${p}`) }
const mustContain = (p, needles) => {
  mustExist(p)
  const src = read(p)
  for (const n of needles) if (!src.includes(n)) throw new Error(`${p} missing \`${n}\``)
}
const domainCount = (src, name) => {
  const m = src.match(new RegExp(`export const ${name}_DOMAIN[^\\[]*\\[([\\s\\S]*?)\\n\\]`))
  if (!m) throw new Error(`domains.ts: ${name}_DOMAIN not found`)
  return (m[1].match(/name:/g) || []).length
}

check('seam + types (source.ts)', () =>
  mustContain('src/lib/daily/source.ts', ['DailyReadingSource', 'DailyReading', 'DailyReadingInput', 'DailyLocation', 'DAILY_SOURCE']))

check('pass model (passModel.ts)', () =>
  mustContain('src/lib/daily/passModel.ts', ['PASS_MODEL', "id: 'vara'", "id: 'native'", "kind: 'overlay'"]))

check('engine contract + request builders (engine-contract.ts)', () =>
  mustContain('src/lib/daily/engine-contract.ts', ['PanchangaResponse', 'TransitsResponse', 'buildPanchangaRequest', 'buildTransitsRequest', 'tithi_name', 'aspects']))

check('lexicon entry schemas (lexicon/schema.ts)', () =>
  mustContain('src/lib/daily/lexicon/schema.ts', ['VaraEntry', 'TithiEntry', 'NakshatraEntry', 'YogaEntry', 'KaranaEntry', 'TransitEntry']))

check('enum key-domains at ground-truth counts (lexicon/domains.ts)', () => {
  mustExist('src/lib/daily/lexicon/domains.ts')
  const src = read('src/lib/daily/lexicon/domains.ts')
  const want = { VARA: 7, TITHI: 30, NAKSHATRA: 27, YOGA: 27, KARANA: 11 }
  for (const [k, n] of Object.entries(want)) {
    const got = domainCount(src, k)
    if (got !== n) throw new Error(`${k}_DOMAIN has ${got} entries, expected ${n}`)
  }
  if (!src.includes('vara: 7, tithi: 30, nakshatra: 27, yoga: 27, karana: 11'))
    throw new Error('DOMAIN_COUNTS literal drifted from 7/30/27/27/11')
})

check('location contract (location.ts + doc)', () => {
  mustContain('src/lib/daily/location.ts', ['DAILY_LOCATION_STORAGE_KEY', 'LocationSource', 'ResolveDefaultLocation'])
  mustExist('docs/daily/location-contract.md')
})

check("ChildRun carries {kind:'daily'}", () =>
  mustContain('src/types/index.ts', ["kind: 'daily'", 'needsLocation']))

check('fixture bundle + manifest load (>=4 bundles, axes covered)', () => {
  mustExist('src/lib/daily/__fixtures__/bundles.manifest.json')
  const man = JSON.parse(read('src/lib/daily/__fixtures__/bundles.manifest.json'))
  if (!Array.isArray(man.bundles) || man.bundles.length < 4) throw new Error('manifest has <4 bundles')
  for (const b of man.bundles) mustExist(`src/lib/daily/__fixtures__/${b.panchanga}`)
  const cats = new Set(man.bundles.map((b) => b.panchanga_limbs?.category))
  const hasOverlay = man.bundles.some((b) => b.overlay)
  if (!cats.has('Nanda') || !cats.has('Rikta')) throw new Error('bundle missing Nanda/Rikta axis')
  if (!hasOverlay) throw new Error('bundle missing an overlay-present case')
  // paksha axis: at least one shukla + one krishna
  const pak = new Set(man.bundles.map((b) => b.panchanga_limbs?.paksha))
  if (!pak.has('Shukla') || !pak.has('Krishna')) throw new Error('bundle missing waxing/waning axis')
})

check('engine-request ledger seeded (REQ-1..5 + SCHEMA-1)', () =>
  mustContain('docs/selemene-engine-requests.md', ['REQ-1', 'REQ-2', 'REQ-3', 'REQ-4', 'REQ-5', 'SCHEMA-1', 'DAILY_SOURCE']))

check('tsc --noEmit is green', () => {
  try { execSync('npx tsc --noEmit', { cwd: root, stdio: 'pipe' }) }
  catch (e) { throw new Error(`tsc failed:\n${(e.stdout || e.message || '').toString().slice(0, 800)}`) }
})

// --- run ---
let failed = 0
for (const c of checks) {
  try { c.fn(); console.log(`  ✓ ${c.name}`) }
  catch (e) { failed++; console.log(`  ✗ ${c.name}\n      ${e.message}`) }
}
const total = checks.length
if (failed) { console.log(`\nPhase-0 exit gate: FAIL (${failed}/${total} checks failed)`); process.exit(1) }
console.log(`\nPhase-0 exit gate: PASS (${total}/${total}) — the frozen-contract surface is real and complete.`)
