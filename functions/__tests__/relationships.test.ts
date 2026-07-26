/**
 * Consent-gated cross-account relationship domain tests.
 *
 * The fake implements exactly the normalized D1 statements issued by
 * functions/lib/relationships.ts, matching the repository's existing focused
 * DAL convention. Its exposed maps provide negative evidence that plaintext
 * invite tokens and cross-owner subject ids never reach persistence.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import type { D1Database } from '@cloudflare/workers-types'
import {
  acceptRelationshipInvitation,
  authorizeRelationshipGeneration,
  createRelationshipInvitation,
  declineRelationshipInvitation,
  listRelationships,
  revokeRelationship,
  type RelationshipInvitationRow,
  type RelationshipParticipantRow,
} from '../lib/relationships'

const ok = (changes: number) => ({
  success: true,
  meta: { changes, duration: 0, last_row_id: 0, served_by: 'fake' },
})

interface OwnedSubject {
  id: string
  user_id: string
}

function makeRelationshipD1() {
  const subjects = new Map<string, OwnedSubject>()
  const invitations = new Map<string, RelationshipInvitationRow>()
  const participants = new Map<string, RelationshipParticipantRow>()
  const participantKey = (relationshipId: string, role: string) => `${relationshipId}:${role}`

  function participantRows(relationshipId: string): RelationshipParticipantRow[] {
    return [...participants.values()].filter((row) => row.relationship_id === relationshipId)
  }

  function flattened(row: RelationshipInvitationRow, participant: RelationshipParticipantRow | null) {
    return {
      ...row,
      invite_token_hash: null,
      participant_relationship_id: participant?.relationship_id ?? null,
      participant_role: participant?.role ?? null,
      participant_user_id: participant?.user_id ?? null,
      participant_subject_id: participant?.subject_id ?? null,
      participant_consent_status: participant?.consent_status ?? null,
      participant_consented_at: participant?.consented_at ?? null,
      participant_revoked_at: participant?.revoked_at ?? null,
      participant_created_at: participant?.created_at ?? null,
      participant_updated_at: participant?.updated_at ?? null,
    }
  }

  function flattenInvitation(row: RelationshipInvitationRow) {
    const rows = participantRows(row.id)
    return rows.length > 0 ? rows.map((participant) => flattened(row, participant)) : [flattened(row, null)]
  }

  function run(sql: string, args: unknown[]) {
    if (sql.startsWith('INSERT INTO relationship_invitations')) {
      const [id, created_by_user_id, invitee_email, invite_token_hash, expires_at, now] = args as [
        string,
        string,
        string,
        string,
        number,
        number,
      ]
      invitations.set(id, {
        id,
        created_by_user_id,
        invitee_email,
        invite_token_hash,
        status: 'pending',
        expires_at,
        accepted_at: null,
        declined_at: null,
        revoked_at: null,
        created_at: now,
        updated_at: now,
      })
      return ok(1)
    }
    if (sql.startsWith('INSERT INTO relationship_participants') && sql.includes("VALUES (?1, 'inviter'")) {
      const [relationship_id, user_id, subject_id, now] = args as [string, string, string, number]
      participants.set(participantKey(relationship_id, 'inviter'), {
        relationship_id,
        role: 'inviter',
        user_id,
        subject_id,
        consent_status: 'active',
        consented_at: now,
        revoked_at: null,
        created_at: now,
        updated_at: now,
      })
      return ok(1)
    }
    if (sql.startsWith('INSERT INTO relationship_participants') && sql.includes("SELECT ?1, 'invitee'")) {
      const [relationship_id, user_id, subject_id, now, tokenHash] = args as [string, string, string, number, string]
      const invitation = invitations.get(relationship_id)
      if (
        !invitation ||
        invitation.status !== 'pending' ||
        invitation.invite_token_hash !== tokenHash ||
        invitation.expires_at <= now
      ) {
        return ok(0)
      }
      participants.set(participantKey(relationship_id, 'invitee'), {
        relationship_id,
        role: 'invitee',
        user_id,
        subject_id,
        consent_status: 'active',
        consented_at: now,
        revoked_at: null,
        created_at: now,
        updated_at: now,
      })
      return ok(1)
    }
    if (sql.startsWith("UPDATE relationship_invitations SET status = 'active'")) {
      const [id, now, tokenHash] = args as [string, number, string]
      const row = invitations.get(id)
      if (!row || row.status !== 'pending' || row.invite_token_hash !== tokenHash || row.expires_at <= now) return ok(0)
      Object.assign(row, { status: 'active', accepted_at: now, invite_token_hash: null, updated_at: now })
      return ok(1)
    }
    if (sql.startsWith("UPDATE relationship_invitations SET status = 'declined'")) {
      const [id, now, tokenHash] = args as [string, number, string]
      const row = invitations.get(id)
      if (!row || row.status !== 'pending' || row.invite_token_hash !== tokenHash) return ok(0)
      Object.assign(row, { status: 'declined', declined_at: now, invite_token_hash: null, updated_at: now })
      return ok(1)
    }
    if (sql.startsWith("UPDATE relationship_invitations SET status = 'revoked'")) {
      const [id, , now] = args as [string, string, number]
      const row = invitations.get(id)
      if (!row || (row.status !== 'pending' && row.status !== 'active')) return ok(0)
      Object.assign(row, { status: 'revoked', revoked_at: now, invite_token_hash: null, updated_at: now })
      return ok(1)
    }
    if (sql.startsWith("UPDATE relationship_participants SET consent_status = 'revoked'")) {
      const [relationshipId, userId, now] = args as [string, string, number]
      const row = participantRows(relationshipId).find(
        (participant) => participant.user_id === userId && participant.consent_status === 'active',
      )
      if (!row) return ok(0)
      Object.assign(row, { consent_status: 'revoked', revoked_at: now, updated_at: now })
      return ok(1)
    }
    if (
      sql.startsWith("UPDATE relationship_invitations SET status = 'expired'") &&
      sql.includes('WHERE id = ?1')
    ) {
      const [id, now] = args as [string, number]
      const row = invitations.get(id)
      if (!row || row.status !== 'pending') return ok(0)
      Object.assign(row, { status: 'expired', invite_token_hash: null, updated_at: now })
      return ok(1)
    }
    if (sql.startsWith("UPDATE relationship_invitations SET status = 'expired'")) {
      const [userId, email, now] = args as [string, string, number]
      let changes = 0
      for (const row of invitations.values()) {
        const visible =
          row.created_by_user_id === userId ||
          row.invitee_email === email ||
          participantRows(row.id).some((participant) => participant.user_id === userId)
        if (visible && row.status === 'pending' && row.expires_at <= now) {
          Object.assign(row, { status: 'expired', invite_token_hash: null, updated_at: now })
          changes += 1
        }
      }
      return ok(changes)
    }
    throw new Error(`relationship fake: unsupported run SQL: ${sql}`)
  }

  function first(sql: string, args: unknown[]): unknown | null {
    if (sql.startsWith('SELECT id FROM subjects')) {
      const row = subjects.get(args[0] as string)
      return row && row.user_id === args[1] ? { id: row.id } : null
    }
    if (sql.startsWith('SELECT * FROM relationship_invitations WHERE invite_token_hash')) {
      const row = [...invitations.values()].find((invitation) => invitation.invite_token_hash === args[0])
      return row ? { ...row } : null
    }
    if (sql.startsWith('SELECT r.*, actor.role AS actor_role')) {
      const [relationshipId, userId] = args as [string, string]
      const row = invitations.get(relationshipId)
      const actor = participantRows(relationshipId).find((participant) => participant.user_id === userId)
      return row && actor ? { ...row, actor_role: actor.role } : null
    }
    throw new Error(`relationship fake: unsupported first SQL: ${sql}`)
  }

  function all(sql: string, args: unknown[]): unknown[] {
    if (sql.includes('FROM relationship_invitations r LEFT JOIN relationship_participants p')) {
      if (sql.includes('WHERE r.id = ?1')) {
        const row = invitations.get(args[0] as string)
        return row ? flattenInvitation(row) : []
      }
      const [userId, email] = args as [string, string]
      return [...invitations.values()]
        .filter(
          (row) =>
            row.created_by_user_id === userId ||
            row.invitee_email === email ||
            participantRows(row.id).some((participant) => participant.user_id === userId),
        )
        .sort((a, b) => b.created_at - a.created_at || a.id.localeCompare(b.id))
        .flatMap(flattenInvitation)
    }
    if (sql.includes('FROM relationship_participants p JOIN relationship_invitations r')) {
      const [relationshipId, actorUserId] = args as [string, string]
      const invitation = invitations.get(relationshipId)
      const rows = participantRows(relationshipId)
      const actor = rows.find(
        (participant) =>
          participant.user_id === actorUserId &&
          participant.consent_status === 'active' &&
          participant.revoked_at === null,
      )
      if (!invitation || invitation.status !== 'active' || !actor) return []
      return rows
        .filter((participant) => {
          const subject = subjects.get(participant.subject_id)
          return subject?.user_id === participant.user_id
        })
        .map((participant) => ({ ...participant }))
    }
    throw new Error(`relationship fake: unsupported all SQL: ${sql}`)
  }

  const db = {
    prepare(rawSql: string) {
      const sql = rawSql.replace(/\s+/g, ' ').trim()
      return {
        bind(...args: unknown[]) {
          return {
            run: () => Promise.resolve(run(sql, args)),
            first: <T>() => Promise.resolve((first(sql, args) ?? null) as T | null),
            all: <T>() => Promise.resolve({ results: all(sql, args) as T[], success: true, meta: ok(0).meta }),
          }
        },
      }
    },
    async batch(statements: { run: () => Promise<{ meta?: { changes?: number } }> }[]) {
      const results = []
      for (const statement of statements) results.push(await statement.run())
      return results
    },
  }
  return { db, subjects, invitations, participants }
}

const A = { userId: 'user-a', email: 'A@example.com' }
const B = { userId: 'user-b', email: 'b@example.com' }
const C = { userId: 'user-c', email: 'c@example.com' }
const NOW = 1_800_000_000_000

let fake: ReturnType<typeof makeRelationshipD1>
let db: D1Database

beforeEach(() => {
  fake = makeRelationshipD1()
  db = fake.db as unknown as D1Database
  fake.subjects.set('subject-a', { id: 'subject-a', user_id: A.userId })
  fake.subjects.set('subject-b', { id: 'subject-b', user_id: B.userId })
  fake.subjects.set('subject-c', { id: 'subject-c', user_id: C.userId })
})

async function create(expiresAt = NOW + 60_000) {
  return createRelationshipInvitation(
    db,
    A,
    { subjectId: 'subject-a', inviteeEmail: '  B@EXAMPLE.COM ', expiresAt },
    NOW,
  )
}

describe('relationship invitations', () => {
  it('returns an opaque token once, stores only its hash, and never lists either token form', async () => {
    const created = await create()
    expect(created.inviteToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(created.relationship).toMatchObject({
      status: 'pending',
      inviteeEmail: 'b@example.com',
      participants: [{ role: 'inviter', userId: A.userId, subjectId: 'subject-a', consentStatus: 'active' }],
    })

    const stored = fake.invitations.get(created.relationship.id)
    expect(stored?.invite_token_hash).toMatch(/^[a-f0-9]{64}$/)
    expect(stored?.invite_token_hash).not.toBe(created.inviteToken)
    expect(JSON.stringify(await listRelationships(db, A, NOW))).not.toContain(created.inviteToken)
    expect(JSON.stringify(await listRelationships(db, A, NOW))).not.toContain(stored?.invite_token_hash)
  })

  it('enforces inviter subject ownership and rejects self-addressed cross-account invitations', async () => {
    await expect(
      createRelationshipInvitation(
        db,
        A,
        { subjectId: 'subject-b', inviteeEmail: B.email, expiresAt: NOW + 60_000 },
        NOW,
      ),
    ).rejects.toMatchObject({ code: 'SUBJECT_NOT_OWNED' })
    await expect(
      createRelationshipInvitation(
        db,
        A,
        { subjectId: 'subject-a', inviteeEmail: 'a@EXAMPLE.com', expiresAt: NOW + 60_000 },
        NOW,
      ),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    expect(fake.invitations.size).toBe(0)
  })

  it('requires the intended authenticated email and the invitee personally owned subject', async () => {
    const { inviteToken, relationship } = await create()
    await expect(
      acceptRelationshipInvitation(db, C, inviteToken, 'subject-c', NOW + 1),
    ).rejects.toMatchObject({ code: 'INVITATION_EMAIL_MISMATCH' })
    await expect(
      acceptRelationshipInvitation(db, B, inviteToken, 'subject-a', NOW + 2),
    ).rejects.toMatchObject({ code: 'SUBJECT_NOT_OWNED' })
    expect(fake.invitations.get(relationship.id)?.status).toBe('pending')
    expect(fake.participants.size).toBe(1)
  })

  it('accepts once, activates both participants, and authorizes only either participant', async () => {
    const { inviteToken, relationship: pending } = await create()
    const active = await acceptRelationshipInvitation(db, B, inviteToken, 'subject-b', NOW + 10)
    expect(active.status).toBe('active')
    expect(active.acceptedAt).toBe(new Date(NOW + 10).toISOString())
    expect(active.participants).toEqual([
      expect.objectContaining({ role: 'inviter', userId: A.userId, subjectId: 'subject-a', consentStatus: 'active' }),
      expect.objectContaining({ role: 'invitee', userId: B.userId, subjectId: 'subject-b', consentStatus: 'active' }),
    ])
    expect(fake.invitations.get(pending.id)?.invite_token_hash).toBeNull()

    await expect(
      acceptRelationshipInvitation(db, B, inviteToken, 'subject-b', NOW + 11),
    ).rejects.toMatchObject({ code: 'INVITATION_NOT_FOUND' })
    await expect(authorizeRelationshipGeneration(db, C.userId, pending.id)).rejects.toMatchObject({
      code: 'CONSENT_REQUIRED',
    })
    await expect(authorizeRelationshipGeneration(db, A.userId, pending.id)).resolves.toEqual({
      relationshipId: pending.id,
      participants: [
        { role: 'inviter', userId: A.userId, subjectId: 'subject-a' },
        { role: 'invitee', userId: B.userId, subjectId: 'subject-b' },
      ],
    })
    await expect(authorizeRelationshipGeneration(db, B.userId, pending.id)).resolves.toBeTruthy()
  })

  it('declines once as the intended recipient and permanently denies generation', async () => {
    const { inviteToken, relationship } = await create()
    const declined = await declineRelationshipInvitation(db, B, inviteToken, NOW + 20)
    expect(declined.status).toBe('declined')
    expect(declined.declinedAt).toBe(new Date(NOW + 20).toISOString())
    expect(declined.participants).toHaveLength(1)
    await expect(declineRelationshipInvitation(db, B, inviteToken, NOW + 21)).rejects.toMatchObject({
      code: 'INVITATION_NOT_FOUND',
    })
    await expect(authorizeRelationshipGeneration(db, A.userId, relationship.id)).rejects.toMatchObject({
      code: 'CONSENT_REQUIRED',
    })
  })

  it('lets the inviter revoke pending and either participant revoke active consent', async () => {
    const pending = await create()
    const revokedPending = await revokeRelationship(db, A.userId, pending.relationship.id, NOW + 30)
    expect(revokedPending.status).toBe('revoked')
    expect(revokedPending.participants[0]).toMatchObject({ consentStatus: 'revoked' })
    await expect(revokeRelationship(db, B.userId, pending.relationship.id, NOW + 31)).rejects.toMatchObject({
      code: 'NOT_PARTICIPANT',
    })

    const second = await create(NOW + 120_000)
    await acceptRelationshipInvitation(db, B, second.inviteToken, 'subject-b', NOW + 40)
    const revokedActive = await revokeRelationship(db, B.userId, second.relationship.id, NOW + 50)
    expect(revokedActive.status).toBe('revoked')
    expect(revokedActive.participants.find((participant) => participant.role === 'invitee')).toMatchObject({
      consentStatus: 'revoked',
      revokedAt: new Date(NOW + 50).toISOString(),
    })
    await expect(authorizeRelationshipGeneration(db, A.userId, second.relationship.id)).rejects.toMatchObject({
      code: 'CONSENT_REQUIRED',
    })
  })

  it('moves overdue pending invitations to expired and clears the one-time hash', async () => {
    const first = await create(NOW + 5)
    await expect(
      acceptRelationshipInvitation(db, B, first.inviteToken, 'subject-b', NOW + 5),
    ).rejects.toMatchObject({ code: 'INVITATION_EXPIRED' })
    expect(fake.invitations.get(first.relationship.id)).toMatchObject({ status: 'expired', invite_token_hash: null })

    const second = await create(NOW + 10)
    const listed = await listRelationships(db, A, NOW + 11)
    expect(listed.find((relationship) => relationship.id === second.relationship.id)?.status).toBe('expired')
    expect(fake.invitations.get(second.relationship.id)?.invite_token_hash).toBeNull()
  })

  it('lists only participant or intended-email relationships', async () => {
    const invitation = await create()
    expect((await listRelationships(db, B, NOW)).map((relationship) => relationship.id)).toEqual([
      invitation.relationship.id,
    ])
    expect(await listRelationships(db, C, NOW)).toEqual([])
    await acceptRelationshipInvitation(db, B, invitation.inviteToken, 'subject-b', NOW + 1)
    expect((await listRelationships(db, A, NOW + 2)).map((relationship) => relationship.id)).toEqual([
      invitation.relationship.id,
    ])
    expect((await listRelationships(db, B, NOW + 2)).map((relationship) => relationship.id)).toEqual([
      invitation.relationship.id,
    ])
  })

  it('denies generation if a bound subject disappears despite an active relationship row', async () => {
    const invitation = await create()
    await acceptRelationshipInvitation(db, B, invitation.inviteToken, 'subject-b', NOW + 1)
    fake.subjects.delete('subject-b')
    await expect(authorizeRelationshipGeneration(db, A.userId, invitation.relationship.id)).rejects.toMatchObject({
      code: 'CONSENT_REQUIRED',
    })
  })
})
