import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const PILOT_SCHEMA_VERSION = 1

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function requireText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} is required`)
  }
  return value.trim()
}

function assertSha256(value, field) {
  if (!/^[0-9a-f]{64}$/.test(value ?? '')) {
    throw new Error(`${field} must be a lowercase SHA-256 digest`)
  }
}

function safeRelativePath(value, field) {
  const normalized = requireText(value, field).replaceAll('\\', '/').normalize('NFC')
  if (path.posix.isAbsolute(normalized) || normalized.split('/').includes('..')) {
    throw new Error(`${field} must remain within the pilot corpus root`)
  }
  return normalized
}

export async function loadPilotDescriptor(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

export async function preparePilot(descriptor, options) {
  if (descriptor?.schemaVersion !== PILOT_SCHEMA_VERSION) {
    throw new Error(`Unsupported pilot schema version: ${descriptor?.schemaVersion}`)
  }
  const corpusRoot = path.resolve(requireText(options?.corpusRoot, 'corpusRoot'))
  const ownerEmail = requireText(descriptor.ownerEmail, 'ownerEmail').toLowerCase()
  const pilotId = requireText(descriptor.pilotId, 'pilotId')
  const subjectKey = requireText(descriptor.subject?.subjectKey, 'subject.subjectKey')
  const canonicalName = requireText(descriptor.subject?.canonicalName, 'subject.canonicalName')
  if (descriptor.subject?.reconciliationState !== 'verified') {
    throw new Error('Pilot subject must be explicitly verified')
  }
  if (descriptor.relationship || descriptor.subjects?.length > 1) {
    throw new Error('The one-reading pilot cannot include another subject or relationship')
  }
  if (descriptor.consent?.basis !== 'principal-requested-one-reading-pilot') {
    throw new Error('Pilot descriptor is missing the explicit owner-consent basis')
  }

  const relativeRoot = safeRelativePath(
    descriptor.corpusRelativeRoot,
    'corpusRelativeRoot',
  )
  const absoluteRoot = path.resolve(corpusRoot, relativeRoot)
  if (absoluteRoot !== corpusRoot && !absoluteRoot.startsWith(`${corpusRoot}${path.sep}`)) {
    throw new Error('Pilot root escapes the corpus root')
  }

  const artifacts = []
  const seenKeys = new Set()
  for (const artifact of descriptor.artifacts ?? []) {
    const artifactKey = requireText(artifact.artifactKey, 'artifacts[].artifactKey')
    if (seenKeys.has(artifactKey)) throw new Error(`Duplicate artifact key: ${artifactKey}`)
    seenKeys.add(artifactKey)
    const relativePath = safeRelativePath(artifact.relativePath, 'artifacts[].relativePath')
    assertSha256(artifact.sha256, `artifacts[${artifactKey}].sha256`)
    const absolutePath = path.resolve(absoluteRoot, relativePath)
    if (!absolutePath.startsWith(`${absoluteRoot}${path.sep}`)) {
      throw new Error(`Artifact escapes the pilot root: ${relativePath}`)
    }
    const info = await stat(absolutePath)
    if (!info.isFile()) throw new Error(`Pilot artifact is not a regular file: ${relativePath}`)
    const bytes = await readFile(absolutePath)
    const observedSha256 = sha256(bytes)
    if (info.size !== artifact.bytes || observedSha256 !== artifact.sha256) {
      throw new Error(`Frozen artifact mismatch: ${relativePath}`)
    }
    const objectKey = [
      'living-readings',
      sha256(ownerEmail).slice(0, 16),
      requireText(descriptor.reading?.stableReadingId, 'reading.stableReadingId'),
      `${artifact.sha256}-${path.posix.basename(relativePath)}`,
    ].join('/')
    artifacts.push({
      ...artifact,
      relativePath,
      absolutePath,
      objectKey,
      bytes,
    })
  }
  if (artifacts.length === 0) throw new Error('Pilot requires at least one artifact')

  const manifestBody = {
    schemaVersion: descriptor.schemaVersion,
    pilotId,
    ownerEmail,
    corpusRelativeRoot: relativeRoot,
    consent: descriptor.consent,
    subject: {
      subjectKey,
      canonicalName,
      aliases: descriptor.subject.aliases ?? [],
      reconciliationState: 'verified',
    },
    reading: descriptor.reading,
    editorial: descriptor.editorial,
    artifacts: artifacts.map(({ absolutePath: _absolutePath, bytes: _bytes, ...artifact }) => artifact),
  }
  const manifestSha256 = sha256(stableJson(manifestBody))
  return {
    ...manifestBody,
    manifestId: `pilot_manifest_${manifestSha256}`,
    manifestSha256,
    idempotencyKey: `pilot:${pilotId}:${manifestSha256}`,
    artifacts,
  }
}

/**
 * Upload first, then commit the relational graph. Any object created by this
 * attempt is removed if the archive transaction fails. Pre-existing,
 * checksum-matching objects are never deleted during compensation.
 */
export async function executePilotImport(pilot, { objectStore, archive }) {
  const existing = await archive.findByIdempotencyKey(pilot.ownerEmail, pilot.idempotencyKey)
  if (existing?.state === 'completed') {
    return { status: 'existing', archive: existing, uploaded: 0, reused: pilot.artifacts.length }
  }

  const createdKeys = []
  let reused = 0
  try {
    for (const artifact of pilot.artifacts) {
      const remote = await objectStore.head(artifact.objectKey)
      if (remote) {
        if (remote.sha256 !== artifact.sha256 || remote.bytes !== artifact.bytes.length) {
          throw new Error(`Object collision for ${artifact.objectKey}`)
        }
        reused += 1
        continue
      }
      await objectStore.put(artifact.objectKey, artifact.bytes, {
        contentType: artifact.mediaType,
        sha256: artifact.sha256,
      })
      createdKeys.push(artifact.objectKey)
    }

    const committed = await archive.commitPilot(pilot)
    return {
      status: committed.created ? 'created' : 'existing',
      archive: committed,
      uploaded: createdKeys.length,
      reused,
    }
  } catch (error) {
    const compensationErrors = []
    for (const key of createdKeys.reverse()) {
      try {
        await objectStore.delete(key)
      } catch (compensationError) {
        compensationErrors.push({ key, error: String(compensationError) })
      }
    }
    if (compensationErrors.length > 0) {
      throw new AggregateError(
        [error, ...compensationErrors.map((item) => new Error(`${item.key}: ${item.error}`))],
        'Pilot import failed and object compensation was incomplete',
      )
    }
    throw error
  }
}

/**
 * Soft-delete relational content first, remove object bytes, then finalize.
 * Import-run and source audit rows remain addressable after completion.
 */
export async function deletePilot(pilot, { objectStore, archive }) {
  const deletion = await archive.beginDeletion(pilot.ownerEmail, pilot.reading.stableReadingId)
  if (!deletion || deletion.state === 'deleted') {
    return { status: 'already-deleted', deletedObjects: 0 }
  }
  let deletedObjects = 0
  for (const objectKey of deletion.objectKeys) {
    await objectStore.delete(objectKey)
    deletedObjects += 1
  }
  await archive.finishDeletion(deletion.deletionId)
  return {
    status: 'deleted',
    deletedObjects,
    auditPreserved: true,
  }
}

export function serializePilot(pilot) {
  return {
    schemaVersion: pilot.schemaVersion,
    pilotId: pilot.pilotId,
    ownerEmail: pilot.ownerEmail,
    manifestId: pilot.manifestId,
    manifestSha256: pilot.manifestSha256,
    idempotencyKey: pilot.idempotencyKey,
    subject: pilot.subject,
    reading: pilot.reading,
    editorial: pilot.editorial,
    artifacts: pilot.artifacts.map(({ bytes, absolutePath, ...artifact }) => ({
      ...artifact,
      absolutePath,
      bytes: bytes.length,
    })),
  }
}
