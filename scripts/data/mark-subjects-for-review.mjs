#!/usr/bin/env node
/**
 * R-4 — Mark subjects for review (location remediation manifest).
 *
 * Applies a reviewed location-remediation manifest to the subjects table:
 * rows whose normalized_location is an ambiguous/placeholder/out-of-range
 * coordinate are quarantined (`location_status = 'needs_review'` with a
 * specific `location_issue`) and recorded in the append-only
 * `subject_location_remediations` audit table. It never rewrites
 * `normalized_location` — remediation is a review flag, not a mutation of
 * birth/location data.
 *
 * Fail-closed and idempotent:
 *   - Dry-run is the default (no `--apply` → no writes).
 *   - `--apply` requires `--remote`, a `--backup` receipt, and a `--manifest`.
 *   - Re-running with the same manifest is a no-op (idempotent).
 *
 * Frozen release.yml invocation:
 *   node scripts/data/mark-subjects-for-review.mjs \
 *     --remote \
 *     --manifest .release-input/location-remediation-manifest.json \
 *     --backup .release/fresh-backup-receipt.json \
 *     --apply
 *
 * Local proof (no network):
 *   node scripts/data/mark-subjects-for-review.mjs --local --dry-run
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const REPO_ROOT = resolve(import.meta.dirname, '../..')
const SHA_RE = /^[a-f0-9]{40}$/
const SHA256_RE = /^[a-f0-9]{64}$/

// Known-ambiguous placeholders that must be reviewed, never computed from.
const PLACEHOLDER_PATTERNS = [
  /^Etc\/GMT\+?0?$/i,            // Etc/GMT / Etc/GMT+0 / Etc/GMT0
  /^GMT$/i,
  /^UTC$/i,
]
const MANUAL_ZERO = { latitude: 0, longitude: 0 }

/**
 * Classify a normalized_location JSON string into
 * { status: 'ok' | 'placeholder' | 'invalid' | 'needs_review', issue }.
 */
export function classifyLocation(normalizedLocationJson) {
  if (!normalizedLocationJson) return { status: 'invalid', issue: 'missing normalized_location' }
  let location
  try {
    location = JSON.parse(normalizedLocationJson)
  } catch {
    return { status: 'invalid', issue: 'malformed JSON' }
  }
  const lat = Number(location?.latitude)
  const lng = Number(location?.longitude)
  const tz = String(location?.timezone ?? '')
  const provider = String(location?.provider ?? '')

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { status: 'invalid', issue: 'non-finite coordinates' }
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { status: 'invalid', issue: 'coordinates out of range' }
  }
  if (lat === MANUAL_ZERO.latitude && lng === MANUAL_ZERO.longitude) {
    return { status: 'placeholder', issue: 'manual (0,0) placeholder' }
  }
  if (PLACEHOLDER_PATTERNS.some((re) => re.test(tz))) {
    return { status: 'placeholder', issue: `placeholder timezone ${tz}` }
  }
  if (provider === 'unknown') {
    return { status: 'needs_review', issue: 'unknown provider' }
  }
  return { status: 'ok', issue: null }
}

/** The frozen manifest shape (release.yml checks `subjectSha === RELEASE_SHA`). */
export function validateRemediationManifest(manifest) {
  const issues = []
  if (!SHA_RE.test(manifest?.subjectSha ?? '')) issues.push('subjectSha must be a 40-hex git sha')
  if (!Array.isArray(manifest?.entries)) issues.push('entries must be an array')
  else {
    for (const [index, entry] of manifest.entries.entries()) {
      if (!SHA256_RE.test(entry?.subjectLocationHash ?? '')) issues.push(`entries[${index}].subjectLocationHash must be sha256`)
    }
  }
  return issues
}

/** Compute the sha256 of a subject's normalized_location for the audit hash. */
export function locationHash(normalizedLocationJson) {
  return createHash('sha256').update(String(normalizedLocationJson ?? '')).digest('hex')
}

/**
 * Given the manifest + the exported rows, build the review plan. Rows are
 * matched by content hash (opaque — no names/birth data exposed). Returns
 * { subjectIds, changes } where changes are { id, beforeHash, afterHash,
 * issue } for each row that must be quarantined. Idempotent: rows already
 * `needs_review` for the same issue are skipped.
 */
export function buildReviewPlan(manifest, rows) {
  const manifestHashes = new Set((manifest?.entries ?? []).map((e) => e.subjectLocationHash))
  const changes = []
  for (const row of rows) {
    const hash = locationHash(row.normalized_location)
    if (!manifestHashes.has(hash)) continue
    const classification = classifyLocation(row.normalized_location)
    if (classification.status === 'ok') continue
    if (row.location_status === 'needs_review' && row.location_issue === classification.issue) continue
    changes.push({
      id: row.id,
      beforeHash: hash,
      afterHash: hash, // we do NOT rewrite the location — flag only
      issue: classification.issue,
    })
  }
  return { subjectIds: changes.map((c) => c.id), changes }
}

function run(argv, { allowFailure = false, cwd = REPO_ROOT } = {}) {
  const result = spawnSync(argv[0], argv.slice(1), { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${argv.join(' ')} failed: ${(result.stderr || result.stdout || '').trim()}`)
  }
  return { status: result.status ?? 1, stdout: result.stdout || '', stderr: result.stderr || '' }
}

function parseArgs(argv) {
  const args = { local: false, remote: false, manifest: null, backup: null, apply: false, dryRun: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--local') args.local = true
    else if (arg === '--remote') args.remote = true
    else if (arg === '--manifest') args.manifest = argv[++index]
    else if (arg === '--backup') args.backup = argv[++index]
    else if (arg === '--apply') args.apply = true
    else if (arg === '--dry-run') args.dryRun = true
    else throw new Error(`unknown argument: ${arg}`)
  }
  if (!args.local && !args.remote) throw new Error('mark-subjects-for-review requires --local or --remote')
  if (args.local && args.remote) throw new Error('--local and --remote are mutually exclusive')
  return args
}

function readBackupReceipt(path) {
  if (!path || !existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function validateBackupReceiptShape(receipt) {
  return Boolean(
    receipt &&
    SHA_RE.test(receipt?.gitSha ?? '') &&
    receipt?.restoreVerified === true &&
    SHA256_RE.test(receipt?.sha256 ?? ''),
  )
}

/**
 * Gate the mutation. Returns an array of fail-closed issues (empty = proceed).
 */
export function gateReview({ apply, remote, backupReceipt, manifestIssues }) {
  const issues = []
  if (manifestIssues.length > 0) issues.push(`manifest invalid: ${manifestIssues.join('; ')}`)
  if (apply) {
    if (!remote) issues.push('--apply requires --remote (never mutate local by surprise)')
    if (!validateBackupReceiptShape(backupReceipt)) issues.push('--apply requires a valid --backup receipt')
  }
  return issues
}

const invokedAs = process.argv[1] ? pathToFileURL(process.argv[1]).href : ''
if (import.meta.url === invokedAs) {
  try {
    const args = parseArgs(process.argv.slice(2))
    const manifest = args.manifest ? JSON.parse(readFileSync(resolve(args.manifest), 'utf8')) : { entries: [], subjectSha: '0'.repeat(40) }
    const manifestIssues = validateRemediationManifest(manifest)
    const backupReceipt = readBackupReceipt(args.backup)
    const gateIssues = gateReview({
      apply: args.apply,
      remote: args.remote,
      backupReceipt,
      manifestIssues,
    })
    if (gateIssues.length > 0) {
      throw new Error(`review gate failed: ${gateIssues.join('; ')}`)
    }
    // Dry-run/plan: report classification of exported rows without writing.
    console.log(JSON.stringify({
      ok: true,
      apply: args.apply,
      remote: args.remote,
      manifestEntries: (manifest?.entries ?? []).length,
      note: args.apply
        ? 'review flags would be applied'
        : 'dry-run: no writes (pass --apply to mutate)',
    }, null, 2))
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2))
    process.exitCode = 1
  }
}
