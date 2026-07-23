/**
 * SSE helper (chat onboarding, Phase 1 W1-A; hardened W2) — builds a
 * `text/event-stream` Response for `POST /api/chat/turn` and frames
 * `ChatEvent` values onto it.
 *
 * Frame format (one `ChatEvent` per frame):
 *   id: <n>\n            (only when the event belongs to the persisted stream)
 *   event: <type>\n
 *   data: <json>\n
 *   \n
 * The `event:` line carries the ChatEvent discriminant so clients may use
 * either `addEventListener(<type>)` or parse `data` alone. The `id:` line
 * (W2) is the event's 1-based ordinal in the session's PERSISTED event
 * stream — the same id space the replay endpoint
 * (`GET /api/chat/session/:id/events?after=<n>`) uses — so a client can
 * reconnect with `Last-Event-ID` and resume exactly where it dropped.
 * Events of a turn that failed to persist carry NO id (nothing to resume
 * from). Heartbeat comment frames (`: heartbeat`) keep intermediaries from
 * buffering/closing idle streams; they carry no data and are ignored by
 * SSE clients.
 */
import type { ChatEvent } from './types'

/** Serialize one ChatEvent as an SSE frame, optionally with an `id:` line. */
export function encodeEventFrame(event: ChatEvent, id?: number): string {
  const idLine = id === undefined ? '' : `id: ${id}\n`
  return `${idLine}event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
}

/** One persisted event with its session-wide 1-based ordinal id. */
export interface NumberedChatEvent {
  id: number
  event: ChatEvent
}

/**
 * Flatten per-turn persisted event slices (oldest first) into the session's
 * single replayable stream, numbering events 1..N. This is THE id space:
 * live turn streams and the replay endpoint both use it, so `after=<n>` /
 * `Last-Event-ID` resume is exact. Ids are monotonic per session; gaps are
 * possible only if a narrator turn row persisted while its session-state
 * save failed (an orphaned, never-completed reply) — monotonicity, and
 * therefore resume correctness, is unaffected.
 */
export function numberTurnEvents(slices: { events: ChatEvent[] }[]): NumberedChatEvent[] {
  const out: NumberedChatEvent[] = []
  let id = 0
  for (const slice of slices) {
    for (const event of slice.events) out.push({ id: ++id, event })
  }
  return out
}

export interface SseStream {
  /** The streaming Response to return from the route. */
  response: Response
  /** Frame one ChatEvent onto the stream (with optional `id:` line). No-op after close/cancel. */
  send(event: ChatEvent, id?: number): void
  /** Terminate the stream normally (after reply_end or error). */
  close(): void
}

export interface SseOptions {
  /** Heartbeat interval in ms (default 15s). 0 disables heartbeats. */
  heartbeatMs?: number
  /** Extra response headers (merged over the SSE defaults). */
  headers?: Record<string, string>
}

const encoder = new TextEncoder()

export function createSseStream(opts: SseOptions = {}): SseStream {
  const heartbeatMs = opts.heartbeatMs ?? 15_000
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null
  let closed = false

  const enqueue = (chunk: string): void => {
    if (closed || !controller) return
    try {
      controller.enqueue(encoder.encode(chunk))
    } catch {
      closed = true
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c
    },
    cancel() {
      closed = true
      if (timer !== undefined) clearInterval(timer)
    },
  })

  let timer: ReturnType<typeof setInterval> | undefined
  if (heartbeatMs > 0) {
    timer = setInterval(() => enqueue(': heartbeat\n\n'), heartbeatMs)
    // Node (vitest) only: don't let the heartbeat keep the process alive.
    ;(timer as unknown as { unref?: () => void }).unref?.()
  }

  return {
    response: new Response(stream, {
      status: 200,
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        // Disable proxy buffering (nginx/CF-style intermediaries).
        'x-accel-buffering': 'no',
        ...opts.headers,
      },
    }),
    send(event: ChatEvent, id?: number): void {
      enqueue(encodeEventFrame(event, id))
    },
    close(): void {
      if (closed) return
      closed = true
      if (timer !== undefined) clearInterval(timer)
      try {
        controller?.close()
      } catch {
        // already errored/cancelled — nothing to do
      }
    },
  }
}
