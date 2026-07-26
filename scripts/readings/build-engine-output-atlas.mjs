#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const ENGINE_OUTPUT_ATLAS_SCHEMA_VERSION = '1.0.0'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..')
export const DEFAULT_PATHS = Object.freeze({
  corpusRoot: path.resolve(REPO_ROOT, '..', '723'),
  selemeneRoot: path.resolve(REPO_ROOT, '..', 'Selemene-engine'),
  outputPath: path.join(REPO_ROOT, 'docs', 'engine-output-atlas.json'),
})

export const EXPECTED_ENGINE_IDS = Object.freeze([
  'biofield',
  'biofield-capture',
  'biorhythm',
  'enneagram',
  'face-reading',
  'gene-keys',
  'human-design',
  'i-ching',
  'nadabrahman',
  'numerology',
  'panchanga',
  'raaga',
  'sacred-geometry',
  'sigil-forge',
  'tarot',
  'transits',
  'vedic-clock',
  'vimshottari',
])

const WORKFLOW_PRESENTATIONS = Object.freeze({
  'birth-blueprint': {
    status: 'proposed',
    runtimeComponent: 'SystemRunLedger',
    primaryComponent: 'CompositeIdentityMap',
    secondaryComponent: 'ContributingEngineIndex',
    fallbackComponent: 'CompositePartialState',
    encodingRelationship: 'Engine results become labeled identity facets without cross-engine scoring.',
    nonVisualEquivalent: 'Sectioned engine summary with source-path links.',
  },
  'creative-expression': {
    status: 'proposed',
    runtimeComponent: 'SystemRunLedger',
    primaryComponent: 'CreativeArtifactShelf',
    secondaryComponent: 'ContributingEngineIndex',
    fallbackComponent: 'CompositePartialState',
    encodingRelationship: 'Generated and procedural artifacts retain media type, source order, and availability.',
    nonVisualEquivalent: 'Ordered artifact list with status and download controls.',
  },
  'daily-practice': {
    status: 'proposed',
    runtimeComponent: 'SystemRunLedger',
    primaryComponent: 'TemporalPracticeSequence',
    secondaryComponent: 'ContributingEngineIndex',
    fallbackComponent: 'CompositePartialState',
    encodingRelationship: 'Daily cycles and recommendations align on a shared labeled time sequence.',
    nonVisualEquivalent: 'Chronological table grouped by contributing engine.',
  },
  'decision-support': {
    status: 'proposed',
    runtimeComponent: 'SystemRunLedger',
    primaryComponent: 'PerspectiveComparison',
    secondaryComponent: 'ContributingEngineIndex',
    fallbackComponent: 'CompositePartialState',
    encodingRelationship: 'Independent systems occupy parallel labeled columns with no invented consensus.',
    nonVisualEquivalent: 'Side-by-side comparison table with one column per engine.',
  },
  'full-spectrum': {
    status: 'proposed',
    runtimeComponent: 'SystemRunLedger',
    primaryComponent: 'FullSpectrumConstellation',
    secondaryComponent: 'ContributingEngineIndex',
    fallbackComponent: 'CompositePartialState',
    encodingRelationship: 'All registered engine outputs become named nodes; membership does not imply rank.',
    nonVisualEquivalent: 'Grouped engine index with explicit present, missing, and error states.',
  },
  'self-inquiry': {
    status: 'proposed',
    runtimeComponent: 'SystemRunLedger',
    primaryComponent: 'InquiryLayerStack',
    secondaryComponent: 'ContributingEngineIndex',
    fallbackComponent: 'CompositePartialState',
    encodingRelationship: 'Questions and typologies remain separate ordered layers rather than conclusions.',
    nonVisualEquivalent: 'Heading-structured list preserving engine and question order.',
  },
})

const ENGINE_PRESENTATIONS = Object.freeze({
  biofield: {
    status: 'capture-gated',
    primaryComponent: 'ChakraFieldMap',
    secondaryComponent: 'BiofieldMetricBands',
    fallbackComponent: 'CaptureConsentGate',
    encodingRelationship: 'Named chakra measures map to labeled bands; capture quality remains a separate state.',
    nonVisualEquivalent: 'Chakra metric table plus explicit capture-quality notice.',
  },
  'biofield-capture': {
    status: 'capture-gated',
    primaryComponent: 'CapturedFieldReading',
    secondaryComponent: 'CaptureQualityPanel',
    fallbackComponent: 'CaptureConsentGate',
    encodingRelationship: 'Persisted analysis sections map to labeled panels after consent and ownership checks.',
    nonVisualEquivalent: 'Sectioned capture report with quality and availability fields.',
  },
  biorhythm: {
    status: 'partial',
    primaryComponent: 'BiorhythmCycleBands',
    secondaryComponent: 'ForecastSequence',
    fallbackComponent: 'UnresolvedFieldState',
    encodingRelationship: 'Cycle values map to labeled signed scales and forecast points retain date order.',
    nonVisualEquivalent: 'Cycle and forecast data tables with printed values.',
  },
  enneagram: {
    status: 'partial',
    primaryComponent: 'InquiryQuestionDeck',
    secondaryComponent: 'TypologyFactGrid',
    fallbackComponent: 'UnresolvedFieldState',
    encodingRelationship: 'Questions remain ordered prompts; available type facts remain labeled facts.',
    nonVisualEquivalent: 'Ordered question list followed by a definition list.',
  },
  'face-reading': {
    status: 'capture-gated',
    primaryComponent: 'PhysiognomyObservationMap',
    secondaryComponent: 'ElementalBalanceBands',
    fallbackComponent: 'CaptureConsentGate',
    encodingRelationship: 'Named facial zones link to observations while balance measures use printed scales.',
    nonVisualEquivalent: 'Facial-zone observation table plus elemental balance table.',
  },
  'gene-keys': {
    status: 'partial',
    primaryComponent: 'GeneKeySequence',
    secondaryComponent: 'FrequencyTriadCards',
    fallbackComponent: 'UnresolvedFieldState',
    encodingRelationship: 'Sequence membership and key positions stay ordered; shadow, gift, and siddhi remain a triad.',
    nonVisualEquivalent: 'Ordered sequence table with shadow, gift, and siddhi columns.',
  },
  'human-design': {
    status: 'partial',
    primaryComponent: 'BodygraphMap',
    secondaryComponent: 'ActivationTable',
    fallbackComponent: 'UnresolvedFieldState',
    encodingRelationship: 'Centers, channels, gates, and activations map to named placements and relationships.',
    nonVisualEquivalent: 'Center, channel, gate, and activation tables.',
  },
  'i-ching': {
    status: 'partial',
    primaryComponent: 'HexagramChangeMap',
    secondaryComponent: 'ChangingLineSequence',
    fallbackComponent: 'UnresolvedFieldState',
    encodingRelationship: 'Six source lines retain order and changing lines connect primary to relating hexagrams.',
    nonVisualEquivalent: 'Six-row line table and primary-to-relating summary.',
  },
  nadabrahman: {
    status: 'implemented',
    primaryComponent: 'RagaRecommendationList',
    secondaryComponent: 'TimeRecommendationCard',
    fallbackComponent: 'UnresolvedFieldState',
    encodingRelationship: 'Recommendations retain named membership and source scores without invented reranking.',
    nonVisualEquivalent: 'Recommendation table and time-window definition list.',
  },
  numerology: {
    status: 'implemented',
    primaryComponent: 'NumberReductionMap',
    secondaryComponent: 'NumerologyFactGrid',
    fallbackComponent: 'UnresolvedFieldState',
    encodingRelationship: 'Reduction chains become ordered number paths with master-number state printed explicitly.',
    nonVisualEquivalent: 'Number table with ordered reduction-chain text.',
  },
  panchanga: {
    status: 'implemented',
    primaryComponent: 'PanchangaFactGrid',
    secondaryComponent: 'FieldFactGrid',
    fallbackComponent: 'UnresolvedFieldState',
    encodingRelationship: 'Five named limbs remain grouped facts; scalar astronomical fields remain separately labeled facts.',
    nonVisualEquivalent: 'Five-limb definition table followed by scalar source facts.',
  },
  raaga: {
    status: 'partial',
    primaryComponent: 'RaagaPlayer',
    secondaryComponent: 'SwaraSequence',
    fallbackComponent: 'PlayableArtifactState',
    encodingRelationship: 'Ascending and descending swaras preserve source order; audio availability controls playback.',
    nonVisualEquivalent: 'Ordered swara table with audio status and download link.',
  },
  'sacred-geometry': {
    status: 'partial',
    primaryComponent: 'SacredGeometryPlate',
    secondaryComponent: 'GeometryElementIndex',
    fallbackComponent: 'UnresolvedFieldState',
    encodingRelationship: 'Declared forms and elements become labeled geometry only when a source artifact exists.',
    nonVisualEquivalent: 'Form definition list and named element list.',
  },
  'sigil-forge': {
    status: 'partial',
    primaryComponent: 'SigilConstructionPlate',
    secondaryComponent: 'ConstructionStepSequence',
    fallbackComponent: 'GeneratedArtifactState',
    encodingRelationship: 'Construction steps preserve order and generated imagery appears only when supplied.',
    nonVisualEquivalent: 'Ordered construction steps with generated-image status.',
  },
  tarot: {
    status: 'implemented',
    primaryComponent: 'TarotSpread',
    secondaryComponent: 'CardMeaningPanel',
    fallbackComponent: 'UnresolvedFieldState',
    encodingRelationship: 'Cards retain source position and labels; interpretations stay attached to their cards.',
    nonVisualEquivalent: 'Ordered spread table with position, card, orientation, and meaning.',
  },
  transits: {
    status: 'implemented',
    primaryComponent: 'TransitAspectMap',
    secondaryComponent: 'PlanetPositionTable',
    fallbackComponent: 'UnresolvedFieldState',
    encodingRelationship: 'Named planetary relationships become edges with aspect and orb printed explicitly.',
    nonVisualEquivalent: 'Aspect edge list and natal/transit position tables.',
  },
  'vedic-clock': {
    status: 'implemented',
    primaryComponent: 'FieldFactGrid',
    secondaryComponent: 'TransitionSequence',
    fallbackComponent: 'UnresolvedFieldState',
    encodingRelationship: 'The current organ and dosha remain labeled facts; supplied transitions retain chronological order.',
    nonVisualEquivalent: 'Current-period definition list and upcoming-transition table.',
  },
  vimshottari: {
    status: 'implemented',
    primaryComponent: 'DashaTimeline',
    secondaryComponent: 'PeriodDetailPanel',
    fallbackComponent: 'UnresolvedFieldState',
    encodingRelationship: 'Nested periods become ordered intervals with explicit start, end, and planetary labels.',
    nonVisualEquivalent: 'Hierarchical period table preserving source order.',
  },
})

const COMPONENT_DETAILS = Object.freeze({
  ActivationTable: ['table', 'Activation records become labeled rows and columns.', 'Accessible activation data table.'],
  BiofieldMetricBands: ['scale', 'Named measures map to labeled bands with printed source values.', 'Accessible metric table.'],
  BiorhythmCycleBands: ['scale', 'Signed cycle values map to labeled horizontal scales.', 'Accessible cycle data table.'],
  BodygraphMap: ['relationship-map', 'Centers and channels become named nodes and edges.', 'Accessible center and channel tables.'],
  CaptureConsentGate: ['state', 'Consent, device, and availability fields become explicit gate states.', 'Accessible capture requirements notice.'],
  CaptureQualityPanel: ['facts', 'Quality fields remain labeled facts without inferred judgment.', 'Accessible quality definition list.'],
  CapturedFieldReading: ['section-stack', 'Persisted analysis objects become named sections after access checks.', 'Accessible sectioned capture report.'],
  CardMeaningPanel: ['facts', 'Card meanings remain attached to their source card.', 'Accessible card definition list.'],
  ChakraFieldMap: ['placement-map', 'Named chakras become placements with printed measures.', 'Accessible chakra metric table.'],
  ChangingLineSequence: ['sequence', 'Changing lines retain source order and labels.', 'Accessible ordered line list.'],
  CompositeIdentityMap: ['composite', 'Contributing engines become labeled facets without synthetic rank.', 'Accessible sectioned engine summary.'],
  CompositePartialState: ['state', 'Missing and failed contributors remain explicit.', 'Accessible contributor status list.'],
  ConstructionStepSequence: ['sequence', 'Procedural steps retain source order.', 'Accessible ordered instructions list.'],
  ContributingEngineIndex: ['membership', 'Workflow membership becomes a named unranked list.', 'Accessible engine membership list.'],
  CreativeArtifactShelf: ['collection', 'Artifacts group by media type and availability.', 'Accessible artifact list with controls.'],
  DashaTimeline: ['timeline', 'Nested periods become bounded ordered intervals.', 'Accessible hierarchical period table.'],
  ElementalBalanceBands: ['scale', 'Element measures map to labeled scales with printed values.', 'Accessible elemental balance table.'],
  FieldFactGrid: ['facts', 'Scalar paths become labeled facts.', 'Accessible definition list.'],
  ForecastSequence: ['sequence', 'Forecast records retain source date order.', 'Accessible forecast data table.'],
  FrequencyTriadCards: ['group', 'Shadow, gift, and siddhi remain one labeled triad.', 'Accessible three-column frequency table.'],
  FullSpectrumConstellation: ['relationship-map', 'Registered contributors become named nodes without rank.', 'Accessible grouped engine index.'],
  GeneKeySequence: ['sequence', 'Gene Keys retain authored sequence and position.', 'Accessible ordered Gene Key table.'],
  GeneratedArtifactState: ['state', 'Generated media availability remains explicit.', 'Accessible generation status and artifact link.'],
  GeometryElementIndex: ['membership', 'Geometry elements remain a named unranked collection.', 'Accessible element list.'],
  HexagramChangeMap: ['relationship-map', 'Changing lines connect primary and relating hexagrams.', 'Accessible line table and relationship summary.'],
  InquiryLayerStack: ['section-stack', 'Questions and typologies remain distinct ordered layers.', 'Accessible heading-structured question list.'],
  InquiryQuestionDeck: ['questions', 'Questions remain questions in source order.', 'Accessible ordered question list.'],
  NumberReductionMap: ['sequence', 'Reduction chains become ordered number paths.', 'Accessible ordered reduction-chain table.'],
  NumerologyFactGrid: ['facts', 'Named numerology results remain labeled facts.', 'Accessible numerology definition list.'],
  OrderedCollectionList: ['membership', 'Collection members remain named and unranked.', 'Accessible named membership list.'],
  PanchangaFactGrid: ['facts', 'Limb indices, names, and values remain grouped.', 'Accessible five-limb data table.'],
  PeriodDetailPanel: ['facts', 'Selected period boundaries and labels remain source facts.', 'Accessible period definition list.'],
  PerspectiveComparison: ['comparison', 'Independent engine perspectives occupy parallel labeled columns.', 'Accessible comparison table.'],
  PhysiognomyObservationMap: ['relationship-map', 'Facial zones link to their source observations.', 'Accessible facial-zone observation table.'],
  PlanetPositionTable: ['table', 'Planet positions become rows with printed coordinates.', 'Accessible planet-position table.'],
  PlayableArtifactState: ['media', 'Audio readiness controls playback and download states.', 'Accessible audio status and download control.'],
  RaagaPlayer: ['media', 'Source ratios and audio references drive playback without reinterpretation.', 'Accessible playback controls and audio status.'],
  RagaRecommendationList: ['membership', 'Recommendations retain source membership and printed scores.', 'Accessible recommendation table.'],
  SacredGeometryPlate: ['geometry', 'A supplied source form becomes a labeled geometric plate.', 'Accessible form description and element list.'],
  SigilConstructionPlate: ['geometry', 'A supplied sigil artifact becomes the visual focus.', 'Accessible artifact status and construction description.'],
  SystemRunLedger: ['membership', 'Declared, returned, failed, capture-gated, and missing contributors remain separate named groups.', 'Accessible grouped workflow status list.'],
  SwaraSequence: ['sequence', 'Ascending and descending swaras retain source order.', 'Accessible ordered swara table.'],
  TarotSpread: ['ordered-placement', 'Cards retain source position, label, and orientation.', 'Accessible ordered spread table.'],
  TemporalPracticeSequence: ['timeline', 'Contributing temporal outputs align by labeled time.', 'Accessible chronological table by engine.'],
  TimeRecommendationCard: ['facts', 'Time-window recommendations remain labeled facts.', 'Accessible time recommendation definition list.'],
  TransitAspectMap: ['relationship-map', 'Planetary aspects become named edges with printed orbs.', 'Accessible aspect edge list.'],
  TransitionSequence: ['sequence', 'Upcoming transitions retain chronological order.', 'Accessible upcoming-transition table.'],
  TypologyFactGrid: ['facts', 'Available type fields remain labeled facts.', 'Accessible typology definition list.'],
  UnresolvedFieldState: ['state', 'Null, unknown, missing, and unsupported fields stay explicit.', 'Accessible unresolved-data notice.'],
  VedicClockDial: ['cyclic', 'Organ and dosha intervals become labeled clock sectors.', 'Accessible current-period definition list.'],
})

const SOURCE_CONTRACTS = Object.freeze({
  'biofield-capture': {
    source: 'crates/engine-biofield-capture/src/lib.rs',
    anchors: ['fn build_result', '"quality_assessment"', '"analysis"'],
    paths: {
      '$.result': ['object'],
      '$.result.analysis': ['object', 'unknown'],
      '$.result.analysis.*': ['unknown'],
      '$.result.analysis_version': ['null', 'unknown'],
      '$.result.available': ['boolean'],
      '$.result.contract_version': ['null', 'unknown'],
      '$.result.created_at': ['string'],
      '$.result.engine_id': ['string'],
      '$.result.input': ['object', 'unknown'],
      '$.result.input.*': ['unknown'],
      '$.result.quality_assessment': ['object'],
      '$.result.reading_id': ['string'],
      '$.result.session_id': ['null', 'unknown'],
    },
  },
  raaga: {
    source: 'packages/noesis-engine-sdk/src/types.ts',
    anchors: ['export interface RaagaResult', 'export interface GeneratedAudioRef'],
    paths: {
      '$.generated_audio': ['object'],
      '$.generated_audio.clip_url': ['null', 'string'],
      '$.generated_audio.metadata': ['object'],
      '$.generated_audio.metadata.*': ['unknown'],
      '$.generated_audio.root_hz': ['number'],
      '$.generated_audio.strudel_ratios': ['array'],
      '$.generated_audio.strudel_ratios[*]': ['number'],
      '$.result': ['object'],
      '$.result.alternate_ragas': ['array'],
      '$.result.alternate_ragas[*]': ['object'],
      '$.result.alternate_ragas[*].*': ['unknown'],
      '$.result.arohana_indices': ['array'],
      '$.result.arohana_indices[*]': ['number'],
      '$.result.avarohana_indices': ['array'],
      '$.result.avarohana_indices[*]': ['number'],
      '$.result.dosha_affinities': ['object'],
      '$.result.dosha_affinities.*': ['boolean'],
      '$.result.melakarta': ['object'],
      '$.result.melakarta.chakra': ['string'],
      '$.result.melakarta.ma_type': ['string'],
      '$.result.melakarta.name': ['string'],
      '$.result.melakarta.num': ['number'],
      '$.result.prahar': ['object'],
      '$.result.prahar.is_recommended_time': ['boolean'],
      '$.result.prahar.label': ['string'],
      '$.result.prahar.num': ['number'],
      '$.result.root_hz': ['number'],
      '$.result.strudel_ratios': ['array'],
      '$.result.strudel_ratios[*]': ['number'],
      '$.result.swaras': ['array'],
      '$.result.swaras[*]': ['object'],
      '$.result.swaras[*].*': ['unknown'],
      '$.result.total_melakartas': ['number'],
    },
  },
  'sigil-forge': {
    source: 'packages/noesis-engine-sdk/src/types.ts',
    anchors: ['export interface SigilForgeResult', 'export interface GeneratedImageRef'],
    paths: {
      '$.generated_image': ['object'],
      '$.generated_image.b64_json': ['string'],
      '$.generated_image.metadata': ['object'],
      '$.generated_image.metadata.*': ['string'],
      '$.generated_image.url': ['string'],
      '$.result': ['object'],
      '$.result.charging_suggestions': ['array'],
      '$.result.charging_suggestions[*]': ['object'],
      '$.result.charging_suggestions[*].description': ['string'],
      '$.result.charging_suggestions[*].name': ['string'],
      '$.result.guidance': ['object'],
      '$.result.guidance.*': ['unknown'],
      '$.result.image_prompt': ['string'],
      '$.result.intention': ['string'],
      '$.result.method': ['object'],
      '$.result.method.description': ['string'],
      '$.result.method.id': ['string'],
      '$.result.method.name': ['string'],
      '$.result.method.steps': ['array'],
      '$.result.method.steps[*]': ['string'],
      '$.result.processing': ['null', 'object'],
      '$.result.processing.letter_count': ['number'],
      '$.result.processing.original': ['string'],
      '$.result.processing.remaining_letters': ['string'],
      '$.result.processing.type': ['string'],
      '$.result.provider': ['string'],
    },
  },
})

const TYPE_ORDER = Object.freeze([
  'array',
  'boolean',
  'null',
  'number',
  'object',
  'string',
  'unknown',
])
const REQUIRED_STATES = Object.freeze(['loading', 'empty', 'partial', 'error', 'stale'])
const REQUIRED_DENSITIES = Object.freeze(['thread', 'reading', 'folio', 'compare', 'operator'])

function valueType(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value === 'object' ? 'object' : typeof value
}

function safePathSegment(key) {
  return /^[A-Za-z_][A-Za-z0-9_-]*$/.test(key) ? `.${key}` : '.*'
}

function recordPath(paths, jsonPath, type) {
  if (!TYPE_ORDER.includes(type)) return
  if (!paths.has(jsonPath)) paths.set(jsonPath, new Map())
  const typeCounts = paths.get(jsonPath)
  typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1)
}

function visitShape(value, jsonPath, paths) {
  const type = valueType(value)
  recordPath(paths, jsonPath, type)

  if (Array.isArray(value)) {
    for (const item of value) visitShape(item, `${jsonPath}[*]`, paths)
    return
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value).sort()) {
      visitShape(value[key], `${jsonPath}${safePathSegment(key)}`, paths)
    }
  }
}

function serializePaths(paths) {
  return [...paths.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([jsonPath, typeCounts]) => {
      const types = Object.fromEntries(
        [...typeCounts.entries()].sort(
          ([left], [right]) => TYPE_ORDER.indexOf(left) - TYPE_ORDER.indexOf(right),
        ),
      )
      return {
        path: jsonPath,
        types,
        count: Object.values(types).reduce((sum, count) => sum + count, 0),
      }
    })
}

function contractPaths(spec) {
  return Object.entries(spec.paths)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([jsonPath, types]) => ({
      path: jsonPath,
      types: Object.fromEntries(
        [...types]
          .sort((left, right) => TYPE_ORDER.indexOf(left) - TYPE_ORDER.indexOf(right))
          .map((type) => [type, 1]),
      ),
      count: types.length,
    }))
}

function summarizePaths(outputPaths) {
  const types = Object.fromEntries(TYPE_ORDER.map((type) => [type, 0]))
  let observations = 0
  for (const outputPath of outputPaths) {
    observations += outputPath.count
    for (const [type, count] of Object.entries(outputPath.types)) types[type] += count
  }
  return {
    pathCount: outputPaths.length,
    observationCount: observations,
    typeCounts: Object.fromEntries(Object.entries(types).filter(([, count]) => count > 0)),
  }
}

async function findEngineFiles(root) {
  const found = []

  async function walk(directory) {
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch {
      throw new Error('Unable to read the corpus root')
    }
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (entry.isSymbolicLink()) continue
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) await walk(entryPath)
      else if (entry.isFile() && entry.name === 'engines.json') found.push(entryPath)
    }
  }

  await walk(root)
  return found
}

async function mineCorpus(corpusRoot) {
  const byEngine = new Map(
    EXPECTED_ENGINE_IDS.map((engineId) => [
      engineId,
      { envelopes: 0, errors: 0, successfulResults: 0, paths: new Map() },
    ]),
  )
  const files = await findEngineFiles(corpusRoot)
  let unrecognizedEngineCount = 0

  for (const file of files) {
    let payload
    try {
      payload = JSON.parse(await readFile(file, 'utf8'))
    } catch {
      throw new Error('Unable to parse an engines.json corpus file')
    }
    if (!Array.isArray(payload)) throw new Error('Every engines.json corpus file must contain an array')

    for (const envelope of payload) {
      if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) continue
      const record = byEngine.get(envelope.engine_id)
      if (!record) {
        if ('engine_id' in envelope) unrecognizedEngineCount += 1
        continue
      }
      record.envelopes += 1
      if ('_error' in envelope || 'error' in envelope) record.errors += 1
      if ('result' in envelope && envelope.result !== undefined) {
        record.successfulResults += 1
        visitShape(envelope.result, '$.result', record.paths)
        for (const generatedField of ['generated_audio', 'generated_image']) {
          if (generatedField in envelope) {
            visitShape(envelope[generatedField], `$.${generatedField}`, record.paths)
          }
        }
      }
    }
  }

  if (unrecognizedEngineCount > 0) {
    throw new Error('Corpus contains one or more unrecognized engine identifiers')
  }
  return { files: files.length, byEngine }
}

function parseWorkflowRegistry(source) {
  const workflows = []
  const blockPattern =
    /self\.register\(ExtendedWorkflowDefinition\s*\{([\s\S]*?)default_options:\s*HashMap::new\(\),\s*\}\);/g
  for (const match of source.matchAll(blockPattern)) {
    const block = match[1]
    const id = block.match(/\bid:\s*"([^"]+)"\.into\(\)/)?.[1]
    const name = block.match(/\bname:\s*"([^"]+)"\.into\(\)/)?.[1]
    const description = block.match(/\bdescription:\s*"([^"]+)"\.into\(\)/)?.[1]
    const requiredPhase = Number(block.match(/\brequired_phase:\s*(\d+)/)?.[1])
    const engineBlock = block.match(/\bengine_ids:\s*vec!\[([\s\S]*?)\],/)?.[1]
    const engineIds = engineBlock
      ? [...engineBlock.matchAll(/"([^"]+)"\.into\(\)/g)].map((engineMatch) => engineMatch[1])
      : []
    if (!id || !name || !description || !Number.isInteger(requiredPhase)) {
      throw new Error('Unable to parse a canonical WorkflowRegistry entry')
    }
    workflows.push({ id, name, description, requiredPhase, engineIds })
  }
  return workflows.sort((left, right) => left.id.localeCompare(right.id))
}

async function loadWorkflows(selemeneRoot) {
  const registryPath = path.join(
    selemeneRoot,
    'crates',
    'noesis-orchestrator',
    'src',
    'workflow',
    'registry.rs',
  )
  let source
  try {
    source = await readFile(registryPath, 'utf8')
  } catch {
    throw new Error('Unable to read the Selemene WorkflowRegistry source')
  }
  const workflows = parseWorkflowRegistry(source)
  if (workflows.length !== 6) throw new Error('WorkflowRegistry must define exactly six workflows')
  return workflows
}

async function verifySourceContract(selemeneRoot, engineId) {
  const spec = SOURCE_CONTRACTS[engineId]
  if (!spec) throw new Error('A result-less engine is missing its source-contract specification')
  let source
  try {
    source = await readFile(path.join(selemeneRoot, spec.source), 'utf8')
  } catch {
    throw new Error('Unable to read a required Selemene source contract')
  }
  if (spec.anchors.some((anchor) => !source.includes(anchor))) {
    throw new Error('A required Selemene source contract no longer matches its declared anchors')
  }
  return spec
}

function componentInventory(workflows) {
  const names = new Set()
  for (const presentation of Object.values(ENGINE_PRESENTATIONS)) {
    names.add(presentation.primaryComponent)
    names.add(presentation.secondaryComponent)
    names.add(presentation.fallbackComponent)
  }
  for (const workflow of workflows) {
    const presentation = WORKFLOW_PRESENTATIONS[workflow.id]
    if (!presentation) throw new Error('Workflow presentation mapping is incomplete')
    names.add(presentation.primaryComponent)
    names.add(presentation.secondaryComponent)
    names.add(presentation.fallbackComponent)
  }
  names.add('FieldFactGrid')
  names.add('OrderedCollectionList')
  names.add('SystemRunLedger')

  return [...names]
    .map((name) => {
      const detail = COMPONENT_DETAILS[name]
      if (!detail) throw new Error('Component inventory metadata is incomplete')
      return {
        id: name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase(),
        name,
        family: detail[0],
        encodingRelationship: detail[1],
        nonVisualEquivalent: detail[2],
        states: [...REQUIRED_STATES],
        densities: [...REQUIRED_DENSITIES],
      }
    })
    .sort((left, right) => left.id.localeCompare(right.id))
}

function hashManifest(manifestWithoutId) {
  return `engine-output-atlas_${createHash('sha256')
    .update(JSON.stringify(manifestWithoutId))
    .digest('hex')}`
}

export async function buildEngineOutputAtlas({
  corpusRoot = DEFAULT_PATHS.corpusRoot,
  selemeneRoot = DEFAULT_PATHS.selemeneRoot,
} = {}) {
  const [corpus, workflows] = await Promise.all([
    mineCorpus(path.resolve(corpusRoot)),
    loadWorkflows(path.resolve(selemeneRoot)),
  ])
  const workflowIds = workflows.map(({ id }) => id)
  const registryEngineIds = new Set(workflows.flatMap(({ engineIds }) => engineIds))
  const missingRegistryEngines = [...registryEngineIds].filter(
    (engineId) => !EXPECTED_ENGINE_IDS.includes(engineId),
  )
  if (missingRegistryEngines.length > 0) {
    throw new Error('WorkflowRegistry contains an engine outside the eighteen-engine atlas')
  }

  const engines = []
  for (const engineId of EXPECTED_ENGINE_IDS) {
    const observed = corpus.byEngine.get(engineId)
    const presentation = ENGINE_PRESENTATIONS[engineId]
    if (!presentation) throw new Error('Engine presentation mapping is incomplete')

    let provenance
    let evidence
    let outputPaths
    if (observed.successfulResults > 0) {
      provenance = 'observed-data'
      evidence = {
        source: '723/**/engines.json',
        envelopeCount: observed.envelopes,
        resultCount: observed.successfulResults,
        errorCount: observed.errors,
      }
      outputPaths = serializePaths(observed.paths)
    } else {
      const contract = await verifySourceContract(path.resolve(selemeneRoot), engineId)
      provenance = 'source-contract'
      evidence = {
        source: contract.source,
        envelopeCount: observed.envelopes,
        resultCount: 0,
        errorCount: observed.errors,
      }
      outputPaths = contractPaths(contract)
    }

    engines.push({
      id: engineId,
      status: presentation.status,
      provenance,
      evidence,
      outputSummary: summarizePaths(outputPaths),
      outputPaths,
      presentation: {
        primaryComponent: presentation.primaryComponent,
        secondaryComponent: presentation.secondaryComponent,
        fallbackComponent: presentation.fallbackComponent,
        encodingRelationship: presentation.encodingRelationship,
        nonVisualEquivalent: presentation.nonVisualEquivalent,
        defaultFormat: 'branded-visual',
        expandedRawJsonByDefault: false,
      },
      workflowMembership: Object.fromEntries(
        workflowIds.map((workflowId) => [
          workflowId,
          workflows
            .find((workflow) => workflow.id === workflowId)
            .engineIds.includes(engineId),
        ]),
      ),
    })
  }

  const workflowEntries = workflows.map((workflow) => ({
    ...workflow,
    presentation: {
      ...WORKFLOW_PRESENTATIONS[workflow.id],
      defaultFormat: 'branded-composite',
      expandedRawJsonByDefault: false,
    },
  }))
  const membershipMatrix = engines.flatMap((engine) =>
    workflowIds.map((workflowId) => ({
      engineId: engine.id,
      workflowId,
      member: engine.workflowMembership[workflowId],
    })),
  )

  const body = {
    schemaVersion: ENGINE_OUTPUT_ATLAS_SCHEMA_VERSION,
    title: 'Urania Engine Output Atlas',
    privacy: {
      corpusDisclosure: 'paths-types-counts-only',
      rawValuesIncluded: false,
      absolutePathsIncluded: false,
      subjectDirectoryNamesIncluded: false,
      binaryDataIncluded: false,
      credentialsIncluded: false,
    },
    sourceSummary: {
      corpusPattern: '723/**/engines.json',
      corpusFileCount: corpus.files,
      workflowRegistry: 'crates/noesis-orchestrator/src/workflow/registry.rs',
      sourceContractRoot: 'Selemene-engine',
    },
    presentationPolicy: {
      defaultPayloadPresentation: 'branded-components',
      technicalSourceAccess: 'collapsed-privacy-filtered-provenance',
      expandedRawJsonByDefault: false,
      requiredStates: [...REQUIRED_STATES],
      requiredDensities: [...REQUIRED_DENSITIES],
    },
    engines,
    workflows: workflowEntries,
    membershipMatrix,
    components: componentInventory(workflows),
  }
  return { manifestId: hashManifest(body), ...body }
}

const USAGE =
  'Usage: build-engine-output-atlas.mjs [--corpus PATH] [--selemene PATH] [--output PATH|-]'

export function parseArguments(args) {
  const options = {
    corpusRoot: DEFAULT_PATHS.corpusRoot,
    selemeneRoot: DEFAULT_PATHS.selemeneRoot,
    outputPath: DEFAULT_PATHS.outputPath,
    help: false,
  }
  const names = {
    '--corpus': 'corpusRoot',
    '--selemene': 'selemeneRoot',
    '--output': 'outputPath',
  }
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--help' || argument === '-h') {
      options.help = true
      continue
    }
    const equalsIndex = argument.indexOf('=')
    const flag = equalsIndex === -1 ? argument : argument.slice(0, equalsIndex)
    const optionName = names[flag]
    if (!optionName) throw new Error('Unknown command-line option')
    const value = equalsIndex === -1 ? args[index + 1] : argument.slice(equalsIndex + 1)
    if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`)
    options[optionName] = value
    if (equalsIndex === -1) index += 1
  }
  return options
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArguments(args)
  if (options.help) {
    process.stdout.write(`${USAGE}\n`)
    return
  }
  const manifest = await buildEngineOutputAtlas(options)
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`
  if (options.outputPath === '-') {
    process.stdout.write(serialized)
    return
  }
  const outputPath = path.resolve(options.outputPath)
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, serialized)
  process.stdout.write(
    `Wrote engine output atlas (${manifest.engines.length} engines, ${manifest.workflows.length} workflows)\n`,
  )
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n${USAGE}\n`)
    process.exitCode = 1
  })
}
