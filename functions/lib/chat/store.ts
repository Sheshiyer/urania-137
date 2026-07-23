/**
 * Chat session DAL (chat onboarding, Phase 1 W1-A) — D1 access for the
 * `chat_sessions` / `chat_turns` tables from migration 0002.
 *
 * User scoping mirrors the readings DAL (functions/lib/db.ts): every session
 * read/write binds `user_id` in SQL, so a cross-user id matches zero rows
 * (null/false, no mutation) and never leaks another user's data. Turns are
 * scoped through the owning session — callers verify session ownership via
 * `getChatSession` before touching `chat_turns`.
 *
 * JSON columns (`seed`, `intake`, `blocks`) are serialized Worker-side;
 * timestamps are ISO 8601 TEXT to match the canonical chat contract
 * (functions/lib/chat/types.ts ← src/types/chat.ts).
 */
import type { D1Database } from '@cloudflare/workers-types'
import type { ChatEvent, ChatMsg, ChatRole, ChatSessionState, StoryChapter } from './types'

/** Row shape of `chat_sessions` (migration 0002). */
export interface ChatSessionRow {
  session_id: string
  user_id: string
  seed: string
  chapter: string
  subject_index: number
  intake: string
  created_at: string
  updated_at: string
}

/** Row shape of `chat_turns` (migration 0002; `events` added by 0003). */
export interface ChatTurnRow {
  turn_id: string
  session_id: string
  role: string
  blocks: string
  chapter: string
  created_at: string
  /** JSON ChatEvent[] for narrator turns (W2 replay); NULL for user turns. */
  events?: string | null
}

// ---------------------------------------------------------------------------
// Row ⇄ contract mapping
// ---------------------------------------------------------------------------

export function sessionRowToState(row: ChatSessionRow): ChatSessionState {
  return {
    sessionId: row.session_id,
    userId: row.user_id,
    seed: JSON.parse(row.seed) as ChatSessionState['seed'],
    chapter: row.chapter as StoryChapter,
    subjectIndex: row.subject_index,
    intake: JSON.parse(row.intake) as ChatSessionState['intake'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function turnRowToMsg(row: ChatTurnRow): ChatMsg {
  return {
    id: row.turn_id,
    sessionId: row.session_id,
    role: row.role as ChatRole,
    blocks: JSON.parse(row.blocks) as ChatMsg['blocks'],
    chapter: row.chapter as StoryChapter,
    createdAt: row.created_at,
  }
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

/** Insert a new session row from an initial `ChatSessionState`. */
export async function createChatSession(db: D1Database, state: ChatSessionState): Promise<ChatSessionState> {
  await db
    .prepare(
      `INSERT INTO chat_sessions (session_id, user_id, seed, chapter, subject_index, intake, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(
      state.sessionId,
      state.userId,
      JSON.stringify(state.seed),
      state.chapter,
      state.subjectIndex,
      JSON.stringify(state.intake),
      state.createdAt,
      state.updatedAt,
    )
    .run()
  return state
}

/** Fetch one session by id, scoped to the owner (cross-user → null). */
export async function getChatSession(
  db: D1Database,
  userId: string,
  sessionId: string,
): Promise<ChatSessionState | null> {
  const row = await db
    .prepare(`SELECT * FROM chat_sessions WHERE session_id = ?1 AND user_id = ?2`)
    .bind(sessionId, userId)
    .first<ChatSessionRow>()
  return row ? sessionRowToState(row) : null
}

/**
 * Persist an updated state (chapter cursor, subject cursor, intake,
 * updated_at). Scoped by user_id like every other write; returns false when
 * the session does not exist FOR THIS USER (unknown and cross-user ids are
 * indistinguishable — no existence leak).
 */
export async function saveChatSession(db: D1Database, state: ChatSessionState): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE chat_sessions
       SET chapter = ?3, subject_index = ?4, intake = ?5, updated_at = ?6
       WHERE session_id = ?1 AND user_id = ?2`,
    )
    .bind(
      state.sessionId,
      state.userId,
      state.chapter,
      state.subjectIndex,
      JSON.stringify(state.intake),
      state.updatedAt,
    )
    .run()
  return (res.meta?.changes ?? 0) > 0
}

/** List the caller's sessions, most recently active first. */
export async function listChatSessions(db: D1Database, userId: string): Promise<ChatSessionState[]> {
  const { results } = await db
    .prepare(`SELECT * FROM chat_sessions WHERE user_id = ?1 ORDER BY updated_at DESC`)
    .bind(userId)
    .all<ChatSessionRow>()
  return (results ?? []).map(sessionRowToState)
}

/**
 * Canonical seed identity for create-or-resume: JSON with recursively sorted
 * object keys, so two semantically identical seeds match regardless of the
 * client's key order.
 */
export function seedKey(seed: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort)
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>
      return Object.fromEntries(Object.keys(o).sort().map((k) => [k, sort(o[k])]))
    }
    return v
  }
  return JSON.stringify(sort(seed))
}

/**
 * Resume target for POST /api/chat/session: the caller's most recently
 * updated session with an identical seed that has not reached `complete`.
 * Seed equality is canonical (`seedKey`), evaluated Worker-side after the
 * user-scoped fetch.
 */
export async function findLatestOpenSession(
  db: D1Database,
  userId: string,
  seed: unknown,
): Promise<ChatSessionState | null> {
  const { results } = await db
    .prepare(
      `SELECT * FROM chat_sessions
       WHERE user_id = ?1 AND chapter != 'complete'
       ORDER BY updated_at DESC`,
    )
    .bind(userId)
    .all<ChatSessionRow>()
  const key = seedKey(seed)
  for (const row of results ?? []) {
    if (seedKey(JSON.parse(row.seed)) === key) return sessionRowToState(row)
  }
  return null
}

// ---------------------------------------------------------------------------
// Turns
// ---------------------------------------------------------------------------

/**
 * Append a persisted turn (one ChatMsg — user or narrator) to a session.
 * W2 (additive): narrator turns also persist the exact `ChatEvent` sequence
 * they emitted (`events`, reply_start..reply_end inclusive) so the replay
 * endpoint can reconstruct the stream verbatim; user turns omit it (NULL).
 */
export async function appendChatTurn(db: D1Database, msg: ChatMsg, events?: ChatEvent[]): Promise<ChatMsg> {
  await db
    .prepare(
      `INSERT INTO chat_turns (turn_id, session_id, role, blocks, chapter, created_at, events)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
    .bind(
      msg.id,
      msg.sessionId,
      msg.role,
      JSON.stringify(msg.blocks),
      msg.chapter,
      msg.createdAt,
      events ? JSON.stringify(events) : null,
    )
    .run()
  return msg
}

/** One narrator turn's persisted event sequence (W2 replay building block). */
export interface ChatTurnEventSlice {
  turnId: string
  events: ChatEvent[]
}

/**
 * Persisted narrator event sequences for a session, oldest first (same
 * ordering as listChatTurns). Concatenated in order they form the session's
 * replayable event stream; event ids are the 1-based ordinals of that
 * concatenation (see numberTurnEvents in sse.ts and docs/chat-protocol.md).
 * Callers must verify session ownership first (`getChatSession`).
 */
export async function listChatTurnEvents(db: D1Database, sessionId: string): Promise<ChatTurnEventSlice[]> {
  const { results } = await db
    .prepare(
      `SELECT turn_id, events FROM chat_turns
       WHERE session_id = ?1 AND events IS NOT NULL
       ORDER BY created_at ASC, rowid ASC`,
    )
    .bind(sessionId)
    .all<{ turn_id: string; events: string }>()
  return (results ?? []).map((r) => ({ turnId: r.turn_id, events: JSON.parse(r.events) as ChatEvent[] }))
}

/**
 * Turn history for a session, oldest first. Ties on created_at break by
 * rowid so same-millisecond turns keep insertion order. Callers must verify
 * session ownership first (`getChatSession`) — this query is intentionally
 * session-scoped only.
 */
export async function listChatTurns(db: D1Database, sessionId: string): Promise<ChatMsg[]> {
  const { results } = await db
    .prepare(`SELECT * FROM chat_turns WHERE session_id = ?1 ORDER BY created_at ASC, rowid ASC`)
    .bind(sessionId)
    .all<ChatTurnRow>()
  return (results ?? []).map(turnRowToMsg)
}
