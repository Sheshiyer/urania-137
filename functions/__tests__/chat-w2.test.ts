/**
 * Chat onboarding backend tests — Phase 1 W2 (Stream_QA).
 *
 * Covers the W2 hardening layer:
 *  - sse.ts: `id:` framing, encodeEventFrame, numberTurnEvents id space
 *  - store.ts: narrator event-sequence persistence + listChatTurnEvents
 *  - turn.ts: emitted events persisted verbatim; `x-chat-key` header on the
 *    LLM path (only when CHAT_PROXY_TOKEN is configured — inert by default)
 *  - routes: live streams carry contiguous per-session event ids; turns
 *    ending in `error` stream WITHOUT ids; the replay endpoint
 *    (GET /api/chat/session/:id/events?after=<n> | Last-Event-ID) replays
 *    the persisted stream verbatim, ownership-guarded.
 *
 * Uses its own in-memory D1 fake (the W1-A suite's fake is left untouched);
 * dispatch mirrors makeFakeChatD1 plus the W2 `events` column.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { D1Database } from '@cloudflare/workers-types'
import type { Env } from '../lib/env'
import { onRequest } from '../api/[[path]]'
import type { ChatEvent, ChatMsg, ChatSessionState, ChildRun } from '../lib/chat/types'
import { initialSessionState } from '../lib/chat/stateMachine'
import {
  appendChatTurn,
  createChatSession,
  getChatSession,
  listChatTurnEvents,
  type ChatSessionRow,
  type ChatTurnRow,
} from '../lib/chat/store'
import { createSseStream, encodeEventFrame, numberTurnEvents } from '../lib/chat/sse'
import { orchestrateTurn } from '../lib/chat/turn'

// ---------------------------------------------------------------------------
// In-memory D1 fake (users + chat tables incl. the W2 `events` column)
// ---------------------------------------------------------------------------

const ok = (changes: number) => ({ success: true, meta: { changes, duration: 0, last_row_id: 0, served_by: 'fake' } })

function makeFakeChatD1() {
  const users = new Map<string, { id: string; email: string; created_at: number; last_seen_at: number }>()
  const sessions = new Map<string, ChatSessionRow>()
  const turns: ChatTurnRow[] = []
  let failNarratorInsert = false // error-path knob: narrator append throws

  function run(sql: string, args: unknown[]) {
    if (sql.startsWith('INSERT INTO users')) {
      const [id, email, now] = args as [string, string, number]
      const existing = users.get(id)
      if (existing) existing.last_seen_at = now
      else users.set(id, { id, email, created_at: now, last_seen_at: now })
      return ok(1)
    }
    if (sql.startsWith('INSERT INTO chat_sessions')) {
      const [session_id, user_id, seed, chapter, subject_index, intake, created_at, updated_at] = args as [
        string, string, string, string, number, string, string, string,
      ]
      sessions.set(session_id, { session_id, user_id, seed, chapter, subject_index, intake, created_at, updated_at })
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
      const [turn_id, session_id, role, blocks, chapter, created_at, events] = args as [
        string, string, string, string, string, string, string | null,
      ]
      if (role === 'narrator' && failNarratorInsert) throw new Error('D1 exploded mid-turn')
      turns.push({ turn_id, session_id, role, blocks, chapter, created_at, events: events ?? null })
      return ok(1)
    }
    throw new Error(`fake D1: unsupported run() SQL: ${sql}`)
  }

  function first(sql: string, args: unknown[]): unknown | null {
    if (sql.startsWith('SELECT id, email, created_at, last_seen_at FROM users')) {
      const row = users.get(args[0] as string)
      return row ? { ...row } : null
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
      const eventsOnly = sql.includes('events IS NOT NULL')
      return turns
        .filter((t) => t.session_id === args[0])
        .filter((t) => !eventsOnly || t.events != null)
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

  return { db, users, sessions, turns, setFailNarratorInsert: (v: boolean) => { failNarratorInsert = v } }
}

// ---------------------------------------------------------------------------
// Shared fixtures / helpers
// ---------------------------------------------------------------------------

const A = 'dev:a@example.com'
const LOCAL = 'http://localhost:8788'
const KUNDALI: ChildRun = { kind: 'witness', mode: 'integrated-kundali-l0', minSubjects: 1, maxSubjects: 5, level: 'L0' }

function makeEnv(db: unknown, devEmail: string | undefined, extra?: Partial<Env>): Env {
  return {
    DB: db,
    CF_ACCESS_AUD: 'aud-tag',
    CF_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com',
    SELEMENE_API_KEY: '',
    SELEMENE_API_URL: '',
    DEV_IDENTITY_EMAIL: devEmail,
    ...extra,
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
afterEach(() => {
  vi.unstubAllGlobals()
})

function makeCtx(request: Request, devEmail: string | undefined = 'a@example.com', extra?: Partial<Env>) {
  return { request, env: makeEnv(fake.db, devEmail, extra) } as unknown as Parameters<typeof onRequest>[0]
}

const post = (body: unknown, url: string) =>
  new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

interface RawFrame {
  id?: number
  event: ChatEvent
}

/** Parse an SSE body into frames, honoring `id:` / `event:` / `data:` fields. */
function parseSseFrames(text: string): RawFrame[] {
  const frames: RawFrame[] = []
  for (const block of text.split('\n\n')) {
    if (!block.trim() || block.startsWith(':')) continue
    let id: number | undefined
    let data: string | undefined
    for (const line of block.split('\n')) {
      if (line.startsWith('id: ')) id = Number(line.slice(4))
      else if (line.startsWith('data: ')) data = line.slice(6)
    }
    if (data !== undefined) frames.push({ id, event: JSON.parse(data) as ChatEvent })
  }
  return frames
}

async function createSession(): Promise<string> {
  const res = await onRequest(makeCtx(post({ seed: KUNDALI }, `${LOCAL}/api/chat/session`)))
  expect(res.status).toBe(201)
  const body = (await res.json()) as { session: ChatSessionState }
  return body.session.sessionId
}

async function driveTurn(id: string, input: unknown): Promise<RawFrame[]> {
  const res = await onRequest(makeCtx(post({ sessionId: id, input }, `${LOCAL}/api/chat/turn`)))
  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toContain('text/event-stream')
  return parseSseFrames(await res.text())
}

// ---------------------------------------------------------------------------
// sse.ts — framing + id space
// ---------------------------------------------------------------------------

describe('sse framing (W2)', () => {
  it('encodeEventFrame puts id before event/data and omits it when undefined', () => {
    const ev: ChatEvent = { type: 'block_end', blockIndex: 0 }
    expect(encodeEventFrame(ev, 7)).toBe('id: 7\nevent: block_end\ndata: {"type":"block_end","blockIndex":0}\n\n')
    expect(encodeEventFrame(ev)).toBe('event: block_end\ndata: {"type":"block_end","blockIndex":0}\n\n')
  })

  it('createSseStream frames ids and tolerates close/cancel races', async () => {
    const sse = createSseStream({ heartbeatMs: 0 })
    sse.send({ type: 'reply_start', msgId: 'm1', chapter: 'surface' }, 1)
    sse.send({ type: 'reply_end', msg: { id: 'm1' } as unknown as ChatMsg }, 2)
    sse.close()
    sse.send({ type: 'error', message: 'late' }) // no-op after close
    sse.close() // idempotent
    const frames = parseSseFrames(await sse.response.text())
    expect(frames.map((f) => f.id)).toEqual([1, 2])
    expect(frames.map((f) => f.event.type)).toEqual(['reply_start', 'reply_end'])
  })

  it('numberTurnEvents numbers the concatenated slices 1..N', () => {
    const e = (m: string): ChatEvent => ({ type: 'error', message: m })
    const numbered = numberTurnEvents([{ events: [e('a'), e('b')] }, { events: [e('c')] }])
    expect(numbered.map((n) => n.id)).toEqual([1, 2, 3])
    expect(numbered[2].event).toEqual(e('c'))
    expect(numberTurnEvents([])).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// store.ts — event-sequence persistence
// ---------------------------------------------------------------------------

describe('chat store event persistence (W2)', () => {
  it('appendChatTurn stores the event slice; listChatTurnEvents replays slices in order, skipping user turns', async () => {
    const state = initialSessionState(KUNDALI, { sessionId: 's1', userId: A })
    await createChatSession(db, state)
    const userMsg: ChatMsg = { id: 't1', sessionId: 's1', role: 'user', blocks: [{ kind: 'text', text: 'begin' }], chapter: 'awakening', createdAt: '2026-07-24T00:00:00.000Z' }
    const narratorMsg: ChatMsg = { id: 't2', sessionId: 's1', role: 'narrator', blocks: [{ kind: 'text', text: 'hi' }], chapter: 'surface', createdAt: '2026-07-24T00:00:00.000Z' }
    const events: ChatEvent[] = [
      { type: 'reply_start', msgId: 't2', chapter: 'surface' },
      { type: 'reply_end', msg: narratorMsg },
    ]
    await appendChatTurn(db, userMsg) // no events → NULL
    await appendChatTurn(db, narratorMsg, events)

    const slices = await listChatTurnEvents(db, 's1')
    expect(slices).toHaveLength(1)
    expect(slices[0].turnId).toBe('t2')
    expect(slices[0].events).toEqual(events)
    expect(numberTurnEvents(slices).map((n) => n.id)).toEqual([1, 2])
    expect(await listChatTurnEvents(db, 'other')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// turn.ts — emitted events persisted verbatim + x-chat-key header
// ---------------------------------------------------------------------------

describe('orchestrateTurn event persistence (W2)', () => {
  it('the persisted slice equals the emitted sequence (reply_start..reply_end)', async () => {
    const state = initialSessionState(KUNDALI, { sessionId: 's-ev', userId: A })
    await createChatSession(db, state)
    const emitted: ChatEvent[] = []
    for await (const ev of orchestrateTurn({ db, env, state, input: 'begin' })) emitted.push(ev)

    expect(emitted[0].type).toBe('reply_start')
    expect(emitted.at(-1)?.type).toBe('reply_end')
    const slices = await listChatTurnEvents(db, 's-ev')
    expect(slices).toHaveLength(1)
    expect(slices[0].events).toEqual(emitted) // verbatim, in order
  })
})

describe('LLM-path auth header (W2)', () => {
  function stubLlmFetch(): { calls: { url: string; headers: Record<string, string> }[] } {
    const calls: { url: string; headers: Record<string, string> }[] = []
    vi.stubGlobal('fetch', async (url: unknown, init?: { headers?: Record<string, string> }) => {
      calls.push({ url: String(url), headers: { ...(init?.headers ?? {}) } })
      return Response.json({ choices: [{ message: { content: 'The mirror holds your name.' } }] })
    })
    return { calls }
  }

  const llmEnv = (token?: string) =>
    makeEnv(fake.db, 'a@example.com', {
      SELEMENE_API_URL: 'http://llm.test',
      SELEMENE_API_KEY: 'engine-key',
      CHAT_PROXY_TOKEN: token,
    })

  it('sends x-chat-key when CHAT_PROXY_TOKEN is configured', async () => {
    const state = initialSessionState(KUNDALI, { sessionId: 's-auth', userId: A })
    await createChatSession(db, state)
    const { calls } = stubLlmFetch()
    const events: ChatEvent[] = []
    for await (const ev of orchestrateTurn({ db, env: llmEnv('s3cret'), state, input: 'begin' })) events.push(ev)

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('http://llm.test/v1/chat/completions')
    expect(calls[0].headers['x-chat-key']).toBe('s3cret')
    expect(calls[0].headers['x-api-key']).toBe('engine-key') // existing header untouched
    // LLM path was actually used (its prose, not the deterministic template).
    const msg = (events.at(-1) as { msg: ChatMsg }).msg
    expect(msg.blocks.some((b) => b.kind === 'text' && b.text === 'The mirror holds your name.')).toBe(true)
  })

  it('omits x-chat-key when CHAT_PROXY_TOKEN is unset (inert by default)', async () => {
    const state = initialSessionState(KUNDALI, { sessionId: 's-noauth', userId: A })
    await createChatSession(db, state)
    const { calls } = stubLlmFetch()
    for await (const _ of orchestrateTurn({ db, env: llmEnv(undefined), state, input: 'begin' })) void _

    expect(calls).toHaveLength(1)
    expect('x-chat-key' in calls[0].headers).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// routes — live event ids + replay endpoint
// ---------------------------------------------------------------------------

describe('turn stream event ids (W2)', () => {
  it('live frames carry contiguous per-session ids continuing across turns', async () => {
    const id = await createSession()
    const t1 = await driveTurn(id, 'begin')
    const t2 = await driveTurn(id, 'yes')

    const n1 = t1.length
    expect(n1).toBeGreaterThan(0)
    expect(t1.map((f) => f.id)).toEqual(Array.from({ length: n1 }, (_, i) => i + 1))
    expect(t2.map((f) => f.id)).toEqual(Array.from({ length: t2.length }, (_, i) => n1 + i + 1))
    expect(t1[0].event.type).toBe('reply_start')
    expect(t1.at(-1)?.event.type).toBe('reply_end')
  })

  it('a turn whose persistence fails streams WITHOUT ids and ends in error', async () => {
    const id = await createSession()
    fake.setFailNarratorInsert(true)
    const frames = await driveTurn(id, 'begin')

    expect(frames.at(-1)?.event.type).toBe('error')
    expect(frames.every((f) => f.id === undefined)).toBe(true)
    // Only the user turn persisted; nothing is replayable.
    expect(fake.turns.map((t) => t.role)).toEqual(['user'])
    expect(await listChatTurnEvents(db, id)).toEqual([])

    // The session recovers on the next turn; ids still start at 1 (the failed
    // turn consumed none — exactly what a Last-Event-ID client needs).
    fake.setFailNarratorInsert(false)
    const retry = await driveTurn(id, 'begin')
    expect(retry.at(-1)?.event.type).toBe('reply_end')
    expect(retry.map((f) => f.id)).toEqual(Array.from({ length: retry.length }, (_, i) => i + 1))
  })
})

describe('replay endpoint (W2)', () => {
  const eventsUrl = (id: string, q = '') => `${LOCAL}/api/chat/session/${id}/events${q}`

  it('replays the persisted stream verbatim with the live id space; ?after= resumes mid-stream', async () => {
    const id = await createSession()
    const t1 = await driveTurn(id, 'begin')
    const t2 = await driveTurn(id, 'yes')
    const live = [...t1, ...t2]

    const full = parseSseFrames(await (await onRequest(makeCtx(new Request(eventsUrl(id))))).text())
    expect(full.map((f) => f.id)).toEqual(live.map((f) => f.id))
    expect(full.map((f) => f.event)).toEqual(live.map((f) => f.event))

    // Resume after the first turn: exactly the second turn's frames.
    const cut = t1.length
    const tail = parseSseFrames(await (await onRequest(makeCtx(new Request(eventsUrl(id, `?after=${cut}`))))).text())
    expect(tail.map((f) => f.id)).toEqual(t2.map((f) => f.id))
    expect(tail.map((f) => f.event)).toEqual(t2.map((f) => f.event))

    // after >= N replays nothing (client is caught up).
    const none = await onRequest(makeCtx(new Request(eventsUrl(id, `?after=${live.length}`))))
    expect((await none.text()).trim()).toBe('')
  })

  it('honors the Last-Event-ID header when ?after is absent', async () => {
    const id = await createSession()
    const t1 = await driveTurn(id, 'begin')
    const t2 = await driveTurn(id, 'yes')

    const res = await onRequest(
      makeCtx(new Request(eventsUrl(id), { headers: { 'Last-Event-ID': String(t1.length) } })),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    const frames = parseSseFrames(await res.text())
    expect(frames.map((f) => f.event)).toEqual(t2.map((f) => f.event))
  })

  it('guards: 400 on a non-integer after, 404 cross-user/unknown, 401 unauthenticated', async () => {
    const id = await createSession()
    await driveTurn(id, 'begin')

    expect((await onRequest(makeCtx(new Request(eventsUrl(id, '?after=abc'))))).status).toBe(400)
    expect((await onRequest(makeCtx(new Request(eventsUrl(id, '?after=-1'))))).status).toBe(400)
    expect((await onRequest(makeCtx(new Request(eventsUrl(id)), 'b@example.com'))).status).toBe(404)
    expect((await onRequest(makeCtx(new Request(eventsUrl('nope'))))).status).toBe(404)
    expect((await onRequest(makeCtx(new Request(eventsUrl(id)), ''))).status).toBe(401)
  })

  it('a mid-conversation replay rebuilds intake state (disconnect recovery shape)', async () => {
    const id = await createSession()
    await driveTurn(id, 'begin') // awakening → surface
    await driveTurn(id, 'yes') // surface → subjects
    await driveTurn(id, 'Asha') // intake: subjects[0].name

    // Simulate a client that received only turn 1 before dropping: replay
    // from its last id and apply intake_recorded events to rebuild state.
    const after = (await listChatTurnEvents(db, id))[0].events.length
    const frames = parseSseFrames(
      await (await onRequest(makeCtx(new Request(eventsUrl(id, `?after=${after}`))))).text(),
    )
    const intake: Record<string, unknown> = {}
    let chapter: string | undefined
    for (const f of frames) {
      if (f.event.type === 'intake_recorded') intake[f.event.field] = f.event.value
      if (f.event.type === 'chapter_advanced') chapter = f.event.chapter
      if (f.event.type === 'reply_start') chapter = f.event.chapter
    }
    expect(intake['subjects[0].name']).toBe('Asha')
    expect(chapter).toBe('subjects')
    expect((await getChatSession(db, A, id))?.chapter).toBe('subjects')
  })
})
