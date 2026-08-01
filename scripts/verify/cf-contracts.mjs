/**
 * Cloudflare contract gate — the platform configuration, API surface, and frozen
 * contracts are present and compile. Runtime D1 migration coverage lives in the
 * migration-chain verifier; this gate prevents accidental removal of the shared
 * authentication boundary or implemented route families.
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

check('implemented API router (auth boundary, route families, unknown → 404)', () =>
  mustContain('functions/api/[[path]].ts', [
    'export async function authenticate',
    'every /api/* request authenticates before routing',
    "'/api/me'",
    '/api/selemene/',
    "'/api/relationships'",
    "'/api/folio'",
    "'/api/folio/import'",
    '/api/folio/:id',
    "'/api/subjects'",
    'NOT_FOUND',
  ]))

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
if (failed) { console.log(`\nCloudflare contract gate: FAIL (${failed}/${total})`); process.exit(1) }
console.log(`\nCloudflare contract gate: PASS (${total}/${total}) — platform, routes, and contracts are present and compiling.`)
