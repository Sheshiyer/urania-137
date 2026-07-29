/**
 * Task 4 — server-side ContextPacketV1 assembler.
 *
 * L0 (interpretationDepth === 0) renders `current` verbatim and invokes
 * nothing model-shaped: this function performs no network/model calls at any
 * depth — it only selects and bounds already-fetched, owner-scoped data. The
 * caller (route/agent layer) is responsible for not invoking a model port
 * until after this function returns, which is trivially true since this
 * module never references `InterpretationModelPort`.
 */
import {
  buildPolicy,
  capList,
  capText,
  isValidConsciousnessLevel,
  isValidInterpretationDepth,
  MAX_QUESTION_LENGTH,
  permissionsForDepth,
  relationshipContextAllowed,
} from './layer-policy'
import type {
  AssembleContextInput,
  AssembleContextResult,
  ContextPacketV1,
  GroundedPassageEntry,
  SelectedHistoryEntry,
  TemporalContextEntry,
} from './types'

function defaultNow(): string {
  return new Date().toISOString()
}

function defaultPacketId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `packet-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function boundedHistory(entries: SelectedHistoryEntry[] | undefined): SelectedHistoryEntry[] {
  return capList(entries ?? [], 8).map((entry) => ({
    ...entry,
    excerpt: capText(entry.excerpt),
  }))
}

function boundedTemporalContext(entries: TemporalContextEntry[] | undefined): TemporalContextEntry[] {
  return capList(entries ?? [], 8)
}

function boundedGroundedPassages(entries: GroundedPassageEntry[] | undefined): GroundedPassageEntry[] {
  return capList(entries ?? [], 12).map((entry) => ({
    ...entry,
    excerpt: capText(entry.excerpt),
  }))
}

/**
 * Assemble an owner-scoped, additive, bounded `ContextPacketV1`.
 *
 * - Owner scoping: `ownerRef` must be present; callers are expected to have
 *   already loaded `current`/`candidateHistory`/etc. from owner-scoped
 *   queries — this function does not itself hit a datastore, but it never
 *   emits a packet without an `ownerRef` stamped on it.
 * - Additivity: each field is gated by `permissionsForDepth`, and every gate
 *   true at depth N stays true at depth > N (enforced in layer-policy.ts),
 *   so packets assembled at increasing depth are strict supersets.
 * - Relationship fail-closed: `relationshipRef`/relationship-shaped temporal
 *   context is included only when `relationshipGrant.active` is true;
 *   otherwise it, and only it, is omitted — other L3 temporal entries that
 *   are not relationship-scoped are unaffected by this gate.
 */
export function assembleContextPacket(input: AssembleContextInput): AssembleContextResult {
  if (!input.ownerRef || input.ownerRef.trim().length === 0) {
    return { ok: false, error: 'owner-ref-required' }
  }
  if (!input.readingId || input.readingId.trim().length === 0) {
    return { ok: false, error: 'reading-id-required' }
  }
  if (!isValidInterpretationDepth(input.interpretationDepth)) {
    return { ok: false, error: 'invalid-interpretation-depth' }
  }
  if (!isValidConsciousnessLevel(input.consciousnessLevel)) {
    return { ok: false, error: 'invalid-consciousness-level' }
  }

  const permissions = permissionsForDepth(input.interpretationDepth)

  // L1+ requires a question; L0 has no question requirement since it never
  // reaches interpretation.
  const question = input.question?.trim() ?? ''
  if (permissions.includeQuestion) {
    if (question.length === 0) return { ok: false, error: 'question-required' }
    if (question.length > MAX_QUESTION_LENGTH) return { ok: false, error: 'question-too-long' }
  }

  const wantsRelationship = Boolean(input.relationshipRef) && permissions.includeRelationshipTemporal
  const grantOk = relationshipContextAllowed(input.relationshipGrant)
  if (wantsRelationship && !grantOk) {
    // Fail closed: an explicit relationship was requested at a depth that
    // permits it, but there is no active grant. Reject rather than silently
    // downgrade, so a caller cannot mistake an omission for success.
    return { ok: false, error: 'relationship-context-requires-active-grant' }
  }
  const includeRelationship = wantsRelationship && grantOk

  const selectedHistory = permissions.includeHistory ? boundedHistory(input.candidateHistory) : []
  const temporalContext = permissions.includeRelationshipTemporal
    ? boundedTemporalContext(input.candidateTemporalContext)
    : []
  const groundedPassages = permissions.includeGroundedPassages
    ? boundedGroundedPassages(input.candidateGroundedPassages)
    : []

  const allowedSourceIds = [
    input.current.sourceId,
    ...selectedHistory.map((h) => h.sourceId),
    ...temporalContext.map((t) => t.sourceId),
    ...groundedPassages.map((g) => g.id),
  ]

  const packet: ContextPacketV1 = {
    schemaVersion: 'noesis.context.v1',
    packetId: input.packetId ?? defaultPacketId(),
    readingId: input.readingId.trim(),
    ownerRef: input.ownerRef.trim(),
    subjectRefs: [...(input.subjectRefs ?? [])],
    ...(includeRelationship && input.relationshipRef ? { relationshipRef: input.relationshipRef } : {}),
    interpretationDepth: input.interpretationDepth,
    consciousnessLevel: input.consciousnessLevel,
    question: permissions.includeQuestion ? question : '',
    // `current` is preserved verbatim: no field is dropped, rewritten, or
    // reinterpreted — it is always present regardless of depth because L0
    // itself is "current only", and every higher depth is additive.
    current: { ...input.current },
    selectedHistory,
    temporalContext,
    groundedPassages,
    policy: buildPolicy({
      allowedSourceIds,
      allowRelationship: includeRelationship,
      allowResearch: permissions.includeGroundedPassages,
    }),
    createdAt: (input.now ?? defaultNow)(),
  }

  return { ok: true, packet }
}
