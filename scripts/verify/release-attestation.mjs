#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const SHA_RE = /^[a-f0-9]{40}$/
const SEMVER_RE = /^\d+\.\d+\.\d+$/
const SHA256_RE = /^[a-f0-9]{64}$/

export function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

export function validateAttestation(attestation, expectedSha = null) {
  const issues = []
  if (!attestation || typeof attestation !== 'object') return ['attestation-must-be-an-object']
  if (attestation.schema !== 'urania.production-attestation.v1') issues.push('schema-invalid')
  const subject = attestation.subject ?? {}
  if (!SHA_RE.test(subject.sha ?? '')) issues.push('subject-sha-invalid')
  if (expectedSha && subject.sha !== expectedSha) issues.push('subject-sha-mismatch')
  if (!SEMVER_RE.test(subject.version ?? '')) issues.push('subject-version-invalid')
  if (subject.tag !== `v${subject.version}`) issues.push('subject-tag-mismatch')
  if (!Number.isFinite(Date.parse(attestation.generatedAt ?? ''))) issues.push('generated-at-invalid')
  if (!Array.isArray(attestation.deployments) || attestation.deployments.length < 2) {
    issues.push('deployments-incomplete')
  } else {
    if (attestation.deployments.some((deployment) => deployment.sourceSha !== subject.sha)) {
      issues.push('deployment-sha-mismatch')
    }
    if (attestation.deployments.some((deployment) => typeof deployment.id !== 'string' || deployment.id.length === 0)) {
      issues.push('deployment-id-missing')
    }
  }
  if (!Array.isArray(attestation.artifacts) || attestation.artifacts.length < 2) {
    issues.push('artifacts-incomplete')
  } else if (attestation.artifacts.some((artifact) => !SHA256_RE.test(artifact.sha256 ?? ''))) {
    issues.push('artifact-checksum-invalid')
  }
  if (!SHA256_RE.test(attestation.backupReceiptSha256 ?? '')) issues.push('backup-receipt-checksum-invalid')
  if (!Array.isArray(attestation.previewProofs) || attestation.previewProofs.length === 0) {
    issues.push('preview-proofs-missing')
  } else if (attestation.previewProofs.some((proof) => proof.subjectSha !== subject.sha || !SHA256_RE.test(proof.sha256 ?? ''))) {
    issues.push('preview-proof-invalid')
  }
  if (!attestation.probes || attestation.probes.ok !== true) issues.push('production-probes-not-passing')
  if (!SHA256_RE.test(attestation.governanceSnapshotSha256 ?? '')) issues.push('governance-snapshot-checksum-invalid')
  return [...new Set(issues)]
}

export function createAttestation({ sha, version, manifest, now = () => new Date().toISOString() }) {
  const attestation = {
    schema: 'urania.production-attestation.v1',
    subject: { sha, version, tag: `v${version}` },
    generatedAt: now(),
    ...manifest,
  }
  const issues = validateAttestation(attestation, sha)
  if (issues.length > 0) throw new Error(`invalid production attestation: ${issues.join(', ')}`)
  return attestation
}

function parseArgs(argv) {
  const [command, ...rest] = argv
  const args = { command, sha: null, version: null, manifest: null, output: null, file: null }
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index]
    if (arg === '--sha') args.sha = rest[++index]
    else if (arg === '--version') args.version = rest[++index]
    else if (arg === '--manifest') args.manifest = rest[++index]
    else if (arg === '--output') args.output = rest[++index]
    else if (arg === '--file') args.file = rest[++index]
    else throw new Error(`unknown argument: ${arg}`)
  }
  return args
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.command === 'create') {
    if (!args.sha || !args.version || !args.manifest || !args.output) {
      throw new Error('create requires --sha, --version, --manifest, and --output')
    }
    const manifest = JSON.parse(readFileSync(args.manifest, 'utf8'))
    const attestation = createAttestation({ sha: args.sha, version: args.version, manifest })
    writeFileSync(args.output, `${JSON.stringify(attestation, null, 2)}\n`)
    console.log(JSON.stringify({ ok: true, file: args.output, sha256: sha256File(args.output) }))
    return
  }
  if (args.command === 'verify') {
    if (!args.sha || !args.file) throw new Error('verify requires --sha and --file')
    const attestation = JSON.parse(readFileSync(args.file, 'utf8'))
    const issues = validateAttestation(attestation, args.sha)
    console.log(JSON.stringify({ ok: issues.length === 0, issues }, null, 2))
    if (issues.length > 0) process.exitCode = 1
    return
  }
  throw new Error('usage: release-attestation.mjs create|verify ...')
}

const invokedAs = process.argv[1] ? pathToFileURL(process.argv[1]).href : ''
if (import.meta.url === invokedAs) {
  try {
    main()
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }))
    process.exitCode = 1
  }
}
