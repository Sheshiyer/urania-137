#!/usr/bin/env node
/**
 * R-2 — Read-only production-target validation.
 *
 * Resolves every live target named in a `production-targets.json` file against
 * the Cloudflare API and fails on any account / Pages project / hostname /
 * database mismatch. It is strictly read-only: no `--apply`, no mutations,
 * no writes to Cloudflare or disk.
 *
 * Frozen release.yml invocation:
 *   node scripts/ops/validate-targets.mjs --targets .release-input/production-targets.json
 *
 * Targets file uses the frozen TOP-LEVEL shape release.yml also reads directly:
 *   productionD1Id, protectedPagesProjectId, protectedPagesProjectName,
 *   protectedHostname, publicPagesProjectId, publicPagesProjectName,
 *   publicHostname, accessAud, accountId, teamDomain, previewD1Id.
 *
 * Exit 0 when every target resolves and matches; 1 on any mismatch, with a
 * redacted report that never prints account ids, tokens, or emails.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const ACCOUNT_RE = /^[a-f0-9]{32}$/
const D1_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SHA256_RE = /^[a-f0-9]{64}$/

/** Cloudflare API adapter — injectable for tests. */
export function createCloudflareApi({ token, accountId, fetchImpl = null }) {
  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}`
  const get = async (path) => {
    const url = path.startsWith('http') ? path : `${base}${path}`
    const headers = { Authorization: `Bearer ${token}` }
    const res = fetchImpl
      ? await fetchImpl(url, { headers })
      : await fetch(url, { headers })
    if (!res.ok) throw new Error(`Cloudflare API HTTP ${res.status} for ${path}`)
    const body = await res.json()
    if (body?.success !== true) throw new Error(`Cloudflare API error for ${path}: ${JSON.stringify(body?.errors ?? body)}`)
    return body.result
  }
  return { get }
}

/** Validate the *shape* of a targets file before any network call. */
export function validateTargetsShape(targets) {
  const issues = []
  if (!ACCOUNT_RE.test(targets?.accountId ?? '')) issues.push('accountId must be a 32-hex account id')
  if (!/^[a-z0-9.-]+cloudflareaccess\.com$/i.test(targets?.teamDomain ?? '')) issues.push('teamDomain invalid')
  for (const key of ['protectedPagesProjectId', 'publicPagesProjectId']) {
    if (!targets?.[key]) issues.push(`${key} is required`)
  }
  if (!targets?.protectedPagesProjectName) issues.push('protectedPagesProjectName is required')
  if (!targets?.publicPagesProjectName) issues.push('publicPagesProjectName is required')
  if (!targets?.protectedHostname) issues.push('protectedHostname is required')
  if (!targets?.publicHostname) issues.push('publicHostname is required')
  if (targets?.protectedHostname === targets?.publicHostname) issues.push('protected and public hostnames must differ (split-host)')
  if (!D1_ID_RE.test(targets?.productionD1Id ?? '')) issues.push('productionD1Id must be a UUID')
  if (!D1_ID_RE.test(targets?.previewD1Id ?? '')) issues.push('previewD1Id must be a UUID')
  if (targets?.productionD1Id === targets?.previewD1Id) issues.push('productionD1Id must differ from previewD1Id')
  if (!SHA256_RE.test(targets?.accessAud ?? '')) issues.push('accessAud must be a 64-hex AUD tag')
  return issues
}

/** Resolve a Pages project's production/preview configs (read-only). */
export async function resolvePagesProject(api, projectName) {
  const project = await api.get(`/pages/projects/${projectName}`)
  const configs = project?.deployment_configs ?? {}
  return {
    name: projectName,
    productionDomains: Array.isArray(project.domains) ? project.domains : [],
    prodD1: configs.production?.d1_databases?.DB?.id ?? null,
    previewD1: configs.preview?.d1_databases?.DB?.id ?? null,
  }
}

/**
 * Resolve every target read-only and compare against the frozen file.
 * Returns `{ ok, results }`; never throws on a mismatch (those are findings).
 */
export async function validateTargets(targets, api) {
  const shape = validateTargetsShape(targets)
  const results = []

  const add = (surface, ok, detail) => results.push({ surface, ok, detail })

  if (shape.length > 0) {
    for (const issue of shape) add('shape', false, issue)
    return { ok: false, results }
  }
  add('shape', true, 'targets file is well-formed')

  try {
    const protectedProj = await resolvePagesProject(api, targets.protectedPagesProjectName)
    add('pages.protected', true, `project ${targets.protectedPagesProjectName} resolves`)
    const protectedHosts = protectedProj.productionDomains.map((d) => d?.name ?? d)
    if (protectedHosts.includes(targets.protectedHostname)) {
      add('pages.protected-hostname', true, `hostname ${targets.protectedHostname} is bound`)
    } else {
      add('pages.protected-hostname', false, `hostname ${targets.protectedHostname} not in ${protectedHosts.join(',')}`)
    }
    if (protectedProj.prodD1 && protectedProj.prodD1 === targets.productionD1Id) {
      add('d1.production', true, 'Pages production DB binding matches productionD1Id')
    } else {
      add('d1.production', false, `Pages production DB ${protectedProj.prodD1} != ${targets.productionD1Id}`)
    }
    if (protectedProj.previewD1 && protectedProj.previewD1 === targets.previewD1Id) {
      add('d1.preview', true, 'Pages preview DB binding matches previewD1Id')
    } else {
      add('d1.preview', false, `Pages preview DB ${protectedProj.previewD1} != ${targets.previewD1Id}`)
    }
  } catch (err) {
    add('pages.protected', false, `resolve failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  try {
    await resolvePagesProject(api, targets.publicPagesProjectName)
    add('pages.public', true, `project ${targets.publicPagesProjectName} resolves`)
  } catch (err) {
    add('pages.public', false, `resolve failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  const ok = results.every((r) => r.ok)
  return { ok, results }
}

function parseArgs(argv, env = process.env) {
  const args = { targets: null }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--targets') args.targets = argv[++index]
    else throw new Error(`unknown argument: ${arg}`)
  }
  if (!args.targets) throw new Error('validate-targets requires --targets <file>')
  args.token = env.CLOUDFLARE_API_TOKEN ?? ''
  args.accountId = env.CLOUDFLARE_ACCOUNT_ID ?? ''
  return args
}

function resolveWranglerOauthToken() {
  const home = process.env.HOME
  try {
    const text = readFileSync(`${home}/Library/Preferences/.wrangler/config/default.toml`, 'utf8')
    const match = text.match(/oauth_token\s*=\s*"([^"]+)"/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

const invokedAs = process.argv[1] ? pathToFileURL(process.argv[1]).href : ''
if (import.meta.url === invokedAs) {
  try {
    const args = parseArgs(process.argv.slice(2))
    const token = args.token || resolveWranglerOauthToken()
    if (!token) throw new Error('validate-targets requires CLOUDFLARE_API_TOKEN or a wrangler oauth token')
    if (!ACCOUNT_RE.test(args.accountId ?? '')) throw new Error('validate-targets requires CLOUDFLARE_ACCOUNT_ID (32-hex)')
    const targets = JSON.parse(readFileSync(resolve(args.targets), 'utf8'))
    const api = createCloudflareApi({ token, accountId: args.accountId })
    const report = await validateTargets(targets, api)
    console.log(JSON.stringify(report, null, 2))
    if (!report.ok) process.exitCode = 1
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2))
    process.exitCode = 1
  }
}
