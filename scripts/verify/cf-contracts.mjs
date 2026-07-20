/**
 * Phase 0 exit gate (T-014) — the Cloudflare platform + frozen contracts are real
 * and complete. Static + type checks; the D1 apply + route-501 checks run alongside
 * (npm run migrate:local + wrangler pages dev). Green here ≠ done — it proves the
 * frozen-contract surface exists and compiles for both the SPA and the Functions.
 *
 *   node scripts/verify/cf-contracts.mjs   (or: npm run verify:cf-contracts)
 */
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const root = process.cwd()
const read = (p) => readFileSync(`${root}/${p}`, 'utf8')
const checks = []
const check = (name, fn) => checks.push({ name, fn })
const mustExist = (p) => { if (!existsSync(`${root}/${p}`)) throw new Error(`missing ${p}`) }
const mustContain = (p, needles) => { mustExist(p); const s = read(p); for (const n of needles) if (!s.includes(n)) throw new Error(`${p} missing \`${n}\``) }

check('wrangler.toml (D1 binding + 4 config keys + Pages output)', () =>
  mustContain('wrangler.toml', ['binding = "DB"', 'pages_build_output_dir', 'CF_ACCESS_AUD', 'CF_ACCESS_TEAM_DOMAIN', 'database_name']))

check('migration 0001 (users + readings + constraints + indexes)', () =>
  mustContain('migrations/0001_init.sql', ['CREATE TABLE users', 'NOT NULL UNIQUE', 'CREATE TABLE readings', 'ON DELETE CASCADE', 'idx_readings_user_time', 'idx_readings_user_fav']))

check('shared API contract (contract.ts)', () =>
  mustContain('src/lib/api/contract.ts', ['ReadingDTO', 'SaveReadingRequest', 'FolioListResponse', 'ImportRequest', 'MeResponse', 'ApiError', 'CfAccessIdentity']))

check('typed Env (env.ts, 4 keys + dev guard var)', () =>
  mustContain('functions/lib/env.ts', ['interface Env', 'DB: D1Database', 'CF_ACCESS_AUD', 'CF_ACCESS_TEAM_DOMAIN', 'SELEMENE_API_KEY', 'SELEMENE_API_URL', 'DEV_IDENTITY_EMAIL']))

check('router skeleton (every endpoint → 501 stub, unknown → 404)', () =>
  mustContain('functions/api/[[path]].ts', ["'/api/me'", '/api/selemene/', "'/api/folio'", "'/api/folio/import'", "/api/folio/:id", '501', 'NOT_FOUND']))

check('frozen decision doc (4 sections a–d)', () =>
  mustContain('docs/auth/contracts.md', ['CF-Access verification contract', 'user_id derivation', 'prod-safe dev-identity guard', '9d9d CF-Access infra handoff', 'alg']))

check('.dev.vars.example (4 keys) + secrets gitignored', () => {
  mustContain('.dev.vars.example', ['SELEMENE_API_KEY', 'SELEMENE_API_URL', 'CF_ACCESS_AUD', 'CF_ACCESS_TEAM_DOMAIN'])
  mustContain('.gitignore', ['.wrangler/', '.dev.vars'])
})

check('tsc --noEmit (SPA) is green', () => {
  try { execSync('npx tsc --noEmit', { cwd: root, stdio: 'pipe' }) }
  catch (e) { throw new Error(`SPA tsc failed:\n${(e.stdout || e.message || '').toString().slice(0, 700)}`) }
})

check('tsc functions (workers-types) is green', () => {
  try { execSync('npx tsc -p tsconfig.functions.json --noEmit', { cwd: root, stdio: 'pipe' }) }
  catch (e) { throw new Error(`functions tsc failed:\n${(e.stdout || e.message || '').toString().slice(0, 700)}`) }
})

let failed = 0
for (const c of checks) {
  try { c.fn(); console.log(`  ✓ ${c.name}`) }
  catch (e) { failed++; console.log(`  ✗ ${c.name}\n      ${e.message}`) }
}
const total = checks.length
if (failed) { console.log(`\nPhase-0 (CF) exit gate: FAIL (${failed}/${total})`); process.exit(1) }
console.log(`\nPhase-0 (CF) exit gate: PASS (${total}/${total}) — platform + frozen contracts real and compiling.`)
