import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildPreviewProofs,
  READINESS_ARTIFACTS,
  validateReadinessBackupReceipt,
  validateReadinessBundle,
  validateReadinessGovernance,
  validateReadinessManifest,
  validateReadinessTargets,
} from './readiness.mjs'

const SHA = 'a'.repeat(40)
const SHA256 = 'b'.repeat(64)

function targets() {
  return {
    accountId: 'c'.repeat(32),
    productionD1Id: 'd57550ea-c8d3-48fc-a2ee-c6b3fc41948e',
    previewD1Id: '6b90d773-0233-4dcf-b548-2feb61365c77',
    protectedPagesProjectName: 'urania-137',
    publicPagesProjectName: 'urania-137-landing',
    protectedHostname: 'urania.tryambakam.space',
    publicHostname: 'urania-landing.tryambakam.space',
    accessAud: SHA256,
  }
}

function backupReceipt() {
  return {
    schema: 'urania.d1-backup-receipt.v1',
    gitSha: SHA,
    databaseId: 'd57550ea-c8d3-48fc-a2ee-c6b3fc41948e',
    sha256: SHA256,
    restoreVerified: true,
  }
}

function manifest() {
  return { subjectSha: SHA, entries: [{ subjectLocationHash: SHA256 }] }
}

function governance() {
  return { branchProtection: true, reviewer: 'independent-reviewer', capturedAt: '2026-08-14T00:00:00.000Z' }
}

test('README: READINESS_ARTIFACTS is exactly the five release.yml downloads', () => {
  assert.deepEqual(READINESS_ARTIFACTS, [
    'backup-receipt.json',
    'preview-proofs.json',
    'production-targets.json',
    'location-remediation-manifest.json',
    'governance-snapshot.json',
  ])
})

test('buildPreviewProofs binds subjectSha and ok to the exact release', () => {
  const proofs = buildPreviewProofs({ sha: SHA, version: '0.7.0', ok: true })
  assert.equal(proofs.subjectSha, SHA)
  assert.equal(proofs.ok, true)
  assert.equal(proofs.version, '0.7.0')
  assert.throws(() => buildPreviewProofs({ sha: 'nope', version: '0.7.0', ok: true }), /40-hex/)
})

test('validateReadinessBundle passes only on a fully-bound bundle', () => {
  const good = validateReadinessBundle({
    sha: SHA,
    targets: targets(),
    backupReceipt: backupReceipt(),
    manifest: manifest(),
    governance: governance(),
    previewProofs: buildPreviewProofs({ sha: SHA, version: '0.7.0', ok: true }),
  })
  assert.deepEqual(good.issues, [])
  assert.equal(good.ok, true)
})

test('validateReadinessBundle fails closed on SHA drift and bad receipts', () => {
  const result = validateReadinessBundle({
    sha: SHA,
    targets: targets(),
    backupReceipt: { ...backupReceipt(), gitSha: '9'.repeat(40) },
    manifest: { ...manifest(), subjectSha: '8'.repeat(40) },
    governance: governance(),
    previewProofs: buildPreviewProofs({ sha: SHA, version: '0.7.0', ok: false }),
  })
  assert.equal(result.ok, false)
  assert.ok(result.issues.some((i) => i.includes('preview-proofs not ok')))
  assert.ok(result.issues.some((i) => i.includes('backup-receipt invalid')))
  assert.ok(result.issues.some((i) => i.includes('subjectSha')))
})

test('validateReadinessBundle skips live artifacts only with requireLive=false', () => {
  const dry = validateReadinessBundle({
    sha: SHA,
    previewProofs: buildPreviewProofs({ sha: SHA, version: '0.7.0', ok: true }),
    requireLive: false,
  })
  assert.equal(dry.ok, true)
  assert.deepEqual(dry.issues, [])
})

test('validateReadinessTargets / manifest / governance / receipt enforce shapes', () => {
  assert.deepEqual(validateReadinessTargets(targets()), [])
  assert.ok(validateReadinessTargets({ ...targets(), productionD1Id: 'bad' }).some((i) => i.includes('productionD1Id')))
  assert.ok(validateReadinessTargets({ ...targets(), previewD1Id: targets().productionD1Id }).some((i) => i.includes('differ')))

  assert.deepEqual(validateReadinessManifest(manifest(), SHA), [])
  assert.ok(validateReadinessManifest({ subjectSha: SHA, entries: [{ subjectLocationHash: 'bad' }] }, SHA).some((i) => i.includes('subjectLocationHash')))

  assert.deepEqual(validateReadinessGovernance(governance()), [])
  assert.deepEqual(validateReadinessGovernance({}), ['governance snapshot must not be empty'])
  assert.deepEqual(validateReadinessGovernance(null), ['governance snapshot must be an object'])

  assert.equal(validateReadinessBackupReceipt(backupReceipt(), SHA), true)
  assert.equal(validateReadinessBackupReceipt({ ...backupReceipt(), restoreVerified: false }, SHA), false)
  assert.equal(validateReadinessBackupReceipt({ ...backupReceipt(), databaseId: 'not-a-uuid' }, SHA), false)
})
