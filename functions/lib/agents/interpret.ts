import { projectReadingEvidence } from './evidence'
import { buildInterpretationPrompts } from './prompt'
import { isInterpretationRoute, resolveInterpretationAgent } from './registry'
import type { InterpretationDepth } from '../context/types'
import { isValidInterpretationDepth } from '../context/layer-policy'
import type {
  InterpretationClaim,
  InterpretationClaimStatus,
  InterpretationFailure,
  InterpretationModelPort,
  InterpretationRequest,
  InterpretationResponse,
  InterpretationTarget,
  ReadingEvidenceSource,
} from './types'

const MAX_READING_ID = 256
const MAX_QUESTION = 2_000
const MAX_IDEMPOTENCY_KEY = 200

/**
 * The public request contract for `/api/chat/interpret`: a strict, minimal
 * whitelist. The browser may only supply a reading id, a named interpretive
 * route, a bounded question, a requested L0-L5 depth, and an idempotency key.
 * It can NEVER supply reading text, context packets, fact locks, prior
 * interpretations, prompt history, provider/model/tool selection, or a user
 * identity — any of those fields, or any unknown field, causes outright
 * rejection rather than silent stripping, so a client cannot smuggle
 * fabricated facts into the pipeline.
 */
export interface MinimalInterpretationRequest {
  readingId: string
  route: InterpretationRequest['route']
  question: string
  depth: InterpretationDepth
  idempotencyKey: string
}

const MINIMAL_REQUEST_ALLOWED_KEYS = new Set(['readingId', 'route', 'question', 'depth', 'idempotencyKey'])

export type MinimalRequestValidation =
  | { ok: true; value: MinimalInterpretationRequest }
  | { ok: false; error: string }

/**
 * Validates the untrusted browser request body against the minimal public
 * contract. Rejects (never strips) unknown fields, so any attempt to attach
 * client-authored facts/history/provenance is an explicit 400, not a
 * silently-ignored extra key.
 */
export function validateMinimalInterpretationRequest(value: unknown): MinimalRequestValidation {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, error: 'expects a JSON object body' }
  }
  const body = value as Record<string, unknown>
  for (const key of Object.keys(body)) {
    if (!MINIMAL_REQUEST_ALLOWED_KEYS.has(key)) {
      return { ok: false, error: `contains unknown/forbidden field '${key}'` }
    }
  }
  if (
    typeof body.readingId !== 'string' ||
    body.readingId.trim().length === 0 ||
    body.readingId.length > MAX_READING_ID
  ) {
    return { ok: false, error: 'readingId must be a non-empty bounded string' }
  }
  if (!isInterpretationRoute(body.route)) {
    return { ok: false, error: 'route must be one of: pattern, embodied, synthesis, navigate' }
  }
  if (
    typeof body.question !== 'string' ||
    body.question.trim().length === 0 ||
    body.question.length > MAX_QUESTION
  ) {
    return { ok: false, error: 'question must be a non-empty string of at most 2000 characters' }
  }
  if (!isValidInterpretationDepth(body.depth)) {
    return { ok: false, error: 'depth must be an integer between 0 and 5' }
  }
  if (
    typeof body.idempotencyKey !== 'string' ||
    body.idempotencyKey.trim().length === 0 ||
    body.idempotencyKey.length > MAX_IDEMPOTENCY_KEY
  ) {
    return { ok: false, error: 'idempotencyKey must be a non-empty bounded string' }
  }
  return {
    ok: true,
    value: {
      readingId: body.readingId.trim(),
      route: body.route,
      question: body.question.trim(),
      depth: body.depth,
      idempotencyKey: body.idempotencyKey.trim(),
    },
  }
}

interface CandidateResponse {
  answer: string
  claims: InterpretationClaim[]
  question: string | null
  targets: InterpretationTarget[]
}

const CLAIM_STATUSES = new Set<InterpretationClaimStatus>([
  'source-grounded',
  'interpretive-synthesis',
])

function stripSingleJsonFence(value: string): string {
  const trimmed = value.trim()
  const match = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i.exec(trimmed)
  return match ? match[1].trim() : trimmed
}

function parseCandidate(
  content: string,
  evidenceIds: ReadonlySet<string>,
  nodeId: string,
): CandidateResponse | null {
  let value: unknown
  try {
    value = JSON.parse(stripSingleJsonFence(content))
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const body = value as Record<string, unknown>
  if (
    typeof body.answer !== 'string' ||
    body.answer.trim().length === 0 ||
    body.answer.length > 6_000
  ) {
    return null
  }
  if (!Array.isArray(body.claims) || body.claims.length > 8) return null
  const claims: InterpretationClaim[] = []
  for (const item of body.claims) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return null
    const claim = item as Record<string, unknown>
    if (
      typeof claim.text !== 'string' ||
      claim.text.trim().length === 0 ||
      claim.text.length > 1_200 ||
      typeof claim.status !== 'string' ||
      !CLAIM_STATUSES.has(claim.status as InterpretationClaimStatus) ||
      !Array.isArray(claim.evidenceIds) ||
      claim.evidenceIds.length === 0 ||
      !claim.evidenceIds.every((id) => typeof id === 'string' && evidenceIds.has(id))
    ) {
      return null
    }
    claims.push({
      text: claim.text.trim(),
      status: claim.status as InterpretationClaimStatus,
      evidenceIds: [...new Set(claim.evidenceIds as string[])],
    })
  }

  const question =
    body.question === null || body.question === undefined
      ? null
      : typeof body.question === 'string' &&
          body.question.trim().length > 0 &&
          body.question.length <= 1_000
        ? body.question.trim()
        : undefined
  if (question === undefined) return null

  if (!Array.isArray(body.targets) || body.targets.length > 4) return null
  const targets: InterpretationTarget[] = []
  for (const item of body.targets) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return null
    const target = item as Record<string, unknown>
    if (
      (target.kind !== 'reading' && target.kind !== 'evidence') ||
      target.nodeId !== nodeId ||
      typeof target.label !== 'string' ||
      target.label.trim().length === 0 ||
      target.label.length > 200
    ) {
      return null
    }
    if (
      target.kind === 'evidence' &&
      (typeof target.evidenceId !== 'string' || !evidenceIds.has(target.evidenceId))
    ) {
      return null
    }
    if (
      target.kind === 'reading' &&
      target.evidenceId !== undefined
    ) {
      return null
    }
    targets.push({
      kind: target.kind,
      nodeId,
      label: target.label.trim(),
      ...(target.kind === 'evidence' ? { evidenceId: target.evidenceId as string } : {}),
    })
  }

  return { answer: body.answer.trim(), claims, question, targets }
}

function unavailable(
  request: InterpretationRequest,
  reading: ReadingEvidenceSource,
  failure: InterpretationFailure,
  evidenceIds: string[],
): InterpretationResponse {
  const agent = resolveInterpretationAgent(request.route)
  if (!agent) throw new Error('unreachable: validated interpretation route has no agent')
  return {
    route: request.route,
    agentId: agent.id,
    answer:
      'Interpretation is temporarily unavailable for this reading. The source remains available without an invented substitute.',
    claims: [],
    question: null,
    targets: [
      {
        kind: 'reading',
        nodeId: reading.nodeId,
        label: `Return to ${reading.title}`,
      },
    ],
    provenance: {
      readingId: reading.id,
      nodeId: reading.nodeId,
      agentId: agent.id,
      evidenceIds,
      model: 'none',
    },
    degraded: true,
    failure,
  }
}

export async function interpretReading(input: {
  request: InterpretationRequest
  reading: ReadingEvidenceSource
  model: InterpretationModelPort
}): Promise<InterpretationResponse> {
  const { request, reading, model } = input
  const agent = resolveInterpretationAgent(request.route)
  if (!agent) throw new Error('interpretReading requires a validated route')
  const evidence = projectReadingEvidence(reading)
  const evidenceIds = evidence.map((item) => item.id)

  if (!model.configured) {
    return unavailable(request, reading, 'model-unconfigured', evidenceIds)
  }

  const prompts = buildInterpretationPrompts({
    agent,
    question: request.question,
    history: request.history,
    reading,
    evidence,
  })
  const content = await model.complete(prompts)
  if (!content) {
    return unavailable(request, reading, 'model-unavailable', evidenceIds)
  }

  const candidate = parseCandidate(content, new Set(evidenceIds), reading.nodeId)
  if (!candidate) {
    return unavailable(request, reading, 'model-response-invalid', evidenceIds)
  }

  return {
    route: request.route,
    agentId: agent.id,
    ...candidate,
    provenance: {
      readingId: reading.id,
      nodeId: reading.nodeId,
      agentId: agent.id,
      evidenceIds,
      model: model.id,
    },
    degraded: false,
  }
}
