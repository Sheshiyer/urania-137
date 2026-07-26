/**
 * Canonical reading substrate.
 *
 * A ReadingDocument is the one semantic model shared by the conversational
 * result and the Folio reader. It deliberately keeps authenticated ownership,
 * reading subject, deterministic evidence, witness synthesis, and retrieval
 * patterns in separate fields.
 */

export type ReadingOrigin = 'live-chat' | 'folio' | 'corpus-723'
export type ReadingStructureSource = 'native' | 'flat'
export type ReadingSubjectKind = 'self' | 'person' | 'dyad' | 'family' | 'collective' | 'unknown'
export type ReadingEvidenceKind = 'deterministic' | 'witness' | 'retrieval' | 'historical' | 'system'
export type ReadingConfidence = 'observed' | 'derived' | 'interpretive' | 'unverified'

/** The authenticated account that owns access to the document. */
export interface ReadingOwnerRef {
  id: string | null
  email: string | null
  label: string
}

/** The person or relationship the reading concerns. Never inferred from owner. */
export interface ReadingSubjectRef {
  id: string | null
  kind: ReadingSubjectKind
  label: string
  relationshipLabel?: string
}

export interface ReadingSection {
  id: string
  title: string
  body: string
  evidenceKind: Exclude<ReadingEvidenceKind, 'retrieval' | 'historical'>
}

export interface ReadingEvidence {
  id: string
  label: string
  detail: string
  kind: ReadingEvidenceKind
  confidence: ReadingConfidence
}

export interface ReadingPattern {
  id: string
  label: string
  detail?: string
  /** Number of independent sources supporting the convergence. */
  sourceCount: number
  /** Retrieval patterns are synthesis memory, never deterministic facts. */
  kind: 'reading' | 'retrieval'
}

export interface ReadingMoment {
  id: string
  label: string
  detail?: string
  timestamp?: number
  status: 'past' | 'present' | 'future' | 'undated'
}

/**
 * Semantic visual elements extracted from explicit engine structure.
 *
 * Elements never replace the source payload or witness prose. They are a
 * loss-aware projection of allowlisted fields into reusable reading geometry.
 */
export interface ReadingElementBase {
  id: string
  title: string
  sourceSystem: string
  sourcePath: string
  evidenceKind: Extract<ReadingEvidenceKind, 'deterministic' | 'witness' | 'system'>
  confidence: ReadingConfidence
}

export interface ReadingFact {
  id: string
  label: string
  value: string
  detail?: string
}

export interface ReadingFactGridElement extends ReadingElementBase {
  kind: 'fact-grid'
  layout: 'grid' | 'limbs' | 'profile'
  facts: ReadingFact[]
}

export interface ReadingNumberCode {
  id: string
  label: string
  value: string
  reduction: string[]
  detail?: string
  isMaster?: boolean
}

export interface ReadingNumberCodesElement extends ReadingElementBase {
  kind: 'number-codes'
  codes: ReadingNumberCode[]
}

export interface ReadingPosition {
  id: string
  label: string
  sign?: string
  degree?: number
  longitude?: number
  isRetrograde?: boolean
  detail?: string
}

export interface ReadingPositionsElement extends ReadingElementBase {
  kind: 'positions'
  frame: 'natal' | 'transit' | 'activation' | 'generic'
  positions: ReadingPosition[]
}

export interface ReadingRelation {
  id: string
  from: string
  to: string
  relation: string
  measure?: string
  detail?: string
  status?: string
}

export interface ReadingRelationsElement extends ReadingElementBase {
  kind: 'relations'
  relations: ReadingRelation[]
}

export interface ReadingSequenceStep {
  id: string
  label: string
  value?: string
  detail?: string
  start?: string
  end?: string
  at?: string
  status?: string
}

export interface ReadingSequenceElement extends ReadingElementBase {
  kind: 'sequence'
  sequenceType: 'temporal' | 'activation' | 'ordered'
  steps: ReadingSequenceStep[]
}

export interface ReadingCycle {
  id: string
  label: string
  value: number
  unit: string
  min?: number
  max?: number
  status?: string
  detail?: string
}

export interface ReadingCyclesElement extends ReadingElementBase {
  kind: 'cycles'
  targetLabel?: string
  cycles: ReadingCycle[]
}

export interface ReadingSpreadPosition {
  id: string
  label: string
  value: string
  detail?: string
  status?: string
}

export interface ReadingSpreadElement extends ReadingElementBase {
  kind: 'spread'
  tradition: 'tarot' | 'i-ching' | 'generic'
  positions: ReadingSpreadPosition[]
}

export interface ReadingCollectionGroup {
  id: string
  label: string
  items: string[]
}

export interface ReadingCollectionsElement extends ReadingElementBase {
  kind: 'collections'
  groups: ReadingCollectionGroup[]
}

export interface ReadingQuestionsElement extends ReadingElementBase {
  kind: 'questions'
  questions: string[]
}

export interface ReadingNoticeElement extends ReadingElementBase {
  kind: 'notice'
  tone: 'source' | 'warning' | 'unresolved'
  body: string
}

export type ReadingItemStatus = 'available' | 'missing' | 'failed' | 'capture-required' | 'recorded' | 'analyzed' | 'unverified'

export interface ReadingMediaItem {
  id: string
  label: string
  mediaType: 'audio' | 'image'
  sourcePath: string
  status: Extract<ReadingItemStatus, 'available' | 'missing' | 'failed'>
  /** A browser-safe http(s), root-relative, or allowlisted non-SVG data URL. */
  url?: string
  mimeType?: string
  textEquivalent: string
  detail?: string
}

export interface ReadingMediaElement extends ReadingElementBase {
  kind: 'media'
  items: ReadingMediaItem[]
}

export interface ReadingArtifactItem {
  id: string
  label: string
  value: string
  detail?: string
  sourcePath: string
  status: Extract<ReadingItemStatus, 'available' | 'missing' | 'failed'>
}

export interface ReadingArtifactStep {
  id: string
  label: string
  sourcePath: string
  status: Extract<ReadingItemStatus, 'available' | 'missing' | 'failed'>
}

export interface ReadingArtifactElement extends ReadingElementBase {
  kind: 'artifact'
  artifactType: 'sigil'
  status: Extract<ReadingItemStatus, 'available' | 'missing' | 'failed'>
  items: ReadingArtifactItem[]
  steps: ReadingArtifactStep[]
}

export interface ReadingCaptureObservation {
  id: string
  label: string
  value: string
  detail?: string
  sourcePath: string
  status: Extract<ReadingItemStatus, 'recorded' | 'unverified'>
}

export interface ReadingCaptureElement extends ReadingElementBase {
  kind: 'capture'
  captureState: Extract<ReadingItemStatus, 'capture-required' | 'recorded' | 'analyzed' | 'failed'>
  body: string
  observations: ReadingCaptureObservation[]
}

export interface ReadingRawElement extends ReadingElementBase {
  kind: 'raw'
  value: unknown
}

export type ReadingElement =
  | ReadingFactGridElement
  | ReadingNumberCodesElement
  | ReadingPositionsElement
  | ReadingRelationsElement
  | ReadingSequenceElement
  | ReadingCyclesElement
  | ReadingSpreadElement
  | ReadingCollectionsElement
  | ReadingQuestionsElement
  | ReadingNoticeElement
  | ReadingMediaElement
  | ReadingArtifactElement
  | ReadingCaptureElement
  | ReadingRawElement

export interface ReadingArchiveState {
  entryId: string | null
  favorite: boolean
}

export interface ReadingDocument {
  id: string
  title: string
  origin: ReadingOrigin
  createdAt: number | null
  mode: string
  nodeId: string
  nodeLabel: string

  owner: ReadingOwnerRef
  subject: ReadingSubjectRef

  /**
   * `native` means the source supplied real sections.
   * `flat` means the source supplied one unstructured body. Adapters must not
   * manufacture section boundaries merely to make a richer visualization.
   */
  structureSource: ReadingStructureSource
  sections: ReadingSection[]
  body: string | null

  systems: string[]
  evidence: ReadingEvidence[]
  patterns: ReadingPattern[]
  moments: ReadingMoment[]
  elements: ReadingElement[]
  /** Complete structured source when locally available; never inferred. */
  sourcePayload: unknown | null
  bridgeQuestion: string | null
  archive: ReadingArchiveState
}

export interface ReadingAdapterContext {
  owner?: Partial<ReadingOwnerRef>
  subject?: Partial<ReadingSubjectRef>
}

export const UNKNOWN_OWNER: ReadingOwnerRef = {
  id: null,
  email: null,
  label: 'Authenticated account',
}

export const UNKNOWN_SUBJECT: ReadingSubjectRef = {
  id: null,
  kind: 'unknown',
  label: 'Subject not recorded',
}

export function ownerFromContext(context?: ReadingAdapterContext): ReadingOwnerRef {
  return { ...UNKNOWN_OWNER, ...context?.owner }
}

export function subjectFromContext(context?: ReadingAdapterContext): ReadingSubjectRef {
  return { ...UNKNOWN_SUBJECT, ...context?.subject }
}
