/**
 * Phase 1 exit gate (T-049) — the interpretation spine ① must be complete and
 * green as a whole before Phase 2 UI work begins. Consolidates: the spine files
 * exist, tsc is green, and the full daily unit suite passes (interpret over the
 * real lexicon, lexicon completeness + voice, determinism/purity, location
 * precedence + privacy, and the hook archive-once/not-on-error contract).
 *
 *   node scripts/verify/daily-phase1.mjs   (or: npm run verify:daily-phase1)
 */
import { existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const root = process.cwd()
const spine = [
  'src/lib/daily/deterministic.ts',
  'src/lib/daily/registry.ts',
  'src/lib/daily/location.ts',
  'src/hooks/useDailyReading.ts',
  'src/lib/daily/lexicon/index.ts',
  'src/lib/daily/lexicon/vara.ts',
  'src/lib/daily/lexicon/tithi.ts',
  'src/lib/daily/lexicon/nakshatra.ts',
  'src/lib/daily/lexicon/yoga.ts',
  'src/lib/daily/lexicon/karana.ts',
  'src/lib/daily/lexicon/transit.ts',
]

let failed = 0
for (const f of spine) {
  if (existsSync(`${root}/${f}`)) console.log(`  ✓ ${f}`)
  else { failed++; console.log(`  ✗ missing ${f}`) }
}

const run = (label, cmd) => {
  try { execSync(cmd, { cwd: root, stdio: 'pipe' }); console.log(`  ✓ ${label}`) }
  catch (e) { failed++; console.log(`  ✗ ${label}\n      ${(e.stdout || e.message || '').toString().slice(0, 600)}`) }
}
run('tsc --noEmit is green', 'npx tsc --noEmit')
run('daily unit suite passes (interpret · completeness · exit · determinism · hook · location)', 'npx vitest run src/lib/daily')

if (failed) { console.log(`\nPhase-1 exit gate: FAIL (${failed})`); process.exit(1) }
console.log('\nPhase-1 exit gate: PASS — the interpretation spine ① is complete, verified, and byte-stable.')
