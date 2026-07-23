/**
 * Story state machine for the narrative chat onboarding (Phase 0, W0-B).
 *
 * Pure TypeScript — no React, no fetch, no DOM. The machine walks the chapter
 * router (AgentScope SwitchPipeline analogue) and each chapter's ask → validate
 * → advance loop (WhileLoopPipeline gate). One question at a time; each valid
 * user turn fills exactly one intake slot of `ChatSessionState.intake`
 * (a `Partial<AssetGenerateRequest>`), and the terminal `handoff` chapter
 * produces exactly the payload shape the existing submit hooks consume.
 *
 * Guardrails encoded here (narrative freedom is in HOW, never WHAT):
 *  - Capabilities derive only from the `ChildRun` seed — `mode` is pre-seeded
 *    for witness runs and the mode chapter only ever CONFIRMS the seeded
 *    capability; unverified modes can never be offered.
 *  - `birth_date` is strictly `YYYY-MM-DD` (real calendar date), `birth_time`
 *    strictly `HH:MM` 24h (or the literal `unknown`, which records the noon
 *    placeholder + `birth_time_confidence: 'unknown'` — the Gardener rule:
 *    friction met with a convention, not a warning).
 *  - `birth_time_confidence ∈ exact | approximate | unknown`;
 *    `relationship_context.type` from the exact taxonomy (never 'romantic').
 *  - Solo flows (1 subject) skip the relationship chapter and yield
 *    `relationship_context === null`.
 *
 * Prompt strings are deterministic `key :: template` pairs — the narrator LLM
 * re-voices them in persona (Phase 1), the machine never generates prose.
 *
 * Deviation note: `ChatSessionState.seed` is typed `ChildRun`, whose union has
 * no `info` member (info children carry no `run`). `initialSessionState`
 * accepts the wider `StorySeed = ChildRun | { kind: 'info' }` and stores info
 * seeds via a documented cast; info sessions go awakening → complete and never
 * reach handoff. Invalid inputs return a NEW state object with identical
 * values (pure no-op), so reducers can always treat the result as immutable.
 */

import type {
  AssetGenerateRequest,
  BirthData,
  ChildRun,
  NormalizedLocation,
  RelationshipContext,
  ReportLevel,
  SubjectInput,
} from '../../types'
import type { ChatSessionState, StoryChapter } from '../../types/chat'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Seeds the machine can start from. `info` children carry no `ChildRun`. */
export type StorySeed = ChildRun | { kind: 'info' }

/** Events the reducer can emit (mirrors the SSE `ChatEvent` vocabulary). */
export type StoryEvent = 'intake_recorded' | 'invalid' | 'chapter_advanced' | 'ready'

export interface StoryTurn {
  state: ChatSessionState
  event: StoryEvent
  /** Dotted intake path of the slot just recorded, when one was. */
  field?: string
  /** Human-safe validation message when `event === 'invalid'`. */
  error?: string
}

/** What `currentQuestion` returns — a deterministic prompt template, not LLM text. */
export interface StoryQuestion {
  chapter: StoryChapter
  prompt: string
}

// ---------------------------------------------------------------------------
// Constants + small validators
// ---------------------------------------------------------------------------

const REPORT_LEVELS: readonly ReportLevel[] = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5']
const TIME_CONFIDENCES = ['exact', 'approximate', 'unknown'] as const
const RELATIONSHIP_TYPES: readonly RelationshipContext['type'][] = [
  'family',
  'friends',
  'business-partners',
  'unmarried-partners',
  'married-partners',
  'custom',
]
const SENSITIVITY_LEVELS: readonly RelationshipContext['sensitivity_level'][] = ['low', 'medium', 'high']

const AFFIRMATIVE = new Set(['', 'yes', 'y', 'confirm', 'confirmed', 'ok', 'okay', 'sure', 'ready', 'proceed', 'true'])
const NEGATIVE = new Set(['no', 'n', 'nope', 'done', 'finish', 'finished', 'continue', 'skip', 'false'])

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const LANG_RE = /^[a-z]{2}(-[A-Za-z]{2})?$/

const now = () => new Date().toISOString()

function asText(input: unknown): string | null {
  return typeof input === 'string' ? input.trim() : null
}

function isAffirmative(input: unknown): boolean {
  const v = asText(input)
  return v !== null && AFFIRMATIVE.has(v.toLowerCase())
}

function isNegative(input: unknown): boolean {
  const v = asText(input)
  return v !== null && NEGATIVE.has(v.toLowerCase())
}

/** Strict `YYYY-MM-DD` AND a real calendar date (2024-02-30 is rejected). */
export function isValidISODate(v: string): boolean {
  if (!DATE_RE.test(v)) return false
  const [y, m, d] = v.split('-').map(Number)
  if (m < 1 || m > 12 || d < 1) return false
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return d <= days[m - 1]
}

/** Strict `HH:MM` 24-hour. */
export function isValidTime(v: string): boolean {
  return TIME_RE.test(v)
}

/** The repo's existing convention for a manually entered (ungeocoded) place. */
function manualLocation(query: string): NormalizedLocation {
  return { display_name: query, latitude: 0, longitude: 0, timezone: 'Asia/Kolkata', provider: 'manual', confidence: 'manual' }
}

interface LocationInput {
  query: string
  normalized?: NormalizedLocation
}

/**
 * Location turn input: either a free-text place query (normalized later by the
 * backend geocoder), or `{ query, normalized_location }` when a normalized
 * result has already been selected upstream.
 */
function parseLocation(input: unknown): LocationInput | null {
  if (typeof input === 'string') {
    const q = input.trim()
    return q ? { query: q } : null
  }
  if (input && typeof input === 'object') {
    const o = input as Record<string, unknown>
    const raw = o.query ?? o.birth_location_query
    const q = typeof raw === 'string' ? raw.trim() : ''
    if (!q) return null
    const n = o.normalized_location as Partial<NormalizedLocation> | undefined
    if (
      n &&
      typeof n === 'object' &&
      typeof n.display_name === 'string' &&
      typeof n.latitude === 'number' &&
      typeof n.longitude === 'number' &&
      typeof n.timezone === 'string'
    ) {
      return { query: q, normalized: n as NormalizedLocation }
    }
    return { query: q }
  }
  return null
}

// ---------------------------------------------------------------------------
// Seed-derived structure
// ---------------------------------------------------------------------------

function seedKind(state: ChatSessionState): StorySeed['kind'] {
  return (state.seed as StorySeed).kind
}

function subjectBounds(seed: StorySeed): { min: number; max: number } {
  if (seed.kind === 'witness') return { min: seed.minSubjects, max: seed.maxSubjects }
  if (seed.kind === 'workflow' || seed.kind === 'engine') return { min: 1, max: 1 }
  return { min: 0, max: 0 }
}

/** Chapter walk per seed kind. `relationship` appears only with 2+ subjects. */
function chapterSequence(seed: StorySeed, subjectCount: number): readonly StoryChapter[] {
  switch (seed.kind) {
    case 'info':
      return ['awakening', 'complete']
    case 'daily':
      return ['awakening', 'surface', 'mode', 'assembly', 'handoff', 'complete']
    case 'workflow':
    case 'engine':
      return ['awakening', 'surface', 'subjects', 'mode', 'assembly', 'handoff', 'complete']
    case 'witness': {
      const seq: StoryChapter[] = ['awakening', 'surface', 'subjects']
      if (subjectCount >= 2) seq.push('relationship')
      seq.push('language_level', 'mode', 'assembly', 'handoff', 'complete')
      return seq
    }
  }
}

function nextChapter(state: ChatSessionState): StoryChapter {
  const seq = chapterSequence(state.seed as StorySeed, state.intake.subjects?.length ?? 0)
  const i = seq.indexOf(state.chapter)
  return seq[Math.min(Math.max(i, 0) + 1, seq.length - 1)]
}

// ---------------------------------------------------------------------------
// State constructors (always NEW objects — the machine never mutates)
// ---------------------------------------------------------------------------

function touch(state: ChatSessionState): ChatSessionState {
  return { ...state, updatedAt: now() }
}

function withIntake(state: ChatSessionState, patch: Partial<AssetGenerateRequest>): ChatSessionState {
  return { ...touch(state), intake: { ...state.intake, ...patch } }
}

function withSubject(state: ChatSessionState, index: number, patch: Partial<SubjectInput>): ChatSessionState {
  const prev = (state.intake.subjects ?? []) as Partial<SubjectInput>[]
  const next = prev.slice()
  next[index] = { ...next[index], ...patch }
  return withIntake(state, { subjects: next as SubjectInput[] })
}

/** Append a fresh `partner` subject slot and move the cursor to it. */
function appendSubject(state: ChatSessionState): ChatSessionState {
  const prev = (state.intake.subjects ?? []) as Partial<SubjectInput>[]
  const next = [...prev, { role: 'partner' }] as SubjectInput[]
  return { ...withIntake(state, { subjects: next }), subjectIndex: prev.length }
}

const recorded = (state: ChatSessionState, field: string): StoryTurn => ({ state, event: 'intake_recorded', field })
const invalid = (state: ChatSessionState, error: string): StoryTurn => ({ state: { ...state }, event: 'invalid', error })

function advance(state: ChatSessionState, field?: string): StoryTurn {
  let next = touch(state)
  // Solo witness flows skip the relationship chapter: codify the guardrail.
  if (state.chapter === 'subjects' && seedKind(state) === 'witness' && (state.intake.subjects?.length ?? 0) < 2) {
    next = withIntake(next, { relationship_context: null as unknown as RelationshipContext })
  }
  return { state: { ...next, chapter: nextChapter(next) }, event: 'chapter_advanced', field }
}

// ---------------------------------------------------------------------------
// initialSessionState
// ---------------------------------------------------------------------------

export function initialSessionState(seed: StorySeed, ids: { sessionId: string; userId: string }): ChatSessionState {
  const ts = now()
  const bounds = subjectBounds(seed)
  // Pre-create the first subject slot (role `primary`, per WitnessForm) so the
  // subjects loop always has a slot under the cursor.
  const subjects = bounds.min > 0 ? ([{ role: 'primary' }] as SubjectInput[]) : []
  const intake: Partial<AssetGenerateRequest> = { subjects }
  if (seed.kind === 'witness') intake.mode = seed.mode
  return {
    sessionId: ids.sessionId,
    userId: ids.userId,
    // Info children have no ChildRun; the seed is stored for the awakening
    // beat only and never drives capability derivation. Documented cast.
    seed: seed as unknown as ChildRun,
    chapter: 'awakening',
    subjectIndex: 0,
    intake,
    createdAt: ts,
    updatedAt: ts,
  }
}

// ---------------------------------------------------------------------------
// currentQuestion — deterministic prompt keys/templates
// ---------------------------------------------------------------------------

function subjectsQuestion(state: ChatSessionState): string {
  const bounds = subjectBounds(state.seed as StorySeed)
  const subjects = (state.intake.subjects ?? []) as Partial<SubjectInput>[]
  const idx = state.subjectIndex
  const s = subjects[idx]
  const n = idx + 1
  if (!s?.name) return `subjects.name :: Subject ${n} — what name should the mirror hold?`
  if (!s.birth_date) return `subjects.birth_date :: ${s.name} — birth date (YYYY-MM-DD)?`
  if (!s.birth_time) return `subjects.birth_time :: ${s.name} — birth time (HH:MM, 24h), or 'unknown'?`
  if (!s.birth_time_confidence) return `subjects.time_confidence :: ${s.name} — how well is that time known: exact | approximate | unknown?`
  if (!s.birth_location_query) return `subjects.location :: ${s.name} — birth location (city, country)?`
  return `subjects.add_another :: ${subjects.length}/${bounds.max} subjects witnessed — add another? (yes/no)`
}

function relationshipQuestion(state: ChatSessionState): string {
  const rc = state.intake.relationship_context as Partial<RelationshipContext> | null | undefined
  if (!rc?.type) return `relationship.type :: What kind of field is this: ${RELATIONSHIP_TYPES.join(' | ')}?`
  if (!rc.mapping_goal) return 'relationship.mapping_goal :: What should the map illuminate between these patterns?'
  return `relationship.sensitivity_level :: Holding this field calls for care — sensitivity: ${SENSITIVITY_LEVELS.join(' | ')}?`
}

function languageLevelQuestion(state: ChatSessionState): string {
  const seed = state.seed as StorySeed
  const defaultLevel = seed.kind === 'witness' ? (seed.level ?? 'L0') : 'L0'
  if (!state.intake.language) return 'language_level.language :: Which language should the reading speak? (default: en)'
  if (!state.intake.report_level) return `language_level.report_level :: Which report level: L0–L5? (default: ${defaultLevel})`
  return 'language_level.consciousness_level :: Which consciousness level: 0–5? (default: 2)'
}

function modeQuestion(state: ChatSessionState): string {
  const seed = state.seed as StorySeed
  if (seed.kind === 'witness') return `mode.confirm :: This doorway is fixed to the '${seed.mode}' mode — confirm?`
  if (seed.kind === 'workflow' || seed.kind === 'engine') {
    const id = seed.kind === 'workflow' ? seed.workflowId : seed.engineId
    if (seed.needsIntention && typeof state.intake.options?.intention !== 'string') {
      return 'mode.intention :: Name the intention this run should carry (without it the engine drops sigil-forge silently).'
    }
    return `mode.confirm :: This doorway is fixed to the '${id}' ${seed.kind} — confirm?`
  }
  // daily
  const asked = !!state.intake.options && Object.prototype.hasOwnProperty.call(state.intake.options, 'locationQuery')
  if (!asked) return "mode.location :: From which place should today's sky be read? (city, country — or 'skip' to use your default)"
  return "mode.confirm :: This doorway is fixed to the daily reading — confirm?"
}

function assemblyRecap(state: ChatSessionState): string {
  const seed = state.seed as StorySeed
  const subjects = ((state.intake.subjects ?? []) as Partial<SubjectInput>[]).map((s, i) => `${i + 1}. ${s.name ?? '?'} · ${s.birth_date ?? '?'} ${s.birth_time ?? '?'} (${s.birth_time_confidence ?? '?'}) · ${s.birth_location_query ?? '?'}`)
  const lines = [`assembly.confirm :: FINAL ASSEMBLED REQUEST — doorway: ${seed.kind}`]
  if (seed.kind === 'witness') {
    lines.push(`mode: ${seed.mode} · level ${state.intake.report_level ?? '?'} · ${state.intake.language ?? '?'} · C${state.intake.consciousness_level ?? '?'}`)
    lines.push(`subjects: ${subjects.join(' ; ')}`)
    const rc = state.intake.relationship_context
    lines.push(`relationship: ${rc ? `${rc.type} / ${rc.sensitivity_level} — ${rc.mapping_goal}` : 'none (solo)'}`)
  } else if (seed.kind === 'workflow' || seed.kind === 'engine') {
    const id = seed.kind === 'workflow' ? seed.workflowId : seed.engineId
    lines.push(`${seed.kind}: ${id} · subject: ${subjects.join(' ; ')}`)
    if (seed.needsIntention) lines.push(`intention: ${String(state.intake.options?.intention ?? '?')}`)
  } else {
    const lq = state.intake.options?.locationQuery
    lines.push(`daily reading · location: ${typeof lq === 'string' ? lq : 'default'}`)
  }
  lines.push('Confirm to hand off to the engines?')
  return lines.join('\n')
}

export function currentQuestion(state: ChatSessionState): StoryQuestion {
  const chapter = state.chapter
  switch (chapter) {
    case 'awakening':
      return { chapter, prompt: `awakening.open :: You entered through the '${seedKind(state)}' doorway. Say anything to begin.` }
    case 'surface':
      return { chapter, prompt: `surface.confirm :: This doorway opens the ${seedKind(state)} surface — confirm to continue?` }
    case 'subjects':
      return { chapter, prompt: subjectsQuestion(state) }
    case 'relationship':
      return { chapter, prompt: relationshipQuestion(state) }
    case 'language_level':
      return { chapter, prompt: languageLevelQuestion(state) }
    case 'mode':
      return { chapter, prompt: modeQuestion(state) }
    case 'assembly':
      return { chapter, prompt: assemblyRecap(state) }
    case 'handoff':
      return { chapter, prompt: 'handoff.ready :: The request is assembled — handing off to the engines.' }
    case 'complete':
      return { chapter, prompt: 'complete.done :: The story has been handed off. Nothing more is asked.' }
  }
}

// ---------------------------------------------------------------------------
// applyUserInput — the per-chapter ask/validate/advance reducer
// ---------------------------------------------------------------------------

function subjectsTurn(state: ChatSessionState, input: unknown): StoryTurn {
  const bounds = subjectBounds(state.seed as StorySeed)
  const subjects = (state.intake.subjects ?? []) as Partial<SubjectInput>[]
  const idx = state.subjectIndex
  const s = subjects[idx]
  if (!s) return invalid(state, 'No subject is under the cursor.')

  if (!s.name) {
    const v = asText(input)
    if (!v) return invalid(state, 'A name is required — the numerology engine rejects nameless subjects.')
    return recorded(withSubject(state, idx, { name: v }), `subjects[${idx}].name`)
  }
  if (!s.birth_date) {
    const v = asText(input)
    if (!v || !isValidISODate(v)) return invalid(state, 'birth_date must be a real date in YYYY-MM-DD form.')
    return recorded(withSubject(state, idx, { birth_date: v }), `subjects[${idx}].birth_date`)
  }
  if (!s.birth_time) {
    const v = asText(input)
    if (v?.toLowerCase() === 'unknown') {
      // Gardener rule: an unknown time is met with the noon convention, not a warning.
      return recorded(withSubject(state, idx, { birth_time: '12:00', birth_time_confidence: 'unknown' }), `subjects[${idx}].birth_time`)
    }
    if (!v || !isValidTime(v)) return invalid(state, "birth_time must be HH:MM (24-hour), or the word 'unknown'.")
    return recorded(withSubject(state, idx, { birth_time: v }), `subjects[${idx}].birth_time`)
  }
  if (!s.birth_time_confidence) {
    const v = asText(input)?.toLowerCase()
    if (!v || !(TIME_CONFIDENCES as readonly string[]).includes(v)) {
      return invalid(state, `birth_time_confidence must be one of: ${TIME_CONFIDENCES.join(' | ')}.`)
    }
    return recorded(withSubject(state, idx, { birth_time_confidence: v as SubjectInput['birth_time_confidence'] }), `subjects[${idx}].birth_time_confidence`)
  }
  if (!s.birth_location_query) {
    const loc = parseLocation(input)
    if (!loc) return invalid(state, 'birth location must be a place name (city, country), or a selected geocoding result.')
    const next = withSubject(state, idx, {
      birth_location_query: loc.query,
      normalized_location: loc.normalized ?? manualLocation(loc.query),
    })
    const field = `subjects[${idx}].location`
    const count = idx + 1
    if (count < bounds.min) return recorded(appendSubject(next), field) // more subjects required
    if (count >= bounds.max) return advance(next, field) // loop closed at max
    return recorded(next, field) // between min and max — ask add_another next
  }

  // Subject complete, between min and max: the add_another gate.
  if (isAffirmative(input)) return recorded(appendSubject(state), `subjects[${idx + 1}].role`)
  if (isNegative(input)) return advance(state)
  return invalid(state, "Answer 'yes' to witness another subject, or 'no' to continue.")
}

function relationshipTurn(state: ChatSessionState, input: unknown): StoryTurn {
  const rc = state.intake.relationship_context as Partial<RelationshipContext> | null | undefined
  if (!rc?.type) {
    const v = asText(input)?.toLowerCase()
    if (!v || !(RELATIONSHIP_TYPES as readonly string[]).includes(v)) {
      // Guardrail: no romantic default — the type must come from the taxonomy.
      return invalid(state, `relationship type must be one of: ${RELATIONSHIP_TYPES.join(' | ')}.`)
    }
    return recorded(withIntake(state, { relationship_context: { type: v } as RelationshipContext }), 'relationship_context.type')
  }
  if (!rc.mapping_goal) {
    const v = asText(input)
    if (!v) return invalid(state, 'A mapping goal is required — what should the map illuminate?')
    return recorded(withIntake(state, { relationship_context: { ...rc, mapping_goal: v } as RelationshipContext }), 'relationship_context.mapping_goal')
  }
  const v = asText(input)?.toLowerCase()
  if (!v || !(SENSITIVITY_LEVELS as readonly string[]).includes(v)) {
    return invalid(state, `sensitivity level must be one of: ${SENSITIVITY_LEVELS.join(' | ')}.`)
  }
  return advance(withIntake(state, { relationship_context: { ...rc, sensitivity_level: v } as RelationshipContext }), 'relationship_context.sensitivity_level')
}

function languageLevelTurn(state: ChatSessionState, input: unknown): StoryTurn {
  const seed = state.seed as StorySeed
  if (!state.intake.language) {
    let v = asText(input)
    if (!v || v.toLowerCase() === 'default') v = 'en'
    if (!LANG_RE.test(v)) return invalid(state, "language must be a language code like 'en' or 'hi' (or 'default').")
    return recorded(withIntake(state, { language: v }), 'language')
  }
  if (!state.intake.report_level) {
    const fallback = seed.kind === 'witness' ? (seed.level ?? 'L0') : 'L0'
    let v = asText(input)?.toUpperCase()
    if (!v || v === 'DEFAULT') v = fallback
    if (!(REPORT_LEVELS as readonly string[]).includes(v)) return invalid(state, `report level must be one of: ${REPORT_LEVELS.join(' | ')}.`)
    return recorded(withIntake(state, { report_level: v as ReportLevel }), 'report_level')
  }
  if (state.intake.consciousness_level === undefined) {
    const v = asText(input)
    const n = !v || v.toLowerCase() === 'default' ? 2 : Number(v)
    if (!Number.isInteger(n) || n < 0 || n > 5) return invalid(state, 'consciousness level must be an integer 0–5.')
    return advance(withIntake(state, { consciousness_level: n }), 'consciousness_level')
  }
  return advance(state)
}

function modeTurn(state: ChatSessionState, input: unknown): StoryTurn {
  const seed = state.seed as StorySeed
  if (seed.kind === 'workflow' || seed.kind === 'engine') {
    if (seed.needsIntention && typeof state.intake.options?.intention !== 'string') {
      const v = asText(input)
      if (!v) return invalid(state, 'An intention is required — without it the engine 422s and the workflow drops sigil-forge silently.')
      return recorded(withIntake(state, { options: { ...state.intake.options, intention: v } }), 'options.intention')
    }
  }
  if (seed.kind === 'daily') {
    const asked = !!state.intake.options && Object.prototype.hasOwnProperty.call(state.intake.options, 'locationQuery')
    if (!asked) {
      const v = asText(input)
      const skip = !v || v.toLowerCase() === 'skip'
      return recorded(withIntake(state, { options: { ...state.intake.options, locationQuery: skip ? null : v } }), 'options.locationQuery')
    }
  }
  // Every kind ends the mode chapter at the confirmation gate — the capability
  // is fixed by the doorway; 'no' can never open an unverified mode.
  if (isAffirmative(input)) return advance(state)
  return invalid(state, 'The capability is fixed by the doorway you chose — confirm to continue.')
}

export function applyUserInput(state: ChatSessionState, input: unknown): StoryTurn {
  switch (state.chapter) {
    case 'awakening':
      return advance(state)
    case 'surface':
      if (isAffirmative(input)) return advance(state)
      return invalid(state, 'The surface is fixed by the doorway you chose — confirm to continue.')
    case 'subjects':
      return subjectsTurn(state, input)
    case 'relationship':
      return relationshipTurn(state, input)
    case 'language_level':
      return languageLevelTurn(state, input)
    case 'mode':
      return modeTurn(state, input)
    case 'assembly':
      if (isAffirmative(input)) return { state: { ...touch(state), chapter: 'handoff' }, event: 'ready' }
      return invalid(state, 'The assembled request must be confirmed before handoff.')
    case 'handoff':
      return advance(state)
    case 'complete':
      return invalid(state, 'The story is complete — no further input is collected.')
  }
}

// ---------------------------------------------------------------------------
// toSubmitPayload — terminal mapping onto the existing submit hooks
// ---------------------------------------------------------------------------

/**
 * Machine-side completeness gate (equivalent to the upstream
 * `isCompleteReportRequest` semantics, strengthened for this surface):
 * at least one subject, and every subject carrying name, birth_date,
 * birth_time, and a normalized_location.
 */
export function isCompleteIntake(intake: Partial<AssetGenerateRequest>): boolean {
  const subjects = (intake.subjects ?? []) as Partial<SubjectInput>[]
  return (
    subjects.length > 0 &&
    subjects.every((s) => Boolean(s?.name && s.birth_date && s.birth_time && s.normalized_location))
  )
}

export type SubmitPayload =
  | AssetGenerateRequest // witness — feeds useReportGenerator.generateReport
  | { birthData: BirthData; intention?: string } // workflow/engine — feeds useDeterministicRun.run
  | { locationQuery?: string } // daily — feeds the DailyReadingPanel location seam

/**
 * Produces the handoff payload. Callable only at `handoff`/`complete`;
 * `info` seeds never reach handoff and always throw.
 */
export function toSubmitPayload(state: ChatSessionState): SubmitPayload {
  const seed = state.seed as StorySeed
  if (seed.kind === 'info') throw new Error('info doorways never reach handoff — there is nothing to submit.')
  if (state.chapter !== 'handoff' && state.chapter !== 'complete') {
    throw new Error(`the story is not ready to hand off — chapter is '${state.chapter}'.`)
  }

  if (seed.kind === 'witness') {
    if (!isCompleteIntake(state.intake)) throw new Error('witness intake is incomplete — every subject needs name, birth_date, birth_time, and a normalized location.')
    const subjects = state.intake.subjects as SubjectInput[]
    const request: AssetGenerateRequest = {
      mode: seed.mode,
      report_level: state.intake.report_level,
      language: state.intake.language,
      consciousness_level: state.intake.consciousness_level,
      subjects,
      // Solo guardrail: exactly null, never a fabricated dyad.
      relationship_context:
        subjects.length >= 2
          ? (state.intake.relationship_context as RelationshipContext)
          : (null as unknown as RelationshipContext),
      options: { output_format: 'markdown', include_rubric: true, include_pattern_extraction: true },
    }
    return request
  }

  if (seed.kind === 'workflow' || seed.kind === 'engine') {
    if (!isCompleteIntake(state.intake)) throw new Error('deterministic intake is incomplete — birth data needs name, date, time, and location.')
    const s = (state.intake.subjects as SubjectInput[])[0]
    // Exactly the shape BirthDataForm's onSubmit emits.
    const birthData: BirthData = {
      name: s.name,
      date: s.birth_date,
      time: s.birth_time,
      latitude: s.normalized_location.latitude,
      longitude: s.normalized_location.longitude,
      timezone: s.normalized_location.timezone,
    }
    const intention = state.intake.options?.intention
    return typeof intention === 'string' && intention ? { birthData, intention } : { birthData }
  }

  // daily — the panel needs only an optional place query.
  const lq = state.intake.options?.locationQuery
  return typeof lq === 'string' && lq ? { locationQuery: lq } : {}
}
