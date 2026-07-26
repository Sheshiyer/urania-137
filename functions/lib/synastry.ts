/**
 * Consent-revalidated cross-account synastry generation.
 *
 * The client selects a relationship and interpretive context, never subject
 * bodies. Both subject snapshots are loaded from the participant bindings,
 * generation runs through the server-key Selemene boundary, then consent is
 * checked again before an atomic, conditional participant-grant commit.
 */
import type { D1Database } from '@cloudflare/workers-types'
import type {
  AssetGenerateRequest,
  RelationshipContext,
  ReportLevel,
  SubjectInput,
} from './chat/types'
import { authorizeRelationshipGeneration } from './relationships'
import { profileToIntakeSubject, subjectRowToProfile, type SubjectRow } from './subjects'

const RELATIONSHIP_TYPES: RelationshipContext['type'][] = [
  'family',
  'friends',
  'business-partners',
  'unmarried-partners',
  'married-partners',
  'custom',
]
const SENSITIVITY_LEVELS: RelationshipContext['sensitivity_level'][] = [
  'low',
  'medium',
  'high',
]
const REPORT_LEVELS: ReportLevel[] = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5']

export interface ConsentedSynastryInput {
  relationship_context: RelationshipContext
  language?: string
  report_level?: ReportLevel
  consciousness_level?: number
  options?: Record<string, unknown>
}

export interface ParticipantReadingGrant {
  userId: string
  subjectId: string
  visibility: 'participant'
}

export interface ConsentedSynastryResult {
  generationId: string
  relationshipId: string
  result: unknown
  grants: ParticipantReadingGrant[]
}

export interface GrantedSynastryReading {
  generationId: string
  relationshipId: string
  mode: 'synastry'
  responseSha256: string
  result: unknown
  visibility: 'participant'
  createdAt: string
  grantedAt: string
}

export type SynastryErrorCode =
  | 'INVALID_INPUT'
  | 'SUBJECT_UNAVAILABLE'
  | 'CONSENT_CHANGED'
  | 'ENGINE_UNAVAILABLE'
  | 'ENGINE_REJECTED'
  | 'ARCHIVE_CORRUPT'

export class SynastryError extends Error {
  readonly code: SynastryErrorCode
  readonly status: number

  constructor(code: SynastryErrorCode, message: string, status = 400) {
    super(message)
    this.name = 'SynastryError'
    this.code = code
    this.status = status
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function validateConsentedSynastryInput(value: unknown): ConsentedSynastryInput {
  if (!isRecord(value)) {
    throw new SynastryError('INVALID_INPUT', 'generation expects a JSON object body')
  }
  if ('subjects' in value) {
    throw new SynastryError(
      'INVALID_INPUT',
      'subjects are resolved server-side from consented participant bindings',
    )
  }
  if ('mode' in value) {
    throw new SynastryError('INVALID_INPUT', "cross-account generation mode is fixed to 'synastry'")
  }

  const relationship = value.relationship_context
  if (!isRecord(relationship)) {
    throw new SynastryError('INVALID_INPUT', 'relationship_context is required')
  }
  const type = relationship.type
  const mappingGoal =
    typeof relationship.mapping_goal === 'string' ? relationship.mapping_goal.trim() : ''
  const sensitivity = relationship.sensitivity_level
  if (!RELATIONSHIP_TYPES.includes(type as RelationshipContext['type'])) {
    throw new SynastryError('INVALID_INPUT', 'relationship_context.type is invalid')
  }
  if (!mappingGoal || mappingGoal.length > 2_000) {
    throw new SynastryError(
      'INVALID_INPUT',
      'relationship_context.mapping_goal must contain 1-2000 characters',
    )
  }
  if (!SENSITIVITY_LEVELS.includes(sensitivity as RelationshipContext['sensitivity_level'])) {
    throw new SynastryError('INVALID_INPUT', 'relationship_context.sensitivity_level is invalid')
  }

  const output: ConsentedSynastryInput = {
    relationship_context: {
      type: type as RelationshipContext['type'],
      mapping_goal: mappingGoal,
      sensitivity_level: sensitivity as RelationshipContext['sensitivity_level'],
    },
  }
  if (value.language !== undefined) {
    if (
      typeof value.language !== 'string' ||
      !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(value.language.trim())
    ) {
      throw new SynastryError('INVALID_INPUT', 'language must be a BCP-47 language tag')
    }
    output.language = value.language.trim()
  }
  if (value.report_level !== undefined) {
    if (!REPORT_LEVELS.includes(value.report_level as ReportLevel)) {
      throw new SynastryError('INVALID_INPUT', 'report_level must be L0 through L5')
    }
    output.report_level = value.report_level as ReportLevel
  }
  if (value.consciousness_level !== undefined) {
    if (
      typeof value.consciousness_level !== 'number' ||
      !Number.isFinite(value.consciousness_level) ||
      value.consciousness_level < 0 ||
      value.consciousness_level > 5
    ) {
      throw new SynastryError('INVALID_INPUT', 'consciousness_level must be between 0 and 5')
    }
    output.consciousness_level = value.consciousness_level
  }
  if (value.options !== undefined) {
    if (!isRecord(value.options)) {
      throw new SynastryError('INVALID_INPUT', 'options must be a JSON object')
    }
    output.options = value.options
  }
  return output
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function resolveSubject(
  db: D1Database,
  subjectId: string,
  userId: string,
  role: 'inviter' | 'invitee',
): Promise<SubjectInput> {
  const row = await db
    .prepare(`SELECT * FROM subjects WHERE id = ?1 AND user_id = ?2`)
    .bind(subjectId, userId)
    .first<SubjectRow>()
  if (!row) {
    throw new SynastryError(
      'SUBJECT_UNAVAILABLE',
      'a consented participant subject is no longer available',
      403,
    )
  }
  return { ...profileToIntakeSubject(subjectRowToProfile(row)), role }
}

function sameAuthorization(
  left: Awaited<ReturnType<typeof authorizeRelationshipGeneration>>,
  right: Awaited<ReturnType<typeof authorizeRelationshipGeneration>>,
) {
  return (
    left.relationshipId === right.relationshipId &&
    left.participants.every((participant, index) => {
      const other = right.participants[index]
      return (
        participant.role === other.role &&
        participant.userId === other.userId &&
        participant.subjectId === other.subjectId
      )
    })
  )
}

async function commitParticipantGrants(
  db: D1Database,
  input: {
    generationId: string
    relationshipId: string
    actorUserId: string
    payload: AssetGenerateRequest
    result: unknown
    now: number
  },
): Promise<void> {
  const requestSha = await sha256(JSON.stringify(input.payload))
  const resultJson = JSON.stringify(input.result)
  if (typeof resultJson !== 'string') {
    throw new SynastryError(
      'ENGINE_REJECTED',
      'Selemene returned a result that cannot be serialized',
      502,
    )
  }
  const responseSha = await sha256(resultJson)
  const auditId = crypto.randomUUID()
  const results = await db.batch([
    db
      .prepare(
        `INSERT INTO relationship_synastry_generations
          (id, relationship_id, requested_by_user_id, mode,
           request_sha256, response_sha256, result_json, created_at)
         SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8
         WHERE EXISTS (
           SELECT 1
           FROM relationship_invitations r
           WHERE r.id = ?2 AND r.status = 'active'
             AND EXISTS (
               SELECT 1 FROM relationship_participants actor
               WHERE actor.relationship_id = r.id
                 AND actor.user_id = ?3
                 AND actor.consent_status = 'active'
                 AND actor.consented_at IS NOT NULL
                 AND actor.revoked_at IS NULL
             )
             AND 2 = (
               SELECT COUNT(*)
               FROM relationship_participants p
               JOIN subjects owned ON owned.id = p.subject_id AND owned.user_id = p.user_id
               WHERE p.relationship_id = r.id
                 AND p.consent_status = 'active'
                 AND p.consented_at IS NOT NULL
                 AND p.revoked_at IS NULL
             )
         )`,
      )
      .bind(
        input.generationId,
        input.relationshipId,
        input.actorUserId,
        input.payload.mode,
        requestSha,
        responseSha,
        resultJson,
        input.now,
      ),
    db
      .prepare(
        `INSERT INTO relationship_reading_grants
          (generation_id, relationship_id, user_id, subject_id, visibility, granted_at)
         SELECT ?1, p.relationship_id, p.user_id, p.subject_id, 'participant', ?3
         FROM relationship_participants p
         JOIN relationship_synastry_generations g
           ON g.id = ?1 AND g.relationship_id = p.relationship_id
         WHERE p.relationship_id = ?2
           AND p.consent_status = 'active'
           AND p.consented_at IS NOT NULL
           AND p.revoked_at IS NULL`,
      )
      .bind(input.generationId, input.relationshipId, input.now),
    db
      .prepare(
        `INSERT INTO relationship_generation_audit
          (id, generation_id, relationship_id, actor_user_id, event, created_at)
         SELECT ?1, ?2, ?3, ?4, 'committed', ?5
         WHERE EXISTS (
           SELECT 1 FROM relationship_synastry_generations WHERE id = ?2
         )`,
      )
      .bind(auditId, input.generationId, input.relationshipId, input.actorUserId, input.now),
  ])
  if (
    (results[0].meta?.changes ?? 0) !== 1 ||
    (results[1].meta?.changes ?? 0) !== 2 ||
    (results[2].meta?.changes ?? 0) !== 1
  ) {
    throw new SynastryError(
      'CONSENT_CHANGED',
      'participant consent changed before the reading grant could be committed',
      403,
    )
  }
}

interface GrantedSynastryReadingRow {
  id: string
  relationship_id: string
  mode: 'synastry'
  response_sha256: string
  result_json: string
  created_at: number
  visibility: 'participant'
  granted_at: number
}

/**
 * List only the canonical generations explicitly granted to this actor.
 * Active consent is intentionally not consulted: revocation blocks future
 * generation while preserving each participant's historical reading access.
 */
export async function listGrantedSynastryReadings(
  db: D1Database,
  actorUserId: string,
  relationshipId: string,
): Promise<GrantedSynastryReading[]> {
  const { results } = await db
    .prepare(
      `SELECT
         generation.id, generation.relationship_id, generation.mode,
         generation.response_sha256, generation.result_json, generation.created_at,
         grant.visibility, grant.granted_at
       FROM relationship_reading_grants grant
       JOIN relationship_synastry_generations generation
         ON generation.id = grant.generation_id
        AND generation.relationship_id = grant.relationship_id
       WHERE grant.relationship_id = ?1 AND grant.user_id = ?2
       ORDER BY generation.created_at DESC, generation.id ASC`,
    )
    .bind(relationshipId, actorUserId)
    .all<GrantedSynastryReadingRow>()

  const readings: GrantedSynastryReading[] = []
  for (const row of results ?? []) {
    const actualSha = await sha256(row.result_json)
    if (actualSha !== row.response_sha256) {
      throw new SynastryError(
        'ARCHIVE_CORRUPT',
        'stored synastry result failed its integrity checksum',
        500,
      )
    }
    let result: unknown
    try {
      result = JSON.parse(row.result_json)
    } catch {
      throw new SynastryError(
        'ARCHIVE_CORRUPT',
        'stored synastry result is not valid JSON',
        500,
      )
    }
    readings.push({
      generationId: row.id,
      relationshipId: row.relationship_id,
      mode: row.mode,
      responseSha256: row.response_sha256,
      result,
      visibility: row.visibility,
      createdAt: new Date(row.created_at).toISOString(),
      grantedAt: new Date(row.granted_at).toISOString(),
    })
  }
  return readings
}

export async function generateConsentedSynastry(input: {
  db: D1Database
  actorUserId: string
  relationshipId: string
  request: unknown
  generate: (payload: AssetGenerateRequest) => Promise<unknown>
  now?: number
}): Promise<ConsentedSynastryResult> {
  const parsed = validateConsentedSynastryInput(input.request)
  const before = await authorizeRelationshipGeneration(
    input.db,
    input.actorUserId,
    input.relationshipId,
  )
  const subjects = (await Promise.all(
    before.participants.map((participant) =>
      resolveSubject(
        input.db,
        participant.subjectId,
        participant.userId,
        participant.role,
      ),
    ),
  )) as [SubjectInput, SubjectInput]

  const payload: AssetGenerateRequest = {
    mode: 'synastry',
    ...(parsed.report_level ? { report_level: parsed.report_level } : {}),
    ...(parsed.language ? { language: parsed.language } : {}),
    ...(parsed.consciousness_level !== undefined
      ? { consciousness_level: parsed.consciousness_level }
      : {}),
    subjects,
    relationship_context: parsed.relationship_context,
    ...(parsed.options ? { options: parsed.options } : {}),
  }
  const result = await input.generate(payload)

  const after = await authorizeRelationshipGeneration(
    input.db,
    input.actorUserId,
    input.relationshipId,
  )
  if (!sameAuthorization(before, after)) {
    throw new SynastryError(
      'CONSENT_CHANGED',
      'participant consent changed while the reading was generating',
      403,
    )
  }

  const generationId = crypto.randomUUID()
  await commitParticipantGrants(input.db, {
    generationId,
    relationshipId: input.relationshipId,
    actorUserId: input.actorUserId,
    payload,
    result,
    now: input.now ?? Date.now(),
  })
  return {
    generationId,
    relationshipId: input.relationshipId,
    result,
    grants: after.participants.map((participant) => ({
      userId: participant.userId,
      subjectId: participant.subjectId,
      visibility: 'participant',
    })),
  }
}

export async function generateSynastryThroughSelemene(
  payload: AssetGenerateRequest,
  options: {
    baseUrl: string
    apiKey: string
    timeoutMs?: number
  },
): Promise<unknown> {
  const controller = options.timeoutMs ? new AbortController() : undefined
  const timer =
    controller && options.timeoutMs
      ? setTimeout(() => controller.abort(), options.timeoutMs)
      : undefined
  try {
    const response = await fetch(
      `${options.baseUrl.replace(/\/+$/, '')}/api/v1/assets/generate`,
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          ...(options.apiKey ? { 'x-api-key': options.apiKey } : {}),
        },
        body: JSON.stringify(payload),
        ...(controller ? { signal: controller.signal } : {}),
      },
    )
    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 400)
      throw new SynastryError(
        'ENGINE_REJECTED',
        `Selemene rejected synastry generation (${response.status})${detail ? `: ${detail}` : ''}`,
        response.status,
      )
    }
    try {
      return await response.json()
    } catch {
      throw new SynastryError(
        'ENGINE_REJECTED',
        'Selemene returned a non-JSON synastry response',
        502,
      )
    }
  } catch (error) {
    if (error instanceof SynastryError) throw error
    const timedOut = controller?.signal.aborted
    throw new SynastryError(
      'ENGINE_UNAVAILABLE',
      timedOut
        ? 'Selemene synastry generation timed out'
        : `Selemene synastry generation failed: ${String((error as Error)?.message || error)}`,
      timedOut ? 504 : 502,
    )
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}
