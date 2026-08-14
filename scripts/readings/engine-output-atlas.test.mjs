import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_PATHS,
  ENGINE_OUTPUT_ATLAS_SCHEMA_VERSION,
  EXPECTED_ENGINE_IDS,
  buildEngineOutputAtlas,
} from './build-engine-output-atlas.mjs'

const CLI = fileURLToPath(new URL('./build-engine-output-atlas.mjs', import.meta.url))
const MANIFEST = fileURLToPath(new URL('../../docs/engine-output-atlas.json', import.meta.url))
const VISUAL_REGISTRY = fileURLToPath(new URL('../../src/lib/readings/engineVisualRegistry.ts', import.meta.url))
const EXTERNAL_PATHS = Object.freeze({
  corpusRoot: path.resolve(process.env.URANIA_CORPUS_ROOT ?? DEFAULT_PATHS.corpusRoot),
  selemeneRoot: path.resolve(process.env.URANIA_SELEMENE_ROOT ?? DEFAULT_PATHS.selemeneRoot),
})
const corpusAvailable = existsSync(EXTERNAL_PATHS.corpusRoot)
const selemeneAvailable = existsSync(EXTERNAL_PATHS.selemeneRoot)
const externalSourcesAvailable = corpusAvailable && selemeneAvailable

if (process.env.URANIA_REQUIRE_EXTERNAL_READING_SOURCES === '1' && !externalSourcesAvailable) {
  const missing = [
    !corpusAvailable && EXTERNAL_PATHS.corpusRoot,
    !selemeneAvailable && EXTERNAL_PATHS.selemeneRoot,
  ].filter(Boolean)
  throw new Error(`required external reading sources are unavailable: ${missing.join(', ')}`)
}

const EXPECTED_WORKFLOW_MEMBERS = Object.freeze({
  'birth-blueprint': ['numerology', 'human-design', 'vimshottari', 'biofield', 'face-reading'],
  'creative-expression': [
    'sigil-forge',
    'sacred-geometry',
    'nadabrahman',
    'numerology',
    'raaga',
  ],
  'daily-practice': ['panchanga', 'vedic-clock', 'biorhythm', 'transits', 'nadabrahman'],
  'decision-support': ['tarot', 'i-ching', 'human-design', 'enneagram', 'gene-keys'],
  'full-spectrum': [
    'numerology',
    'human-design',
    'vimshottari',
    'panchanga',
    'vedic-clock',
    'biorhythm',
    'gene-keys',
    'biofield',
    'face-reading',
    'transits',
    'nadabrahman',
    'tarot',
    'i-ching',
    'enneagram',
    'sacred-geometry',
    'sigil-forge',
    'raaga',
  ],
  'self-inquiry': ['gene-keys', 'enneagram', 'face-reading', 'biofield'],
})

const ALLOWED_STATUSES = new Set(['implemented', 'partial', 'capture-gated', 'proposed'])
const ALLOWED_PROVENANCE = new Set(['observed-data', 'source-contract'])
const ALLOWED_TYPES = new Set([
  'array',
  'boolean',
  'null',
  'number',
  'object',
  'string',
  'unknown',
])

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right))
}

function collectStrings(value, found = []) {
  if (typeof value === 'string') found.push(value)
  else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, found)
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, found)
  }
  return found
}

function collectKeys(value, found = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, found)
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      found.push(key)
      collectKeys(item, found)
    }
  }
  return found
}

async function engineFiles(root) {
  const found = []
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) await walk(entryPath)
      else if (entry.isFile() && entry.name === 'engines.json') found.push(entryPath)
    }
  }
  await walk(root)
  return found
}

async function corpusPrivacyTerms(root) {
  const rawStrings = new Set()
  const subjectDirectories = new Set()
  for (const file of await engineFiles(root)) {
    const relativeSegments = path.relative(root, file).split(path.sep)
    if (relativeSegments[1]?.length >= 4) {
      subjectDirectories.add(relativeSegments[1].toLocaleLowerCase())
    }
    const payload = JSON.parse(await readFile(file, 'utf8'))
    for (const value of collectStrings(payload)) {
      if (value.length >= 8) rawStrings.add(value)
    }
  }
  return { rawStrings, subjectDirectories }
}

test('committed atlas is deterministic and matches a fresh structural build', {
  skip: externalSourcesAvailable ? false : 'requires sibling corpus and Selemene sources',
}, async () => {
  const committed = JSON.parse(await readFile(MANIFEST, 'utf8'))
  const first = await buildEngineOutputAtlas(EXTERNAL_PATHS)
  const second = await buildEngineOutputAtlas(EXTERNAL_PATHS)

  assert.deepEqual(second, first)
  assert.deepEqual(committed, first)
  assert.equal(first.schemaVersion, ENGINE_OUTPUT_ATLAS_SCHEMA_VERSION)
  assert.match(first.manifestId, /^engine-output-atlas_[a-f0-9]{64}$/)
})

test('atlas contains exactly eighteen unique engines and six current workflows', async () => {
  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'))
  const engineIds = manifest.engines.map(({ id }) => id)
  const workflowIds = manifest.workflows.map(({ id }) => id)
  const componentIds = manifest.components.map(({ id }) => id)

  assert.equal(manifest.engines.length, 18)
  assert.equal(new Set(engineIds).size, 18)
  assert.deepEqual(engineIds, EXPECTED_ENGINE_IDS)
  assert.equal(manifest.workflows.length, 6)
  assert.equal(new Set(workflowIds).size, 6)
  assert.deepEqual(workflowIds, sorted(Object.keys(EXPECTED_WORKFLOW_MEMBERS)))
  assert.equal(new Set(componentIds).size, componentIds.length)
  assert.equal(new Set([...engineIds, ...workflowIds, ...componentIds]).size, 24 + componentIds.length)

  for (const workflow of manifest.workflows) {
    assert.deepEqual(workflow.engineIds, EXPECTED_WORKFLOW_MEMBERS[workflow.id])
  }
})

test('runtime visual registry reconciles atlas states, provenance, components, and alternatives', async () => {
  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'))
  const registry = await readFile(VISUAL_REGISTRY, 'utf8')
  const lines = registry.split('\n')

  for (const engine of manifest.engines) {
    const prefix = engine.id.includes('-') ? `'${engine.id}': engine(` : `${engine.id}: engine(`
    const line = lines.find((candidate) => candidate.trimStart().startsWith(prefix))
    assert.ok(line, `runtime visual contract missing for ${engine.id}`)
    assert.ok(line.includes(`'${engine.status}'`), `${engine.id} status drifted`)
    assert.ok(line.includes(`'${engine.provenance}'`), `${engine.id} provenance drifted`)
    assert.ok(line.includes(engine.presentation.primaryComponent), `${engine.id} primary component drifted`)
    assert.ok(line.includes(engine.presentation.secondaryComponent), `${engine.id} secondary component drifted`)
    assert.ok(line.includes(engine.presentation.fallbackComponent), `${engine.id} fallback component drifted`)
    assert.ok(line.includes(engine.presentation.nonVisualEquivalent), `${engine.id} non-visual alternative drifted`)
  }

  for (const workflow of manifest.workflows) {
    const prefix = `'${workflow.id}': workflow(`
    const line = lines.find((candidate) => candidate.trimStart().startsWith(prefix))
    assert.ok(line, `runtime workflow contract missing for ${workflow.id}`)
    assert.ok(line.includes(workflow.presentation.primaryComponent), `${workflow.id} primary component drifted`)
    assert.ok(line.includes(workflow.presentation.nonVisualEquivalent), `${workflow.id} non-visual alternative drifted`)
  }
})

test('Selemene supported engines, Urania extractors, and atlas entries stay reconciled', {
  skip: selemeneAvailable ? false : 'requires sibling Selemene sources',
}, async () => {
  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'))
  const selemeneSource = await readFile(
    path.join(
      EXTERNAL_PATHS.selemeneRoot,
      'crates',
      'noesis-orchestrator',
      'src',
      'lib.rs',
    ),
    'utf8',
  )
  const supportedBlock = selemeneSource.match(
    /pub const SUPPORTED_ENGINE_IDS:\s*\[&str;\s*\d+\]\s*=\s*\[([\s\S]*?)\];/,
  )?.[1]
  assert.ok(supportedBlock, 'Selemene supported-engine contract is missing')
  const selemeneIds = [...supportedBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1])

  const uraniaSource = await readFile(
    fileURLToPath(new URL('../../src/lib/readings/elements.ts', import.meta.url)),
    'utf8',
  )
  const extractorBlock = uraniaSource.match(
    /function knownExtractor\([\s\S]*?switch \(engineId\) \{([\s\S]*?)\n\s*default:/,
  )?.[1]
  assert.ok(extractorBlock, 'Urania named-extractor contract is missing')
  const uraniaIds = [...extractorBlock.matchAll(/case '([^']+)'/g)].map((match) => match[1])

  const atlasIds = manifest.engines.map(({ id }) => id)
  // Urania ships an eighteen-engine subset of Selemene's supported set.
  // Selemene may add engines (e.g. financial-biosensor) that Urania has not
  // yet adopted, so assert every Urania engine is supported upstream rather
  // than that the two lists are byte-identical.
  assert.equal(atlasIds.length, 18)
  for (const engineId of EXPECTED_ENGINE_IDS) {
    assert.ok(selemeneIds.includes(engineId), `Selemene no longer supports ${engineId}`)
  }
  assert.deepEqual(sorted(uraniaIds), EXPECTED_ENGINE_IDS)
  assert.deepEqual(atlasIds, EXPECTED_ENGINE_IDS)
})

test('all engine and path collections have stable sorting and typed counts', async () => {
  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'))

  assert.deepEqual(
    manifest.engines.map(({ id }) => id),
    sorted(manifest.engines.map(({ id }) => id)),
  )
  assert.deepEqual(
    manifest.workflows.map(({ id }) => id),
    sorted(manifest.workflows.map(({ id }) => id)),
  )
  assert.deepEqual(
    manifest.components.map(({ id }) => id),
    sorted(manifest.components.map(({ id }) => id)),
  )

  for (const engine of manifest.engines) {
    assert.ok(ALLOWED_STATUSES.has(engine.status))
    assert.ok(ALLOWED_PROVENANCE.has(engine.provenance))
    assert.ok(engine.outputPaths.length > 0)
    assert.deepEqual(
      engine.outputPaths.map(({ path: outputPath }) => outputPath),
      sorted(engine.outputPaths.map(({ path: outputPath }) => outputPath)),
    )
    assert.equal(engine.outputSummary.pathCount, engine.outputPaths.length)

    for (const outputPath of engine.outputPaths) {
      assert.deepEqual(Object.keys(outputPath).sort(), ['count', 'path', 'types'])
      assert.match(outputPath.path, /^\$\.result|^\$\.generated_(?:audio|image)/)
      assert.ok(Number.isInteger(outputPath.count) && outputPath.count > 0)
      assert.equal(
        outputPath.count,
        Object.values(outputPath.types).reduce((sum, count) => sum + count, 0),
      )
      assert.ok(Object.keys(outputPath.types).every((type) => ALLOWED_TYPES.has(type)))
      assert.ok(
        Object.values(outputPath.types).every((count) => Number.isInteger(count) && count > 0),
      )
    }
  }
})

test('membership matrix contains every one of the 18 by 6 cells exactly once', async () => {
  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'))
  const workflowIds = manifest.workflows.map(({ id }) => id)
  const cells = new Map(
    manifest.membershipMatrix.map((cell) => [`${cell.engineId}\0${cell.workflowId}`, cell]),
  )

  assert.equal(manifest.membershipMatrix.length, 18 * 6)
  assert.equal(cells.size, 18 * 6)
  for (const engine of manifest.engines) {
    assert.deepEqual(Object.keys(engine.workflowMembership), workflowIds)
    for (const workflowId of workflowIds) {
      const cell = cells.get(`${engine.id}\0${workflowId}`)
      assert.ok(cell)
      assert.equal(cell.member, engine.workflowMembership[workflowId])
      assert.equal(
        cell.member,
        EXPECTED_WORKFLOW_MEMBERS[workflowId].includes(engine.id),
      )
    }
  }
})

test('every engine defaults to named non-JSON presentations with accessible equivalents', async () => {
  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'))
  const componentsByName = new Map(
    manifest.components.map((component) => [component.name, component]),
  )

  assert.equal(manifest.presentationPolicy.expandedRawJsonByDefault, false)
  assert.equal(
    manifest.presentationPolicy.technicalSourceAccess,
    'collapsed-privacy-filtered-provenance',
  )
  for (const engine of manifest.engines) {
    const presentation = engine.presentation
    assert.equal(presentation.expandedRawJsonByDefault, false)
    assert.doesNotMatch(presentation.defaultFormat, /json/i)
    assert.match(presentation.encodingRelationship, /\S/)
    assert.match(presentation.nonVisualEquivalent, /\S/)
    for (const key of ['primaryComponent', 'secondaryComponent', 'fallbackComponent']) {
      assert.doesNotMatch(presentation[key], /json|source.?payload/i)
      assert.ok(componentsByName.has(presentation[key]))
    }
  }

  for (const component of manifest.components) {
    assert.match(component.encodingRelationship, /\S/)
    assert.match(component.nonVisualEquivalent, /\S/)
    assert.deepEqual(component.states, ['loading', 'empty', 'partial', 'error', 'stale'])
    assert.deepEqual(component.densities, ['thread', 'reading', 'folio', 'compare', 'operator'])
  }

  for (const workflow of manifest.workflows) {
    assert.equal(workflow.presentation.status, 'proposed')
    assert.equal(workflow.presentation.runtimeComponent, 'SystemRunLedger')
    assert.ok(componentsByName.has(workflow.presentation.runtimeComponent))
  }

  const panchanga = manifest.engines.find(({ id }) => id === 'panchanga')
  assert.equal(panchanga.presentation.primaryComponent, 'PanchangaFactGrid')
  assert.equal(panchanga.presentation.secondaryComponent, 'FieldFactGrid')
  assert.doesNotMatch(
    `${panchanga.presentation.primaryComponent} ${panchanga.presentation.secondaryComponent} ${panchanga.presentation.encodingRelationship}`,
    /wheel|mandala|sector|cyclic/i,
  )

  const specialistVisualsStillPartial = new Set([
    'biorhythm',
    'gene-keys',
    'human-design',
    'i-ching',
    'raaga',
    'sacred-geometry',
    'sigil-forge',
  ])
  for (const engine of manifest.engines) {
    if (specialistVisualsStillPartial.has(engine.id)) {
      assert.equal(engine.status, 'partial')
    }
  }
})

test('manifest contains no absolute paths, subject directories, raw values, binary data, or secrets', {
  skip: corpusAvailable ? false : 'requires the sibling 723 corpus',
}, async () => {
  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'))
  const serialized = JSON.stringify(manifest)
  const { rawStrings, subjectDirectories } = await corpusPrivacyTerms(EXTERNAL_PATHS.corpusRoot)

  assert.doesNotMatch(serialized, /\/(?:Users|Volumes|home|private|tmp)\//)
  assert.doesNotMatch(serialized, /[A-Za-z]:\\/)
  assert.doesNotMatch(serialized, /-----BEGIN [A-Z ]+PRIVATE KEY-----/)
  assert.doesNotMatch(serialized, /\b(?:sk|pk)_[A-Za-z0-9_-]{20,}\b/)
  assert.doesNotMatch(serialized, /\bBearer\s+[A-Za-z0-9._~-]{20,}\b/i)
  assert.doesNotMatch(serialized, /(?:[A-Za-z0-9+/]{200,}={0,2})/)

  const manifestStrings = new Set(
    collectStrings(manifest).map((value) => value.toLocaleLowerCase()),
  )
  for (const subjectDirectory of subjectDirectories) {
    assert.equal(manifestStrings.has(subjectDirectory), false)
  }

  const allowedCorpusContractStrings = new Set([
    ...EXPECTED_ENGINE_IDS,
    ...Object.keys(EXPECTED_WORKFLOW_MEMBERS),
    ...manifest.components.map(({ family }) => family),
  ])
  for (const value of collectStrings(manifest)) {
    if (allowedCorpusContractStrings.has(value)) continue
    assert.equal(rawStrings.has(value), false, 'Manifest includes a raw corpus string')
  }

  const forbiddenDataKeys = /^(?:value|values|example|examples|sample|samples|binary|token|secret)$/
  assert.equal(collectKeys(manifest).some((key) => forbiddenDataKeys.test(key)), false)
  assert.deepEqual(manifest.privacy, {
    corpusDisclosure: 'paths-types-counts-only',
    rawValuesIncluded: false,
    absolutePathsIncluded: false,
    subjectDirectoryNamesIncluded: false,
    binaryDataIncluded: false,
    credentialsIncluded: false,
  })
})

test('CLI accepts explicit corpus, Selemene, and output flags', {
  skip: externalSourcesAvailable ? false : 'requires sibling corpus and Selemene sources',
}, async (t) => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), 'engine-output-atlas-'))
  t.after(() => rm(tempRoot, { recursive: true, force: true }))
  const output = path.join(tempRoot, 'atlas.json')

  const result = spawnSync(
    process.execPath,
    [
      CLI,
      '--corpus',
      EXTERNAL_PATHS.corpusRoot,
      '--selemene',
      EXTERNAL_PATHS.selemeneRoot,
      '--output',
      output,
    ],
    { encoding: 'utf8' },
  )

  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stderr, '')
  const manifest = JSON.parse(await readFile(output, 'utf8'))
  assert.equal(manifest.engines.length, 18)
  assert.equal(manifest.workflows.length, 6)
})
