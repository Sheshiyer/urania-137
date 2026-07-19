/**
 * G8 made runnable (T-096) + ③ dormancy guard (T-097). The interpreter and the
 * witness adapter are TypeScript, so the proof lives in vitest; this is the thin
 * node entrypoint the flip runbook calls. Green means ① and ③ produce the same
 * DailyReading shape (differing only in meta.source) AND ③ stays dormant under the
 * default flag (zero /assets/generate calls).
 *
 *   node scripts/verify/daily-seam-swap.mjs
 */
import { execSync } from 'node:child_process'

try {
  execSync('npx vitest run src/lib/daily/__tests__/seam-swap.test.ts src/lib/daily/__tests__/witness.test.ts', {
    stdio: 'inherit',
  })
  console.log('\nseam-swap + dormancy: PASS — ①↔③ shape-safe, ③ dormant by default.')
} catch {
  console.log('\nseam-swap + dormancy: FAIL')
  process.exit(1)
}
