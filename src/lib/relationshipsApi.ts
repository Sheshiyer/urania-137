/**
 * Typed SPA client for the consent-gated cross-account relationship routes.
 *
 * The route contract intentionally mirrors functions/lib/relationships.ts.
 * Until route wiring deploys, callers should surface RelationshipApiError as
 * an unavailable state rather than implying that consent changed.
 */

export type RelationshipStatus = 'pending' | 'active' | 'declined' | 'revoked' | 'expired'
export type RelationshipRole = 'inviter' | 'invitee'
export type ParticipantConsentStatus = 'pending' | 'active' | 'declined' | 'revoked'

export interface RelationshipParticipant {
  role: RelationshipRole
  userId: string
  subjectId: string
  consentStatus: ParticipantConsentStatus
  consentedAt: string | null
  revokedAt: string | null
}

export interface Relationship {
  id: string
  status: RelationshipStatus
  inviteeEmail: string
  expiresAt: string
  acceptedAt: string | null
  declinedAt: string | null
  revokedAt: string | null
  createdAt: string
  updatedAt: string
  participants: RelationshipParticipant[]
}

export interface CreateRelationshipInvitationInput {
  subjectId: string
  inviteeEmail: string
  expiresAt?: number
}

export interface CreatedRelationshipInvitation {
  relationship: Relationship
  /** Opaque one-time value. It is absent from list and every later response. */
  inviteToken: string
}

export interface RelationshipGenerationRequest {
  relationship_context: {
    type: string
    mapping_goal: string
    sensitivity_level: string
  }
  language?: string
  report_level?: 'L0' | 'L1' | 'L2' | 'L3'
  consciousness_level?: number
  options?: Record<string, unknown>
}

export interface RelationshipGenerationResponse {
  generationId: string
  relationshipId: string
  result: unknown
  grants: unknown
}

export class RelationshipApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'RelationshipApiError'
    this.status = status
    this.code = code
  }
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
  fetchImpl: FetchLike = fetch,
): Promise<T> {
  const response = await fetchImpl(path, {
    credentials: 'include',
    ...init,
    headers: {
      accept: 'application/json',
      ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(init.headers ?? {}),
    },
  })
  if (!response.ok) {
    let code = 'RELATIONSHIP_API_ERROR'
    let message = `Relationship request failed (${response.status})`
    try {
      const body = (await response.json()) as { error?: string; code?: string; message?: string }
      code = body.code || body.error || code
      message = body.message || message
    } catch {
      // Preserve the HTTP fallback for non-JSON edge responses.
    }
    throw new RelationshipApiError(response.status, code, message)
  }
  return (await response.json()) as T
}

/** GET /api/relationships — participant-visible and intended-email invitations. */
export async function listRelationships(fetchImpl?: FetchLike): Promise<Relationship[]> {
  const body = await requestJson<{ relationships: Relationship[] }>(
    '/api/relationships',
    {},
    fetchImpl,
  )
  return body.relationships
}

/** POST /api/relationships — returns the opaque invitation token exactly once. */
export function createRelationshipInvitation(
  input: CreateRelationshipInvitationInput,
  fetchImpl?: FetchLike,
): Promise<CreatedRelationshipInvitation> {
  return requestJson(
    '/api/relationships',
    { method: 'POST', body: JSON.stringify(input) },
    fetchImpl,
  )
}

/** POST /api/relationships/accept — binds the caller's owned subject. */
export function acceptRelationshipInvitation(
  inviteToken: string,
  subjectId: string,
  fetchImpl?: FetchLike,
): Promise<Relationship> {
  return requestJson<{ relationship: Relationship }>(
    '/api/relationships/accept',
    { method: 'POST', body: JSON.stringify({ inviteToken, subjectId }) },
    fetchImpl,
  ).then((body) => body.relationship)
}

/** POST /api/relationships/decline — no subject disclosure is required. */
export function declineRelationshipInvitation(
  inviteToken: string,
  fetchImpl?: FetchLike,
): Promise<Relationship> {
  return requestJson<{ relationship: Relationship }>(
    '/api/relationships/decline',
    { method: 'POST', body: JSON.stringify({ inviteToken }) },
    fetchImpl,
  ).then((body) => body.relationship)
}

/** POST /api/relationships/:id/revoke — future generation is denied. */
export function revokeRelationship(
  relationshipId: string,
  fetchImpl?: FetchLike,
): Promise<Relationship> {
  return requestJson<{ relationship: Relationship }>(
    `/api/relationships/${encodeURIComponent(relationshipId)}/revoke`,
    { method: 'POST' },
    fetchImpl,
  ).then((body) => body.relationship)
}

/**
 * Optional generation route. The Settings UI intentionally does not call it:
 * active relationships return to the Union Mirror graph and enter through chat.
 */
export function generateRelationshipReading(
  relationshipId: string,
  input: RelationshipGenerationRequest,
  fetchImpl?: FetchLike,
): Promise<RelationshipGenerationResponse> {
  return requestJson(
    `/api/relationships/${encodeURIComponent(relationshipId)}/generate`,
    { method: 'POST', body: JSON.stringify(input) },
    fetchImpl,
  )
}
