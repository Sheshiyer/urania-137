import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildReviewPlan,
  classifyLocation,
  gateReview,
  locationHash,
  validateRemediationManifest,
} from './mark-subjects-for-review.mjs'

const SHA = 'a'.repeat(40)

test('classifyLocation separates ok / placeholder / invalid / needs_review', () => {
  assert.deepEqual(classifyLocation(null), { status: 'invalid', issue: 'missing normalized_location' })
  assert.equal(classifyLocation('{not json').status, 'invalid')
  assert.equal(classifyLocation(JSON.stringify({ latitude: 0, longitude: 0, timezone: 'Asia/Kolkata', provider: 'geocoder' })).status, 'placeholder')
  assert.equal(classifyLocation(JSON.stringify({ latitude: 19.076, longitude: 72.8777, timezone: 'Etc/GMT', provider: 'geocoder' })).status, 'placeholder')
  assert.equal(classifyLocation(JSON.stringify({ latitude: 91, longitude: 0, timezone: 'X', provider: 'geocoder' })).status, 'invalid')
  assert.equal(classifyLocation(JSON.stringify({ latitude: 19.076, longitude: 72.8777, timezone: 'Asia/Kolkata', provider: 'unknown' })).status, 'needs_review')
  assert.equal(classifyLocation(JSON.stringify({ latitude: 19.076, longitude: 72.8777, timezone: 'Asia/Kolkata', provider: 'geocoder' })).status, 'ok')
})

test('validateRemediationManifest enforces the frozen shape', () => {
  assert.deepEqual(validateRemediationManifest({ subjectSha: SHA, entries: [{ subjectLocationHash: 'b'.repeat(64) }] }), [])
  const issues = validateRemediationManifest({})
  assert.ok(issues.some((i) => i.includes('subjectSha')))
  assert.ok(issues.some((i) => i.includes('entries')))
})

test('buildReviewPlan is idempotent and content-hash matched', () => {
  const rows = [
    { id: '1', normalized_location: JSON.stringify({ latitude: 0, longitude: 0, timezone: 'Asia/Kolkata', provider: 'geocoder' }), location_status: 'unchecked', location_issue: null },
    { id: '2', normalized_location: JSON.stringify({ latitude: 19.076, longitude: 72.8777, timezone: 'Asia/Kolkata', provider: 'geocoder' }), location_status: 'unchecked', location_issue: null },
  ]
  const manifest = { subjectSha: SHA, entries: [{ subjectLocationHash: locationHash(rows[0].normalized_location) }] }
  const plan = buildReviewPlan(manifest, rows)
  assert.deepEqual(plan.subjectIds, ['1'])
  assert.equal(plan.changes.length, 1)
  assert.equal(plan.changes[0].issue, 'manual (0,0) placeholder')

  // Idempotent: already flagged rows are skipped.
  const already = [{ ...rows[0], location_status: 'needs_review', location_issue: 'manual (0,0) placeholder' }]
  assert.deepEqual(buildReviewPlan(manifest, already).changes, [])
})

test('gateReview fails closed on apply without remote or backup', () => {
  const ok = gateReview({ apply: false, remote: false, backupReceipt: null, manifestIssues: [] })
  assert.deepEqual(ok, [])
  const noRemote = gateReview({ apply: true, remote: false, backupReceipt: { gitSha: SHA, restoreVerified: true, sha256: 'b'.repeat(64) }, manifestIssues: [] })
  assert.ok(noRemote.some((e) => e.includes('--remote')))
  const noBackup = gateReview({ apply: true, remote: true, backupReceipt: null, manifestIssues: [] })
  assert.ok(noBackup.some((e) => e.includes('backup')))
  const badManifest = gateReview({ apply: false, remote: false, backupReceipt: null, manifestIssues: ['subjectSha must be a 40-hex git sha'] })
  assert.ok(badManifest.some((e) => e.includes('manifest invalid')))
})

test('locationHash is stable and opaque', () => {
  const a = locationHash(JSON.stringify({ latitude: 0, longitude: 0 }))
  const b = locationHash(JSON.stringify({ latitude: 0, longitude: 0 }))
  assert.equal(a, b)
  assert.match(a, /^[a-f0-9]{64}$/)
})
