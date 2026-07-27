/**
 * Framework-neutral contracts for conversational interpretation of an
 * existing reading. These types intentionally do not model report generation,
 * intake collection, memory, retrieval, or autonomous tool execution.
 */

export type InterpretationRoute = 'pattern' | 'embodied' | 'synthesis' | 'navigate'

export type InterpretationAgentId = 'aletheios' | 'pichet' | 'synthesis' | 'navigator'

export type InterpretationClaimStatus = 'source-grounded' | 'interpretive-synthesis'

export type InterpretationFailure =
  | 'model-unconfigured'
  | 'model-unavailable'
  | 'model-response-invalid'

export interface InterpretationHistoryTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface InterpretationRequest {
  readingId: string
  route: InterpretationRoute
  question: string
  history: InterpretationHistoryTurn[]
}

export interface ReadingEvidenceSource {
  id: string
  nodeId: string
  nodeLabel: string
  mode: string
  title: string
  content: string
}

export interface InterpretationEvidence {
  id: string
  sourcePath: string
  label: string
  text: string
  kind: 'reading-metadata' | 'reading-content'
}

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

export interface InterpretationAgentDefinition {
  id: InterpretationAgentId
  route: InterpretationRoute
  intent: string
  posture: string
  allowedEvidence: readonly ['owned-reading']
  allowedTools: readonly []
}

export interface ModelCompletionInput {
  system: string
  user: string
}

/** Replaceable model boundary; no provider type escapes the agent kernel. */
export interface InterpretationModelPort {
  readonly id: 'selemene-llm-proxy'
  readonly configured: boolean
  complete(input: ModelCompletionInput): Promise<string | null>
}
