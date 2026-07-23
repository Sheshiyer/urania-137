import { useCallback, useEffect, useRef, useState } from 'react'
import { Send, X } from 'lucide-react'
import type { ChildRun } from '../../types'
import type { ChatBlock, ChatEvent, ChatMsg, ChatSessionState } from '../../types/chat'
import { toSubmitPayload, type SubmitPayload } from '../../lib/chat/stateMachine'
import { createOrResumeSession, completeSession, getSession, replayEvents, streamTurn } from '../../lib/chatApi'

/**
 * ChatSheet (Phase 2, W3-A) — the narrative onboarding surface that replaces
 * the node modal. One question at a time: the user answers, the narrator
 * replies over SSE, and every validated turn lands as an exact intake slot
 * server-side. When the story state machine reaches `handoff`, the sheet
 * refetches the authoritative session and fires `onHandoff(toSubmitPayload)`
 * exactly once — Node_Splice wires that to the existing submit hooks.
 *
 * Shell styling is copied 1:1 from `Modal.tsx` (void backdrop, gold-bordered
 * bottom sheet on mobile / centered panel on ≥sm, sticky header) so the chat
 * reads as the same chrome, not a new surface. No new palette, no new deps.
 *
 * Stream discipline (docs/chat-protocol.md): deltas accumulate into ONE
 * in-progress narrator message (keyed by `reply_start.msgId`); `reply_end`
 * replaces it with the authoritative ChatMsg; `error` discards it. The last
 * received event id is tracked so a transport failure triggers exactly one
 * replay from that id before surfacing an error.
 *
 * Kickoff: a fresh session (no turns) auto-sends an empty-string input so
 * the narrator speaks first ("say anything to begin" would otherwise leave
 * an empty thread). The empty user bubble is hidden in render.
 */

export interface ChatSheetProps {
  seed: ChildRun
  childLabel: string
  nodeId: string
  nodeLabel: string
  onClose: () => void
  /** Fired once when the session chapter reaches 'handoff'. */
  onHandoff: (payload: SubmitPayload) => void
}

const SEED_KIND_LABEL: Record<ChildRun['kind'], string> = {
  witness: 'Witness doorway',
  workflow: 'Workflow doorway',
  engine: 'Engine doorway',
  daily: 'Daily doorway',
}

/** WitnessForm's input treatment — the chat composer speaks the same visual language. */
const FIELD =
  'w-full rounded-lg border border-gold/10 bg-surface px-3 py-2 text-parchment placeholder-silver/50 focus:border-gold focus:outline-none'

function emptyBlock(kind: ChatBlock['kind']): ChatBlock {
  switch (kind) {
    case 'text':
      return { kind, text: '' }
    case 'stage_direction':
      return { kind, text: '' }
    case 'intake_field':
      return { kind, field: '', value: undefined }
    case 'tool_result':
      return { kind, ok: true }
  }
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return '—'
  const s = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return s.length > 80 ? `${s.slice(0, 77)}…` : s
}

function msgText(msg: ChatMsg): string {
  return msg.blocks
    .map((b) => (b.kind === 'text' || b.kind === 'stage_direction' ? b.text : ''))
    .join('')
    .trim()
}

function BlockView({ block }: { block: ChatBlock }) {
  switch (block.kind) {
    case 'text':
      return <p className="whitespace-pre-wrap leading-relaxed">{block.text}</p>
    case 'stage_direction':
      return (
        <p className="py-1 text-center font-display text-[10px] uppercase tracking-[0.25em] text-gold/60" aria-label="stage direction">
          ✦ {block.text} ✦
        </p>
      )
    case 'intake_field':
      if (!block.field) return null
      return (
        <p className="py-0.5">
          <span className="inline-flex max-w-full items-baseline gap-2 rounded-full border border-emerald/30 bg-emerald/10 px-2.5 py-0.5 text-xs text-emerald">
            <span className="font-display uppercase tracking-widest">{block.field}</span>
            <span className="truncate text-emerald/80">{formatValue(block.value)}</span>
          </span>
        </p>
      )
    case 'tool_result':
      return (
        <p className={`text-xs ${block.ok ? 'text-emerald' : 'text-terracotta'}`}>
          {block.ok ? (block.message ?? 'Recorded.') : (block.message ?? 'That did not validate — the narrator will re-ask.')}
        </p>
      )
  }
}

export function ChatSheet({ seed, childLabel, nodeId, nodeLabel, onClose, onHandoff }: ChatSheetProps) {
  const [session, setSession] = useState<ChatSessionState | null>(null)
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initRef = useRef(false)
  const streamingRef = useRef(false)
  const handedOffRef = useRef(false)
  const abortRef = useRef<(() => void) | null>(null)
  const lastEventIdRef = useRef(0)
  const sessionIdRef = useRef('')
  const shellIdRef = useRef<string | null>(null)
  const threadRef = useRef<HTMLDivElement | null>(null)

  // Latest-callback refs so stream handlers never capture stale props/state.
  const onHandoffRef = useRef(onHandoff)
  onHandoffRef.current = onHandoff
  const sessionRef = useRef(session)
  sessionRef.current = session

  // -------------------------------------------------------------------------
  // Event accumulation — one reply ⇒ exactly one ChatMsg (protocol invariant)
  // -------------------------------------------------------------------------

  const applyEvent = useCallback((ev: ChatEvent, id?: number) => {
    if (id !== undefined) lastEventIdRef.current = id
    switch (ev.type) {
      case 'reply_start':
        shellIdRef.current = ev.msgId
        setMsgs((prev) => [
          ...prev.filter((m) => m.id !== ev.msgId),
          {
            id: ev.msgId,
            sessionId: sessionIdRef.current,
            role: 'narrator',
            blocks: [],
            chapter: ev.chapter,
            createdAt: new Date().toISOString(),
          },
        ])
        break
      case 'block_start':
        setMsgs((prev) =>
          prev.map((m) => {
            if (m.id !== shellIdRef.current) return m
            const blocks = m.blocks.slice()
            blocks[ev.blockIndex] = emptyBlock(ev.blockKind)
            return { ...m, blocks }
          }),
        )
        break
      case 'block_delta':
        setMsgs((prev) =>
          prev.map((m) => {
            if (m.id !== shellIdRef.current) return m
            const blocks = m.blocks.slice()
            const b = blocks[ev.blockIndex]
            if (b && (b.kind === 'text' || b.kind === 'stage_direction')) {
              blocks[ev.blockIndex] = { ...b, text: b.text + ev.text }
            }
            return { ...m, blocks }
          }),
        )
        break
      case 'block_end':
        break // shells are replaced by the authoritative msg on reply_end
      case 'intake_recorded':
        break // server-authoritative; the reply_end msg carries intake_field blocks
      case 'chapter_advanced':
        setSession((s) => (s ? { ...s, chapter: ev.chapter } : s))
        break
      case 'reply_end':
        shellIdRef.current = null
        setMsgs((prev) => [...prev.filter((m) => m.id !== ev.msg.id), ev.msg])
        break
      case 'error':
        setMsgs((prev) => prev.filter((m) => m.id !== shellIdRef.current))
        shellIdRef.current = null
        setError(ev.message)
        break
    }
  }, [])

  // -------------------------------------------------------------------------
  // Sending a turn (with one-shot replay recovery on transport failure)
  // -------------------------------------------------------------------------

  const sendInput = useCallback(
    (sess: ChatSessionState, input: string) => {
      if (streamingRef.current) return
      streamingRef.current = true
      setStreaming(true)
      setError(null)
      setMsgs((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sessionId: sess.sessionId,
          role: 'user',
          blocks: [{ kind: 'text', text: input }],
          chapter: sess.chapter,
          createdAt: new Date().toISOString(),
        },
      ])
      abortRef.current = streamTurn(sess.sessionId, input, {
        onEvent: applyEvent,
        onDone: () => {
          streamingRef.current = false
          setStreaming(false)
        },
        onError: (err) => {
          // W2 contract: the turn persisted before any frame, so a transport
          // break is recoverable — replay once from the last good event id.
          void (async () => {
            try {
              let recovered = false
              await replayEvents(sess.sessionId, lastEventIdRef.current, (ev, id) => {
                applyEvent(ev, id)
                if (ev.type === 'reply_end') recovered = true
              })
              if (!recovered) setError(`${err.message} — the reply could not be recovered; send again to continue.`)
            } catch {
              setError(err.message)
            } finally {
              streamingRef.current = false
              setStreaming(false)
            }
          })()
        },
      })
    },
    [applyEvent],
  )

  // -------------------------------------------------------------------------
  // Mount: create/resume the session, load history, kick off a fresh story
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (initRef.current) return // StrictMode double-invoke guard
    initRef.current = true
    let cancelled = false
    void (async () => {
      try {
        const created = await createOrResumeSession(seed)
        const { session: loaded, turns } = await getSession(created.sessionId)
        if (cancelled) return
        sessionIdRef.current = loaded.sessionId
        setSession(loaded)
        setMsgs(turns)
        setLoading(false)
        if (turns.length === 0 && loaded.chapter !== 'handoff' && loaded.chapter !== 'complete') {
          sendInput(loaded, '') // narrator speaks first (see kickoff note above)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'The doorway could not be opened.')
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [seed, sendInput])

  // Abort any in-flight stream when the sheet unmounts.
  useEffect(() => () => abortRef.current?.(), [])

  // -------------------------------------------------------------------------
  // Handoff — fired exactly once when the chapter reaches 'handoff'
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!session || session.chapter !== 'handoff' || handedOffRef.current) return
    handedOffRef.current = true
    void (async () => {
      let consumed = false
      try {
        // Refetch so the payload is built from the authoritative session,
        // not from client-side event accumulation.
        const fresh = await getSession(session.sessionId)
        onHandoffRef.current(toSubmitPayload(fresh.session))
        consumed = true
        // Advance-on-consume (W4): the backend moves the session to
        // 'complete' once the handoff payload has been delivered, so a
        // remounted sheet can never re-fire onHandoff (duplicate engine
        // submit + duplicate Folio save). handedOffRef stays as
        // defense-in-depth for this mount.
        setSession(await completeSession(session.sessionId))
      } catch (err) {
        // Only a pre-handoff failure may retry: once the payload has been
        // consumed, re-firing would duplicate the engine submit + Folio save.
        if (!consumed) handedOffRef.current = false
        setError(
          consumed
            ? 'The story was handed off, but marking the session complete failed — do not reopen this doorway; start a new one instead.'
            : err instanceof Error
              ? err.message
              : 'The assembled request could not be handed off.',
        )
      }
    })()
  }, [session])

  // -------------------------------------------------------------------------
  // Auto-scroll (honors prefers-reduced-motion)
  // -------------------------------------------------------------------------

  useEffect(() => {
    const el = threadRef.current
    if (!el) return
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth' })
  }, [msgs, streaming])

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const chapter = session?.chapter
  const done = chapter === 'handoff' || chapter === 'complete'
  const inputDisabled = loading || streaming || done || !session

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    const sess = sessionRef.current
    if (!text || !sess || streamingRef.current || done) return
    setDraft('')
    sendInput(sess, text)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" data-node-id={nodeId}>
      <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-3xl border border-gold/20 bg-surface/95 shadow-2xl shadow-gold/10 sm:max-h-[88vh] sm:rounded-3xl">
        {/* Grab handle (mobile bottom-sheet affordance) */}
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-silver/30 sm:hidden" aria-hidden="true" />

        {/* Sticky header — same chrome as Modal, plus the chapter cursor */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gold/10 px-5 py-3.5 sm:px-8 sm:py-5">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] font-display text-silver">
              {nodeLabel} · {SEED_KIND_LABEL[seed.kind]}
              {chapter && <span className="text-gold/70"> · {chapter.replace('_', ' ')}</span>}
            </p>
            <h2 className="truncate font-display text-lg font-semibold tracking-wide text-parchment sm:text-2xl">{childLabel}</h2>
          </div>
          <button
            onClick={onClose}
            className="-mr-1 shrink-0 rounded-full p-2 text-silver transition-colors hover:bg-parchment/5 hover:text-parchment"
            aria-label="Close chat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Message thread */}
        <div ref={threadRef} role="log" aria-live="polite" className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-8">
          {loading && <p className="py-8 text-center text-sm text-silver">Opening the doorway…</p>}

          {!loading && msgs.length === 0 && !streaming && (
            <p className="py-8 text-center text-sm text-silver">
              You entered through the <span className="text-gold">{childLabel}</span> doorway. Say anything to begin.
            </p>
          )}

          {msgs.map((msg) => {
            if (msg.role === 'user') {
              const text = msgText(msg)
              if (!text) return null // hidden kickoff input
              return (
                <div key={msg.id} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm border border-gold/25 bg-gold/10 px-4 py-2.5 text-sm text-parchment">
                  <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
                </div>
              )
            }
            return (
              <div key={msg.id} className="mr-auto max-w-[92%] space-y-1.5 text-sm text-parchment/90">
                {msg.blocks.map((b, i) => (
                  <BlockView key={i} block={b} />
                ))}
              </div>
            )
          })}

          {/* Typing indicator — shown until the first block of the reply lands */}
          {streaming && (msgs.length === 0 || msgs[msgs.length - 1].role === 'user' || msgs[msgs.length - 1].blocks.length === 0) && (
            <div className="flex items-center gap-1.5 py-1" aria-label="The narrator is composing">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold/60 motion-reduce:animate-none"
                  style={{ animationDelay: `${i * 180}ms` }}
                />
              ))}
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-terracotta/20 bg-terracotta/10 px-3 py-2 text-sm text-terracotta">{error}</p>
          )}

          {done && (
            <p className="py-2 text-center font-display text-[10px] uppercase tracking-[0.25em] text-gold/60">
              ✦ The story has been handed off to the engines ✦
            </p>
          )}
        </div>

        {/* Composer — sticky footer in the Modal shell's place of the scroll body */}
        <form onSubmit={submit} className="flex shrink-0 items-center gap-2 border-t border-gold/10 px-5 py-4 sm:px-8">
          <input
            className={FIELD}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={inputDisabled}
            placeholder={loading ? 'Opening the doorway…' : done ? 'This story has been handed off.' : 'Answer the narrator…'}
            aria-label="Your reply"
          />
          <button
            type="submit"
            disabled={inputDisabled || !draft.trim()}
            className="shrink-0 rounded-full bg-gradient-to-r from-emerald to-gold p-2.5 text-void transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send reply"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
