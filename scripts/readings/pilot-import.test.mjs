import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  deletePilot,
  executePilotImport,
  loadPilotDescriptor,
  preparePilot,
  serializePilot,
} from './lib/pilot-import.mjs'
import { buildPilotSoftDeleteSql, buildPilotUpsertSql } from './lib/pilot-sql.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const descriptorPath = path.join(here, 'pilots/sheshnarayan-l0.json')
const corpusRoot =
  '/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/723'

async function prepared() {
  return preparePilot(await loadPilotDescriptor(descriptorPath), { corpusRoot })
}

function fixtures(options = {}) {
  const objects = new Map(options.objects ?? [])
  let record = options.record ?? null
  let deletion = null
  const objectStore = {
    async head(key) {
      return objects.get(key)?.metadata ?? null
    },
    async put(key, bytes, metadata) {
      objects.set(key, { bytes, metadata: { ...metadata, bytes: bytes.length } })
    },
    async delete(key) {
      objects.delete(key)
    },
  }
  const archive = {
    async findByIdempotencyKey(_owner, key) {
      return record?.idempotencyKey === key ? record : null
    },
    async commitPilot(pilot) {
      if (options.failCommit) throw new Error('injected database failure')
      if (record) return { ...record, created: false }
      record = {
        state: 'completed',
        created: true,
        idempotencyKey: pilot.idempotencyKey,
        stableReadingId: pilot.reading.stableReadingId,
        objectKeys: pilot.artifacts.map((artifact) => artifact.objectKey),
      }
      return record
    },
    async beginDeletion(_owner, stableReadingId) {
      if (!record || record.stableReadingId !== stableReadingId) return null
      if (record.state === 'deleted') return { state: 'deleted' }
      deletion = {
        deletionId: 'delete-1',
        objectKeys: record.objectKeys,
        importRunPreserved: true,
        sourceRowsPreserved: true,
      }
      return deletion
    },
    async finishDeletion(deletionId) {
      assert.equal(deletionId, deletion.deletionId)
      record = { ...record, state: 'deleted' }
    },
  }
  return { objects, objectStore, archive, getRecord: () => record }
}

test('freezes one verified owner-subject reading and both artifact checksums', async () => {
  const pilot = await prepared()
  assert.equal(pilot.ownerEmail, 'sheshnarayan.iyer@gmail.com')
  assert.equal(pilot.subject.reconciliationState, 'verified')
  assert.match(pilot.manifestId, /^pilot_manifest_[0-9a-f]{64}$/)
  assert.equal(pilot.artifacts.length, 2)
  for (const artifact of pilot.artifacts) {
    assert.equal((await readFile(artifact.absolutePath)).length, artifact.bytes.length)
    assert.match(artifact.objectKey, /^living-readings\//)
  }
  assert.deepEqual(
    serializePilot(pilot).artifacts.map((artifact) => artifact.bytes),
    [608, 147658],
  )
})

test('rejects a pilot descriptor containing a relationship or second subject', async () => {
  const descriptor = await loadPilotDescriptor(descriptorPath)
  descriptor.relationship = { relationshipKey: 'forbidden' }
  await assert.rejects(
    preparePilot(descriptor, { corpusRoot }),
    /cannot include another subject or relationship/,
  )
})

test('rejects a pilot descriptor without the explicit owner-consent basis', async () => {
  const descriptor = await loadPilotDescriptor(descriptorPath)
  descriptor.consent = { basis: 'unverified-import' }
  await assert.rejects(
    preparePilot(descriptor, { corpusRoot }),
    /missing the explicit owner-consent basis/,
  )
})

test('imports once and reuses the completed graph and objects on rerun', async () => {
  const pilot = await prepared()
  const fake = fixtures()
  const first = await executePilotImport(pilot, fake)
  const second = await executePilotImport(pilot, fake)
  assert.equal(first.status, 'created')
  assert.equal(first.uploaded, 2)
  assert.equal(second.status, 'existing')
  assert.equal(second.uploaded, 0)
  assert.equal(fake.objects.size, 2)
})

test('database failure compensates every object created by the attempt', async () => {
  const pilot = await prepared()
  const fake = fixtures({ failCommit: true })
  await assert.rejects(executePilotImport(pilot, fake), /injected database failure/)
  assert.equal(fake.objects.size, 0)
})

test('database failure never removes a checksum-matching pre-existing object', async () => {
  const pilot = await prepared()
  const first = pilot.artifacts[0]
  const fake = fixtures({
    failCommit: true,
    objects: [
      [
        first.objectKey,
        {
          bytes: first.bytes,
          metadata: { sha256: first.sha256, bytes: first.bytes.length },
        },
      ],
    ],
  })
  await assert.rejects(executePilotImport(pilot, fake), /injected database failure/)
  assert.equal(fake.objects.size, 1)
  assert.ok(fake.objects.has(first.objectKey))
})

test('deletion removes object bytes while preserving run and source audit boundaries', async () => {
  const pilot = await prepared()
  const fake = fixtures()
  await executePilotImport(pilot, fake)
  const result = await deletePilot(pilot, fake)
  assert.deepEqual(result, {
    status: 'deleted',
    deletedObjects: 2,
    auditPreserved: true,
  })
  assert.equal(fake.objects.size, 0)
  assert.equal(fake.getRecord().state, 'deleted')
})

test('generated SQL is idempotent, metadata-only, and preserves audit rows on deletion', async () => {
  const pilot = await prepared()
  const sql = buildPilotUpsertSql(pilot, { bucket: 'tryambakam-noesis-readings' })
  assert.match(sql, /ON CONFLICT \(owner_user_id, idempotency_key\)/)
  assert.match(sql, /ON CONFLICT \(reading_id, artifact_key\)/)
  assert.ok(sql.includes('r2://tryambakam-noesis-readings/'))
  assert.doesNotMatch(sql, /Opening — A Letter Before the Reading/)
  const deletion = buildPilotSoftDeleteSql(pilot)
  assert.match(deletion, /record_state = 'deleted'/)
  assert.doesNotMatch(deletion, /DELETE FROM reading_import_runs/)
  assert.doesNotMatch(deletion, /DELETE FROM reading_sources/)
})
