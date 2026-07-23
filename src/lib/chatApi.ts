/**
 * Chat onboarding API client (Phase 2, W3-A) — the SPA side of the SSE
 * contract in `docs/chat-protocol.md`, against the live Pages Functions
 * backend (`functions/api/[[path]].ts`):
 *
 *   POST /api/chat/session            { seed } → 201 create / 200 resume { session, resumed }
 *   GET  /api/chat/session/:id        → { session, turns }
 *   POST /api/chat/turn               { sessionId, input } → SSE ChatEvent stream (id: lines)
 *   GET  /api/chat/session/:id/events ?after=<n> → finite SSE replay
 *
 * Auth is the existing CF Access / dev-identity cookie — every call sends
 * `credentials: 'include'` (same-origin already carries it; the flag keeps
 * the contract explicit). Errors follow the frozen `ApiError` envelope
 * (`src/lib/api/contract.ts`): { error, message }.
 *
 * Streaming is a raw `fetch` + ReadableStream consumer (EventSource cannot
 * POST). Frame format mirrors the backend encoder
 * (`functions/lib/chat/sse.ts`): optional `id:` line, `event: <type>`,
 * `data: <json>`, blank-line terminator; `: heartbeat` comments are ignored.
 * The `data` payload IS the full ChatEvent (its `type` matches the `event:`
 * line), so parsing `data` alone is sufficient.
 */

import type { ChildRun } from '../types'
import type { ChatEvent, ChatMsg, ChatSessionState } from '../types/chat'

const CHAT_BASE = '/api/chat'

// ---------------------------------------------------------------------------
// Error handling — frozen ApiError envelope
// ---------------------------------------------------------------------------

async function toError(res: Response, fallback: string): Promise<Error> {
  try {
    const body = (await res.json()) as { error?: string; message?: string }
    return new Error(body.message || body.error || fallback)
  } catch {
    return new Error(fallback)
  }
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

/**
 * Create a session for `seed`, or resume the latest open one for
 * (user, seed) — the backend decides (201 create / 200 resume); both return
 * the authoritative `ChatSessionState`.
 */
export async function createOrResumeSession(seed: ChildRun): Promise<ChatSessionState> {
  const res = await fetch(`${CHAT_BASE}/session`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ seed }),
  })
  if (!res.ok) throw await toError(res, `chat session ${res.status}`)
  const body = (await res.json()) as { session: ChatSessionState; resumed: boolean }
  return body.session
}

/** Authoritative snapshot: session state + full turn history (oldest first). */
export async function getSession(sessionId: string): Promise<{ session: ChatSessionState; turns: ChatMsg[] }> {
  const res = await fetch(`${CHAT_BASE}/session/${encodeURIComponent(sessionId)}`, {
    credentials: 'include',
    headers: { accept: 'application/json' },
  })
  if (!res.ok) throw await toError(res, `chat session ${res.status}`)
  return (await res.json()) as { session: ChatSessionState; turns: ChatMsg[] }
}

/**
 * Advance-on-consume (Phase 2 W4): mark a `handoff` session `complete` AFTER
 * the client has consumed the handoff payload, so a remounted ChatSheet can
 * never re-fire `onHandoff` (duplicate engine submit + duplicate Folio save).
 * Idempotent on `complete`; the backend 400s on any earlier chapter.
 * Returns the updated session state.
 */
export async function completeSession(sessionId: string): Promise<ChatSessionState> {
  const res = await fetch(`${CHAT_BASE}/session/${encodeURIComponent(sessionId)}/complete`, {
    method: 'POST',
    credentials: 'include',
    headers: { accept: 'application/json' },
  })
  if (!res.ok) throw await toError(res, `chat complete ${res.status}`)
  const body = (await res.json()) as { session: ChatSessionState }
  return body.session
}

// ---------------------------------------------------------------------------
// SSE frame parsing (shared by the live turn stream and the replay endpoint)
// ---------------------------------------------------------------------------

/** Parse one raw SSE frame; heartbeat/comment frames yield no event. */
function parseFrame(raw: string, onEvent: (ev: ChatEvent, id?: number) => void): void {
  let id: number | undefined
  let data = ''
  for (const line of raw.split('\n')) {
    if (!line || line.startsWith(':')) continue // heartbeat comments / blanks
    if (line.startsWith('id:')) {
      const n = Number(line.slice(3).trim())
      if (Number.isInteger(n) && n > 0) id = n
    } else if (line.startsWith('data:')) {
      data += (data ? '\n' : '') + line.slice(5).replace(/^ /, '')
    }
    // `event:` lines are redundant with data.type — ignored by design.
  }
  if (!data) return
  onEvent(JSON.parse(data) as ChatEvent, id)
}

/** Consume a `text/event-stream` body to completion, emitting parsed frames. */
async function readEventStream(body: ReadableStream<Uint8Array>, onEvent: (ev: ChatEvent, id?: number) => void): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let cut: number
      while ((cut = buf.indexOf('\n\n')) !== -1) {
        parseFrame(buf.slice(0, cut), onEvent)
        buf = buf.slice(cut + 2)
      }
    }
    buf += decoder.decode() // flush
    if (buf.trim()) parseFrame(buf, onEvent)
  } finally {
    reader.releaseLock()
  }
}

// ---------------------------------------------------------------------------
// Turn streaming
// ---------------------------------------------------------------------------

export interface StreamHandlers {
  /** One parsed ChatEvent; `id` is its session-wide persisted ordinal when present. */
  onEvent: (ev: ChatEvent, id?: number) => void
  /** The stream terminated normally (after reply_end or error frame). */
  onDone: () => void
  /** Transport/HTTP failure — no further callbacks for this turn. */
  onError: (err: Error) => void
}

/**
 * POST one user input and stream the narrator reply. Returns an abort
 * function. Per the W2 contract the backend persists the whole turn BEFORE
 * the first frame, so aborting never loses data — the caller can recover
 * with `replayEvents` from its last received event id. Abort is silent:
 * neither onDone nor onError fires after it.
 */
export function streamTurn(sessionId: string, input: unknown, handlers: StreamHandlers): () => void {
  const ctrl = new AbortController()
  void (async () => {
    try {
      const res = await fetch(`${CHAT_BASE}/turn`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, input }),
        signal: ctrl.signal,
      })
      if (!res.ok) throw await toError(res, `chat turn ${res.status}`)
      if (!res.body) throw new Error('chat turn: response has no stream body')
      await readEventStream(res.body, handlers.onEvent)
      if (!ctrl.signal.aborted) handlers.onDone()
    } catch (err) {
      if (ctrl.signal.aborted) return
      handlers.onError(err instanceof Error ? err : new Error(String(err)))
    }
  })()
  return () => ctrl.abort()
}

// ---------------------------------------------------------------------------
// Replay (disconnect recovery)
// ---------------------------------------------------------------------------

/**
 * Replay the persisted event stream after event `after` (0 = full replay).
 * Applies each frame through `onEvent` with its ordinal id and returns the
 * last id seen (`after` itself when already caught up). The body is finite;
 * frames are byte-identical to what the live streams emitted.
 */
export async function replayEvents(
  sessionId: string,
  after: number,
  onEvent: (ev: ChatEvent, id: number) => void,
): Promise<number> {
  const res = await fetch(`${CHAT_BASE}/session/${encodeURIComponent(sessionId)}/events?after=${Math.max(0, Math.floor(after))}`, {
    credentials: 'include',
    headers: { accept: 'text/event-stream' },
  })
  if (!res.ok) throw await toError(res, `chat events ${res.status}`)
  if (!res.body) throw new Error('chat events: response has no stream body')
  let last = after
  await readEventStream(res.body, (ev, id) => {
    if (id !== undefined) {
      last = id
      onEvent(ev, id)
    }
  })
  return last
}
