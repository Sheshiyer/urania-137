import { createHash } from 'node:crypto'
import { lstat, readdir, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { mediaTypeFor, sha256File } from './corpus-manifest.mjs'

export const ARCHIVE_IMPORT_SCHEMA_VERSION = 'archive-723-v2'
export const ARCHIVE_EXPECTED_COUNTS = Object.freeze({
  solo: 51,
  synastry: 2,
})

const UNIT_TYPES = Object.freeze([
  {
    directory: 'Solos',
    readingType: 'solo',
    subjectType: 'person',
    subjectRole: 'primary',
  },
  {
    directory: 'Synastry',
    readingType: 'synastry',
    subjectType: 'person',
  },
])

const SYNSTRY_PARTICIPANT_OVERRIDES = Object.freeze({
  'synastry-matru-putra': Object.freeze({
    names: Object.freeze(['Arathi Pai', 'Rohan Kamat']),
    relationshipKind: 'parent_child',
    relationshipLabel: 'Arathi Pai × Rohan Kamat · mother and son',
    identityInference: 'verified-from-canonical-reading',
  }),
  'witnessalchemist-harshita-synastry': Object.freeze({
    names: Object.freeze(['Witnessalchemist', 'Harshita']),
    relationshipKind: 'synastry',
    relationshipLabel: 'Witnessalchemist × Harshita',
    identityInference: 'verified-from-canonical-reading',
  }),
})

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function stableJson(value) {
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

function normalizeOwnerEmail(value) {
  const email = requireText(value, 'ownerEmail').toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error('ownerEmail must be a valid email address')
  }
  return email
}

function containsPath(root, candidate) {
  const relative = path.relative(root, candidate)
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
}

async function canonicalDirectory(directory, root, field) {
  const info = await lstat(directory).catch((error) => {
    if (error?.code === 'ENOENT') return null
    throw error
  })
  if (!info?.isDirectory() || info.isSymbolicLink()) {
    throw new Error(`${field} must be a real directory`)
  }
  const canonical = await realpath(directory)
  if (!containsPath(root, canonical)) throw new Error(`${field} escapes the corpus root`)
  return canonical
}

async function canonicalFile(filePath, root, field) {
  const info = await lstat(filePath).catch((error) => {
    if (error?.code === 'ENOENT') return null
    throw error
  })
  if (!info) return null
  if (!info.isFile() || info.isSymbolicLink()) {
    throw new Error(`${field} must be a regular non-symlink file`)
  }
  const canonical = await realpath(filePath)
  if (!containsPath(root, canonical)) throw new Error(`${field} escapes the corpus root`)
  return canonical
}

function stableId(prefix, identity) {
  return `${prefix}_${sha256(identity)}`
}

export function humanizeUnitLabel(value) {
  return value
    .normalize('NFC')
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toLocaleUpperCase('en-US')}${word.slice(1)}`)
    .join(' ')
}

function synastryParticipants(unitLabel) {
  const override = SYNSTRY_PARTICIPANT_OVERRIDES[unitLabel]
  if (override) return override

  const tokens = unitLabel
    .replace(/^synastry-/, '')
    .replace(/-synastry$/, '')
    .split('-')
    .filter(Boolean)
  if (tokens.length < 2) {
    throw new Error(`Synastry/${unitLabel} does not identify two participant candidates`)
  }
  const midpoint = Math.ceil(tokens.length / 2)
  const names = [
    humanizeUnitLabel(tokens.slice(0, midpoint).join('-')),
    humanizeUnitLabel(tokens.slice(midpoint).join('-')),
  ]
  return {
    names,
    relationshipKind: 'synastry',
    relationshipLabel: `${names[0]} × ${names[1]}`,
    identityInference: 'unit-label-candidates',
  }
}

function unitSubjects(definition, unitLabel, displayLabel) {
  if (definition.readingType === 'solo') {
    return {
      subjects: [{
        subjectKey: stableId('archive_subject', `solo:${unitLabel}:primary`),
        subjectType: definition.subjectType,
        canonicalName: displayLabel,
        reconciliationState: 'candidate',
        subjectRole: definition.subjectRole,
        position: 1,
        identityInference: 'unit-label-candidate',
      }],
      relationship: null,
    }
  }

  const participants = synastryParticipants(unitLabel)
  const subjects = participants.names.map((canonicalName, index) => ({
    subjectKey: stableId(
      'archive_subject',
      `synastry:${unitLabel}:${index + 1}:${canonicalName}`,
    ),
    subjectType: definition.subjectType,
    canonicalName,
    reconciliationState: 'candidate',
    subjectRole: index === 0 ? 'primary' : 'secondary',
    position: index + 1,
    identityInference: participants.identityInference,
  }))
  return {
    subjects,
    relationship: {
      relationshipKey: stableId('archive_relationship', `synastry:${unitLabel}`),
      relationshipKind: participants.relationshipKind,
      relationshipLabel: participants.relationshipLabel,
      reconciliationState: 'candidate',
      identityInference: participants.identityInference,
    },
  }
}

async function discoverType(corpusRoot, definition) {
  const typeRoot = await canonicalDirectory(
    path.join(corpusRoot, definition.directory),
    corpusRoot,
    definition.directory,
  )
  const entries = await readdir(typeRoot, { withFileTypes: true })
  const units = []

  for (const entry of entries.sort((left, right) => compareText(left.name, right.name))) {
    if (entry.name.startsWith('.') || entry.name === '.DS_Store') continue
    if (entry.isSymbolicLink()) {
      throw new Error(`${definition.directory}/${entry.name} must not be a symlink`)
    }
    if (!entry.isDirectory()) continue

    const unitLabel = entry.name.normalize('NFC')
    const unitRoot = await canonicalDirectory(
      path.join(typeRoot, entry.name),
      corpusRoot,
      `${definition.directory}/${unitLabel}`,
    )
    const preferred = await canonicalFile(
      path.join(unitRoot, 'new-l0-local', 'reading.html'),
      corpusRoot,
      `${definition.directory}/${unitLabel}/new-l0-local/reading.html`,
    )
    const fallback = preferred
      ? null
      : await canonicalFile(
          path.join(unitRoot, 'local', 'reading.html'),
          corpusRoot,
          `${definition.directory}/${unitLabel}/local/reading.html`,
        )
    const artifactPath = preferred ?? fallback
    if (!artifactPath) {
      throw new Error(`${definition.directory}/${unitLabel} has no canonical completed reading.html`)
    }

    const artifactInfo = await stat(artifactPath)
    const corpusRelativePath = path
      .relative(corpusRoot, artifactPath)
      .split(path.sep)
      .join('/')
      .normalize('NFC')
    const unitKey = `${definition.directory}/${unitLabel}`
    const displayLabel = humanizeUnitLabel(unitLabel)
    const { subjects, relationship } = unitSubjects(definition, unitLabel, displayLabel)
    const readingId = stableId('archive_reading', unitKey)

    units.push({
      unitKey,
      unitLabel,
      readingType: definition.readingType,
      stableReadingId: readingId,
      title: displayLabel,
      subjects,
      relationship,
      source: {
        stableSourceId: stableId('archive_source', corpusRelativePath),
        sourceKind: 'file',
        locator: artifactPath,
        corpusRelativePath,
        contentSha256: await sha256File(artifactPath),
        byteSize: artifactInfo.size,
        mediaType: mediaTypeFor(artifactPath),
      },
      artifact: {
        artifactKey: 'rendered-html',
        artifactRole: 'rendered_reading',
        storageProvider: 'filesystem',
        objectLocator: artifactPath,
        contentSha256: null,
        byteSize: artifactInfo.size,
        mediaType: mediaTypeFor(artifactPath),
        selection: preferred ? 'new-l0-local' : 'local',
      },
    })
  }

  return units
}

/**
 * Inventory the bounded completed-reading corpus without reading artifact
 * bodies into memory. Only the selected HTML files are streamed for SHA-256.
 */
export async function buildArchiveInventory(options = {}) {
  const ownerEmail = normalizeOwnerEmail(options.ownerEmail)
  const requestedRoot = path.resolve(requireText(options.corpusRoot, 'corpusRoot'))
  const requestedInfo = await lstat(requestedRoot).catch((error) => {
    if (error?.code === 'ENOENT') return null
    throw error
  })
  if (!requestedInfo?.isDirectory() || requestedInfo.isSymbolicLink()) {
    throw new Error('corpusRoot must be a real directory')
  }
  const corpusRoot = await realpath(requestedRoot)
  if (
    options.expectedCorpusName !== null &&
    path.basename(corpusRoot) !== (options.expectedCorpusName ?? '723')
  ) {
    throw new Error('corpusRoot must identify the canonical 723 directory')
  }

  const units = (
    await Promise.all(UNIT_TYPES.map((definition) => discoverType(corpusRoot, definition)))
  )
    .flat()
    .sort((left, right) => compareText(left.unitKey, right.unitKey))
  for (const unit of units) unit.artifact.contentSha256 = unit.source.contentSha256

  const expectedCounts = options.expectedCounts ?? ARCHIVE_EXPECTED_COUNTS
  const counts = {
    solo: units.filter((unit) => unit.readingType === 'solo').length,
    synastry: units.filter((unit) => unit.readingType === 'synastry').length,
  }
  for (const type of Object.keys(ARCHIVE_EXPECTED_COUNTS)) {
    if (counts[type] !== expectedCounts[type]) {
      throw new Error(
        `Expected exactly ${expectedCounts[type]} ${type} units; found ${counts[type]}`,
      )
    }
  }

  const manifestBody = {
    schemaVersion: ARCHIVE_IMPORT_SCHEMA_VERSION,
    corpus: '723',
    ownerEmail,
    consentBasis: 'owner-confirmed-protected-archive-import',
    editorial: { state: 'approved', visibility: 'owner_only' },
    units: units.map((unit) => ({
      unitKey: unit.unitKey,
      unitLabel: unit.unitLabel,
      readingType: unit.readingType,
      stableReadingId: unit.stableReadingId,
      title: unit.title,
      subjects: unit.subjects,
      relationship: unit.relationship,
      source: (({ locator: _locator, ...source }) => source)(unit.source),
      artifact: (({ objectLocator: _objectLocator, ...artifact }) => artifact)(unit.artifact),
    })),
  }
  const manifestSha256 = sha256(stableJson(manifestBody))

  return {
    schemaVersion: ARCHIVE_IMPORT_SCHEMA_VERSION,
    corpusRoot,
    ownerEmail,
    ownerEmailSha256: sha256(ownerEmail),
    consentBasis: manifestBody.consentBasis,
    editorial: manifestBody.editorial,
    manifestId: `archive_manifest_${manifestSha256}`,
    manifestSha256,
    idempotencyKey: `archive-723:v2:${manifestSha256}`,
    counts: { ...counts, total: units.length },
    totals: {
      artifacts: units.length,
      bytes: units.reduce((total, unit) => total + unit.artifact.byteSize, 0),
    },
    units,
  }
}

export function serializeArchiveInventory(inventory, options = {}) {
  const summary = {
    mode: options.mode ?? 'dry-run',
    schemaVersion: inventory.schemaVersion,
    corpus: '723',
    owner: {
      emailSha256: inventory.ownerEmailSha256,
      consentBasis: inventory.consentBasis,
    },
    manifestId: inventory.manifestId,
    manifestSha256: inventory.manifestSha256,
    idempotencyKey: inventory.idempotencyKey,
    counts: inventory.counts,
    totals: inventory.totals,
    canonicalSelections: {
      preferred: inventory.units.filter((unit) => unit.artifact.selection === 'new-l0-local').length,
      fallback: inventory.units.filter((unit) => unit.artifact.selection === 'local').length,
    },
    editorial: inventory.editorial,
    storageProvider: 'filesystem',
    sql: {
      destination: options.sqlDestination ?? null,
      hint: options.sqlDestination ? undefined : 'Use --sql-out <file> to write the transaction',
    },
  }

  if (options.showPaths) {
    summary.corpusRoot = inventory.corpusRoot
    summary.artifacts = inventory.units.map((unit) => ({
      unitKey: unit.unitKey,
      objectLocator: unit.artifact.objectLocator,
    }))
  }
  return summary
}
