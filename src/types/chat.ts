/**
 * Shared chat contract for the narrative onboarding flow (Phase 0, W0-A).
 *
 * Canonical definition of the chat protocol shared between the SPA and the
 * Cloudflare Pages Functions backend. `functions/lib/chat/types.ts` carries a
 * self-contained mirror (the Functions tsconfig cannot import from `src/`);
 * THIS file is canonical — any change here must be mirrored there.
 *
 * Guardrails encoded by this contract:
 *  - Narrative freedom lives in HOW questions are asked, never WHAT is
 *    collected — every turn resolves into exact `AssetGenerateRequest` slots.
 *  - Capabilities derive only from `ChildRun` / `SELEMENE_NODES`, never from
 *    the wider `WitnessMode` union or unverified modes.
 *  - Solo flows must yield `relationship_context === null` (handled by the
 *    state machine; the `relationship` chapter is skipped).
 *  - `birth_date` is strictly `YYYY-MM-DD`, `birth_time` strictly `HH:MM`,
 *    `birth_time_confidence ∈ exact | approximate | unknown` (enforced by the
 *    state-machine validators, not by these types).
 */

import type { AssetGenerateRequest, ChildRun, NormalizedLocation } from './index'

// ---------------------------------------------------------------------------
// Content blocks
// ---------------------------------------------------------------------------

/** Discriminant values of {@link ChatBlock}. */
export type ChatBlockKind = 'text' | 'stage_direction' | 'intake_field' | 'tool_result'

/**
 * Content blocks of a chat message. A single narrator reply is an ordered
 * list of blocks; blocks stream individually over SSE (see {@link ChatEvent}).
 */
export type ChatBlock =
  | { kind: 'text'; text: string }
  /** Narrator beat (AgentScope HintBlock analogue) — rendered as stage direction, not dialogue. */
  | { kind: 'stage_direction'; text: string }
  /** Schema-validated `record_intake` payload landing in the session's intake slots. */
  | { kind: 'intake_field'; field: string; value: unknown }
  | { kind: 'tool_result'; ok: boolean; message?: string }

// ---------------------------------------------------------------------------
// Chapters
// ---------------------------------------------------------------------------

/**
 * Story chapters of the onboarding flow. The state machine routes between
 * chapters; the narrator LLM only ever speaks within the current chapter.
 *
 *  - `awakening`      — opening beat seeded by the clicked node
 *  - `surface`        — confirm witness vs deterministic vs daily (usually pre-seeded by ChildRun)
 *  - `subjects`       — one-subject-at-a-time loop (name → birth_date → birth_time → time_confidence → location)
 *  - `relationship`   — relationship_context when 2+ subjects; solo ⇒ null
 *  - `language_level` — language + report_level + consciousness_level
 *  - `mode`           — confirm mode/workflow/engine (pre-seeded by ChildRun; never offer unverified modes)
 *  - `assembly`       — recap + FINAL ASSEMBLED REQUEST confirmation
 *  - `handoff`        — fire existing submit hooks
 *  - `complete`       — terminal state after handoff resolves
 */
export type StoryChapter =
  | 'awakening'
  | 'surface'
  | 'subjects'
  | 'relationship'
  | 'language_level'
  | 'mode'
  | 'assembly'
  | 'handoff'
  | 'complete'

/** All chapters in canonical flow order (the subjects loop may repeat). */
export const STORY_CHAPTERS: readonly StoryChapter[] = [
  'awakening',
  'surface',
  'subjects',
  'relationship',
  'language_level',
  'mode',
  'assembly',
  'handoff',
  'complete',
] as const

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/** Roles that can author a {@link ChatMsg}. */
export type ChatRole = 'user' | 'narrator' | 'system'

export interface ChatMsg {
  id: string
  sessionId: string
  role: ChatRole
  blocks: ChatBlock[]
  chapter: StoryChapter
  /** ISO 8601 timestamp. */
  createdAt: string
}

// ---------------------------------------------------------------------------
// SSE events
// ---------------------------------------------------------------------------

/**
 * SSE events streamed by `POST /api/chat/turn`. The events of one narrator
 * reply accumulate into exactly one {@link ChatMsg} (delivered in `reply_end`).
 *
 * Lifecycle: `reply_start` → (`block_start` → `block_delta`* → `block_end`)*
 * → `intake_recorded`? → `chapter_advanced`? → `reply_end` | `error`.
 */
export type ChatEvent =
  | { type: 'reply_start'; msgId: string; chapter: StoryChapter }
  | { type: 'block_start'; blockIndex: number; blockKind: ChatBlock['kind'] }
  | { type: 'block_delta'; blockIndex: number; text: string }
  | { type: 'block_end'; blockIndex: number }
  | { type: 'intake_recorded'; field: string; value: unknown }
  | { type: 'chapter_advanced'; chapter: StoryChapter }
  | { type: 'reply_end'; msg: ChatMsg }
  | { type: 'error'; message: string }

/** Discriminant values of {@link ChatEvent}. */
export type ChatEventType = ChatEvent['type']

// ---------------------------------------------------------------------------
// Session state
// ---------------------------------------------------------------------------

/**
 * Persisted chat session state (= partially-filled intake + chapter cursor +
 * `ChildRun` seed). Resumable across devices via the `chat_sessions` table.
 */
export interface ChatSessionState {
  sessionId: string
  userId: string
  /** Capability card from the clicked node — pre-selected mode/workflow/engine. */
  seed: ChildRun
  chapter: StoryChapter
  /** Cursor for the subjects loop (index into `intake.subjects`). */
  subjectIndex: number
  /**
   * Count of leading `intake.subjects` that arrived prefilled from the stored
   * profile (Threshold W0-A) rather than collected in this session. Absent or
   * 0 for sessions that predate profile prefill. When it reaches the seed's
   * max subject count the `subjects` chapter is skipped entirely.
   */
  prefilledCount?: number
  /**
   * Circle opt-in (W3-A): indexes of `intake.subjects` the user chose to hold
   * in their circle at the `subjects.persist_offer` beat. Machine-maintained;
   * lives ONLY here (never in `SubjectInput` — that would leak client
   * semantics into the engine's `AssetGenerateRequest`).
   *
   * Persistence note: the functions DAL (`functions/lib/chat/store.ts`)
   * stores fixed columns + the `intake` JSON document, so across turns this
   * rides the intake column (`intake.options.circle.persist`) and the machine
   * rehydrates this field on entry. A state that has not passed through the
   * machine since load (e.g. a raw route/GET response) may carry the data
   * only under `intake.options.circle` — read both.
   */
  circlePersist?: number[]
  /** Fills one slot per validated turn; never accepts unvalidated fields. */
  intake: Partial<AssetGenerateRequest>
  /** ISO 8601 timestamp. */
  createdAt: string
  /** ISO 8601 timestamp. */
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Subject profiles (Threshold W0-A)
// ---------------------------------------------------------------------------

/**
 * A persisted subject — the stored `self` profile written once by the
 * Threshold, or an opt-in circle member ("hold for next time?"). The intake
 * fields are exactly `SubjectInput`; the server maps a profile back into an
 * intake slot (self → role `primary`) when seeding a doorway session.
 * Persisted in the D1 `subjects` table (migration 0004).
 */
export interface SubjectProfile {
  id: string
  /** `self` (Threshold profile, unique per user) | `partner` | `family` | … */
  role: string
  name: string
  /** Strict `YYYY-MM-DD`. */
  birth_date: string
  /** Strict `HH:MM` 24h (noon convention when unknown). */
  birth_time: string
  birth_time_confidence: 'exact' | 'approximate' | 'unknown'
  birth_location_query: string
  normalized_location: NormalizedLocation
  /** ISO 8601 timestamp. */
  createdAt: string
  /** ISO 8601 timestamp. */
  updatedAt: string
}
