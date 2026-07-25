/**
 * Subject profiles + Threshold wiring tests (Threshold W1-A + W1-B).
 *
 * W1-A: /api/subjects CRUD through onRequest against an in-memory D1 fake —
 * round-trip, the self-upsert invariant (one self row per user, updated in
 * place), validation 400s, and ownership (cross-user ≡ unknown ≡ 404).
 *
 * W1-B: the Threshold loop closed end to end —
 *   1. POST /api/chat/session injects the caller's stored self profile
 *      SERVER-SIDE for doorway seeds (engine/workflow/witness), with
 *      negative evidence for a user who has not crossed.
 *   2. POST /api/chat/session/:id/complete on a threshold session persists
 *      the collected profile as the caller's `self` row — at the
 *      advance-on-consume seam, idempotently (the DAL upsert), never in the
 *      turn handler.
 *
 * Location note: lives in functions/__tests__ (not functions/lib) because
 * vitest.config.ts only collects src/** and functions/__tests__/** — the
 * existing convention for functions tests that actually run.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import type { D1Database } from '@cloudflare/workers-types'
import type { Env } from '../lib/env'
import { onRequest } from '../api/[[path]]'
import type { ChatSessionState } from '../lib/chat/types'
import { applyUserInput, initialSessionState } from '../lib/chat/stateMachine'
import { createChatSession, saveChatSession, type ChatSessionRow } from '../lib/chat/store'
import type { SubjectRow } from '../lib/subjects'

// ---------------------------------------------------------------------------
// In-memory D1 fake — subjects + users + chat_sessions (the W1-B routes touch
// all three; chat_sessions handlers mirror chat.test.ts exactly)
// ---------------------------------------------------------------------------

const ok = (changes: number) => ({ success: true, meta: { changes, duration: 0, last_row_id: 0, served_by: 'fake' } })

function makeFakeD1() {
  const users = new Map<string, { id: string; email: string; created_at: number; last_seen_at: number }>()
  const subjects = new Map<string, SubjectRow>()
  const sessions = new Map<string, ChatSessionRow>()

  const SUBJECT_COLS = [
    'name',
    'birth_date',
    'birth_time',
    'birth_time_confidence',
    'birth_location_query',
    'normalized_location',
    'updated_at',
  ] as const

  function run(sql: string, args: unknown[]) {
    if (sql.startsWith('INSERT INTO users')) {
      const [id, email, now] = args as [string, string, number]
      const existing = users.get(id)
      if (existing) existing.last_seen_at = now
      else users.set(id, { id, email, created_at: now, last_seen_at: now })
      return ok(1)
    }
    if (sql.startsWith('INSERT INTO subjects')) {
      if (sql.includes('ON CONFLICT')) {
        // self-upsert: (id, userId, name, date, time, confidence, query, loc, now)
        const [id, userId, name, birth_date, birth_time, conf, query, loc, now] = args as [
          string, string, string, string, string, string, string, string, number,
        ]
        const existing = [...subjects.values()].find((s) => s.user_id === userId && s.role === 'self')
        if (existing) {
          // The real upsert keeps id + created_at (neither is in DO UPDATE SET).
          Object.assign(existing, {
            name, birth_date, birth_time,
            birth_time_confidence: conf,
            birth_location_query: query,
            normalized_location: loc,
            updated_at: now,
          })
        } else {
          subjects.set(id, {
            id, user_id: userId, role: 'self', name, birth_date, birth_time,
            birth_time_confidence: conf, birth_location_query: query,
            normalized_location: loc, created_at: now, updated_at: now,
          })
        }
        return ok(1)
      }
      // plain insert: (id, userId, role, name, date, time, confidence, query, loc, now)
      const [id, userId, role, name, birth_date, birth_time, conf, query, loc, now] = args as [
        string, string, string, string, string, string, string, string, string, number,
      ]
      subjects.set(id, {
        id, user_id: userId, role, name, birth_date, birth_time,
        birth_time_confidence: conf, birth_location_query: query,
        normalized_location: loc, created_at: now, updated_at: now,
      })
      return ok(1)
    }
    if (sql.startsWith('UPDATE subjects SET')) {
      // Positional mapping: parse the `col = ?` pairs out of the SET clause,
      // in order; the trailing two args are (id, userId).
      const setClause = sql.slice(sql.indexOf('SET') + 3, sql.indexOf('WHERE')).trim()
      const cols = setClause.split(', ').map((pair) => pair.split(' = ')[0])
      const id = args[args.length - 2] as string
      const userId = args[args.length - 1] as string
      const row = subjects.get(id)
      if (!row || row.user_id !== userId) return ok(0)
      cols.forEach((col, i) => {
        if ((SUBJECT_COLS as readonly string[]).includes(col)) {
          ;(row as unknown as Record<string, unknown>)[col] = args[i]
        }
      })
      return ok(1)
    }
    if (sql.startsWith('DELETE FROM subjects')) {
      const [id, userId] = args as [string, string]
      const row = subjects.get(id)
      if (!row || row.user_id !== userId) return ok(0)
      subjects.delete(id)
      return ok(1)
    }
    if (sql.startsWith('INSERT INTO chat_sessions')) {
      const [session_id, user_id, seed, chapter, subject_index, prefilled_count, intake, created_at, updated_at] = args as [
        string, string, string, string, number, number, string, string, string,
      ]
      sessions.set(session_id, { session_id, user_id, seed, chapter, subject_index, prefilled_count, intake, created_at, updated_at })
      return ok(1)
    }
    if (sql.startsWith('UPDATE chat_sessions SET chapter')) {
      const [session_id, user_id, chapter, subject_index, intake, updated_at] = args as [
        string, string, string, number, string, string,
      ]
      const row = sessions.get(session_id)
      if (!row || row.user_id !== user_id) return ok(0)
      Object.assign(row, { chapter, subject_index, intake, updated_at })
      return ok(1)
    }
    throw new Error(`fake D1: unsupported run() SQL: ${sql}`)
  }

  function first(sql: string, args: unknown[]): unknown | null {
    if (sql.startsWith('SELECT id, email, created_at, last_seen_at FROM users')) {
      const row = users.get(args[0] as string)
      return row ? { ...row } : null
    }
    if (sql.includes("FROM subjects WHERE user_id = ?1 AND role = 'self'")) {
      const row = [...subjects.values()].find((s) => s.user_id === args[0] && s.role === 'self')
      return row ? { ...row } : null
    }
    if (sql.includes('FROM subjects WHERE id = ?1 AND user_id = ?2')) {
      const row = subjects.get(args[0] as string)
      return row && row.user_id === args[1] ? { ...row } : null
    }
    if (sql.includes('FROM chat_sessions WHERE session_id = ?1 AND user_id = ?2')) {
      const row = sessions.get(args[0] as string)
      return row && row.user_id === args[1] ? { ...row } : null
    }
    throw new Error(`fake D1: unsupported first() SQL: ${sql}`)
  }

  function all(sql: string, args: unknown[]): unknown[] {
    if (sql.includes('FROM subjects WHERE user_id = ?1')) {
      return [...subjects.values()]
        .filter((s) => s.user_id === args[0])
        .sort((a, b) => a.created_at - b.created_at)
        .map((s) => ({ ...s }))
    }
    if (sql.includes('FROM chat_sessions WHERE user_id = ?1')) {
      const openOnly = sql.includes("chapter != 'complete'")
      return [...sessions.values()]
        .filter((s) => s.user_id === args[0])
        .filter((s) => !openOnly || s.chapter !== 'complete')
        .sort((a, b) => (a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0))
        .map((s) => ({ ...s }))
    }
    throw new Error(`fake D1: unsupported all() SQL: ${sql}`)
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
  }

  return { db, users, subjects, sessions }
}

// ---------------------------------------------------------------------------
// Harness (mirrors chat.test.ts)
// ---------------------------------------------------------------------------

const A = 'dev:a@example.com'
const LOCAL = 'http://localhost:8788'

function makeEnv(db: unknown, devEmail: string | undefined): Env {
  return {
    DB: db,
    CF_ACCESS_AUD: 'aud-tag',
    CF_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com',
    SELEMENE_API_KEY: '',
    SELEMENE_API_URL: '',
    DEV_IDENTITY_EMAIL: devEmail,
  } as Env
}

let fake: ReturnType<typeof makeFakeD1>
let db: D1Database
beforeEach(() => {
  fake = makeFakeD1()
  db = fake.db as unknown as D1Database
})

function makeCtx(request: Request, dbArg: unknown, devEmail: string | undefined) {
  return { request, env: makeEnv(dbArg, devEmail) } as unknown as Parameters<typeof onRequest>[0]
}
const asA = (req: Request) => makeCtx(req, fake.db, 'a@example.com')
const asB = (req: Request) => makeCtx(req, fake.db, 'b@example.com')

const post = (body: unknown, url: string) =>
  new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
const patch = (body: unknown, url: string) =>
  new Request(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

const SUBJECTS_URL = `${LOCAL}/api/subjects`
const SESSION_URL = `${LOCAL}/api/chat/session`

const GEO = {
  display_name: 'Bengaluru, India',
  latitude: 12.9716,
  longitude: 77.5946,
  timezone: 'Asia/Kolkata',
  provider: 'nominatim',
  confidence: 'high',
}

const ASHA_SELF = {
  role: 'self',
  name: 'Asha',
  birth_date: '1990-12-31',
  birth_time: '07:30',
  birth_time_confidence: 'exact',
  birth_location_query: 'Bengaluru, India',
  normalized_location: GEO,
}

const ROHAN_PARTNER = {
  role: 'partner',
  name: 'Rohan',
  birth_date: '1988-06-15',
  birth_time: '18:45',
  birth_time_confidence: 'approximate',
  birth_location_query: 'Mumbai, India',
  normalized_location: { ...GEO, display_name: 'Mumbai, India', latitude: 19.076, longitude: 72.8777 },
}

// ---------------------------------------------------------------------------
// W1-A — /api/subjects CRUD
// ---------------------------------------------------------------------------

describe('W1-A: /api/subjects CRUD', () => {
  it('create → list → patch → delete round-trips a partner profile', async () => {
    const created = await onRequest(asA(post(ROHAN_PARTNER, SUBJECTS_URL)))
    expect(created.status).toBe(201)
    const profile = (await created.json()) as { id: string; role: string; name: string; createdAt: string }
    expect(profile.role).toBe('partner')
    expect(profile.name).toBe('Rohan')
    expect(typeof profile.id).toBe('string')
    expect(typeof profile.createdAt).toBe('string') // unix ms ↔ ISO at the row boundary

    const list = await onRequest(asA(new Request(SUBJECTS_URL)))
    expect(list.status).toBe(200)
    const { subjects } = (await list.json()) as { subjects: { id: string; name: string }[] }
    expect(subjects).toHaveLength(1)
    expect(subjects[0].id).toBe(profile.id)

    const patched = await onRequest(asA(patch({ name: 'Rohan K.' }, `${SUBJECTS_URL}/${profile.id}`)))
    expect(patched.status).toBe(200)
    expect(((await patched.json()) as { name: string }).name).toBe('Rohan K.')

    const deleted = await onRequest(asA(new Request(`${SUBJECTS_URL}/${profile.id}`, { method: 'DELETE' })))
    expect(deleted.status).toBe(200)
    const after = (await (await onRequest(asA(new Request(SUBJECTS_URL)))).json()) as { subjects: unknown[] }
    expect(after.subjects).toEqual([])
  })

  it("role 'self' upserts: a second POST updates the same single row in place", async () => {
    const first = await onRequest(asA(post(ASHA_SELF, SUBJECTS_URL)))
    expect(first.status).toBe(201)
    const firstProfile = (await first.json()) as { id: string; name: string }

    const second = await onRequest(asA(post({ ...ASHA_SELF, name: 'Asha Iyer' }, SUBJECTS_URL)))
    expect(second.status).toBe(201)
    const secondProfile = (await second.json()) as { id: string; name: string }

    expect(secondProfile.id).toBe(firstProfile.id) // updated in place, not duplicated
    expect(secondProfile.name).toBe('Asha Iyer')
    const { subjects } = (await (await onRequest(asA(new Request(SUBJECTS_URL)))).json()) as { subjects: unknown[] }
    expect(subjects).toHaveLength(1)
  })

  it('omitted normalized_location is filled with the manual-entry convention', async () => {
    const { normalized_location, ...bare } = ASHA_SELF
    void normalized_location
    const created = await onRequest(asA(post(bare, SUBJECTS_URL)))
    expect(created.status).toBe(201)
    const profile = (await created.json()) as { normalized_location: { display_name: string; provider: string } }
    expect(profile.normalized_location.display_name).toBe('Bengaluru, India')
    expect(profile.normalized_location.provider).toBe('manual')
  })

  it('validation: bad date, missing name, bad role slug, bad confidence → 400, nothing stored', async () => {
    expect((await onRequest(asA(post({ ...ASHA_SELF, birth_date: '1990-02-30' }, SUBJECTS_URL)))).status).toBe(400)
    expect((await onRequest(asA(post({ ...ASHA_SELF, birth_date: '31/12/1990' }, SUBJECTS_URL)))).status).toBe(400)
    expect((await onRequest(asA(post({ ...ASHA_SELF, name: '  ' }, SUBJECTS_URL)))).status).toBe(400)
    expect((await onRequest(asA(post({ ...ASHA_SELF, role: 'Self' }, SUBJECTS_URL)))).status).toBe(400)
    expect((await onRequest(asA(post({ ...ASHA_SELF, birth_time: '25:00' }, SUBJECTS_URL)))).status).toBe(400)
    expect((await onRequest(asA(post({ ...ASHA_SELF, birth_time_confidence: 'maybe' }, SUBJECTS_URL)))).status).toBe(400)
    expect((await onRequest(asA(post('not-json{{', SUBJECTS_URL)))).status).toBe(400)
    expect(fake.subjects.size).toBe(0)
  })

  it('a bare birth_location_query patch re-derives the manual location', async () => {
    const created = (await (await onRequest(asA(post(ASHA_SELF, SUBJECTS_URL)))).json()) as { id: string }
    const patched = await onRequest(asA(patch({ birth_location_query: 'Chennai, India' }, `${SUBJECTS_URL}/${created.id}`)))
    expect(patched.status).toBe(200)
    const profile = (await patched.json()) as { birth_location_query: string; normalized_location: { display_name: string; provider: string } }
    expect(profile.birth_location_query).toBe('Chennai, India')
    expect(profile.normalized_location.display_name).toBe('Chennai, India')
    expect(profile.normalized_location.provider).toBe('manual')
  })

  it('patch validation: bad field values → 404 (no mutation), empty patch → 404', async () => {
    const created = (await (await onRequest(asA(post(ASHA_SELF, SUBJECTS_URL)))).json()) as { id: string }
    expect((await onRequest(asA(patch({ birth_date: '1990-02-30' }, `${SUBJECTS_URL}/${created.id}`)))).status).toBe(404)
    expect((await onRequest(asA(patch({}, `${SUBJECTS_URL}/${created.id}`)))).status).toBe(404)
    const snap = (await (await onRequest(asA(new Request(SUBJECTS_URL)))).json()) as { subjects: { birth_date: string }[] }
    expect(snap.subjects[0].birth_date).toBe('1990-12-31') // untouched
  })

  it('ownership: cross-user reads see nothing; cross-user patch/delete ≡ unknown ≡ 404', async () => {
    const created = (await (await onRequest(asA(post(ASHA_SELF, SUBJECTS_URL)))).json()) as { id: string }

    const bList = (await (await onRequest(asB(new Request(SUBJECTS_URL)))).json()) as { subjects: unknown[] }
    expect(bList.subjects).toEqual([])

    expect((await onRequest(asB(patch({ name: 'hijack' }, `${SUBJECTS_URL}/${created.id}`)))).status).toBe(404)
    expect((await onRequest(asB(new Request(`${SUBJECTS_URL}/${created.id}`, { method: 'DELETE' })))).status).toBe(404)
    expect((await onRequest(asA(patch({ name: 'x' }, `${SUBJECTS_URL}/nope`)))).status).toBe(404)
    expect((await onRequest(asA(new Request(`${SUBJECTS_URL}/nope`, { method: 'DELETE' })))).status).toBe(404)

    // The cross-user probes mutated nothing.
    const snap = (await (await onRequest(asA(new Request(SUBJECTS_URL)))).json()) as { subjects: { name: string }[] }
    expect(snap.subjects).toHaveLength(1)
    expect(snap.subjects[0].name).toBe('Asha')
  })

  it('the unauthenticated get 401 before any routing', async () => {
    expect((await onRequest(makeCtx(new Request(SUBJECTS_URL), fake.db, undefined))).status).toBe(401)
    expect((await onRequest(makeCtx(post(ASHA_SELF, SUBJECTS_URL), fake.db, undefined))).status).toBe(401)
    expect(fake.subjects.size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// W1-B — server-side prefill on session create
// ---------------------------------------------------------------------------

describe('W1-B: server-side prefill on POST /api/chat/session', () => {
  const NUMEROLOGY = { kind: 'engine', engineId: 'numerology' }

  it('a crossed caller gets their self profile injected into an engine session', async () => {
    await onRequest(asA(post(ASHA_SELF, SUBJECTS_URL))) // cross the Threshold directly

    const created = await onRequest(asA(post({ seed: NUMEROLOGY }, SESSION_URL)))
    expect(created.status).toBe(201)
    const c = (await created.json()) as { session: ChatSessionState }
    expect(c.session.prefilledCount).toBe(1)
    const subject = c.session.intake.subjects?.[0]
    expect(subject?.name).toBe('Asha')
    expect(subject?.role).toBe('primary') // stored self → leading intake slot
    expect(subject?.normalized_location?.timezone).toBe('Asia/Kolkata')
  })

  it('negative evidence: a caller with no self row starts unprefilled', async () => {
    await onRequest(asA(post(ASHA_SELF, SUBJECTS_URL))) // A crossed; B did not

    const created = await onRequest(asB(post({ seed: NUMEROLOGY }, SESSION_URL)))
    expect(created.status).toBe(201)
    const c = (await created.json()) as { session: ChatSessionState }
    expect(c.session.prefilledCount ?? 0).toBe(0)
    expect(c.session.intake.subjects?.[0]?.name).toBeUndefined()
  })

  it('threshold sessions never prefill — collecting the self profile is their purpose', async () => {
    await onRequest(asA(post(ASHA_SELF, SUBJECTS_URL))) // even a crossed caller

    const created = await onRequest(asA(post({ seed: { kind: 'threshold' } }, SESSION_URL)))
    expect(created.status).toBe(201)
    const c = (await created.json()) as { session: ChatSessionState }
    expect(c.session.prefilledCount ?? 0).toBe(0)
    expect(c.session.chapter).toBe('awakening')
  })
})

// ---------------------------------------------------------------------------
// W1-B — threshold /complete persists the self row (advance-on-consume seam)
// ---------------------------------------------------------------------------

describe('W1-B: threshold /complete writes the self profile', () => {
  /** Walk a threshold session to 'handoff' with the real machine, persisted. */
  async function walkThresholdToHandoff(sessionId: string): Promise<ChatSessionState> {
    let state = initialSessionState({ kind: 'threshold' }, { sessionId, userId: A })
    await createChatSession(db, state)
    state = applyUserInput(state, 'begin').state // awakening → subjects
    for (const input of ['Asha', '1990-12-31', '07:30', 'exact', 'Bengaluru, India']) {
      state = applyUserInput(state, input).state
    }
    expect(state.chapter).toBe('assembly')
    state = applyUserInput(state, 'yes').state // assembly → handoff
    expect(state.chapter).toBe('handoff')
    await saveChatSession(db, state)
    return state
  }

  it('complete persists the collected profile as the caller self row; idempotent on retry', async () => {
    const sessionId = 'sess-th-1'
    await walkThresholdToHandoff(sessionId)
    expect(fake.subjects.size).toBe(0) // nothing written before the seam

    const done = await onRequest(asA(post({}, `${SESSION_URL}/${sessionId}/complete`)))
    expect(done.status).toBe(200)
    expect(((await done.json()) as { session: ChatSessionState }).session.chapter).toBe('complete')

    expect(fake.subjects.size).toBe(1)
    const self = [...fake.subjects.values()][0]
    expect(self.user_id).toBe(A)
    expect(self.role).toBe('self')
    expect(self.name).toBe('Asha')
    expect(self.birth_date).toBe('1990-12-31')
    expect(self.birth_time).toBe('07:30')
    expect(JSON.parse(self.normalized_location)).toMatchObject({ display_name: 'Bengaluru, India' })

    // Idempotent retry (e.g. the first response was lost to a disconnect):
    // the upsert updates in place — still exactly one self row.
    const again = await onRequest(asA(post({}, `${SESSION_URL}/${sessionId}/complete`)))
    expect(again.status).toBe(200)
    expect(fake.subjects.size).toBe(1)
  })

  it('the written self row then prefills the next doorway session (loop closed)', async () => {
    const sessionId = 'sess-th-2'
    await walkThresholdToHandoff(sessionId)
    await onRequest(asA(post({}, `${SESSION_URL}/${sessionId}/complete`)))

    const created = await onRequest(asA(post({ seed: { kind: 'engine', engineId: 'numerology' } }, SESSION_URL)))
    expect(created.status).toBe(201)
    const c = (await created.json()) as { session: ChatSessionState }
    expect(c.session.prefilledCount).toBe(1)
    expect(c.session.intake.subjects?.[0]?.name).toBe('Asha')
  })

  it('completing a NON-threshold session writes no subject row', async () => {
    // A daily session at handoff (shortest walk): awakening → surface →
    // (skip location) → mode → assembly → handoff.
    let state = initialSessionState({ kind: 'daily', needsLocation: true }, { sessionId: 'sess-daily-1', userId: A })
    await createChatSession(db, state)
    for (const input of ['begin', 'yes', 'skip', 'yes', 'yes']) {
      state = applyUserInput(state, input).state
    }
    expect(state.chapter).toBe('handoff')
    await saveChatSession(db, state)

    const done = await onRequest(asA(post({}, `${SESSION_URL}/sess-daily-1/complete`)))
    expect(done.status).toBe(200)
    expect(fake.subjects.size).toBe(0)
  })
})
