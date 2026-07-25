/**
 * Chat onboarding backend tests (Phase 1, W1-A).
 *
 * Covers: the chat DAL (store.ts) against an in-memory D1 fake, Functions-port
 * parity with the canonical state machine (scripted intakes mirroring
 * src/lib/chat/stateMachine.test.ts), turn orchestration (orchestrateTurn)
 * with a mocked narrator plus the deterministic fallback, and the three
 * chat routes through onRequest (auth gate, ownership 404s, SSE shape).
 *
 * Location note: lives in functions/__tests__ (not functions/lib/chat) because
 * vitest.config.ts only collects src/** and functions/__tests__/** — this is
 * the existing convention for functions tests that actually run.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import type { D1Database } from '@cloudflare/workers-types'
import type { Env } from '../lib/env'
import { onRequest } from '../api/[[path]]'
import type { ChatEvent, ChatMsg, ChatSessionState, ChildRun } from '../lib/chat/types'
import {
  applyUserInput,
  currentQuestion,
  initialSessionState,
  isStorySeed,
  isValidISODate,
  toSubmitPayload,
  type StoryTurn,
} from '../lib/chat/stateMachine'
import {
  appendChatTurn,
  createChatSession,
  findLatestOpenSession,
  getChatSession,
  listChatSessions,
  listChatTurns,
  saveChatSession,
  seedKey,
  type ChatSessionRow,
  type ChatTurnRow,
} from '../lib/chat/store'
import {
  chunkText,
  deterministicNarrator,
  getPathValue,
  orchestrateTurn,
  type NarratorFn,
} from '../lib/chat/turn'

// ---------------------------------------------------------------------------
// In-memory D1 fake for the chat tables (+ users for the auth path)
// ---------------------------------------------------------------------------

const ok = (changes: number) => ({ success: true, meta: { changes, duration: 0, last_row_id: 0, served_by: 'fake' } })

function makeFakeChatD1() {
  const users = new Map<string, { id: string; email: string; created_at: number; last_seen_at: number }>()
  const sessions = new Map<string, ChatSessionRow>()
  const turns: ChatTurnRow[] = []

  function run(sql: string, args: unknown[]) {
    if (sql.startsWith('INSERT INTO users')) {
      const [id, email, now] = args as [string, string, number]
      const existing = users.get(id)
      if (existing) existing.last_seen_at = now
      else users.set(id, { id, email, created_at: now, last_seen_at: now })
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
    if (sql.startsWith('INSERT INTO chat_turns')) {
      const [turn_id, session_id, role, blocks, chapter, created_at] = args as [
        string, string, string, string, string, string,
      ]
      turns.push({ turn_id, session_id, role, blocks, chapter, created_at })
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
      return null // W1-B prefill probe: these fixtures never cross the Threshold
    }
    if (sql.includes('FROM chat_sessions WHERE session_id = ?1 AND user_id = ?2')) {
      const row = sessions.get(args[0] as string)
      return row && row.user_id === args[1] ? { ...row } : null
    }
    throw new Error(`fake D1: unsupported first() SQL: ${sql}`)
  }

  function all(sql: string, args: unknown[]): unknown[] {
    if (sql.includes('FROM chat_sessions WHERE user_id = ?1')) {
      const openOnly = sql.includes("chapter != 'complete'")
      return [...sessions.values()]
        .filter((s) => s.user_id === args[0])
        .filter((s) => !openOnly || s.chapter !== 'complete')
        .sort((a, b) => (a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0))
        .map((s) => ({ ...s }))
    }
    if (sql.includes('FROM chat_turns WHERE session_id = ?1')) {
      return turns
        .filter((t) => t.session_id === args[0])
        .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0))
        .map((t) => ({ ...t }))
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

  return { db, users, sessions, turns }
}

// ---------------------------------------------------------------------------
// Shared fixtures — hand-rolled ChildRun seeds (the Functions tsconfig cannot
// import src/data/selemeneNodes; shapes mirror the real capability cards).
// ---------------------------------------------------------------------------

const A = 'dev:a@example.com'
const B = 'dev:b@example.com'
const LOCAL = 'http://localhost:8788'

const KUNDALI: ChildRun = { kind: 'witness', mode: 'integrated-kundali-l0', minSubjects: 1, maxSubjects: 5, level: 'L0' }
const DYAD: ChildRun = { kind: 'witness', mode: 'composite-dyad', minSubjects: 2, maxSubjects: 2 }
const NUMEROLOGY: ChildRun = { kind: 'engine', engineId: 'numerology' }

const SUBJECT_A = { name: 'Asha', date: '1990-12-31', time: '07:30', confidence: 'exact', location: 'Bengaluru, India' }
const SUBJECT_B = { name: 'Rohan', date: '1988-06-15', time: '18:45', confidence: 'approximate', location: 'Mumbai, India' }

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

let fake: ReturnType<typeof makeFakeChatD1>
let db: D1Database
let env: Env
beforeEach(() => {
  fake = makeFakeChatD1()
  db = fake.db as unknown as D1Database
  env = makeEnv(fake.db, 'a@example.com')
})

// ---------------------------------------------------------------------------
// store.ts — DAL
// ---------------------------------------------------------------------------

describe('chat store (DAL)', () => {
  it('create + get round-trips the full ChatSessionState (JSON columns intact)', async () => {
    const state = initialSessionState(KUNDALI, { sessionId: 's1', userId: A })
    await createChatSession(db, state)
    const loaded = await getChatSession(db, A, 's1')
    expect(loaded).toEqual(state)
  })

  it('get is ownership-scoped: cross-user and unknown ids are both null', async () => {
    await createChatSession(db, initialSessionState(KUNDALI, { sessionId: 's1', userId: A }))
    expect(await getChatSession(db, B, 's1')).toBeNull()
    expect(await getChatSession(db, A, 'nope')).toBeNull()
  })

  it('save persists chapter/subjectIndex/intake/updatedAt and stays user-scoped', async () => {
    const state = initialSessionState(KUNDALI, { sessionId: 's1', userId: A })
    await createChatSession(db, state)
    const next = applyUserInput(state, 'begin').state
    expect(await saveChatSession(db, next)).toBe(true)
    expect((await getChatSession(db, A, 's1'))?.chapter).toBe('surface')
    // Cross-user save touches nothing.
    expect(await saveChatSession(db, { ...next, userId: B })).toBe(false)
    expect((await getChatSession(db, A, 's1'))?.chapter).toBe('surface')
  })

  it('seedKey ignores client key order', () => {
    expect(seedKey({ kind: 'daily', needsLocation: true })).toBe(seedKey({ needsLocation: true, kind: 'daily' }))
    expect(seedKey(KUNDALI)).not.toBe(seedKey(DYAD))
  })

  it('findLatestOpenSession resumes the same-seed open session, newest first', async () => {
    const older = { ...initialSessionState(KUNDALI, { sessionId: 's-old', userId: A }), updatedAt: '2026-01-01T00:00:00.000Z' }
    const newer = { ...initialSessionState(KUNDALI, { sessionId: 's-new', userId: A }), updatedAt: '2026-02-01T00:00:00.000Z' }
    const otherSeed = { ...initialSessionState(DYAD, { sessionId: 's-dyad', userId: A }), updatedAt: '2026-03-01T00:00:00.000Z' }
    await createChatSession(db, older)
    await createChatSession(db, newer)
    await createChatSession(db, otherSeed)

    expect((await findLatestOpenSession(db, A, KUNDALI))?.sessionId).toBe('s-new')
    expect((await findLatestOpenSession(db, A, DYAD))?.sessionId).toBe('s-dyad')
    expect(await findLatestOpenSession(db, A, NUMEROLOGY)).toBeNull()
    expect(await findLatestOpenSession(db, B, KUNDALI)).toBeNull() // user-scoped

    // A completed session is not a resume target.
    await saveChatSession(db, { ...newer, chapter: 'complete' })
    expect((await findLatestOpenSession(db, A, KUNDALI))?.sessionId).toBe('s-old')
  })

  it('listChatSessions returns only the caller sessions, newest first', async () => {
    await createChatSession(db, { ...initialSessionState(KUNDALI, { sessionId: 's1', userId: A }), updatedAt: '2026-01-01T00:00:00.000Z' })
    await createChatSession(db, { ...initialSessionState(DYAD, { sessionId: 's2', userId: A }), updatedAt: '2026-02-01T00:00:00.000Z' })
    await createChatSession(db, { ...initialSessionState(KUNDALI, { sessionId: 's3', userId: B }), updatedAt: '2026-03-01T00:00:00.000Z' })
    expect((await listChatSessions(db, A)).map((s) => s.sessionId)).toEqual(['s2', 's1'])
  })

  it('appendChatTurn + listChatTurns round-trip ChatMsgs in insertion order', async () => {
    await createChatSession(db, initialSessionState(KUNDALI, { sessionId: 's1', userId: A }))
    const stamp = '2026-07-23T10:00:00.000Z' // same ms for both — rowid order wins
    const userMsg: ChatMsg = { id: 't1', sessionId: 's1', role: 'user', blocks: [{ kind: 'text', text: 'begin' }], chapter: 'awakening', createdAt: stamp }
    const narratorMsg: ChatMsg = {
      id: 't2', sessionId: 's1', role: 'narrator',
      blocks: [{ kind: 'stage_direction', text: 'chapter.surface' }, { kind: 'text', text: 'surface.confirm :: …' }],
      chapter: 'surface', createdAt: stamp,
    }
    await appendChatTurn(db, userMsg)
    await appendChatTurn(db, narratorMsg)
    expect(await listChatTurns(db, 's1')).toEqual([userMsg, narratorMsg])
    expect(await listChatTurns(db, 'other')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// stateMachine port parity — scripted intakes mirroring the SPA-side suite
// ---------------------------------------------------------------------------

function fillSubject(state: ChatSessionState, s: typeof SUBJECT_A): StoryTurn {
  let turn: StoryTurn = { state, event: 'intake_recorded' }
  for (const input of [s.name, s.date, s.time, s.confidence, s.location]) {
    turn = applyUserInput(turn.state, input)
    expect(turn.event).not.toBe('invalid')
  }
  return turn
}

describe('state machine port parity', () => {
  const IDS = { sessionId: 'sess-test', userId: 'user-test' }

  it('validators: strict calendar dates', () => {
    expect(isValidISODate('2024-02-29')).toBe(true)
    expect(isValidISODate('2023-02-29')).toBe(false)
    expect(isValidISODate('1990-02-30')).toBe(false)
  })

  it('solo witness walk: awakening → handoff, relationship skipped, null context', () => {
    let state = initialSessionState(KUNDALI, IDS)
    expect(state.chapter).toBe('awakening')
    expect(currentQuestion(state).prompt).toContain('awakening.open')

    state = applyUserInput(state, 'begin').state
    state = applyUserInput(state, 'yes').state
    expect(state.chapter).toBe('subjects')

    const afterSubject = fillSubject(state, SUBJECT_A)
    expect(afterSubject.state.chapter).toBe('subjects') // add_another gate (1..5)
    const declined = applyUserInput(afterSubject.state, 'no')
    expect(declined.event).toBe('chapter_advanced')
    expect(declined.state.chapter).toBe('language_level') // relationship skipped
    expect(declined.state.intake.relationship_context).toBeNull()

    state = applyUserInput(declined.state, 'default').state // language → en
    state = applyUserInput(state, 'default').state // report_level → L0 (seed default)
    const cons = applyUserInput(state, 'default')
    expect(cons.state.intake.consciousness_level).toBe(2)
    expect(cons.state.chapter).toBe('mode')

    state = applyUserInput(cons.state, 'yes').state
    expect(state.chapter).toBe('assembly')
    expect(currentQuestion(state).prompt).toContain('FINAL ASSEMBLED REQUEST')

    const ready = applyUserInput(state, 'yes')
    expect(ready.event).toBe('ready')
    expect(ready.state.chapter).toBe('handoff')

    const payload = toSubmitPayload(ready.state) as { mode: string; relationship_context: unknown; subjects: unknown[] }
    expect(payload.mode).toBe('integrated-kundali-l0')
    expect(payload.relationship_context).toBeNull()
    expect(payload.subjects).toHaveLength(1)
  })

  it('dyad walk: 2 subjects, relationship from the exact taxonomy (never romantic)', () => {
    let state = initialSessionState(DYAD, IDS)
    state = applyUserInput(state, 'begin').state
    state = applyUserInput(state, 'yes').state

    const first = fillSubject(state, SUBJECT_A)
    expect(first.state.chapter).toBe('subjects') // min 2 → straight to subject 2
    const second = fillSubject(first.state, SUBJECT_B)
    // W3-A: the fresh partner is offered circle persistence before advancing.
    expect(second.event).toBe('intake_recorded')
    expect(currentQuestion(second.state).prompt).toContain('subjects.persist_offer')
    const offered = applyUserInput(second.state, 'no')
    expect(offered.event).toBe('chapter_advanced')
    expect(offered.state.chapter).toBe('relationship')
    expect(offered.state.circlePersist).toBeUndefined()

    const romantic = applyUserInput(offered.state, 'romantic')
    expect(romantic.event).toBe('invalid') // guardrail: taxonomy only

    state = applyUserInput(offered.state, 'unmarried-partners').state
    state = applyUserInput(state, 'map where our patterns meet').state
    const done = applyUserInput(state, 'medium')
    expect(done.event).toBe('chapter_advanced')
    expect(done.state.chapter).toBe('language_level')
  })

  it('unknown birth time records the noon convention (Gardener rule)', () => {
    let state = initialSessionState(KUNDALI, IDS)
    state = applyUserInput(state, 'begin').state
    state = applyUserInput(state, 'yes').state
    state = applyUserInput(state, 'Asha').state
    state = applyUserInput(state, '1990-12-31').state
    const t = applyUserInput(state, 'unknown')
    expect(t.event).toBe('intake_recorded')
    const s = (t.state.intake.subjects as { birth_time: string; birth_time_confidence: string }[])[0]
    expect(s.birth_time).toBe('12:00')
    expect(s.birth_time_confidence).toBe('unknown')
  })

  it('isStorySeed guards the session-create body', () => {
    expect(isStorySeed(KUNDALI)).toBe(true)
    expect(isStorySeed({ kind: 'daily', needsLocation: true })).toBe(true)
    expect(isStorySeed({ kind: 'info' })).toBe(true)
    expect(isStorySeed({ kind: 'witness', mode: 'x', minSubjects: 3, maxSubjects: 2 })).toBe(false)
    expect(isStorySeed({ kind: 'workflow' })).toBe(false)
    expect(isStorySeed({ kind: 'bogus' })).toBe(false)
    expect(isStorySeed(null)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// turn.ts — orchestration
// ---------------------------------------------------------------------------

async function collect(gen: AsyncGenerator<ChatEvent, void>): Promise<ChatEvent[]> {
  const out: ChatEvent[] = []
  for await (const ev of gen) out.push(ev)
  return out
}

async function freshSession(seed: ChildRun = KUNDALI): Promise<ChatSessionState> {
  const state = initialSessionState(seed, { sessionId: crypto.randomUUID(), userId: A })
  await createChatSession(db, state)
  return state
}

describe('orchestrateTurn', () => {
  it('emits the protocol sequence and persists user + narrator turns + state', async () => {
    const state = await freshSession()
    const narrator: NarratorFn = async () => ({
      blocks: [{ kind: 'stage_direction', text: 'beat' }, { kind: 'text', text: 'Welcome through the witness doorway. Shall we begin?' }],
    })
    const events = await collect(orchestrateTurn({ db, env, state, input: 'begin', narrator }))

    expect(events[0]).toEqual({ type: 'reply_start', msgId: expect.any(String), chapter: 'surface' })
    expect(events.map((e) => e.type)).toEqual([
      'reply_start',
      'block_start', 'block_delta', 'block_end',
      'block_start', 'block_delta', 'block_delta', 'block_end', // chunked text
      'chapter_advanced',
      'reply_end',
    ])
    expect(events.find((e) => e.type === 'chapter_advanced')).toEqual({ type: 'chapter_advanced', chapter: 'surface' })

    const end = events.at(-1)
    expect(end?.type).toBe('reply_end')
    const msg = (end as { msg: ChatMsg }).msg
    expect(msg.role).toBe('narrator')
    expect(msg.chapter).toBe('surface')
    expect(msg.blocks).toHaveLength(2)

    // Deltas reassemble into exactly the reply text block.
    const deltas = events.filter((e) => e.type === 'block_delta' && e.blockIndex === 1) as { text: string }[]
    expect(deltas.map((d) => d.text).join('')).toBe('Welcome through the witness doorway. Shall we begin?')

    // Exactly one user + one narrator turn persisted; state advanced.
    const turns = await listChatTurns(db, state.sessionId)
    expect(turns.map((t) => t.role)).toEqual(['user', 'narrator'])
    expect(turns[0].chapter).toBe('awakening') // user msg authored pre-advance
    expect((await getChatSession(db, A, state.sessionId))?.chapter).toBe('surface')
  })

  it('deterministic fallback emits intake_recorded with the validated slot', async () => {
    let state = await freshSession()
    state = applyUserInput(state, 'begin').state
    state = applyUserInput(state, 'yes').state
    await saveChatSession(db, state)

    // env has no SELEMENE_API_URL/KEY → defaultNarrator is deterministic.
    const events = await collect(orchestrateTurn({ db, env, state, input: 'Asha' }))
    const intake = events.find((e) => e.type === 'intake_recorded')
    expect(intake).toEqual({ type: 'intake_recorded', field: 'subjects[0].name', value: 'Asha' })
    const msg = (events.at(-1) as { msg: ChatMsg }).msg
    expect(msg.blocks[0]).toEqual({ kind: 'intake_field', field: 'subjects[0].name', value: 'Asha' })
    expect(msg.blocks[1].kind).toBe('text')
    expect((await getChatSession(db, A, state.sessionId))?.intake.subjects?.[0]?.name).toBe('Asha')
  })

  it('invalid input: tool_result ok:false, no intake/chapter events, state untouched', async () => {
    let state = await freshSession()
    state = applyUserInput(state, 'begin').state
    state = applyUserInput(state, 'yes').state
    state = applyUserInput(state, 'Asha').state
    await saveChatSession(db, state)

    const events = await collect(orchestrateTurn({ db, env, state, input: '31/12/1990' }))
    expect(events.some((e) => e.type === 'intake_recorded')).toBe(false)
    expect(events.some((e) => e.type === 'chapter_advanced')).toBe(false)
    const msg = (events.at(-1) as { msg: ChatMsg }).msg
    expect(msg.blocks[0]).toMatchObject({ kind: 'tool_result', ok: false })
    expect((msg.blocks[0] as { message?: string }).message).toContain('YYYY-MM-DD')
    expect((await getChatSession(db, A, state.sessionId))?.chapter).toBe('subjects')
  })

  it('a throwing narrator degrades to the deterministic fallback (never errors the turn)', async () => {
    const state = await freshSession()
    const badNarrator: NarratorFn = async () => {
      throw new Error('LLM exploded')
    }
    const events = await collect(orchestrateTurn({ db, env, state, input: 'begin', narrator: badNarrator }))
    expect(events.at(-1)?.type).toBe('reply_end')
    expect(events.some((e) => e.type === 'error')).toBe(false)
    const msg = (events.at(-1) as { msg: ChatMsg }).msg
    expect(msg.blocks[0]).toEqual({ kind: 'stage_direction', text: 'chapter.surface' })
  })

  it('full solo witness walk through orchestrateTurn reaches handoff with a complete payload', async () => {
    let state = await freshSession()
    const drive = async (input: unknown): Promise<ChatEvent[]> => {
      const events = await collect(orchestrateTurn({ db, env, state, input }))
      expect(events.at(-1)?.type).toBe('reply_end')
      state = (await getChatSession(db, A, state.sessionId))!
      return events
    }
    await drive('begin') // awakening → surface
    await drive('yes') // surface → subjects
    for (const input of [SUBJECT_A.name, SUBJECT_A.date, SUBJECT_A.time, SUBJECT_A.confidence, SUBJECT_A.location]) await drive(input)
    await drive('no') // add_another → language_level
    await drive('default') // language
    await drive('default') // report_level
    await drive('default') // consciousness_level → mode
    await drive('yes') // mode → assembly
    const final = await drive('yes') // assembly → ready/handoff
    expect(final.some((e) => e.type === 'chapter_advanced' && e.chapter === 'handoff')).toBe(true)
    expect(state.chapter).toBe('handoff')

    const payload = toSubmitPayload(state) as { mode: string; subjects: { name: string }[] }
    expect(payload.mode).toBe('integrated-kundali-l0')
    expect(payload.subjects[0].name).toBe('Asha')

    // Turn history: exactly one user + one narrator msg per driven input (13).
    const turns = await listChatTurns(db, state.sessionId)
    expect(turns).toHaveLength(2 * 13)
    expect(turns.filter((t) => t.role === 'user')).toHaveLength(13)
  })

  it('helpers: getPathValue + chunkText', () => {
    expect(getPathValue({ a: [{ b: 1 }] }, 'a[0].b')).toBe(1)
    expect(getPathValue({ a: null }, 'a.b')).toBeUndefined()
    expect(chunkText('')).toEqual([])
    expect(chunkText('short')).toEqual(['short'])
    expect(chunkText('one two three four five six seven eight nine ten eleven twelve', 20).join('')).toContain('one two')
  })

  it('deterministicNarrator covers all four story events', () => {
    const base = initialSessionState(KUNDALI, { sessionId: 's', userId: 'u' })
    const q = currentQuestion(base)
    expect(deterministicNarrator({ state: base, turn: { state: base, event: 'invalid', error: 'x' }, question: q, input: '' }).blocks[0].kind).toBe('tool_result')
    expect(deterministicNarrator({ state: base, turn: { state: base, event: 'intake_recorded', field: 'language' }, question: q, input: '' }).blocks[0].kind).toBe('intake_field')
    expect(deterministicNarrator({ state: base, turn: { state: base, event: 'chapter_advanced' }, question: q, input: '' }).blocks[0].kind).toBe('stage_direction')
    expect(deterministicNarrator({ state: base, turn: { state: base, event: 'ready' }, question: q, input: '' }).blocks).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Routes — POST /api/chat/session, GET /api/chat/session/:id, POST /api/chat/turn
// ---------------------------------------------------------------------------

function makeCtx(request: Request, db: unknown, devEmail: string | undefined) {
  return { request, env: makeEnv(db, devEmail) } as unknown as Parameters<typeof onRequest>[0]
}
const asA = (req: Request) => makeCtx(req, fake.db, 'a@example.com')
const asB = (req: Request) => makeCtx(req, fake.db, 'b@example.com')

const post = (body: unknown, url: string) =>
  new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

async function readSseEvents(res: Response): Promise<ChatEvent[]> {
  const text = await res.text()
  // W2: frames may carry an `id:` line ahead of `event:`/`data:` — parse by
  // field name instead of fixed line positions.
  return text
    .split('\n\n')
    .map((f) => f.split('\n').find((l) => l.startsWith('data: ')))
    .filter((d): d is string => typeof d === 'string')
    .map((d) => JSON.parse(d.replace(/^data: /, '')) as ChatEvent)
}

describe('chat routes', () => {
  const SESSION_URL = `${LOCAL}/api/chat/session`
  const TURN_URL = `${LOCAL}/api/chat/turn`

  it('POST /api/chat/session creates (201) then resumes (200) the same-seed session', async () => {
    const created = await onRequest(asA(post({ seed: KUNDALI }, SESSION_URL)))
    expect(created.status).toBe(201)
    const c = (await created.json()) as { session: ChatSessionState; resumed: boolean }
    expect(c.resumed).toBe(false)
    expect(c.session.chapter).toBe('awakening')
    expect(c.session.userId).toBe(A)

    const resumed = await onRequest(asA(post({ seed: KUNDALI }, SESSION_URL)))
    expect(resumed.status).toBe(200)
    const r = (await resumed.json()) as { session: ChatSessionState; resumed: boolean }
    expect(r.resumed).toBe(true)
    expect(r.session.sessionId).toBe(c.session.sessionId)

    // A different seed opens a new session; user B does not resume A's.
    const other = await onRequest(asA(post({ seed: DYAD }, SESSION_URL)))
    expect(other.status).toBe(201)
    const bSession = await onRequest(asB(post({ seed: KUNDALI }, SESSION_URL)))
    expect(bSession.status).toBe(201)
  })

  it('POST /api/chat/session rejects bad bodies and the unauthenticated', async () => {
    expect((await onRequest(asA(post({}, SESSION_URL)))).status).toBe(400)
    expect((await onRequest(asA(post({ seed: { kind: 'bogus' } }, SESSION_URL)))).status).toBe(400)
    expect((await onRequest(asA(post('not-json{{', SESSION_URL)))).status).toBe(400)
    expect((await onRequest(makeCtx(post({ seed: KUNDALI }, SESSION_URL), fake.db, undefined))).status).toBe(401)
    expect(fake.sessions.size).toBe(0)
  })

  it('GET /api/chat/session/:id is ownership-guarded (cross-user ≡ unknown ≡ 404)', async () => {
    const created = (await (await onRequest(asA(post({ seed: KUNDALI }, SESSION_URL)))).json()) as { session: ChatSessionState }
    const id = created.session.sessionId

    const mine = await onRequest(asA(new Request(`${SESSION_URL}/${id}`)))
    expect(mine.status).toBe(200)
    const body = (await mine.json()) as { session: ChatSessionState; turns: ChatMsg[] }
    expect(body.session.sessionId).toBe(id)
    expect(body.turns).toEqual([])

    expect((await onRequest(asB(new Request(`${SESSION_URL}/${id}`)))).status).toBe(404)
    expect((await onRequest(asA(new Request(`${SESSION_URL}/nope`)))).status).toBe(404)
  })

  it('POST /api/chat/turn streams the SSE reply and persists both turns', async () => {
    const created = (await (await onRequest(asA(post({ seed: KUNDALI }, SESSION_URL)))).json()) as { session: ChatSessionState }
    const id = created.session.sessionId

    const res = await onRequest(asA(post({ sessionId: id, input: 'begin' }, TURN_URL)))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')

    const events = await readSseEvents(res)
    expect(events[0].type).toBe('reply_start')
    expect(events.at(-1)?.type).toBe('reply_end')
    expect(events.some((e) => e.type === 'chapter_advanced' && e.chapter === 'surface')).toBe(true)

    const after = (await (await onRequest(asA(new Request(`${SESSION_URL}/${id}`)))).json()) as {
      session: ChatSessionState
      turns: ChatMsg[]
    }
    expect(after.session.chapter).toBe('surface')
    expect(after.turns.map((t) => t.role)).toEqual(['user', 'narrator'])
  })

  it('POST /api/chat/turn guards: 404 cross-user/unknown, 400 bad body, 401 unauthenticated', async () => {
    const created = (await (await onRequest(asA(post({ seed: KUNDALI }, SESSION_URL)))).json()) as { session: ChatSessionState }
    const id = created.session.sessionId

    expect((await onRequest(asB(post({ sessionId: id, input: 'begin' }, TURN_URL)))).status).toBe(404)
    expect((await onRequest(asA(post({ sessionId: 'nope', input: 'begin' }, TURN_URL)))).status).toBe(404)
    expect((await onRequest(asA(post({ sessionId: id }, TURN_URL)))).status).toBe(400)
    expect((await onRequest(asA(post({ input: 'begin' }, TURN_URL)))).status).toBe(400)
    expect((await onRequest(asA(post('not-json{{', TURN_URL)))).status).toBe(400)
    expect((await onRequest(makeCtx(post({ sessionId: id, input: 'begin' }, TURN_URL), fake.db, undefined))).status).toBe(401)
    expect(fake.turns).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// POST /api/chat/session/:id/complete — W4 duplicate-handoff regression
// (advance-on-consume: a completed session can never re-fire the handoff)
// ---------------------------------------------------------------------------

describe('POST /api/chat/session/:id/complete (W4 advance-on-consume)', () => {
  const SESSION_URL = `${LOCAL}/api/chat/session`
  const TURN_URL = `${LOCAL}/api/chat/turn`
  const DAILY: ChildRun = { kind: 'daily', needsLocation: true }

  /** Walk a daily session to 'handoff' through the real routes (shortest path). */
  async function walkDailyToHandoff(): Promise<string> {
    const created = (await (await onRequest(asA(post({ seed: DAILY }, SESSION_URL)))).json()) as {
      session: ChatSessionState
    }
    const id = created.session.sessionId
    for (const input of ['begin', 'yes', 'skip', 'yes', 'yes']) {
      const res = await onRequest(asA(post({ sessionId: id, input }, TURN_URL)))
      await res.text() // drain the SSE stream (persistence precedes framing)
    }
    return id
  }

  it('400s on any chapter before handoff (nothing was ever delivered)', async () => {
    const created = (await (await onRequest(asA(post({ seed: DAILY }, SESSION_URL)))).json()) as {
      session: ChatSessionState
    }
    const id = created.session.sessionId
    const early = await onRequest(asA(post({}, `${SESSION_URL}/${id}/complete`)))
    expect(early.status).toBe(400)

    const res = await onRequest(asA(post({ sessionId: id, input: 'begin' }, TURN_URL)))
    await res.text() // chapter: surface — still not handoff
    const mid = await onRequest(asA(post({}, `${SESSION_URL}/${id}/complete`)))
    expect(mid.status).toBe(400)

    const snap = (await (await onRequest(asA(new Request(`${SESSION_URL}/${id}`)))).json()) as {
      session: ChatSessionState
    }
    expect(snap.session.chapter).toBe('surface') // untouched by the failed completes
  })

  it('handoff → complete persists, is idempotent, and the same seed then starts FRESH (no re-handoff)', async () => {
    const id = await walkDailyToHandoff()
    const atHandoff = (await (await onRequest(asA(new Request(`${SESSION_URL}/${id}`)))).json()) as {
      session: ChatSessionState
    }
    expect(atHandoff.session.chapter).toBe('handoff')

    // The client consumes the handoff payload, then completes the session.
    const done = await onRequest(asA(post({}, `${SESSION_URL}/${id}/complete`)))
    expect(done.status).toBe(200)
    const d = (await done.json()) as { session: ChatSessionState }
    expect(d.session.chapter).toBe('complete')

    // Persisted, not just in-memory of the response.
    const snap = (await (await onRequest(asA(new Request(`${SESSION_URL}/${id}`)))).json()) as {
      session: ChatSessionState
    }
    expect(snap.session.chapter).toBe('complete')

    // Idempotent retry (e.g. the first response was lost to a disconnect).
    const again = await onRequest(asA(post({}, `${SESSION_URL}/${id}/complete`)))
    expect(again.status).toBe(200)
    expect(((await again.json()) as { session: ChatSessionState }).session.chapter).toBe('complete')

    // The regression itself: create-or-resume must NOT return the completed
    // session — a remounted ChatSheet gets a fresh session and can never
    // re-fire onHandoff (duplicate engine submit + duplicate Folio save).
    const reopened = await onRequest(asA(post({ seed: DAILY }, SESSION_URL)))
    expect(reopened.status).toBe(201)
    const r = (await reopened.json()) as { session: ChatSessionState; resumed: boolean }
    expect(r.resumed).toBe(false)
    expect(r.session.sessionId).not.toBe(id)
    expect(r.session.chapter).toBe('awakening')
  })

  it('is ownership-guarded: cross-user ≡ unknown ≡ 404; unauthenticated ≡ 401', async () => {
    const id = await walkDailyToHandoff()
    expect((await onRequest(asB(post({}, `${SESSION_URL}/${id}/complete`)))).status).toBe(404)
    expect((await onRequest(asA(post({}, `${SESSION_URL}/nope/complete`)))).status).toBe(404)
    expect((await onRequest(makeCtx(post({}, `${SESSION_URL}/${id}/complete`), fake.db, undefined))).status).toBe(401)

    // The cross-user probe must not have mutated the session.
    const snap = (await (await onRequest(asA(new Request(`${SESSION_URL}/${id}`)))).json()) as {
      session: ChatSessionState
    }
    expect(snap.session.chapter).toBe('handoff')
  })
})

// ---------------------------------------------------------------------------
// Threshold W0-A parity — threshold seed + profile prefill (mirrors the
// canonical suite's Threshold W0-A describes)
// ---------------------------------------------------------------------------

const THRESHOLD_SEED = { kind: 'threshold' } as const

const SELF_PROFILE = {
  role: 'primary',
  name: 'Asha',
  birth_date: '1990-12-31',
  birth_time: '07:30',
  birth_time_confidence: 'exact',
  birth_location_query: 'Bengaluru, India',
  normalized_location: {
    display_name: 'Bengaluru, India',
    latitude: 12.9716,
    longitude: 77.5946,
    timezone: 'Asia/Kolkata',
    provider: 'test',
    confidence: 'high',
  },
} as import('../lib/chat/types').SubjectInput

describe('threshold + prefill port parity (W0-A)', () => {
  const IDS = { sessionId: 'sess-th', userId: 'user-th' }

  it('isStorySeed accepts the threshold seed', () => {
    expect(isStorySeed({ kind: 'threshold' })).toBe(true)
  })

  it('threshold walk yields the self profile at handoff', () => {
    let state = initialSessionState(THRESHOLD_SEED, IDS)
    expect(state.chapter).toBe('awakening')
    const opened = applyUserInput(state, 'begin')
    expect(opened.state.chapter).toBe('subjects') // no surface/mode chapters

    const filled = fillSubject(opened.state, SUBJECT_A)
    expect(filled.state.chapter).toBe('assembly')
    expect(currentQuestion(filled.state).prompt).toContain('pattern')

    const ready = applyUserInput(filled.state, 'yes')
    expect(ready.event).toBe('ready')
    const payload = toSubmitPayload(ready.state) as { subject: { name: string; birth_date: string } }
    expect(payload.subject.name).toBe('Asha')
    expect(payload.subject.birth_date).toBe('1990-12-31')
  })

  it('witness 1..5 with a stored self opens at add_another, never re-asks the five facts', () => {
    let state = initialSessionState(KUNDALI, IDS, [SELF_PROFILE])
    expect(state.prefilledCount).toBe(1)
    expect(state.subjectIndex).toBe(1)
    state = applyUserInput(state, 'begin').state
    state = applyUserInput(state, 'yes').state
    expect(state.chapter).toBe('subjects')
    const q = currentQuestion(state).prompt
    expect(q).toContain('subjects.add_another')
    expect(q).not.toContain('subjects.name')

    const declined = applyUserInput(state, 'no')
    expect(declined.state.chapter).toBe('language_level')
    expect(declined.state.intake.relationship_context).toBeNull()
  })

  it('witness 2..2 with a stored self still collects the required partner', () => {
    let state = initialSessionState(DYAD, IDS, [SELF_PROFILE])
    expect(state.intake.subjects).toHaveLength(2) // profile + fresh partner slot
    expect(state.subjectIndex).toBe(1)
    state = applyUserInput(state, 'begin').state
    state = applyUserInput(state, 'yes').state
    expect(currentQuestion(state).prompt).toContain('subjects.name')
    const filled = fillSubject(state, SUBJECT_B)
    // W3-A: the required partner is fresh — persist_offer fires before the
    // loop closes at max; declining advances to relationship.
    expect(currentQuestion(filled.state).prompt).toContain('subjects.persist_offer')
    const offered = applyUserInput(filled.state, 'no')
    expect(offered.event).toBe('chapter_advanced')
    expect(offered.state.chapter).toBe('relationship')
  })

  it('engine doorway with a stored self skips subjects and still produces birthData', () => {
    let state = initialSessionState(NUMEROLOGY, IDS, [SELF_PROFILE])
    state = applyUserInput(state, 'begin').state
    state = applyUserInput(state, 'yes').state
    expect(state.chapter).toBe('mode') // subjects skipped
    state = applyUserInput(state, 'yes').state
    const ready = applyUserInput(state, 'yes')
    expect(ready.event).toBe('ready')
    const payload = toSubmitPayload(ready.state) as { birthData: { name: string; timezone: string } }
    expect(payload.birthData.name).toBe('Asha')
    expect(payload.birthData.timezone).toBe('Asia/Kolkata')
  })

  it('incomplete profile rows are dropped, not trusted', () => {
    const partial = { role: 'primary', name: 'Asha' } as import('../lib/chat/types').SubjectInput
    const state = initialSessionState(KUNDALI, IDS, [partial])
    expect(state.prefilledCount).toBe(0)
    expect(state.subjectIndex).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// W3-A parity — wholesale circle picks + the persist_offer beat (mirrors the
// canonical suite's W3-A describes) + the DAL round-trip for the circle meta
// ---------------------------------------------------------------------------

/** A stored circle member exactly as the ChatSheet picker sends it (intake fields = SubjectInput). */
const CIRCLE_ROHAN = {
  role: 'partner',
  name: 'Rohan',
  birth_date: '1988-06-15',
  birth_time: '18:45',
  birth_time_confidence: 'approximate',
  birth_location_query: 'Mumbai, India',
  normalized_location: {
    display_name: 'Mumbai, India',
    latitude: 19.076,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
    provider: 'test',
    confidence: 'high',
  },
} as import('../lib/chat/types').SubjectInput

describe('W3-A circle picks + persist_offer port parity', () => {
  const IDS = { sessionId: 'sess-w3', userId: 'user-w3' }
  type SubjectInput = import('../lib/chat/types').SubjectInput

  /** Kundali (1..5) with the stored self prefilled, at the name slot of subject 2. */
  function walkToFreshNameSlot(): ChatSessionState {
    let state = initialSessionState(KUNDALI, IDS, [SELF_PROFILE])
    state = applyUserInput(state, 'begin').state
    state = applyUserInput(state, 'yes').state
    const accepted = applyUserInput(state, 'yes') // add_another → fresh slot at index 1
    expect(accepted.event).toBe('intake_recorded')
    expect(currentQuestion(accepted.state).prompt).toContain('subjects.name')
    return accepted.state
  }

  it('a stored circle member can be picked at the add_another gate — the whole subject records in one turn', () => {
    let state = initialSessionState(KUNDALI, IDS, [SELF_PROFILE])
    state = applyUserInput(state, 'begin').state
    state = applyUserInput(state, 'yes').state
    expect(currentQuestion(state).prompt).toContain('subjects.add_another')

    const picked = applyUserInput(state, CIRCLE_ROHAN)
    expect(picked.event).toBe('intake_recorded')
    expect(picked.field).toBe('subjects[1]')
    const subjects = picked.state.intake.subjects as SubjectInput[]
    expect(subjects).toHaveLength(2)
    expect(subjects[0].name).toBe('Asha') // prefilled self untouched
    expect(subjects[1]).toEqual(CIRCLE_ROHAN)
    expect(picked.state.subjectIndex).toBe(1)
    // Cursor advanced as if all five slots had been answered — and a picked
    // member is already persisted, so NO persist_offer beat.
    const q = currentQuestion(picked.state).prompt
    expect(q).toContain('subjects.add_another')
    expect(q).not.toContain('persist_offer')
  })

  it('the name slot of subject index >= 1 accepts a wholesale pick; absent/self roles coerce to partner', () => {
    const { role: _omit, ...withoutRole } = CIRCLE_ROHAN
    const picked = applyUserInput(walkToFreshNameSlot(), withoutRole)
    expect(picked.event).toBe('intake_recorded')
    const s = (picked.state.intake.subjects as SubjectInput[])[1]
    expect(s.name).toBe('Rohan')
    expect(s.role).toBe('partner') // absent → forced

    const coerced = applyUserInput(walkToFreshNameSlot(), { ...CIRCLE_ROHAN, role: 'self' })
    expect((coerced.state.intake.subjects as SubjectInput[])[1].role).toBe('partner') // self → forced

    const kept = applyUserInput(walkToFreshNameSlot(), { ...CIRCLE_ROHAN, role: 'family' })
    expect((kept.state.intake.subjects as SubjectInput[])[1].role).toBe('family') // valid roles kept
  })

  it('an invalid wholesale object is an invalid turn with a clear message and no intake write', () => {
    const state = walkToFreshNameSlot()
    const bads: unknown[] = [
      { name: 'Rohan' },
      { ...CIRCLE_ROHAN, birth_date: '1988-15-99' },
      { ...CIRCLE_ROHAN, birth_time: '6pm' },
      { ...CIRCLE_ROHAN, birth_time_confidence: 'maybe' },
      { ...CIRCLE_ROHAN, normalized_location: null },
    ]
    for (const bad of bads) {
      const r = applyUserInput(state, bad)
      expect(r.event).toBe('invalid')
      expect(r.error).toContain('incomplete')
      expect(r.state.chapter).toBe('subjects')
      expect((r.state.intake.subjects as SubjectInput[])[1].name).toBeUndefined()
    }
  })

  it('the threshold seed and the unprefilled primary slot both reject wholesale picks', () => {
    const threshold = applyUserInput(initialSessionState(THRESHOLD_SEED, IDS), 'begin').state
    const r = applyUserInput(threshold, CIRCLE_ROHAN)
    expect(r.event).toBe('invalid')
    expect((r.state.intake.subjects as SubjectInput[])[0].name).toBeUndefined()

    let solo = initialSessionState(KUNDALI, IDS)
    solo = applyUserInput(solo, 'begin').state
    solo = applyUserInput(solo, 'yes').state
    expect(currentQuestion(solo).prompt).toContain('subjects.name')
    const r2 = applyUserInput(solo, CIRCLE_ROHAN)
    expect(r2.event).toBe('invalid')
    expect((r2.state.intake.subjects as SubjectInput[])[0].name).toBeUndefined()
  })

  it('persist_offer fires for a fresh slot-by-slot subject, never for prefilled or picked ones', () => {
    // Fresh: dyad subject 2 collected by hand (index 0 gets no beat).
    let state = initialSessionState(DYAD, IDS)
    state = applyUserInput(state, 'begin').state
    state = applyUserInput(state, 'yes').state
    state = fillSubject(state, SUBJECT_A).state
    expect(currentQuestion(state).prompt).toContain('subjects.name')
    const s2 = fillSubject(state, SUBJECT_B)
    expect(currentQuestion(s2.state).prompt).toContain('subjects.persist_offer')
    expect(currentQuestion(s2.state).prompt).toContain('Rohan')

    // Picked: wholesale circle member — already persisted, no beat.
    let pre = initialSessionState(KUNDALI, IDS, [SELF_PROFILE])
    pre = applyUserInput(pre, 'begin').state
    pre = applyUserInput(pre, 'yes').state
    const picked = applyUserInput(pre, CIRCLE_ROHAN)
    expect(currentQuestion(picked.state).prompt).not.toContain('persist_offer')

    // Prefilled: two stored profiles skip the subjects chapter entirely.
    const partner = { ...SELF_PROFILE, role: 'partner', name: 'Rohan' } as SubjectInput
    let skipped = initialSessionState(DYAD, IDS, [SELF_PROFILE, partner])
    skipped = applyUserInput(skipped, 'begin').state
    skipped = applyUserInput(skipped, 'yes').state
    expect(skipped.chapter).toBe('relationship')
  })

  it('an affirmative answer records the index in circlePersist; a decline records nothing and is not re-asked', () => {
    let dyad = initialSessionState(DYAD, IDS)
    dyad = applyUserInput(dyad, 'begin').state
    dyad = applyUserInput(dyad, 'yes').state
    dyad = fillSubject(dyad, SUBJECT_A).state
    const s2 = fillSubject(dyad, SUBJECT_B)
    const held = applyUserInput(s2.state, 'yes')
    expect(held.state.circlePersist).toEqual([1])
    expect(held.event).toBe('chapter_advanced') // count == max → relationship
    expect(held.state.chapter).toBe('relationship')
    expect(currentQuestion(held.state).prompt).not.toContain('persist_offer')

    let state = initialSessionState(KUNDALI, IDS, [SELF_PROFILE])
    state = applyUserInput(state, 'begin').state
    state = applyUserInput(state, 'yes').state
    state = applyUserInput(state, 'yes').state // add_another → fresh slot
    const fresh = fillSubject(state, SUBJECT_B)
    expect(currentQuestion(fresh.state).prompt).toContain('subjects.persist_offer')
    const unclear = applyUserInput(fresh.state, 'maybe')
    expect(unclear.event).toBe('invalid')
    expect(currentQuestion(unclear.state).prompt).toContain('subjects.persist_offer')
    const declined = applyUserInput(fresh.state, 'no')
    expect(declined.state.circlePersist).toBeUndefined()
    expect(currentQuestion(declined.state).prompt).toContain('subjects.add_another')
    const done = applyUserInput(declined.state, 'no')
    expect(done.event).toBe('chapter_advanced')
    expect(done.state.chapter).toBe('relationship')
  })

  it('the solo walk never sees the beat and still ends with a valid payload; circle meta never leaks', () => {
    let state = initialSessionState(KUNDALI, IDS)
    state = applyUserInput(state, 'begin').state
    state = applyUserInput(state, 'yes').state
    const s1 = fillSubject(state, SUBJECT_A)
    // Slot 0 fresh: straight to add_another — persist_offer is never offered.
    expect(currentQuestion(s1.state).prompt).toContain('subjects.add_another')
    state = applyUserInput(s1.state, 'no').state
    state = applyUserInput(state, 'en').state
    state = applyUserInput(state, 'L0').state
    state = applyUserInput(state, '2').state
    state = applyUserInput(state, 'yes').state
    const ready = applyUserInput(state, 'yes')
    expect(ready.event).toBe('ready')
    expect(ready.state.circlePersist).toBeUndefined()

    const payload = toSubmitPayload(ready.state) as {
      subjects: Record<string, unknown>[]
      relationship_context: unknown
      options: unknown
    }
    expect(payload.subjects).toHaveLength(1)
    expect(payload.relationship_context).toBeNull()
    expect('circlePersist' in payload).toBe(false)
    expect(payload.options).toEqual({ output_format: 'markdown', include_rubric: true, include_pattern_extraction: true })
    expect(Object.keys(payload.subjects[0]).sort()).toEqual(
      ['birth_date', 'birth_location_query', 'birth_time', 'birth_time_confidence', 'name', 'normalized_location', 'role'].sort(),
    )
  })

  it('the circle meta rides the intake JSON column through the DAL and rehydrates on machine entry', async () => {
    let state = initialSessionState(DYAD, { sessionId: 's-circle', userId: A })
    state = applyUserInput(state, 'begin').state
    state = applyUserInput(state, 'yes').state
    state = fillSubject(state, SUBJECT_A).state
    state = fillSubject(state, SUBJECT_B).state
    state = applyUserInput(state, 'yes').state // persist_offer → hold index 1
    expect(state.circlePersist).toEqual([1])

    await createChatSession(db, state)
    await saveChatSession(db, state)
    const loaded = await getChatSession(db, A, 's-circle')
    // The column-based DAL restores the intake document (meta intact) but not
    // the top-level mirror field…
    expect(loaded?.circlePersist).toBeUndefined()
    expect(loaded?.intake.options?.circle).toEqual({ persist: [1] })
    // …and the machine rehydrates the contract field on entry, so the beat is
    // never re-asked after a store round-trip.
    expect(currentQuestion(loaded!).prompt).not.toContain('persist_offer')
    const turn = applyUserInput(loaded!, 'family')
    expect(turn.state.circlePersist).toEqual([1])
    expect(turn.event).toBe('intake_recorded')
  })
})
