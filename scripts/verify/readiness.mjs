#!/usr/bin/env node
/**
 * R-6 — Readiness artifact assembly + validation (fail-closed).
 *
 * The readiness workflow (`readiness.yml`) proves a release-candidate SHA in
 * preview and then bundles the EXACT evidence release.yml downloads. This
 * script is the assembler/validator: it takes each raw input produced by the
 * workflow (secrets, `backup.mjs`, `gh api`) and
 *   1. validates that every artifact is well-formed and bound to the one SHA,
 *   2. assembles `preview-proofs.json` from the preview verification result,
 *   3. writes the five normalized artifacts into the bundle directory,
 *   4. fails closed (exit 1) if any artifact is missing or does not bind.
 *
 * The five artifacts (must match release.yml's download list exactly):
 *   backup-receipt.json
 *   preview-proofs.json
 *   production-targets.json
 *   location-remediation-manifest.json
 *   governance-snapshot.json
 *
 * Invocation (inside readiness.yml):
 *   node scripts/verify/readiness.mjs \
 *     --sha "$RELEASE_SHA" \
 *     --version "$RELEASE_VERSION" \
 *     --targets .readiness/production-targets.json \
 *     --backup-receipt .readiness/fresh-backup-receipt.json \
 *     --manifest .readiness/location-remediation-manifest.json \
 *     --governance .readiness/governance-snapshot.json \
 *     --preview-proofs-ok true \
 *     --out .release-input
 *
 * Local dry-run / test (no secrets):
 *   node scripts/verify/readiness.mjs --sha "$(git rev-parse HEAD)" \
 *     --preview-proofs-ok true --out /tmp/urania-readiness \
 *     --skip-live
 *   (--skip-live omits targets/backup/manifest/governance so the pure
 *    preview-proofs + validation path is exercisable without secrets.)
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const SHA_RE = /^[a-f0-9]{40}$/
const SEMVER_RE = /^\d+\.\d+\.\d+$/
const SHA256_RE = /^[a-f0-9]{64}$/
const D1_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function sha256Of(value) {
  return createHash('sha256').update(String(value)).digest('hex')
}

/** The five artifacts release.yml downloads — order-independent here. */
export const READINESS_ARTIFACTS = [
  'backup-receipt.json',
  'preview-proofs.json',
  'production-targets.json',
  'location-remediation-manifest.json',
  'governance-snapshot.json',
]

/** Assemble the preview-proofs artifact bound to one exact SHA. */
export function buildPreviewProofs({ sha, version, ok, checks = {}, now = () => new Date().toISOString() }) {
  if (!SHA_RE.test(sha ?? '')) throw new Error(`preview-proofs requires a 40-hex sha (got ${sha})`)
  if (!SEMVER_RE.test(version ?? '')) throw new Error(`preview-proofs requires a semver version (got ${version})`)
  return {
    schema: 'urania.preview-proofs.v1',
    subjectSha: sha,
    version,
    ok: ok === true,
    checks,
    generatedAt: now(),
  }
}

/** Validate a backup receipt against the frozen release shape + expected SHA. */
export function validateReadinessBackupReceipt(receipt, sha) {
  return Boolean(
    receipt &&
      typeof receipt === 'object' &&
      receipt.gitSha === sha &&
      receipt.restoreVerified === true &&
      typeof receipt.databaseId === 'string' &&
      D1_ID_RE.test(receipt.databaseId) &&
      SHA256_RE.test(receipt.sha256 ?? ''),
  )
}

/** Validate the location-remediation manifest shape and SHA binding. */
export function validateReadinessManifest(manifest, sha) {
  const issues = []
  if (!SHA_RE.test(manifest?.subjectSha ?? '')) issues.push('subjectSha must be a 40-hex git sha')
  else if (manifest.subjectSha !== sha) issues.push(`manifest subjectSha ${manifest.subjectSha} != ${sha}`)
  if (!Array.isArray(manifest?.entries)) issues.push('entries must be an array')
  else {
    for (const [index, entry] of manifest.entries.entries()) {
      if (!SHA256_RE.test(entry?.subjectLocationHash ?? '')) issues.push(`entries[${index}].subjectLocationHash must be sha256`)
    }
  }
  return issues
}

/** Validate the production-targets top-level shape (mirrors validate-targets.mjs). */
export function validateReadinessTargets(targets) {
  const issues = []
  if (!/^[a-f0-9]{32}$/.test(targets?.accountId ?? '')) issues.push('accountId must be 32-hex')
  if (!D1_ID_RE.test(targets?.productionD1Id ?? '')) issues.push('productionD1Id must be a UUID')
  if (!D1_ID_RE.test(targets?.previewD1Id ?? '')) issues.push('previewD1Id must be a UUID')
  if (targets?.productionD1Id && targets?.productionD1Id === targets?.previewD1Id) issues.push('productionD1Id must differ from previewD1Id')
  for (const key of ['protectedPagesProjectName', 'publicPagesProjectName', 'protectedHostname', 'publicHostname', 'accessAud']) {
    if (!targets?.[key]) issues.push(`${key} is required`)
  }
  if (targets?.protectedHostname && targets?.protectedHostname === targets?.publicHostname) issues.push('protected/public hostnames must differ')
  return issues
}

/** Validate the governance snapshot is a non-empty object (read-only capture). */
export function validateReadinessGovernance(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return ['governance snapshot must be an object']
  if (Object.keys(snapshot).length === 0) return ['governance snapshot must not be empty']
  return []
}

/**
 * Validate every readiness artifact against the exact SHA. Returns
 * `{ ok, issues }`. Fails closed on any missing file or any non-binding value.
 */
export function validateReadinessBundle({ sha, targets = null, backupReceipt = null, manifest = null, governance = null, previewProofs = null, requireLive = true }) {
  const issues = []
  if (!SHA_RE.test(sha ?? '')) return { ok: false, issues: [`invalid sha (got ${sha})`] }

  if (previewProofs == null) issues.push('preview-proofs missing')
  else if (previewProofs.subjectSha !== sha) issues.push(`preview-proofs subjectSha ${previewProofs.subjectSha} != ${sha}`)
  else if (previewProofs.ok !== true) issues.push('preview-proofs not ok')

  if (requireLive) {
    for (const issue of validateReadinessTargets(targets)) issues.push(`targets: ${issue}`)
    if (!validateReadinessBackupReceipt(backupReceipt, sha)) issues.push('backup-receipt invalid (must be same-SHA, restoreVerified, UUID + sha256)')
    for (const issue of validateReadinessManifest(manifest, sha)) issues.push(`manifest: ${issue}`)
    for (const issue of validateReadinessGovernance(governance)) issues.push(`governance: ${issue}`)
  }

  return { ok: issues.length === 0, issues: [...new Set(issues)] }
}

function readJson(path) {
  if (!path || !existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function writeJson(outDir, name, value) {
  mkdirSync(outDir, { recursive: true })
  writeFileSync(resolve(outDir, name), `${JSON.stringify(value, null, 2)}\n`)
}

function parseArgs(argv) {
  const args = {
    sha: null,
    version: null,
    targets: null,
    backupReceipt: null,
    manifest: null,
    governance: null,
    previewProofsOk: false,
    out: '.release-input',
    skipLive: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--sha') args.sha = argv[++index]
    else if (arg === '--version') args.version = argv[++index]
    else if (arg === '--targets') args.targets = argv[++index]
    else if (arg === '--backup-receipt') args.backupReceipt = argv[++index]
    else if (arg === '--manifest') args.manifest = argv[++index]
    else if (arg === '--governance') args.governance = argv[++index]
    else if (arg === '--preview-proofs-ok') args.previewProofsOk = argv[++index] === 'true'
    else if (arg === '--out') args.out = argv[++index]
    else if (arg === '--skip-live') args.skipLive = true
    else throw new Error(`unknown argument: ${arg}`)
  }
  return args
}

function readPackageVersion() {
  try {
    return JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version
  } catch {
    return null
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!SHA_RE.test(args.sha ?? '')) throw new Error('--sha is required (40-hex)')
  const version = args.version ?? readPackageVersion()
  if (!SEMVER_RE.test(version ?? '')) throw new Error('--version is required (or package.json version)')

  const requireLive = !args.skipLive
  const targets = args.targets ? readJson(args.targets) : null
  const backupReceipt = args.backupReceipt ? readJson(args.backupReceipt) : null
  const manifest = args.manifest ? readJson(args.manifest) : null
  const governance = args.governance ? readJson(args.governance) : null

  const previewProofs = buildPreviewProofs({
    sha: args.sha,
    version,
    ok: args.previewProofsOk,
    checks: {
      verifyCi: args.previewProofsOk,
      note: 'readiness workflow preview verification of the exact release SHA',
    },
  })

  const result = validateReadinessBundle({
    sha: args.sha,
    targets,
    backupReceipt,
    manifest,
    governance,
    previewProofs,
    requireLive,
  })

  // Always write the artifacts we have; fail on missing/invalid afterwards.
  if (previewProofs) writeJson(args.out, 'preview-proofs.json', previewProofs)
  if (targets) writeJson(args.out, 'production-targets.json', targets)
  if (backupReceipt) writeJson(args.out, 'backup-receipt.json', backupReceipt)
  if (manifest) writeJson(args.out, 'location-remediation-manifest.json', manifest)
  if (governance) writeJson(args.out, 'governance-snapshot.json', governance)

  const summary = {
    ok: result.ok,
    sha: args.sha,
    version,
    requireLive,
    artifactsWritten: READINESS_ARTIFACTS.filter((name) => existsSync(resolve(args.out, name))),
    issues: result.issues,
  }
  console.log(JSON.stringify(summary, null, 2))
  if (!result.ok) process.exitCode = 1
}

const invokedAs = process.argv[1] ? pathToFileURL(process.argv[1]).href : ''
if (import.meta.url === invokedAs) {
  try {
    main()
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2))
    process.exitCode = 1
  }
}
