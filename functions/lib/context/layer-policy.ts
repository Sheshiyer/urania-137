/**
 * Task 4 — layer policy: which layers are permitted at a given
 * `interpretationDepth`, plus bounded caps and the relationship fail-closed
 * gate. This module contains no model/LLM calls — L0 renders source data with
 * zero model invocation by construction (nothing here invokes a model port).
 */
import type {
  ConsciousnessLevel,
  ContextPacketPolicy,
  InterpretationDepth,
  RelationshipGrantCheck,
} from './types'

export const MAX_HISTORY = 8
export const MAX_TEMPORAL_CONTEXT = 8
export const MAX_GROUNDED_PASSAGES = 12
export const MAX_EXCERPT_LENGTH = 900
export const MAX_QUESTION_LENGTH = 2_000
export const MAX_PACKET_BYTES = 32_000

export interface LayerPermissions {
  /** L0 only: verbatim engine payload, zero model invocation. */
  includeCurrent: boolean
  /** L1+: user's question/intention. */
  includeQuestion: boolean
  /** L2+: explicitly selected owned prior readings. */
  includeHistory: boolean
  /** L3+: authorized relationship/temporal context (still gated by grant). */
  includeRelationshipTemporal: boolean
  /** L4+: provenance-labelled research/grounded passages. */
  includeGroundedPassages: boolean
  /** L5: cross-engine/cross-reading pattern synthesis (same evidence set as L4; synthesis is agent-side, not an extra evidence layer here). */
  includeCrossReadingSynthesis: boolean
}

/**
 * Additive layer table. Every permission true at depth N stays true at every
 * depth > N — this function is the single place that encodes that invariant,
 * so `assemble.ts` cannot accidentally regress it.
 */
export function permissionsForDepth(depth: InterpretationDepth): LayerPermissions {
  return {
    includeCurrent: depth >= 0,
    includeQuestion: depth >= 1,
    includeHistory: depth >= 2,
    includeRelationshipTemporal: depth >= 3,
    includeGroundedPassages: depth >= 4,
    includeCrossReadingSynthesis: depth >= 5,
  }
}

export function isValidInterpretationDepth(value: unknown): value is InterpretationDepth {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 5
}

export function isValidConsciousnessLevel(value: unknown): value is ConsciousnessLevel {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5
}

/**
 * Relationship/dyad context fails closed: no active, explicit grant => the
 * layer is omitted entirely. There is no "reduced fidelity" fallback — either
 * the full authorized relationship context is included, or none of it is.
 */
export function relationshipContextAllowed(grant: RelationshipGrantCheck | undefined): boolean {
  return grant !== undefined && grant.active === true && typeof grant.relationshipId === 'string' && grant.relationshipId.length > 0
}

/** Deterministic bounded truncation — never silently unbounded. */
export function capText(value: string, maxLength: number = MAX_EXCERPT_LENGTH): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value
}

/** Deterministic bounded slice — newest/first N entries kept, rest dropped. */
export function capList<T>(items: readonly T[], max: number): T[] {
  return items.slice(0, max)
}

export function buildPolicy(input: {
  allowedSourceIds: string[]
  allowRelationship: boolean
  allowResearch: boolean
  maxHistory?: number
  maxBytes?: number
}): ContextPacketPolicy {
  return {
    allowedSourceIds: [...input.allowedSourceIds],
    maxHistory: input.maxHistory ?? MAX_HISTORY,
    maxBytes: input.maxBytes ?? MAX_PACKET_BYTES,
    allowRelationship: input.allowRelationship,
    allowResearch: input.allowResearch,
  }
}
