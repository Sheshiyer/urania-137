import { projectReadingEvidence } from './evidence'
import { buildInterpretationPrompts } from './prompt'
import { resolveInterpretationAgent } from './registry'
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
