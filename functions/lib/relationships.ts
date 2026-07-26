/**
 * Consent-gated cross-account relationship domain layer.
 *
 * Every participant subject is selected server-side through an ownership
 * query. Invitations are bearer capabilities whose opaque value is returned
 * only from createRelationshipInvitation; D1 stores only a SHA-256 hash and
 * clears it on every terminal transition. The existing same-owner subject
 * dyad path does not call this module and is intentionally unchanged.
 */
import type { D1Database } from '@cloudflare/workers-types'

export type RelationshipStatus = 'pending' | 'active' | 'declined' | 'revoked' | 'expired'
export type RelationshipRole = 'inviter' | 'invitee'
export type ParticipantConsentStatus = 'pending' | 'active' | 'declined' | 'revoked'

export interface RelationshipActor {
  userId: string
  email: string
}

export interface RelationshipInvitationRow {
  id: string
  created_by_user_id: string
  invitee_email: string
  invite_token_hash: string | null
  status: RelationshipStatus
  expires_at: number
  accepted_at: number | null
  declined_at: number | null
  revoked_at: number | null
  created_at: number
  updated_at: number
}

export interface RelationshipParticipantRow {
  relationship_id: string
  role: RelationshipRole
  user_id: string
  subject_id: string
  consent_status: ParticipantConsentStatus
  consented_at: number | null
  revoked_at: number | null
  created_at: number
  updated_at: number
}

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
  /** Unix milliseconds. Defaults to seven days after creation. */
  expiresAt?: number
}

export interface CreatedRelationshipInvitation {
  relationship: Relationship
  /** Opaque bearer token. This is the only domain result that contains it. */
  inviteToken: string
}

export interface RelationshipGenerationAuthorization {
  relationshipId: string
  participants: [
    { role: 'inviter'; userId: string; subjectId: string },
    { role: 'invitee'; userId: string; subjectId: string },
  ]
}

export type RelationshipErrorCode =
  | 'INVALID_INPUT'
  | 'SUBJECT_NOT_OWNED'
  | 'INVITATION_NOT_FOUND'
  | 'INVITATION_EMAIL_MISMATCH'
  | 'INVITATION_EXPIRED'
  | 'INVALID_TRANSITION'
  | 'RELATIONSHIP_NOT_FOUND'
  | 'NOT_PARTICIPANT'
  | 'CONSENT_REQUIRED'

export class RelationshipError extends Error {
  readonly code: RelationshipErrorCode

  constructor(code: RelationshipErrorCode, message: string) {
    super(message)
    this.name = 'RelationshipError'
    this.code = code
  }
}

const DEFAULT_INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1_000
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function iso(value: number | null): string | null {
  return value === null ? null : new Date(value).toISOString()
}

function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase()
  if (!EMAIL_RE.test(normalized)) {
    throw new RelationshipError('INVALID_INPUT', 'invitee email must be a valid email address')
  }
  return normalized
}

function validateActor(actor: RelationshipActor): RelationshipActor {
  if (!actor.userId.trim()) throw new RelationshipError('INVALID_INPUT', 'authenticated user id is required')
  return { userId: actor.userId, email: normalizeEmail(actor.email) }
}

function validateToken(token: string): string {
  const value = token.trim()
  if (value.length < 32 || value.length > 512) {
    throw new RelationshipError('INVITATION_NOT_FOUND', 'invitation token is invalid')
  }
  return value
}

function opaqueToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '')
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function assertSubjectOwned(db: D1Database, userId: string, subjectId: string): Promise<void> {
  if (!subjectId.trim()) throw new RelationshipError('INVALID_INPUT', 'subject id is required')
  const owned = await db
    .prepare(`SELECT id FROM subjects WHERE id = ?1 AND user_id = ?2`)
    .bind(subjectId, userId)
    .first<{ id: string }>()
  if (!owned) {
    throw new RelationshipError('SUBJECT_NOT_OWNED', 'subject is not owned by the authenticated user')
  }
}

function participantFromRow(row: RelationshipParticipantRow): RelationshipParticipant {
  return {
    role: row.role,
    userId: row.user_id,
    subjectId: row.subject_id,
    consentStatus: row.consent_status,
    consentedAt: iso(row.consented_at),
    revokedAt: iso(row.revoked_at),
  }
}

function relationshipFromRow(
  row: RelationshipInvitationRow,
  participants: RelationshipParticipantRow[],
): Relationship {
  return {
    id: row.id,
    status: row.status,
    inviteeEmail: row.invitee_email,
    expiresAt: new Date(row.expires_at).toISOString(),
    acceptedAt: iso(row.accepted_at),
    declinedAt: iso(row.declined_at),
    revokedAt: iso(row.revoked_at),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    participants: participants
      .slice()
      .sort((a, b) => (a.role === b.role ? 0 : a.role === 'inviter' ? -1 : 1))
      .map(participantFromRow),
  }
}

/**
 * Create a pending invitation for a subject owned by the authenticated user.
 * The returned inviteToken is never included by list or any later operation.
 */
export async function createRelationshipInvitation(
  db: D1Database,
  actorInput: RelationshipActor,
  input: CreateRelationshipInvitationInput,
  now = Date.now(),
): Promise<CreatedRelationshipInvitation> {
  const actor = validateActor(actorInput)
  const inviteeEmail = normalizeEmail(input.inviteeEmail)
  if (inviteeEmail === actor.email) {
    throw new RelationshipError('INVALID_INPUT', 'cross-account invitations must target a different email')
  }
  await assertSubjectOwned(db, actor.userId, input.subjectId)

  const expiresAt = input.expiresAt ?? now + DEFAULT_INVITATION_TTL_MS
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) {
    throw new RelationshipError('INVALID_INPUT', 'invitation expiry must be a future unix-millisecond timestamp')
  }

  const id = crypto.randomUUID()
  const inviteToken = opaqueToken()
  const tokenHash = await sha256Hex(inviteToken)
  const statements = [
    db
      .prepare(
        `INSERT INTO relationship_invitations
          (id, created_by_user_id, invitee_email, invite_token_hash, status, expires_at,
           accepted_at, declined_at, revoked_at, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 'pending', ?5, NULL, NULL, NULL, ?6, ?6)`,
      )
      .bind(id, actor.userId, inviteeEmail, tokenHash, expiresAt, now),
    db
      .prepare(
        `INSERT INTO relationship_participants
          (relationship_id, role, user_id, subject_id, consent_status,
           consented_at, revoked_at, created_at, updated_at)
         VALUES (?1, 'inviter', ?2, ?3, 'active', ?4, NULL, ?4, ?4)`,
      )
      .bind(id, actor.userId, input.subjectId, now),
  ]
  await db.batch(statements)

  const invitationRow: RelationshipInvitationRow = {
    id,
    created_by_user_id: actor.userId,
    invitee_email: inviteeEmail,
    invite_token_hash: null,
    status: 'pending',
    expires_at: expiresAt,
    accepted_at: null,
    declined_at: null,
    revoked_at: null,
    created_at: now,
    updated_at: now,
  }
  const participantRow: RelationshipParticipantRow = {
    relationship_id: id,
    role: 'inviter',
    user_id: actor.userId,
    subject_id: input.subjectId,
    consent_status: 'active',
    consented_at: now,
    revoked_at: null,
    created_at: now,
    updated_at: now,
  }
  return {
    relationship: relationshipFromRow(invitationRow, [participantRow]),
    inviteToken,
  }
}

async function invitationByToken(
  db: D1Database,
  token: string,
): Promise<{ row: RelationshipInvitationRow; tokenHash: string }> {
  const tokenHash = await sha256Hex(validateToken(token))
  const row = await db
    .prepare(`SELECT * FROM relationship_invitations WHERE invite_token_hash = ?1`)
    .bind(tokenHash)
    .first<RelationshipInvitationRow>()
  if (!row) throw new RelationshipError('INVITATION_NOT_FOUND', 'invitation token is invalid or has already been used')
  return { row, tokenHash }
}

async function requireUsableInvitation(
  db: D1Database,
  actorInput: RelationshipActor,
  token: string,
  now: number,
): Promise<{ actor: RelationshipActor; row: RelationshipInvitationRow; tokenHash: string }> {
  const actor = validateActor(actorInput)
  const found = await invitationByToken(db, token)
  if (found.row.invitee_email !== actor.email) {
    throw new RelationshipError('INVITATION_EMAIL_MISMATCH', 'invitation is intended for a different email')
  }
  if (found.row.status !== 'pending') {
    throw new RelationshipError('INVALID_TRANSITION', `invitation is already ${found.row.status}`)
  }
  if (found.row.expires_at <= now) {
    await db
      .prepare(
        `UPDATE relationship_invitations
         SET status = 'expired', invite_token_hash = NULL, updated_at = ?2
         WHERE id = ?1 AND status = 'pending'`,
      )
      .bind(found.row.id, now)
      .run()
    throw new RelationshipError('INVITATION_EXPIRED', 'invitation has expired')
  }
  if (found.row.created_by_user_id === actor.userId) {
    throw new RelationshipError('INVITATION_EMAIL_MISMATCH', 'inviter cannot consume their own invitation')
  }
  return { actor, ...found }
}

/** Accept a pending invitation and bind the invitee's personally owned subject. */
export async function acceptRelationshipInvitation(
  db: D1Database,
  actorInput: RelationshipActor,
  inviteToken: string,
  subjectId: string,
  now = Date.now(),
): Promise<Relationship> {
  const { actor, row, tokenHash } = await requireUsableInvitation(db, actorInput, inviteToken, now)
  await assertSubjectOwned(db, actor.userId, subjectId)

  const results = await db.batch([
    db
      .prepare(
        `INSERT INTO relationship_participants
          (relationship_id, role, user_id, subject_id, consent_status,
           consented_at, revoked_at, created_at, updated_at)
         SELECT ?1, 'invitee', ?2, ?3, 'active', ?4, NULL, ?4, ?4
         WHERE EXISTS (
           SELECT 1 FROM relationship_invitations
           WHERE id = ?1 AND status = 'pending' AND invite_token_hash = ?5 AND expires_at > ?4
         )`,
      )
      .bind(row.id, actor.userId, subjectId, now, tokenHash),
    db
      .prepare(
        `UPDATE relationship_invitations
         SET status = 'active', accepted_at = ?2, invite_token_hash = NULL, updated_at = ?2
         WHERE id = ?1 AND status = 'pending' AND invite_token_hash = ?3 AND expires_at > ?2`,
      )
      .bind(row.id, now, tokenHash),
  ])
  if ((results[0].meta?.changes ?? 0) !== 1 || (results[1].meta?.changes ?? 0) !== 1) {
    throw new RelationshipError('INVALID_TRANSITION', 'invitation changed before it could be accepted')
  }

  const relationships = await listRelationships(db, actor, now)
  const relationship = relationships.find((item) => item.id === row.id)
  if (!relationship) throw new RelationshipError('RELATIONSHIP_NOT_FOUND', 'accepted relationship could not be loaded')
  return relationship
}

/** Decline a pending invitation. Declining does not disclose or require a subject. */
export async function declineRelationshipInvitation(
  db: D1Database,
  actorInput: RelationshipActor,
  inviteToken: string,
  now = Date.now(),
): Promise<Relationship> {
  const { actor, row, tokenHash } = await requireUsableInvitation(db, actorInput, inviteToken, now)
  const result = await db
    .prepare(
      `UPDATE relationship_invitations
       SET status = 'declined', declined_at = ?2, invite_token_hash = NULL, updated_at = ?2
       WHERE id = ?1 AND status = 'pending' AND invite_token_hash = ?3`,
    )
    .bind(row.id, now, tokenHash)
    .run()
  if ((result.meta?.changes ?? 0) !== 1) {
    throw new RelationshipError('INVALID_TRANSITION', 'invitation changed before it could be declined')
  }

  const relationships = await listRelationships(db, actor, now)
  const relationship = relationships.find((item) => item.id === row.id)
  if (!relationship) throw new RelationshipError('RELATIONSHIP_NOT_FOUND', 'declined relationship could not be loaded')
  return relationship
}

interface RelationshipListRow extends RelationshipInvitationRow {
  participant_relationship_id: string | null
  participant_role: RelationshipRole | null
  participant_user_id: string | null
  participant_subject_id: string | null
  participant_consent_status: ParticipantConsentStatus | null
  participant_consented_at: number | null
  participant_revoked_at: number | null
  participant_created_at: number | null
  participant_updated_at: number | null
}

/**
 * List relationships visible to a participant plus pending/declined invites
 * addressed to the actor's normalized email. No token or token hash is selected.
 */
export async function listRelationships(
  db: D1Database,
  actorInput: RelationshipActor,
  now = Date.now(),
): Promise<Relationship[]> {
  const actor = validateActor(actorInput)
  await db
    .prepare(
      `UPDATE relationship_invitations
       SET status = 'expired', invite_token_hash = NULL, updated_at = ?3
       WHERE status = 'pending' AND expires_at <= ?3
         AND (
           created_by_user_id = ?1 OR invitee_email = ?2 OR
           EXISTS (
             SELECT 1 FROM relationship_participants visible
             WHERE visible.relationship_id = relationship_invitations.id AND visible.user_id = ?1
           )
         )`,
    )
    .bind(actor.userId, actor.email, now)
    .run()

  const { results } = await db
    .prepare(
      `SELECT
         r.id, r.created_by_user_id, r.invitee_email, NULL AS invite_token_hash,
         r.status, r.expires_at, r.accepted_at, r.declined_at, r.revoked_at,
         r.created_at, r.updated_at,
         p.relationship_id AS participant_relationship_id,
         p.role AS participant_role,
         p.user_id AS participant_user_id,
         p.subject_id AS participant_subject_id,
         p.consent_status AS participant_consent_status,
         p.consented_at AS participant_consented_at,
         p.revoked_at AS participant_revoked_at,
         p.created_at AS participant_created_at,
         p.updated_at AS participant_updated_at
       FROM relationship_invitations r
       LEFT JOIN relationship_participants p ON p.relationship_id = r.id
       WHERE r.created_by_user_id = ?1 OR r.invitee_email = ?2 OR
         EXISTS (
           SELECT 1 FROM relationship_participants visible
           WHERE visible.relationship_id = r.id AND visible.user_id = ?1
         )
       ORDER BY r.created_at DESC, r.id ASC, p.role ASC`,
    )
    .bind(actor.userId, actor.email)
    .all<RelationshipListRow>()

  const grouped = new Map<string, { row: RelationshipInvitationRow; participants: RelationshipParticipantRow[] }>()
  for (const item of results ?? []) {
    let group = grouped.get(item.id)
    if (!group) {
      group = { row: item, participants: [] }
      grouped.set(item.id, group)
    }
    if (
      item.participant_relationship_id &&
      item.participant_role &&
      item.participant_user_id &&
      item.participant_subject_id &&
      item.participant_consent_status &&
      item.participant_created_at !== null &&
      item.participant_updated_at !== null
    ) {
      group.participants.push({
        relationship_id: item.participant_relationship_id,
        role: item.participant_role,
        user_id: item.participant_user_id,
        subject_id: item.participant_subject_id,
        consent_status: item.participant_consent_status,
        consented_at: item.participant_consented_at,
        revoked_at: item.participant_revoked_at,
        created_at: item.participant_created_at,
        updated_at: item.participant_updated_at,
      })
    }
  }
  return [...grouped.values()].map(({ row, participants }) => relationshipFromRow(row, participants))
}

interface ActorRelationshipRow extends RelationshipInvitationRow {
  actor_role: RelationshipRole
}

/**
 * Revoke a pending invitation as its inviter, or an active grant as either
 * participant. Declined, expired, and already-revoked relationships are final.
 */
export async function revokeRelationship(
  db: D1Database,
  actorUserId: string,
  relationshipId: string,
  now = Date.now(),
): Promise<Relationship> {
  const row = await db
    .prepare(
      `SELECT r.*, actor.role AS actor_role
       FROM relationship_invitations r
       JOIN relationship_participants actor ON actor.relationship_id = r.id
       WHERE r.id = ?1 AND actor.user_id = ?2`,
    )
    .bind(relationshipId, actorUserId)
    .first<ActorRelationshipRow>()
  if (!row) throw new RelationshipError('NOT_PARTICIPANT', 'relationship is not visible to the authenticated user')
  if (row.status !== 'pending' && row.status !== 'active') {
    throw new RelationshipError('INVALID_TRANSITION', `a ${row.status} relationship cannot be revoked`)
  }

  const results = await db.batch([
    db
      .prepare(
        `UPDATE relationship_invitations
         SET status = 'revoked', revoked_at = ?3, invite_token_hash = NULL, updated_at = ?3
         WHERE id = ?1 AND status IN ('pending', 'active')`,
      )
      .bind(relationshipId, actorUserId, now),
    db
      .prepare(
        `UPDATE relationship_participants
         SET consent_status = 'revoked', revoked_at = ?3, updated_at = ?3
         WHERE relationship_id = ?1 AND user_id = ?2 AND consent_status = 'active'`,
      )
      .bind(relationshipId, actorUserId, now),
  ])
  if ((results[0].meta?.changes ?? 0) !== 1) {
    throw new RelationshipError('INVALID_TRANSITION', 'relationship changed before it could be revoked')
  }

  const { results: rows } = await db
    .prepare(
      `SELECT
         r.id, r.created_by_user_id, r.invitee_email, NULL AS invite_token_hash,
         r.status, r.expires_at, r.accepted_at, r.declined_at, r.revoked_at,
         r.created_at, r.updated_at,
         p.relationship_id AS participant_relationship_id,
         p.role AS participant_role,
         p.user_id AS participant_user_id,
         p.subject_id AS participant_subject_id,
         p.consent_status AS participant_consent_status,
         p.consented_at AS participant_consented_at,
         p.revoked_at AS participant_revoked_at,
         p.created_at AS participant_created_at,
         p.updated_at AS participant_updated_at
       FROM relationship_invitations r
       LEFT JOIN relationship_participants p ON p.relationship_id = r.id
       WHERE r.id = ?1
       ORDER BY p.role ASC`,
    )
    .bind(relationshipId)
    .all<RelationshipListRow>()
  if (!rows?.length) throw new RelationshipError('RELATIONSHIP_NOT_FOUND', 'revoked relationship could not be loaded')
  const participantRows = rows
    .filter(
      (item) =>
        item.participant_relationship_id &&
        item.participant_role &&
        item.participant_user_id &&
        item.participant_subject_id &&
        item.participant_consent_status &&
        item.participant_created_at !== null &&
        item.participant_updated_at !== null,
    )
    .map((item) => ({
      relationship_id: item.participant_relationship_id as string,
      role: item.participant_role as RelationshipRole,
      user_id: item.participant_user_id as string,
      subject_id: item.participant_subject_id as string,
      consent_status: item.participant_consent_status as ParticipantConsentStatus,
      consented_at: item.participant_consented_at,
      revoked_at: item.participant_revoked_at,
      created_at: item.participant_created_at as number,
      updated_at: item.participant_updated_at as number,
    }))
  return relationshipFromRow(rows[0], participantRows)
}

/**
 * Resolve the two server-owned subject ids permitted for generation.
 * The caller must itself be an active participant, the relationship must be
 * active, and both inviter and invitee consent rows must remain active and
 * unrevoked. Any missing/cascaded subject row therefore denies generation.
 */
export async function authorizeRelationshipGeneration(
  db: D1Database,
  actorUserId: string,
  relationshipId: string,
): Promise<RelationshipGenerationAuthorization> {
  const { results } = await db
    .prepare(
      `SELECT p.relationship_id, p.role, p.user_id, p.subject_id,
              p.consent_status, p.consented_at, p.revoked_at,
              p.created_at, p.updated_at
       FROM relationship_participants p
       JOIN relationship_invitations r ON r.id = p.relationship_id
       JOIN subjects owned ON owned.id = p.subject_id AND owned.user_id = p.user_id
       WHERE p.relationship_id = ?1 AND r.status = 'active'
         AND EXISTS (
           SELECT 1 FROM relationship_participants actor
           WHERE actor.relationship_id = r.id
             AND actor.user_id = ?2
             AND actor.consent_status = 'active'
             AND actor.revoked_at IS NULL
         )
       ORDER BY p.role ASC`,
    )
    .bind(relationshipId, actorUserId)
    .all<RelationshipParticipantRow>()

  const participants = results ?? []
  if (participants.length === 0) {
    throw new RelationshipError('CONSENT_REQUIRED', 'active consent from both participants is required')
  }
  const inviter = participants.find((participant) => participant.role === 'inviter')
  const invitee = participants.find((participant) => participant.role === 'invitee')
  if (
    participants.length !== 2 ||
    !inviter ||
    !invitee ||
    inviter.consent_status !== 'active' ||
    invitee.consent_status !== 'active' ||
    inviter.consented_at === null ||
    invitee.consented_at === null ||
    inviter.revoked_at !== null ||
    invitee.revoked_at !== null
  ) {
    throw new RelationshipError('CONSENT_REQUIRED', 'active consent from both participants is required')
  }

  return {
    relationshipId,
    participants: [
      { role: 'inviter', userId: inviter.user_id, subjectId: inviter.subject_id },
      { role: 'invitee', userId: invitee.user_id, subjectId: invitee.subject_id },
    ],
  }
}
