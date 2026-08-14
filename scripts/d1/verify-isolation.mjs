#!/usr/bin/env node
/**
 * R-7 — Prove D1 preview/production isolation.
 *
 * The invariant: the preview database and the production database MUST be
 * distinct. A preview deployment (or `wrangler dev` / `wrangler d1 --preview`)
 * that silently points at the production database would let non-production
 * traffic read/write production rows. This gate fails closed the moment the
 * two IDs collapse to the same UUID.
 *
 * Sources, in order of trust:
 *   1. `--api` (default): query the Cloudflare API for the Pages project's
 *      preview + production `DB` bindings, and confirm the preview binding
 *      targets the preview database while production targets production.
 *      Read-only — never mutates.
 *   2. Static `wrangler.toml`: confirm `database_id` != `preview_database_id`
 *      (guards the local/wrangler-dev path even with no network/token).
 *
 * Usage:
 *   node scripts/d1/verify-isolation.mjs            # static + live API check
 *   node scripts/d1/verify-isolation.mjs --static   # static wrangler.toml only
 *   node scripts/d1/verify-isolation.mjs --api      # live API only
 *
 * Exit 0 = isolated (preview != prod), 1 = isolation violated or unreachable.
 *
 * Sensitive output is redacted: account IDs and bearer tokens are never
 * printed; only database UUIDs (which are bindings, not credentials) appear.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const REPO_ROOT = resolve(import.meta.dirname, '../..')

function fail(message) {
  console.error(`ISOLATION FAIL — ${message}`)
  process.exit(1)
}

function parseWranglerToml(root = REPO_ROOT) {
  const text = readFileSync(resolve(root, 'wrangler.toml'), 'utf8')
  // Grab the [[d1_databases]] block(s): binding, database_name, database_id,
  // preview_database_id.
  const databases = []
  let current = null
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (line.startsWith('[[d1_databases]]')) {
      current = { binding: null, database_name: null, database_id: null, preview_database_id: null }
      databases.push(current)
      continue
    }
    if (!current) continue
    const match = line.match(/^(\w+)\s*=\s*"([^"]+)"\s*$/)
    if (match && ['binding', 'database_name', 'database_id', 'preview_database_id'].includes(match[1])) {
      current[match[1]] = match[2]
    }
  }
  if (databases.length === 0) fail('no [[d1_databases]] block found in wrangler.toml')
  return databases
}

function checkStatic() {
  const databases = parseWranglerToml()
  const errors = []
  for (const db of databases) {
    if (!db.database_id) errors.push(`binding ${db.binding ?? '(unnamed)'}: missing database_id`)
    if (!db.preview_database_id) errors.push(`binding ${db.binding ?? '(unnamed)'}: missing preview_database_id`)
    if (db.database_id && db.preview_database_id && db.database_id === db.preview_database_id) {
      errors.push(`binding ${db.binding}: preview_database_id equals database_id (${db.database_id})`)
    }
  }
  if (errors.length) fail(errors.join('; '))
  console.log('static wrangler.toml: PASS — every [[d1_databases]] block has distinct preview != production IDs')
  return databases
}

function readWranglerOauthToken() {
  // Resolve the oauth token from the default wrangler config without echoing it.
  const candidates = [
    `${process.env.HOME}/Library/Preferences/.wrangler/config/default.toml`,
  ]
  for (const candidate of candidates) {
    try {
      const text = readFileSync(candidate, 'utf8')
      const match = text.match(/oauth_token\s*=\s*"([^"]+)"/)
      if (match) return match[1]
    } catch {
      /* not present */
    }
  }
  return null
}

function resolveAccountId() {
  return process.env.CLOUDFLARE_ACCOUNT_ID || null
}

function apiGet(token, accountId, path) {
  const result = spawnSync(
    'curl',
    ['-s', '-H', `Authorization: Bearer ${token}`, `https://api.cloudflare.com/client/v4/accounts/${accountId}${path}`],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  )
  if (result.status !== 0) throw new Error(`curl failed: ${result.stderr}`)
  return JSON.parse(result.stdout)
}

function checkApi() {
  const token = readWranglerOauthToken()
  if (!token) fail('live API check requested but no wrangler oauth token found (run `wrangler login`)')
  const accountId = resolveAccountId()
  if (!accountId) fail('live API check requested but CLOUDFLARE_ACCOUNT_ID is unset')

  const projectResponse = apiGet(token, accountId, '/pages/projects/urania-137')
  if (!projectResponse?.success) {
    fail(`Pages API error: ${JSON.stringify(projectResponse?.errors ?? projectResponse)}`)
  }
  const project = projectResponse.result
  const configs = project.deployment_configs ?? {}
  const prodBinding = configs.production?.d1_databases?.DB?.id
  const previewBinding = configs.preview?.d1_databases?.DB?.id

  // Production must equal the canonical prod ID from wrangler.toml.
  const [canonical] = parseWranglerToml()
  if (prodBinding !== canonical.database_id) {
    fail(`Pages PRODUCTION DB binding (${prodBinding}) does not match wrangler.toml database_id (${canonical.database_id})`)
  }
  if (!previewBinding) fail('Pages PREVIEW deployment has no DB binding')
  if (previewBinding === prodBinding) {
    fail(`Pages PREVIEW DB binding (${previewBinding}) equals PRODUCTION (${prodBinding})`)
  }
  if (previewBinding !== canonical.preview_database_id) {
    fail(`Pages PREVIEW DB binding (${previewBinding}) does not match preview_database_id (${canonical.preview_database_id})`)
  }

  console.log(`live Pages API: PASS — preview DB ${previewBinding} != production DB ${prodBinding}`)
}

const args = new Set(process.argv.slice(2))
const doStatic = args.has('--static') || args.size === 0
const doApi = args.has('--api') || args.size === 0

if (doStatic) checkStatic()
if (doApi) checkApi()
console.log('ISOLATION VERIFIED — preview and production D1 are distinct.')
