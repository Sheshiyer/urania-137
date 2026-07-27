import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { D1Database } from '@cloudflare/workers-types'
import { onRequest } from '../api/[[path]]'
import { revokeRelationship, type RelationshipInvitationRow, type RelationshipParticipantRow } from '../lib/relationships'
import type { SubjectRow } from '../lib/subjects'

const LOCAL = 'http://localhost:8788'
const ENGINE = 'https://engine.example'
const NOW = 1_800_000_000_000

const A = { userId: 'dev:a@example.com', email: 'a@example.com', subjectId: 'subject-a' }
const B = { userId: 'dev:b@example.com', email: 'b@example.com', subjectId: 'subject-b' }
const ADMIN = { userId: 'dev:admin@example.com', email: 'admin@example.com', subjectId: 'subject-admin' }

const ok = (changes: number) => ({
  success: true,
  meta: { changes, duration: 0, last_row_id: 0, served_by: 'fake' },
})

function subject(id: string, userId: string, name: string, role: string): SubjectRow {
  return {
    id,
    user_id: userId,
    role,
    name,
    birth_date: '1990-01-02',
    birth_time: '03:04',
    birth_time_confidence: 'exact',
    birth_location_query: `${name} City`,
    normalized_location: JSON.stringify({
      display_name: `${name} City`,
      latitude: 12.34,
      longitude: 56.78,
      timezone: 'Asia/Kolkata',
      provider: 'fixture',
      confidence: 'high',
    }),
    created_at: NOW,
    updated_at: NOW,
  }
}

function makeRelationshipHttpD1() {
  const users = new Map<string, { id: string; email: string; created_at: number; last_seen_at: number }>()
  const subjects = new Map<string, SubjectRow>()
  const invitations = new Map<string, RelationshipInvitationRow>()
  const participants = new Map<string, RelationshipParticipantRow>()
  const generations = new Map<string, Record<string, unknown>>()
  const grants = new Map<string, Record<string, unknown>>()
  const audits = new Map<string, Record<string, unknown>>()
  const participantKey = (relationshipId: string, role: string) => `${relationshipId}:${role}`
  const participantRows = (relationshipId: string) =>
    [...participants.values()].filter((row) => row.relationship_id === relationshipId)

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

  function flattenedInvitation(row: RelationshipInvitationRow) {
    const rows = participantRows(row.id)
    return rows.length ? rows.map((participant) => flattened(row, participant)) : [flattened(row, null)]
  }

  function relationshipIsActive(relationshipId: string, actorUserId?: string) {
    const invitation = invitations.get(relationshipId)
    const rows = participantRows(relationshipId)
    return (
      invitation?.status === 'active' &&
      rows.length === 2 &&
      rows.every(
        (row) =>
          row.consent_status === 'active' &&
          row.consented_at !== null &&
          row.revoked_at === null &&
          subjects.get(row.subject_id)?.user_id === row.user_id,
      ) &&
      (!actorUserId ||
        rows.some(
          (row) =>
            row.user_id === actorUserId &&
            row.consent_status === 'active' &&
            row.revoked_at === null,
        ))
    )
  }

  function run(sql: string, args: unknown[]) {
    if (sql.startsWith('INSERT INTO users')) {
      const [id, email, now] = args as [string, string, number]
      const existing = users.get(id)
      if (existing) existing.last_seen_at = now
      else users.set(id, { id, email, created_at: now, last_seen_at: now })
      return ok(1)
    }
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
      const [relationship_id, user_id, subject_id, now, tokenHash] = args as [
        string,
        string,
        string,
        number,
        string,
      ]
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
      if (!row || row.status !== 'pending' || row.invite_token_hash !== tokenHash || row.expires_at <= now) {
        return ok(0)
      }
      Object.assign(row, {
        status: 'active',
        accepted_at: now,
        invite_token_hash: null,
        updated_at: now,
      })
      return ok(1)
    }
    if (sql.startsWith("UPDATE relationship_invitations SET status = 'declined'")) {
      const [id, now, tokenHash] = args as [string, number, string]
      const row = invitations.get(id)
      if (!row || row.status !== 'pending' || row.invite_token_hash !== tokenHash) return ok(0)
      Object.assign(row, {
        status: 'declined',
        declined_at: now,
        invite_token_hash: null,
        updated_at: now,
      })
      return ok(1)
    }
    if (sql.startsWith("UPDATE relationship_invitations SET status = 'revoked'")) {
      const [id, , now] = args as [string, string, number]
      const row = invitations.get(id)
      if (!row || !['pending', 'active'].includes(row.status)) return ok(0)
      Object.assign(row, {
        status: 'revoked',
        revoked_at: now,
        invite_token_hash: null,
        updated_at: now,
      })
      return ok(1)
    }
    if (sql.startsWith("UPDATE relationship_participants SET consent_status = 'revoked'")) {
      const [relationshipId, userId, now] = args as [string, string, number]
      const row = participantRows(relationshipId).find(
        (participant) =>
          participant.user_id === userId && participant.consent_status === 'active',
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
      Object.assign(row, {
        status: 'expired',
        invite_token_hash: null,
        updated_at: now,
      })
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
          Object.assign(row, {
            status: 'expired',
            invite_token_hash: null,
            updated_at: now,
          })
          changes += 1
        }
      }
      return ok(changes)
    }
    if (sql.startsWith('INSERT INTO relationship_synastry_generations')) {
      const [id, relationshipId, actorUserId, mode, requestSha, responseSha, resultJson, now] = args as [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        number,
      ]
      if (!relationshipIsActive(relationshipId, actorUserId)) return ok(0)
      generations.set(id, {
        id,
        relationship_id: relationshipId,
        requested_by_user_id: actorUserId,
        mode,
        request_sha256: requestSha,
        response_sha256: responseSha,
        result_json: resultJson,
        created_at: now,
      })
      return ok(1)
    }
    if (sql.startsWith('INSERT INTO relationship_reading_grants')) {
      const [generationId, relationshipId, now] = args as [string, string, number]
      if (!generations.has(generationId) || !relationshipIsActive(relationshipId)) return ok(0)
      for (const row of participantRows(relationshipId)) {
        grants.set(`${generationId}:${row.user_id}`, {
          generation_id: generationId,
          relationship_id: relationshipId,
          user_id: row.user_id,
          subject_id: row.subject_id,
          visibility: 'participant',
          granted_at: now,
        })
      }
      return ok(2)
    }
    if (sql.startsWith('INSERT INTO relationship_generation_audit')) {
      const [id, generationId, relationshipId, actorUserId, now] = args as [
        string,
        string,
        string,
        string,
        number,
      ]
      if (!generations.has(generationId)) return ok(0)
      audits.set(id, {
        id,
        generation_id: generationId,
        relationship_id: relationshipId,
        actor_user_id: actorUserId,
        event: 'committed',
        created_at: now,
      })
      return ok(1)
    }
    throw new Error(`relationship HTTP fake: unsupported run SQL: ${sql}`)
  }

  function first(sql: string, args: unknown[]): unknown | null {
    if (sql.startsWith('SELECT id, email, created_at, last_seen_at FROM users')) {
      return users.get(args[0] as string) ?? null
    }
    if (sql.startsWith('SELECT id FROM subjects')) {
      const row = subjects.get(args[0] as string)
      return row && row.user_id === args[1] ? { id: row.id } : null
    }
    if (sql.startsWith('SELECT * FROM subjects')) {
      const row = subjects.get(args[0] as string)
      return row?.user_id === args[1] ? { ...row } : null
    }
    if (sql.startsWith('SELECT * FROM relationship_invitations WHERE invite_token_hash')) {
      return (
        [...invitations.values()].find(
          (invitation) => invitation.invite_token_hash === args[0],
        ) ?? null
      )
    }
    if (sql.startsWith('SELECT r.*, actor.role AS actor_role')) {
      const [relationshipId, userId] = args as [string, string]
      const row = invitations.get(relationshipId)
      const actor = participantRows(relationshipId).find(
        (participant) => participant.user_id === userId,
      )
      return row && actor ? { ...row, actor_role: actor.role } : null
    }
    throw new Error(`relationship HTTP fake: unsupported first SQL: ${sql}`)
  }

  function all(sql: string, args: unknown[]): unknown[] {
    if (
      sql.includes(
        'FROM relationship_reading_grants grant JOIN relationship_synastry_generations generation',
      )
    ) {
      const [relationshipId, userId] = args as [string, string]
      return [...grants.values()]
        .filter(
          (grant) =>
            grant.relationship_id === relationshipId &&
            grant.user_id === userId,
        )
        .map(
          (grant): Record<string, unknown> => ({
            ...(generations.get(grant.generation_id as string) ?? {}),
            visibility: grant.visibility,
            granted_at: grant.granted_at,
          }),
        )
        .sort((left, right) => (right.created_at as number) - (left.created_at as number))
    }
    if (sql.includes('FROM relationship_invitations r LEFT JOIN relationship_participants p')) {
      if (sql.includes('WHERE r.id = ?1')) {
        const row = invitations.get(args[0] as string)
        return row ? flattenedInvitation(row) : []
      }
      const [userId, email] = args as [string, string]
      return [...invitations.values()]
        .filter(
          (row) =>
            row.created_by_user_id === userId ||
            row.invitee_email === email ||
            participantRows(row.id).some((participant) => participant.user_id === userId),
        )
        .flatMap(flattenedInvitation)
    }
    if (sql.includes('FROM relationship_participants p JOIN relationship_invitations r')) {
      const [relationshipId, actorUserId] = args as [string, string]
      if (!relationshipIsActive(relationshipId, actorUserId)) return []
      return participantRows(relationshipId).map((participant) => ({ ...participant }))
    }
    throw new Error(`relationship HTTP fake: unsupported all SQL: ${sql}`)
  }

  const db = {
    prepare(rawSql: string) {
      const sql = rawSql.replace(/\s+/g, ' ').trim()
      return {
        bind(...args: unknown[]) {
          return {
            run: () => Promise.resolve(run(sql, args)),
            first: <T>() => Promise.resolve((first(sql, args) ?? null) as T | null),
            all: <T>() =>
              Promise.resolve({
                results: all(sql, args) as T[],
                success: true,
                meta: ok(0).meta,
              }),
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

  subjects.set(A.subjectId, subject(A.subjectId, A.userId, 'Asha', 'self'))
  subjects.set(B.subjectId, subject(B.subjectId, B.userId, 'Bela', 'self'))
  subjects.set(
    ADMIN.subjectId,
    subject(ADMIN.subjectId, ADMIN.userId, 'Admin', 'self'),
  )

  return { db: db as unknown as D1Database, subjects, invitations, participants, generations, grants, audits }
}

function makeEnv(db: D1Database, email?: string) {
  return {
    DB: db,
    CF_ACCESS_AUD: 'aud-tag',
    CF_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com',
    SELEMENE_API_KEY: 'server-key',
    SELEMENE_API_URL: ENGINE,
    DEV_IDENTITY_EMAIL: email,
  }
}

function request(
  path: string,
  method = 'GET',
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(`${LOCAL}${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function call(fake: ReturnType<typeof makeRelationshipHttpD1>, email: string | undefined, req: Request) {
  return onRequest({
    request: req,
    env: makeEnv(fake.db, email),
  } as unknown as Parameters<typeof onRequest>[0])
}

const relationshipContext = {
  type: 'friends',
  mapping_goal: 'Map how we make decisions together.',
  sensitivity_level: 'medium',
}

let fake: ReturnType<typeof makeRelationshipHttpD1>

beforeEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  fake = makeRelationshipHttpD1()
})

async function createAndAccept() {
  const createdResponse = await call(
    fake,
    A.email,
    request('/api/relationships', 'POST', {
      subjectId: A.subjectId,
      inviteeEmail: B.email,
      expiresAt: NOW + 60_000,
    }),
  )
  expect(createdResponse.status).toBe(201)
  const created = (await createdResponse.json()) as {
    relationship: { id: string }
    inviteToken: string
  }
  const accepted = await call(
    fake,
    B.email,
    request('/api/relationships/accept', 'POST', {
      inviteToken: created.inviteToken,
      subjectId: B.subjectId,
    }),
  )
  expect(accepted.status).toBe(200)
  return created
}

describe('authenticated relationship HTTP transport', () => {
  it('returns 401 before relationship routing when authentication is absent', async () => {
    const response = await call(fake, undefined, request('/api/relationships'))
    expect(response.status).toBe(401)
    expect(fake.invitations.size).toBe(0)
  })

  it('creates, lists, declines, accepts, and revokes through authenticated routes', async () => {
    const first = await call(
      fake,
      A.email,
      request('/api/relationships', 'POST', {
        subjectId: A.subjectId,
        inviteeEmail: B.email,
        expiresAt: NOW + 60_000,
      }),
    )
    expect(first.status).toBe(201)
    const pending = (await first.json()) as {
      relationship: { id: string }
      inviteToken: string
    }

    const listed = await call(fake, B.email, request('/api/relationships'))
    expect(listed.status).toBe(200)
    expect(((await listed.json()) as { relationships: unknown[] }).relationships).toHaveLength(1)

    const declined = await call(
      fake,
      B.email,
      request('/api/relationships/decline', 'POST', {
        inviteToken: pending.inviteToken,
      }),
    )
    expect(declined.status).toBe(200)
    expect(((await declined.json()) as { relationship: { status: string } }).relationship.status).toBe(
      'declined',
    )

    const active = await createAndAccept()
    const revoked = await call(
      fake,
      A.email,
      request(`/api/relationships/${active.relationship.id}/revoke`, 'POST'),
    )
    expect(revoked.status).toBe(200)
    expect(((await revoked.json()) as { relationship: { status: string } }).relationship.status).toBe(
      'revoked',
    )
  })

  it('denies the wrong authenticated invitee without consuming the invitation', async () => {
    const created = await call(
      fake,
      A.email,
      request('/api/relationships', 'POST', {
        subjectId: A.subjectId,
        inviteeEmail: B.email,
        expiresAt: NOW + 60_000,
      }),
    )
    const pending = (await created.json()) as {
      relationship: { id: string }
      inviteToken: string
    }
    const response = await call(
      fake,
      ADMIN.email,
      request('/api/relationships/accept', 'POST', {
        inviteToken: pending.inviteToken,
        subjectId: ADMIN.subjectId,
      }),
    )
    expect(response.status).toBe(403)
    expect(fake.invitations.get(pending.relationship.id)?.status).toBe('pending')
  })
})

describe('consent-revalidated cross-account synastry', () => {
  it('denies foreign/admin bypass before calling Selemene', async () => {
    const active = await createAndAccept()
    const upstream = vi.fn()
    vi.stubGlobal('fetch', upstream)

    const response = await call(
      fake,
      ADMIN.email,
      request(
        `/api/relationships/${active.relationship.id}/generate`,
        'POST',
        { relationship_context: relationshipContext },
        { 'x-admin-role': 'platform-admin' },
      ),
    )
    expect(response.status).toBe(403)
    expect(upstream).not.toHaveBeenCalled()
    expect(fake.generations.size).toBe(0)
  })

  it('fails closed when consent is revoked while Selemene is generating', async () => {
    const active = await createAndAccept()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        await revokeRelationship(fake.db, B.userId, active.relationship.id, NOW + 100)
        return new Response(JSON.stringify({ mode: 'synastry', assembled: 'must not commit' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }),
    )

    const response = await call(
      fake,
      A.email,
      request(`/api/relationships/${active.relationship.id}/generate`, 'POST', {
        relationship_context: relationshipContext,
      }),
    )
    expect(response.status).toBe(403)
    expect(fake.generations.size).toBe(0)
    expect(fake.grants.size).toBe(0)
    expect(fake.audits.size).toBe(0)
  })

  it('sends exactly two server-resolved subjects and commits two participant grants', async () => {
    const active = await createAndAccept()
    const upstream = vi.fn(async () =>
      new Response(
        JSON.stringify({
          mode: 'synastry',
          register: 'relational',
          passes: [],
          assembled: 'Shared reading',
          engines_used: ['synastry'],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', upstream)

    const response = await call(
      fake,
      A.email,
      request(`/api/relationships/${active.relationship.id}/generate`, 'POST', {
        relationship_context: relationshipContext,
        subjects: [{ name: 'client-forged-subject' }],
      }),
    )
    expect(response.status).toBe(400)
    expect(upstream).not.toHaveBeenCalled()

    const success = await call(
      fake,
      A.email,
      request(`/api/relationships/${active.relationship.id}/generate`, 'POST', {
        relationship_context: relationshipContext,
        language: 'en',
        report_level: 'L3',
      }),
    )
    expect(success.status).toBe(201)
    expect(upstream).toHaveBeenCalledTimes(1)
    const [target, init] = upstream.mock.calls[0] as unknown as [string, RequestInit]
    expect(target).toBe(`${ENGINE}/api/v1/assets/generate`)
    expect(new Headers(init.headers).get('x-api-key')).toBe('server-key')
    const payload = JSON.parse(String(init.body)) as {
      mode: string
      subjects: { role: string; name: string }[]
      relationship_context: typeof relationshipContext
    }
    expect(payload).toMatchObject({
      mode: 'synastry',
      relationship_context: relationshipContext,
    })
    expect(payload.subjects).toEqual([
      expect.objectContaining({ role: 'inviter', name: 'Asha' }),
      expect.objectContaining({ role: 'invitee', name: 'Bela' }),
    ])

    const result = (await success.json()) as {
      generationId: string
      grants: { userId: string; visibility: string }[]
    }
    expect(result.generationId).toMatch(/^[0-9a-f-]{36}$/)
    expect(result.grants).toEqual([
      { userId: A.userId, subjectId: A.subjectId, visibility: 'participant' },
      { userId: B.userId, subjectId: B.subjectId, visibility: 'participant' },
    ])
    expect(fake.generations.size).toBe(1)
    expect(fake.grants.size).toBe(2)
    expect(fake.audits.size).toBe(1)
  })

  it('lets both grantees reopen one canonical result after revocation, but no foreign user can', async () => {
    const active = await createAndAccept()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            mode: 'synastry',
            register: 'relational',
            passes: [],
            assembled: 'One canonical shared reading',
            engines_used: ['synastry'],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    )
    const generatedResponse = await call(
      fake,
      A.email,
      request(`/api/relationships/${active.relationship.id}/generate`, 'POST', {
        relationship_context: relationshipContext,
      }),
    )
    expect(generatedResponse.status).toBe(201)
    const generated = (await generatedResponse.json()) as { generationId: string }

    const [aBrowse, bBrowse, foreignBrowse] = await Promise.all([
      call(
        fake,
        A.email,
        request(`/api/relationships/${active.relationship.id}/readings`),
      ),
      call(
        fake,
        B.email,
        request(`/api/relationships/${active.relationship.id}/readings`),
      ),
      call(
        fake,
        ADMIN.email,
        request(`/api/relationships/${active.relationship.id}/readings`),
      ),
    ])
    expect(aBrowse.status).toBe(200)
    expect(bBrowse.status).toBe(200)
    expect(foreignBrowse.status).toBe(200)
    const aReadings = (await aBrowse.json()) as {
      readings: {
        generationId: string
        responseSha256: string
        result: { assembled: string }
      }[]
    }
    const bReadings = (await bBrowse.json()) as typeof aReadings
    expect(aReadings.readings).toHaveLength(1)
    expect(bReadings).toEqual(aReadings)
    expect(aReadings.readings[0]).toMatchObject({
      generationId: generated.generationId,
      result: { assembled: 'One canonical shared reading' },
    })
    expect(aReadings.readings[0].responseSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(((await foreignBrowse.json()) as { readings: unknown[] }).readings).toEqual([])

    const revoked = await call(
      fake,
      B.email,
      request(`/api/relationships/${active.relationship.id}/revoke`, 'POST'),
    )
    expect(revoked.status).toBe(200)
    const historical = await call(
      fake,
      B.email,
      request(`/api/relationships/${active.relationship.id}/readings`),
    )
    expect((await historical.json()) as typeof aReadings).toEqual(aReadings)

    const newGeneration = await call(
      fake,
      A.email,
      request(`/api/relationships/${active.relationship.id}/generate`, 'POST', {
        relationship_context: relationshipContext,
      }),
    )
    expect(newGeneration.status).toBe(403)
    expect(fake.generations.size).toBe(1)
    expect(fake.grants.size).toBe(2)
  })
})
