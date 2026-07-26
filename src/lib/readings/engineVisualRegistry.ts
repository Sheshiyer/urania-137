import type { ReadingElement } from './types'

export type EngineVisualStatus = 'implemented' | 'partial' | 'capture-gated'
export type EngineVisualFamily = 'foundation' | 'time' | 'motion' | 'symbol' | 'creation' | 'capture'
export type NonVisualKind =
  | 'definition-list'
  | 'value-table'
  | 'sortable-table'
  | 'ordered-list'
  | 'edge-list'
  | 'grouped-list'
  | 'media-metadata'
  | 'consent-quality-status'
  | 'collapsed-disclosure'

export interface EngineVisualContract {
  status: EngineVisualStatus
  family: EngineVisualFamily
  primary: ReadingElement['kind']
  secondary: ReadingElement['kind'][]
  nonVisual: {
    kind: NonVisualKind
    label: string
    preservesOrder: boolean
  }
  provenance: 'observed-data' | 'source-contract'
  atlasComponents: {
    primary: string
    secondary: string
    fallback: string
  }
}

export interface WorkflowVisualContract {
  name: string
  surface: string
  status: 'proposed'
  engineIds: readonly string[]
  nonVisual: EngineVisualContract['nonVisual']
  atlasComponents: {
    runtime: string
    primary: string
    secondary: string
    fallback: string
  }
}

function engine(
  status: EngineVisualStatus,
  family: EngineVisualFamily,
  primary: ReadingElement['kind'],
  secondary: ReadingElement['kind'][],
  provenance: EngineVisualContract['provenance'],
  nonVisualKind: NonVisualKind,
  nonVisualLabel: string,
  preservesOrder: boolean,
  primaryComponent: string,
  secondaryComponent: string,
  fallbackComponent: string,
): EngineVisualContract {
  return {
    status,
    family,
    primary,
    secondary,
    provenance,
    nonVisual: { kind: nonVisualKind, label: nonVisualLabel, preservesOrder },
    atlasComponents: {
      primary: primaryComponent,
      secondary: secondaryComponent,
      fallback: fallbackComponent,
    },
  }
}

export const ENGINE_VISUAL_REGISTRY: Record<string, EngineVisualContract> = {
  biofield: engine('capture-gated', 'capture', 'capture', ['notice'], 'observed-data', 'consent-quality-status', 'Chakra metric table plus explicit capture-quality notice.', true, 'ChakraFieldMap', 'BiofieldMetricBands', 'CaptureConsentGate'),
  'biofield-capture': engine('capture-gated', 'capture', 'capture', ['notice'], 'source-contract', 'consent-quality-status', 'Sectioned capture report with quality and availability fields.', true, 'CapturedFieldReading', 'CaptureQualityPanel', 'CaptureConsentGate'),
  biorhythm: engine('partial', 'motion', 'cycles', ['sequence'], 'observed-data', 'value-table', 'Cycle and forecast data tables with printed values.', true, 'BiorhythmCycleBands', 'ForecastSequence', 'UnresolvedFieldState'),
  enneagram: engine('partial', 'foundation', 'questions', ['fact-grid'], 'observed-data', 'ordered-list', 'Ordered question list followed by a definition list.', true, 'InquiryQuestionDeck', 'TypologyFactGrid', 'UnresolvedFieldState'),
  'face-reading': engine('capture-gated', 'capture', 'capture', ['notice'], 'observed-data', 'consent-quality-status', 'Facial-zone observation table plus elemental balance table.', true, 'PhysiognomyObservationMap', 'ElementalBalanceBands', 'CaptureConsentGate'),
  'gene-keys': engine('partial', 'foundation', 'sequence', ['fact-grid'], 'observed-data', 'value-table', 'Ordered sequence table with shadow, gift, and siddhi columns.', true, 'GeneKeySequence', 'FrequencyTriadCards', 'UnresolvedFieldState'),
  'human-design': engine('partial', 'foundation', 'fact-grid', ['collections', 'relations'], 'observed-data', 'edge-list', 'Center, channel, gate, and activation tables.', true, 'BodygraphMap', 'ActivationTable', 'UnresolvedFieldState'),
  'i-ching': engine('partial', 'symbol', 'spread', ['sequence'], 'observed-data', 'value-table', 'Six-row line table and primary-to-relating summary.', true, 'HexagramChangeMap', 'ChangingLineSequence', 'UnresolvedFieldState'),
  nadabrahman: engine('implemented', 'time', 'collections', ['fact-grid'], 'observed-data', 'grouped-list', 'Recommendation table and time-window definition list.', true, 'RagaRecommendationList', 'TimeRecommendationCard', 'UnresolvedFieldState'),
  numerology: engine('implemented', 'foundation', 'number-codes', ['fact-grid'], 'observed-data', 'value-table', 'Number table with ordered reduction-chain text.', true, 'NumberReductionMap', 'NumerologyFactGrid', 'UnresolvedFieldState'),
  panchanga: engine('implemented', 'time', 'fact-grid', ['fact-grid'], 'observed-data', 'definition-list', 'Five-limb definition table followed by scalar source facts.', true, 'PanchangaFactGrid', 'FieldFactGrid', 'UnresolvedFieldState'),
  raaga: engine('partial', 'creation', 'media', ['collections', 'fact-grid'], 'source-contract', 'media-metadata', 'Ordered swara table with audio status and download link.', true, 'RaagaPlayer', 'SwaraSequence', 'PlayableArtifactState'),
  'sacred-geometry': engine('partial', 'creation', 'fact-grid', ['collections'], 'observed-data', 'definition-list', 'Form definition list and named element list.', true, 'SacredGeometryPlate', 'GeometryElementIndex', 'UnresolvedFieldState'),
  'sigil-forge': engine('partial', 'creation', 'artifact', ['sequence', 'media'], 'source-contract', 'ordered-list', 'Ordered construction steps with generated-image status.', true, 'SigilConstructionPlate', 'ConstructionStepSequence', 'GeneratedArtifactState'),
  tarot: engine('implemented', 'symbol', 'spread', ['fact-grid'], 'observed-data', 'value-table', 'Ordered spread table with position, card, orientation, and meaning.', true, 'TarotSpread', 'CardMeaningPanel', 'UnresolvedFieldState'),
  transits: engine('implemented', 'motion', 'relations', ['positions'], 'observed-data', 'edge-list', 'Aspect edge list and natal/transit position tables.', true, 'TransitAspectMap', 'PlanetPositionTable', 'UnresolvedFieldState'),
  'vedic-clock': engine('implemented', 'time', 'fact-grid', ['sequence'], 'observed-data', 'definition-list', 'Current-period definition list and upcoming-transition table.', true, 'FieldFactGrid', 'TransitionSequence', 'UnresolvedFieldState'),
  vimshottari: engine('implemented', 'time', 'sequence', ['fact-grid'], 'observed-data', 'value-table', 'Hierarchical period table preserving source order.', true, 'DashaTimeline', 'PeriodDetailPanel', 'UnresolvedFieldState'),
}

function workflow(
  name: string,
  surface: string,
  engineIds: readonly string[],
  nonVisualKind: NonVisualKind,
  nonVisualLabel: string,
  primary: string,
): WorkflowVisualContract {
  return {
    name,
    surface,
    status: 'proposed',
    engineIds,
    nonVisual: { kind: nonVisualKind, label: nonVisualLabel, preservesOrder: true },
    atlasComponents: {
      runtime: 'SystemRunLedger',
      primary,
      secondary: 'ContributingEngineIndex',
      fallback: 'CompositePartialState',
    },
  }
}

export const WORKFLOW_VISUAL_REGISTRY: Record<string, WorkflowVisualContract> = {
  'birth-blueprint': workflow('Birth Blueprint', 'Identity Atlas', ['numerology', 'human-design', 'vimshottari', 'biofield', 'face-reading'], 'grouped-list', 'Sectioned engine summary with source-path links.', 'CompositeIdentityMap'),
  'creative-expression': workflow('Creative Expression', 'Artifact Shelf', ['sigil-forge', 'sacred-geometry', 'nadabrahman', 'numerology', 'raaga'], 'ordered-list', 'Ordered artifact list with status and download controls.', 'CreativeArtifactShelf'),
  'daily-practice': workflow('Daily Practice', 'Rhythm Atlas', ['panchanga', 'vedic-clock', 'biorhythm', 'transits', 'nadabrahman'], 'value-table', 'Chronological table grouped by contributing engine.', 'TemporalPracticeSequence'),
  'decision-support': workflow('Decision Support', 'Perspective Field', ['tarot', 'i-ching', 'human-design', 'enneagram', 'gene-keys'], 'value-table', 'Side-by-side comparison table with one column per engine.', 'PerspectiveComparison'),
  'full-spectrum': workflow('Full Spectrum', 'System Atlas', ['numerology', 'human-design', 'vimshottari', 'panchanga', 'vedic-clock', 'biorhythm', 'gene-keys', 'biofield', 'face-reading', 'transits', 'nadabrahman', 'tarot', 'i-ching', 'enneagram', 'sacred-geometry', 'sigil-forge', 'raaga'], 'grouped-list', 'Grouped engine index with explicit present, missing, and error states.', 'FullSpectrumConstellation'),
  'self-inquiry': workflow('Self-Inquiry', 'Inquiry Field', ['gene-keys', 'enneagram', 'face-reading', 'biofield'], 'ordered-list', 'Heading-structured list preserving engine and question order.', 'InquiryLayerStack'),
}
