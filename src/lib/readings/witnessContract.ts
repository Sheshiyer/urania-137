/**
 * Browser-side mirror of the POST /api/chat/interpret contract
 * (functions/lib/agents/types.ts). Kept as plain types — no server-only
 * fields (model port, evidence source, ReadingEvidenceSource) leak here, only
 * what the client sends or receives over the wire.
 */

export type InterpretationRoute = 'pattern' | 'embodied' | 'synthesis' | 'navigate'

export type InterpretationAgentId = 'aletheios' | 'pichet' | 'synthesis' | 'navigator'

export type InterpretationClaimStatus = 'source-grounded' | 'interpretive-synthesis'

export type InterpretationFailure =
  | 'model-unconfigured'
  | 'model-unavailable'
  | 'model-response-invalid'

export interface InterpretationClaim {
  text: string
  status: InterpretationClaimStatus
  evidenceIds: string[]
}

export interface InterpretationTarget {
  kind: 'reading' | 'evidence'
  nodeId: string
  label: string
  evidenceId?: string
}

export interface InterpretationProvenance {
  readingId: string
  nodeId: string
  agentId: InterpretationAgentId
  evidenceIds: string[]
  model: 'selemene-llm-proxy' | 'none'
}

export interface InterpretationResponse {
  route: InterpretationRoute
  agentId: InterpretationAgentId
  answer: string
  claims: InterpretationClaim[]
  question: string | null
  targets: InterpretationTarget[]
  provenance: InterpretationProvenance
  degraded: boolean
  failure?: InterpretationFailure
}

/** The full JSON body POST /api/chat/interpret returns (response + persisted hashes/refs). */
export interface WitnessInterpretResult extends InterpretationResponse {
  contextPacketHash: string
  factLockHash: string
  sourceRefs: string[]
}
