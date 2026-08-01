import assert from 'node:assert/strict'
import test from 'node:test'
import { createAttestation, validateAttestation } from './release-attestation.mjs'

const sha = 'a'.repeat(40)
const checksum = 'b'.repeat(64)

function manifest() {
  return {
    deployments: [
      { surface: 'app', id: 'app-deploy', sourceSha: sha },
      { surface: 'landing', id: 'landing-deploy', sourceSha: sha },
    ],
    artifacts: [
      { name: 'app', sha256: checksum },
      { name: 'landing', sha256: 'c'.repeat(64) },
    ],
    backupReceiptSha256: 'd'.repeat(64),
    previewProofs: [{ name: 'consent-e2e', subjectSha: sha, sha256: 'e'.repeat(64) }],
    probes: { ok: true, requestId: 'probe-123' },
    governanceSnapshotSha256: 'f'.repeat(64),
  }
}

test('creates an attestation bound to one exact release SHA', () => {
  const attestation = createAttestation({
    sha,
    version: '0.7.0',
    manifest: manifest(),
    now: () => '2026-08-01T00:00:00.000Z',
  })
  assert.deepEqual(validateAttestation(attestation, sha), [])
  assert.equal(attestation.subject.tag, 'v0.7.0')
})

test('rejects deployment, proof, and expected-SHA drift', () => {
  const attestation = createAttestation({ sha, version: '0.7.0', manifest: manifest() })
  attestation.deployments[0].sourceSha = '9'.repeat(40)
  attestation.previewProofs[0].subjectSha = '8'.repeat(40)
  const issues = validateAttestation(attestation, '7'.repeat(40))
  assert.ok(issues.includes('subject-sha-mismatch'))
  assert.ok(issues.includes('deployment-sha-mismatch'))
  assert.ok(issues.includes('preview-proof-invalid'))
})

test('rejects incomplete or failed operational evidence', () => {
  const invalid = {
    schema: 'urania.production-attestation.v1',
    subject: { sha, version: '0.7.0', tag: 'v0.7.0' },
    generatedAt: '2026-08-01T00:00:00.000Z',
    deployments: [],
    artifacts: [],
    previewProofs: [],
    probes: { ok: false },
  }
  const issues = validateAttestation(invalid, sha)
  assert.ok(issues.includes('deployments-incomplete'))
  assert.ok(issues.includes('production-probes-not-passing'))
  assert.ok(issues.includes('governance-snapshot-checksum-invalid'))
})
