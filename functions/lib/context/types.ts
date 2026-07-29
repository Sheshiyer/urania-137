/**
 * Task 4 — server-authoritative L0-L5 context assembly contracts.
 *
 * These types mirror the `ContextPacketV1` contract frozen in
 * `docs/plans/2026-07-28-agentscope-context-orchestration-integration.md`
 * (owned by the sibling `@witness/orchestration` package, which is not a
 * dependency of this repo). Field shapes are intentionally identical so a
 * future adoption of the real package is a type-compatible swap, not a
 * migration.
 *
 * `interpretationDepth` (0-5, additive context/synthesis policy) and
 * `consciousnessLevel` (1-5, register/Kosha resolution) are independent axes.
 * Neither is ever derived from the other anywhere in this module.
 */

export type InterpretationDepth = 0 | 1 | 2 | 3 | 4 | 5
export type ConsciousnessLevel = 1 | 2 | 3 | 4 | 5

export interface CurrentCalculationRef {
  sourceId: string
  engineId: string
  engineVersion: string
  inputHash: string
  resultHash: string
  calculatedAt: string
  method?: string
  seed?: string
  /** Verbatim engine payload. Never rewritten, summarized, or reinterpreted. */
  payload: unknown
}

export interface SelectedHistoryEntry {
  readingId: string
  sourceId: string
  excerpt: string
  excerptHash: string
}

export interface TemporalContextEntry {
  sourceId: string
  kind: string
  value: unknown
  valueHash: string
}

export interface GroundedPassageEntry {
  id: string
  source: string
  excerpt: string
  score: number
  provenance: 'sourced-fact'
}

export interface ContextPacketPolicy {
  allowedSourceIds: string[]
  maxHistory: number
  maxBytes: number
  allowRelationship: boolean
  allowResearch: boolean
}

export interface ContextPacketV1 {
  schemaVersion: 'noesis.context.v1'
  packetId: string
  readingId: string
  ownerRef: string
  subjectRefs: string[]
  relationshipRef?: string
  interpretationDepth: InterpretationDepth
  consciousnessLevel: ConsciousnessLevel
  question: string
  current: CurrentCalculationRef
  selectedHistory: SelectedHistoryEntry[]
  temporalContext: TemporalContextEntry[]
  groundedPassages: GroundedPassageEntry[]
  policy: ContextPacketPolicy
  createdAt: string
}

/**
 * Everything the assembler needs to build a packet for one request. This is
 * the caller-supplied, still-untrusted input; `assembleContextPacket` is the
 * only place that turns it into an authoritative `ContextPacketV1`.
 */
export interface AssembleContextInput {
  readingId: string
  ownerRef: string
  subjectRefs: string[]
  interpretationDepth: InterpretationDepth
  consciousnessLevel: ConsciousnessLevel
  question: string
  current: CurrentCalculationRef
  /** Candidate history; owner scoping + caps are enforced by the assembler. */
  candidateHistory?: SelectedHistoryEntry[]
  candidateTemporalContext?: TemporalContextEntry[]
  candidateGroundedPassages?: GroundedPassageEntry[]
  /**
   * Relationship/dyad context request. Only included when
   * `relationshipGrant.active` is true; otherwise it is omitted entirely
   * (fail closed), never silently included at reduced fidelity.
   */
  relationshipRef?: string
  relationshipGrant?: RelationshipGrantCheck
  now?: () => string
  packetId?: string
}

/** Minimal grant-check shape the assembler consults to fail closed. */
export interface RelationshipGrantCheck {
  relationshipId: string
  active: boolean
}

export type AssembleContextResult =
  | { ok: true; packet: ContextPacketV1 }
  | { ok: false; error: AssembleContextError }

export type AssembleContextError =
  | 'owner-ref-required'
  | 'reading-id-required'
  | 'question-required'
  | 'question-too-long'
  | 'relationship-context-requires-active-grant'
  | 'invalid-interpretation-depth'
  | 'invalid-consciousness-level'
