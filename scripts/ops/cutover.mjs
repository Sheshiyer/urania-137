#!/usr/bin/env node
/**
 * R-2 — Fail-closed cutover executor.
 *
 * Performs exactly ONE named production mutation per invocation, and only
 * after both `--apply` and `--confirm <resolved-resource-id>` are supplied.
 * Default is dry-run: it emits the before-state and the exact intended
 * mutation and refuses to touch anything. Each applied mutation writes a
 * checksummed receipt containing before/after state and a tested rollback
 * command. Deploy receipts carry `deploymentId` + `sourceSha` (the frozen
 * shape release.yml's attestation step reads).
 *
 * Frozen release.yml invocations:
 *   node scripts/ops/cutover.mjs d1-migrate   --targets <t> --backup <r> --apply --confirm <productionD1Id>        --receipt .release/d1-migrate.json
 *   node scripts/ops/cutover.mjs app-deploy    --targets <t> --artifact dist/app --sha <40> --apply --confirm <protectedPagesProjectId> --receipt .release/app-deploy.json
 *   node scripts/ops/cutover.mjs landing-deploy --targets <t> --artifact dist/landing --sha <40> --apply --confirm <publicPagesProjectId> --receipt .release/landing-deploy.json
 *
 * The runner is a pure, injectable `executeCutover` so the test suite can prove
 * the fail-closed guards (wrong target, wildcard, missing backup, multi-mutation,
 * rollback receipt) without a network. Pages deployment-id lookup is a second
 * injectable (`fetchDeploymentId`); omitting it keeps Canonical-gate tests off
 * the live Cloudflare API even when CLOUDFLARE_* is set in the environment.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const SHA_RE = /^[a-f0-9]{40}$/
const DEPLOYMENT_ID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

export function parsePagesDeploymentId(stdout) {
  const text = String(stdout ?? '')
  const jsonStart = text.indexOf('{')
  if (jsonStart !== -1) {
    try {
      const parsed = JSON.parse(text.slice(jsonStart))
      const id = parsed.id ?? parsed.deployment_id ?? parsed.deploymentId
      if (typeof id === 'string' && id.length > 0) return id
    } catch {
      // fall through to UUID scan
    }
  }
  const match = text.match(DEPLOYMENT_ID_RE)
  return match ? match[0] : null
}

/**
 * Resolve a Pages deployment id from the Cloudflare API. Prefer a deployment
 * whose commit hash matches the frozen release SHA; fall back to the project's
 * canonical deployment only when no SHA match exists. Tests must inject this
 * (or omit it) — never call it from a mocked runner, because readiness.yml
 * sets CLOUDFLARE_* and a live GET would leak into the Canonical gate.
 */
export function fetchLatestDeploymentId(projectName, sourceSha) {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID
  const token = process.env.CLOUDFLARE_API_TOKEN
  if (!account || !token || !projectName) return null
  const curl = (url) => spawnSync(
    'curl',
    ['-sS', '--max-time', '15', '-H', `Authorization: Bearer ${token}`, url],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  )
  const accountRoot = `https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/${projectName}`
  if (SHA_RE.test(sourceSha ?? '')) {
    const listed = curl(`${accountRoot}/deployments`)
    if (listed.status === 0) {
      try {
        const parsed = JSON.parse(listed.stdout || '{}')
        const rows = Array.isArray(parsed?.result) ? parsed.result : []
        const match = rows.find((row) => {
          const hash = row?.deployment_trigger?.metadata?.commit_hash
          return hash === sourceSha && typeof row?.id === 'string' && row.id.length > 0
        })
        if (match?.id) return match.id
      } catch {
        // fall through to canonical_deployment
      }
    }
  }
  const result = curl(accountRoot)
  if (result.status !== 0) return null
  try {
    const parsed = JSON.parse(result.stdout || '{}')
    const id = parsed?.result?.canonical_deployment?.id
    return typeof id === 'string' && id.length > 0 ? id : null
  } catch {
    return null
  }
}

const MUTATIONS = new Set(['d1-migrate', 'app-deploy', 'landing-deploy'])

/** The three mutations release.yml invokes, and their resolved resources. */
const RESOURCE_OF = {
  'd1-migrate': (targets) => targets?.productionD1Id,
  'app-deploy': (targets) => targets?.protectedPagesProjectId,
  'landing-deploy': (targets) => targets?.publicPagesProjectId,
}

/** One mutation descriptor produced by `planCutover`. */
export function planCutover(mutation, args, targets) {
  if (!MUTATIONS.has(mutation)) throw new Error(`unknown mutation "${mutation}" — allowed: ${[...MUTATIONS].join(' | ')}`)
  const resource = RESOURCE_OF[mutation](targets)
  if (!resource) throw new Error(`mutation "${mutation}" has no resolved resource in targets`)
  if (args.confirm && args.confirm.includes('*')) throw new Error('--confirm rejects wildcards')
  if (args.confirm && args.confirm !== resource) {
    throw new Error(`--confirm ${args.confirm} does not match resolved resource for ${mutation}`)
  }
  const rollback = {
    'd1-migrate': ['wrangler', 'd1', 'time-travel', 'restore', '--database', resource],
    'app-deploy': ['wrangler', 'pages', 'deployment', 'rollback', '--project', targets.protectedPagesProjectName],
    'landing-deploy': ['wrangler', 'pages', 'deployment', 'rollback', '--project', targets.publicPagesProjectName],
  }[mutation]

  return {
    mutation,
    resource,
    before: { mutation, resource, capturedAt: new Date().toISOString() },
    intended: args,
    rollback,
    sha256: null,
  }
}

/** Pure fail-closed gate: dry-run emits, --apply + --confirm permits. */
export function gateCutover(plan, { apply = false, confirm = null, backupReceipt = null } = {}) {
  const errors = []
  if (plan.mutation === 'd1-migrate' && !backupReceipt) {
    errors.push('d1-migrate requires a --backup receipt')
  }
  if (apply && !confirm) errors.push('--apply requires --confirm <resolved-resource-id>')
  if (confirm && confirm !== plan.resource) errors.push('--confirm does not match the resolved resource')
  return errors
}

/** Write a checksummed receipt (mode 0600) containing the rollback command. */
export function writeCutoverReceipt(plan, afterState, receiptPath) {
  const body = { ...plan, after: afterState, rollbackCommand: plan.rollback, completedAt: new Date().toISOString() }
  const receipt = { ...body, sha256: createHash('sha256').update(JSON.stringify(body)).digest('hex') }
  mkdirSync(resolve(receiptPath, '..'), { recursive: true })
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 })
  return receipt
}

/**
 * Execute a mutation via the injected `run` runner (spawnSync-like). This is
 * the seam the test suite mocks. `run` receives (argv[], cwd) and returns
 * { status, stdout, stderr }. Optional `fetchDeploymentId(projectName, sha)`
 * is the only path that may touch the Cloudflare API; tests omit it.
 */
export function executeCutover(mutation, args, targets, { run, fetchDeploymentId } = {}) {
  if (typeof run !== 'function') throw new Error('executeCutover requires a run runner')
  const plan = planCutover(mutation, args, targets)
  if (args.dryRun || !args.apply) {
    return { ok: true, dryRun: true, plan }
  }
  const gates = gateCutover(plan, {
    apply: args.apply,
    confirm: args.confirm,
    backupReceipt: args.backup,
  })
  if (gates.length > 0) {
    throw new Error(`cutover gate failed: ${gates.join('; ')}`)
  }

  const cwd = resolve(import.meta.dirname, '../..')
  const wranglerBin = [
    resolve(cwd, 'node_modules/.bin/wrangler'),
    resolve(cwd, 'node_modules/wrangler/bin/wrangler.js'),
  ].find((candidate) => existsSync(candidate))
  if (!wranglerBin) throw new Error('wrangler executable not found — run `npm ci` first')
  let command
  if (mutation === 'd1-migrate') {
    command = [process.execPath, wranglerBin, 'd1', 'migrations', 'apply', 'DB', '--remote']
  } else if (mutation === 'app-deploy') {
    command = [process.execPath, wranglerBin, 'pages', 'deploy', args.artifact, '--project-name', targets.protectedPagesProjectName, '--branch', 'main', '--commit-hash', args.sha, '--commit-dirty=false']
  } else {
    command = [process.execPath, wranglerBin, 'pages', 'deploy', args.artifact, '--project-name', targets.publicPagesProjectName, '--branch', 'main', '--commit-hash', args.sha, '--commit-dirty=false']
  }

  const result = run(command, cwd)
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || result.error || '').toString().trim()
    throw new Error(`cutover ${mutation} failed: ${detail || `exit ${result.status}`}`)
  }

  const after = {
    mutation,
    resource: plan.resource,
    output: (result.stdout || '').slice(0, 400),
    completedAt: new Date().toISOString(),
  }
  // Deploy receipts must expose deploymentId + sourceSha (release.yml attestation).
  if (mutation === 'app-deploy' || mutation === 'landing-deploy') {
    const projectName =
      mutation === 'app-deploy' ? targets.protectedPagesProjectName : targets.publicPagesProjectName
    after.deploymentId =
      result.deploymentId
      ?? parsePagesDeploymentId(result.stdout)
      ?? (typeof fetchDeploymentId === 'function' ? fetchDeploymentId(projectName, args.sha) : null)
      ?? null
    after.sourceSha = SHA_RE.test(args.sha ?? '') ? args.sha : null
    if (!after.deploymentId) {
      throw new Error(`cutover ${mutation} failed: Pages deployment id missing from wrangler output and Cloudflare API`)
    }
  }
  const receipt = writeCutoverReceipt(plan, after, args.receipt)
  if (mutation === 'app-deploy' || mutation === 'landing-deploy') {
    receipt.deploymentId = after.deploymentId
    receipt.sourceSha = after.sourceSha
    writeFileSync(args.receipt, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 })
  }
  return { ok: true, dryRun: false, receipt }
}

function parseArgs(argv, env = process.env) {
  const mutation = argv[0]
  const args = {
    targets: null,
    artifact: null,
    sha: '',
    backup: null,
    receipt: '.release/cutover.json',
    apply: false,
    confirm: null,
    dryRun: false,
  }
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--targets') args.targets = argv[++index]
    else if (arg === '--artifact') args.artifact = argv[++index]
    else if (arg === '--sha') args.sha = argv[++index]
    else if (arg === '--backup') args.backup = argv[++index]
    else if (arg === '--receipt') args.receipt = argv[++index]
    else if (arg === '--apply') args.apply = true
    else if (arg === '--confirm') args.confirm = argv[++index]
    else if (arg === '--dry-run') args.dryRun = true
    else throw new Error(`unknown argument: ${arg}`)
  }
  if (!mutation) throw new Error('cutover requires a mutation: d1-migrate | app-deploy | landing-deploy')
  if (!args.targets) throw new Error('cutover requires --targets <file>')
  return { mutation, args }
}

const invokedAs = process.argv[1] ? pathToFileURL(process.argv[1]).href : ''
if (import.meta.url === invokedAs) {
  try {
    const { mutation, args } = parseArgs(process.argv.slice(2))
    const targets = JSON.parse(readFileSync(resolve(args.targets), 'utf8'))
    const runner = (argv, cwd) => {
      const result = spawnSync(argv[0], argv.slice(1), { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      return { status: result.status ?? 1, stdout: result.stdout || '', stderr: result.stderr || '' }
    }
    const report = executeCutover(mutation, args, targets, {
      run: runner,
      fetchDeploymentId: fetchLatestDeploymentId,
    })
    console.log(JSON.stringify(report, null, 2))
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2))
    process.exitCode = 1
  }
}
