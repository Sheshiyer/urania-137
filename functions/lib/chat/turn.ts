/**
 * Turn orchestration (chat onboarding, Phase 1 W1-A) — one user message in,
 * one narrator reply out as a `ChatEvent` sequence, with persistence.
 *
 * Flow per turn (HITL resume — no long-lived process):
 *   load state (route, ownership-guarded) → applyUserInput (state machine is
 *   the SOLE intake writer — schema-validated slots, never parsed prose) →
 *   persist user turn → narratorReply seam (LLM path via SELEMENE_API_URL /
 *   SELEMENE_API_KEY when configured, deterministic currentQuestion()
 *   templates otherwise — a turn NEVER 500s because the LLM is down) →
 *   emit reply_start → block frames → intake_recorded? → chapter_advanced? →
 *   persist narrator turn + new state → reply_end (exactly one ChatMsg).
 *
 * W2 hardening: the narrator reply's exact event sequence is persisted on the
 * turn row (replay source for GET /api/chat/session/:id/events), and the LLM
 * fetch sends the shared-secret `x-chat-key` header when CHAT_PROXY_TOKEN is
 * configured (inert when unset). Disconnect/timeout semantics live in the
 * route (functions/api/[[path]].ts) and docs/chat-protocol.md.
 */
import type { D1Database } from '@cloudflare/workers-types'
import type { Env } from '../env'
import type { ChatBlock, ChatEvent, ChatMsg, ChatSessionState } from './types'
import {
  applyUserInput,
  currentQuestion,
  type StoryQuestion,
  type StoryTurn,
} from './stateMachine'
import { appendChatTurn, saveChatSession } from './store'
import { buildNarratorSystemPrompt } from './prompts'
import { RECORD_INTAKE_TOOL } from './tools'

// ---------------------------------------------------------------------------
// narratorReply seam — W1-B (prompts/tools) and W2 align to this signature
// ---------------------------------------------------------------------------

/** Everything a narrator needs to voice ONE reply. State is post-validation. */
export interface NarratorContext {
  /** Session state AFTER applyUserInput (the reply speaks from here). */
  state: ChatSessionState
  /** Reducer result for this input (event / validated field / error). */
  turn: StoryTurn
  /** Deterministic next-question template for the current chapter. */
  question: StoryQuestion
  /** Raw user input for this turn. */
  input: unknown
}

export interface NarratorReply {
  /** Ordered content blocks of the single narrator ChatMsg. */
  blocks: ChatBlock[]
}

/**
 * The narrator seam. Implementations MUST NOT throw — a narrator failure
 * degrades to the deterministic fallback inside `defaultNarrator`; the
 * orchestrator additionally guards with try/catch (belt and suspenders).
 */
export type NarratorFn = (ctx: NarratorContext, env: Env) => Promise<NarratorReply>

/** Read a dotted intake path (`subjects[0].name`, `options.intention`, …). */
export function getPathValue(obj: unknown, path: string): unknown {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean)
  let cur: unknown = obj
  for (const p of parts) {
    if (cur === null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

/**
 * Deterministic fallback narrator — pure function of the state machine
 * output, no LLM. Used when no upstream LLM is configured, when the call
 * fails, and in tests. The `key :: template` prompts are the machine's
 * voice; W1-B's persona narrator re-voices them when the LLM path is live.
 */
export function deterministicNarrator(ctx: NarratorContext): NarratorReply {
  const { turn, question } = ctx
  const text: ChatBlock = { kind: 'text', text: question.prompt }
  switch (turn.event) {
    case 'invalid':
      return {
        blocks: [
          { kind: 'tool_result', ok: false, message: turn.error ?? 'invalid input' },
          text,
        ],
      }
    case 'intake_recorded':
      return {
        blocks: [
          {
            kind: 'intake_field',
            field: turn.field ?? '',
            value: turn.field ? getPathValue(turn.state.intake, turn.field) : undefined,
          },
          text,
        ],
      }
    case 'chapter_advanced':
    case 'ready':
      return {
        blocks: [{ kind: 'stage_direction', text: `chapter.${turn.state.chapter}` }, text],
      }
  }
}

// ---------------------------------------------------------------------------
// LLM narrator path (upstream llm-proxy, OpenAI-compatible)
// ---------------------------------------------------------------------------

/** Upstream narrator timeout; a hang degrades to the deterministic fallback. */
const NARRATOR_TIMEOUT_MS = 25_000

interface LlmToolCall {
  function?: { name?: unknown; arguments?: unknown }
}

/**
 * LLM path, or null (→ deterministic fallback). The state machine remains
 * the sole intake writer: `record_intake` tool calls are ADVISORY — a call
 * is honored only when its field matches the slot the state machine just
 * validated, and the emitted value always comes from the validated state,
 * never from model output.
 */
async function tryLlmNarrator(ctx: NarratorContext, env: Env): Promise<NarratorReply | null> {
  const base = (env.SELEMENE_API_URL ?? '').replace(/\/+$/, '')
  const key = env.SELEMENE_API_KEY ?? ''
  if (!base || !key) return null

  try {
    const userPrompt = [
      `chapter: ${ctx.state.chapter}`,
      `event: ${ctx.turn.event}`,
      ctx.turn.field ? `validated_field: ${ctx.turn.field}` : null,
      ctx.turn.error ? `validation_error: ${ctx.turn.error}` : null,
      `deterministic_template: ${ctx.question.prompt}`,
      `user_input: ${typeof ctx.input === 'string' ? ctx.input : JSON.stringify(ctx.input)}`,
    ]
      .filter((l): l is string => l !== null)
      .join('\n')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), NARRATOR_TIMEOUT_MS)
    let res: Response
    try {
      const headers: Record<string, string> = { 'content-type': 'application/json', 'x-api-key': key }
      // W2: shared-secret gate on the upstream llm-proxy chat endpoint.
      // Inert by default — the header is sent only when CHAT_PROXY_TOKEN is
      // configured here (and the proxy enforces it only when it has the same
      // secret configured). See docs/chat-protocol.md § LLM-path auth.
      if (env.CHAT_PROXY_TOKEN) headers['x-chat-key'] = env.CHAT_PROXY_TOKEN
      res = await fetch(`${base}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'narrator',
          messages: [
            { role: 'system', content: buildNarratorSystemPrompt(ctx.state) },
            { role: 'user', content: userPrompt },
          ],
          tools: [RECORD_INTAKE_TOOL],
          tool_choice: 'auto',
          temperature: 0.7,
        }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }
    if (!res.ok) return null

    const data = (await res.json()) as {
      choices?: { message?: { content?: unknown; tool_calls?: LlmToolCall[] } }[]
    }
    const message = data.choices?.[0]?.message
    const content = typeof message?.content === 'string' ? message.content.trim() : ''
    if (!content) return null

    const blocks: ChatBlock[] = []
    const recordedField = ctx.turn.event === 'intake_recorded' ? ctx.turn.field : undefined
    for (const call of message?.tool_calls ?? []) {
      if (call?.function?.name !== 'record_intake') continue
      let args: { field?: unknown } = {}
      try {
        args = JSON.parse(typeof call.function.arguments === 'string' ? call.function.arguments : '{}') as {
          field?: unknown
        }
      } catch {
        continue
      }
      // Advisory only: must name the slot the state machine just validated;
      // the value is re-read from validated state, never from the model.
      if (recordedField && args.field === recordedField) {
        blocks.push({
          kind: 'intake_field',
          field: recordedField,
          value: getPathValue(ctx.turn.state.intake, recordedField),
        })
      }
    }
    blocks.push({ kind: 'text', text: content })
    return { blocks }
  } catch {
    return null
  }
}

/** Default seam implementation: LLM when configured and healthy, else deterministic. */
export const defaultNarrator: NarratorFn = async (ctx, env) => {
  const llm = await tryLlmNarrator(ctx, env)
  return llm ?? deterministicNarrator(ctx)
}

// ---------------------------------------------------------------------------
// orchestrateTurn — ChatEvent generator for one user turn
// ---------------------------------------------------------------------------

export interface OrchestrateTurnArgs {
  db: D1Database
  env: Env
  /** Ownership-verified session state (the route 404s before this runs). */
  state: ChatSessionState
  /** Raw user input (string, or a structured location selection). */
  input: unknown
  /** Injectable narrator (tests); defaults to `defaultNarrator`. */
  narrator?: NarratorFn
}

/** Split text into delta-sized chunks on word boundaries (≤ ~48 chars). */
export function chunkText(text: string, size = 48): string[] {
  if (text.length <= size) return text ? [text] : []
  const chunks: string[] = []
  let rest = text
  while (rest.length > size) {
    let cut = rest.lastIndexOf(' ', size)
    if (cut <= 0) cut = size
    else cut += 1 // keep the space with the preceding chunk
    chunks.push(rest.slice(0, cut))
    rest = rest.slice(cut)
  }
  if (rest) chunks.push(rest)
  return chunks
}

/**
 * Emit the full ChatEvent sequence for one user turn and persist along the
 * way. Emits `error` (and persists no narrator message) if persistence or an
 * unexpected failure occurs; the narrator itself can never trigger `error`.
 *
 * Order per docs/chat-protocol.md:
 *   reply_start → (block_start → block_delta* → block_end)*
 *   → intake_recorded? → chapter_advanced? → reply_end | error
 */
export async function* orchestrateTurn(args: OrchestrateTurnArgs): AsyncGenerator<ChatEvent, void> {
  const { db, env, input } = args
  const narrator = args.narrator ?? defaultNarrator
  const preChapter = args.state.chapter

  // The state machine is the sole intake writer — validation happened here,
  // before any narrator involvement.
  const turn = applyUserInput(args.state, input)
  const question = currentQuestion(turn.state)

  // Persist the user turn first (chapter = the chapter it was authored in).
  const userMsg: ChatMsg = {
    id: crypto.randomUUID(),
    sessionId: args.state.sessionId,
    role: 'user',
    blocks: [{ kind: 'text', text: typeof input === 'string' ? input : JSON.stringify(input) }],
    chapter: preChapter,
    createdAt: new Date().toISOString(),
  }

  // Persist the user turn; a persistence failure is terminal for the reply.
  try {
    await appendChatTurn(db, userMsg)
  } catch (err) {
    yield { type: 'error', message: String((err as Error)?.message || err) }
    return
  }

  // Narrator throw → deterministic fallback (never error a turn over the LLM).
  let reply: NarratorReply
  try {
    reply = await narrator({ state: turn.state, turn, question, input }, env)
  } catch {
    reply = deterministicNarrator({ state: turn.state, turn, question, input })
  }

  const msg: ChatMsg = {
    id: crypto.randomUUID(),
    sessionId: args.state.sessionId,
    role: 'narrator',
    blocks: reply.blocks,
    chapter: turn.state.chapter,
    createdAt: new Date().toISOString(),
  }

  yield { type: 'reply_start', msgId: msg.id, chapter: msg.chapter }

  // W2: record the exact sequence this reply emits (reply_start..reply_end)
  // so it can be persisted on the turn row and replayed verbatim.
  const emitted: ChatEvent[] = [{ type: 'reply_start', msgId: msg.id, chapter: msg.chapter }]

  for (let i = 0; i < reply.blocks.length; i++) {
    const block = reply.blocks[i]
    emitted.push({ type: 'block_start', blockIndex: i, blockKind: block.kind })
    yield { type: 'block_start', blockIndex: i, blockKind: block.kind }
    if (block.kind === 'text' || block.kind === 'stage_direction') {
      for (const piece of chunkText(block.text)) {
        emitted.push({ type: 'block_delta', blockIndex: i, text: piece })
        yield { type: 'block_delta', blockIndex: i, text: piece }
      }
    }
    emitted.push({ type: 'block_end', blockIndex: i })
    yield { type: 'block_end', blockIndex: i }
  }

  // intake_recorded fires for ANY turn that validated a slot into intake —
  // including turns that simultaneously advanced the chapter (advance()
  // carries the field) — so stream/replay consumers never miss a slot.
  if (turn.field) {
    const ev: ChatEvent = { type: 'intake_recorded', field: turn.field, value: getPathValue(turn.state.intake, turn.field) }
    emitted.push(ev)
    yield ev
  }
  if (turn.event === 'chapter_advanced' || turn.event === 'ready') {
    const ev: ChatEvent = { type: 'chapter_advanced', chapter: turn.state.chapter }
    emitted.push(ev)
    yield ev
  }

  // Persist BEFORE reply_end: the invariant is that reply_end.msg is always
  // durable. A persistence failure discards the reply (error, no reply_end).
  // The persisted event sequence includes reply_end itself — it is only
  // streamed (and only receives an event id, route-side) when this succeeds.
  const end: ChatEvent = { type: 'reply_end', msg }
  emitted.push(end)
  try {
    await appendChatTurn(db, msg, emitted)
    const saved = await saveChatSession(db, turn.state)
    if (!saved) throw new Error('chat session vanished mid-turn')
  } catch (err) {
    yield { type: 'error', message: String((err as Error)?.message || err) }
    return
  }

  yield end
}
