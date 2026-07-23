/**
 * Self-contained mirror of the shared chat contract for the Pages Functions
 * backend (Phase 0, W0-A).
 *
 * CANONICAL SOURCE: `src/types/chat.ts`. The Functions tsconfig cannot import
 * from `src/`, so this file inlines the same contract plus minimal copies of
 * the `ChildRun` / `AssetGenerateRequest` field shapes it needs (mirrored from
 * `src/types/index.ts`). Any change to the canonical file MUST be mirrored
 * here; the field shapes below must stay structurally compatible with
 * `src/types/index.ts`.
 */

// ---------------------------------------------------------------------------
// Inlined minimal mirrors of src/types/index.ts (keep in sync!)
// ---------------------------------------------------------------------------

/** Mirror of `ReportLevel` in src/types/index.ts. */
export type ReportLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5'

/** Mirror of `NormalizedLocation` in src/types/index.ts. */
export interface NormalizedLocation {
  display_name: string
  latitude: number
  longitude: number
  timezone: string
  provider: string
  confidence: string
}

/** Mirror of `SubjectInput` in src/types/index.ts. */
export interface SubjectInput {
  role: string
  name: string
  /** Strict `YYYY-MM-DD`. */
  birth_date: string
  /** Strict `HH:MM`. */
  birth_time: string
  birth_time_confidence: 'exact' | 'approximate' | 'unknown'
  birth_location_query: string
  normalized_location: NormalizedLocation
}

/** Mirror of `RelationshipContext` in src/types/index.ts. */
export interface RelationshipContext {
  type: 'family' | 'friends' | 'business-partners' | 'unmarried-partners' | 'married-partners' | 'custom'
  mapping_goal: string
  sensitivity_level: 'low' | 'medium' | 'high'
}

/**
 * Minimal mirror of `ChildRun` in src/types/index.ts — the capability card
 * from the clicked node. Capabilities derive ONLY from this / SELEMENE_NODES,
 * never from the wider `WitnessMode` union or unverified modes.
 */
export type ChildRun =
  | { kind: 'workflow'; workflowId: string; needsIntention?: boolean }
  | { kind: 'engine'; engineId: string; needsIntention?: boolean }
  | { kind: 'witness'; mode: string; minSubjects: number; maxSubjects: number; level?: ReportLevel }
  | { kind: 'daily'; needsLocation: true }

/**
 * Minimal mirror of `AssetGenerateRequest` in src/types/index.ts — the intake
 * target the chat flow fills one slot per validated turn. Solo flows must
 * yield `relationship_context === null` (or leave it absent; the state machine
 * normalizes to `null` for solo witness requests).
 */
export interface AssetGenerateRequest {
  mode: string
  report_level?: ReportLevel
  language?: string
  consciousness_level?: number
  subjects?: SubjectInput[]
  relationship_context?: RelationshipContext
  options?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Mirror of src/types/chat.ts (keep in sync!)
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
  /** Fills one slot per validated turn; never accepts unvalidated fields. */
  intake: Partial<AssetGenerateRequest>
  /** ISO 8601 timestamp. */
  createdAt: string
  /** ISO 8601 timestamp. */
  updatedAt: string
}
