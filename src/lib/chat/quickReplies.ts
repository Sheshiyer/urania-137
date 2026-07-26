/**
 * Quick replies for the doorway chat sheet (W4-A) — the closed-vocabulary
 * beats of the story state machine rendered as one-tap chips, so a confirm /
 * yes-no / enum beat never needs the keyboard.
 *
 * Pure derivation, no React: `quickRepliesFor(session)` mirrors the exact
 * branches of `currentQuestion` / `applyUserInput` in `./stateMachine.ts` and
 * returns the chips valid at the CURRENT beat. This is a UI hint only — the
 * server-side machine remains authoritative and re-validates every turn; a
 * stale chip degrades to a normal `invalid` turn, never a corrupted intake.
 *
 * Beats deliberately left to free text or to other components:
 *  - awakening.open (any text begins), subjects.name / birth_date / location,
 *    relationship.mapping_goal, mode.intention — open-ended slots.
 *  - subjects.persist_offer — owned by CircleBar's "Hold them / Just this
 *    once" chips (W3-A); returning chips here too would double-render.
 *  - handoff / complete — terminal; the composer is disabled.
 *
 * Tones map onto the console grammar (see QuickReplies.tsx):
 *  - primary  — gold filled: doorway/surface/mode confirmations.
 *  - growth   — growth green filled: the FINAL assembly confirm (the
 *    validation moment of the whole flow, brand-kit signal colour).
 *  - affirm   — growth outline: 'yes' at gates.
 *  - ghost    — parchment outline: 'no' / skip / use-default escapes.
 *  - choice   — gold-tinted pill: closed-enum options.
 */

import type { RelationshipContext, SubjectInput } from '../../types'
import type { ChatSessionState } from '../../types/chat'

export type QuickReplyTone = 'primary' | 'growth' | 'affirm' | 'ghost' | 'choice'

export interface QuickReply {
  /** Chip label shown to the caller. */
  label: string
  /** Turn payload sent to the machine (the exact vocabulary it validates). */
  input: unknown
  /** User-bubble echo text; defaults to `label` when omitted. */
  echo?: string
  tone: QuickReplyTone
}

// ---------------------------------------------------------------------------
// Machine mirrors (documented UI-hint-only — see header)
// ---------------------------------------------------------------------------

type PartialSubject = Partial<SubjectInput>

function subjectComplete(s: PartialSubject | undefined): boolean {
  return Boolean(s?.name && s.birth_date && s.birth_time && s.birth_time_confidence && s.birth_location_query)
}

/** Mirror of the machine's persistOfferPending (CircleBar owns that beat). */
function persistOfferPending(session: ChatSessionState): boolean {
  if (session.chapter !== 'subjects') return false
  const idx = session.subjectIndex
  if (idx < 1 || idx < (session.prefilledCount ?? 0)) return false
  const raw = session.intake.options?.circle
  const list = (v: unknown): number[] => (Array.isArray(v) ? v.filter((n): n is number => Number.isInteger(n)) : [])
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  if (list(o.picked).includes(idx) || list(o.persist).includes(idx) || list(o.declined).includes(idx)) return false
  const s = (session.intake.subjects ?? []) as PartialSubject[]
  return subjectComplete(s[idx])
}

const yes = (label = 'Yes'): QuickReply => ({ label, input: 'yes', tone: 'affirm' })
const no = (label = 'No'): QuickReply => ({ label, input: 'no', tone: 'ghost' })
const confirm = (label = 'Confirm'): QuickReply => ({ label, input: 'yes', tone: 'primary' })

const RELATIONSHIP_LABELS: Record<RelationshipContext['type'], string> = {
  family: 'Family',
  friends: 'Friends',
  'business-partners': 'Business partners',
  'unmarried-partners': 'Unmarried partners',
  'married-partners': 'Married partners',
  custom: 'Custom',
}

// ---------------------------------------------------------------------------
// Per-chapter derivations
// ---------------------------------------------------------------------------

function subjectsReplies(session: ChatSessionState): QuickReply[] {
  const subjects = (session.intake.subjects ?? []) as PartialSubject[]
  const idx = session.subjectIndex
  const s = subjects[idx]

  // add_another gate — cursor past the end (prefill form) or a complete
  // subject under the cursor. The gate only renders below the seed's max
  // (at max the machine advances on completion, never holding for the gate).
  const max = session.seed.kind === 'witness' ? session.seed.maxSubjects : 1
  const atGate =
    subjects.length < max &&
    (!s || (subjectComplete(s) && !persistOfferPending(session)))
  if (atGate) return [yes('Yes — add another'), no('No — continue')]

  if (!s || !s.name || !s.birth_date) return [] // name/date slots are free text
  if (!s.birth_time) {
    // Gardener rule: an unknown time is met with the noon convention.
    return [{ label: "I don't know the time", input: 'unknown', tone: 'ghost' }]
  }
  if (!s.birth_time_confidence) {
    return (['exact', 'approximate', 'unknown'] as const).map((v) => ({
      label: v[0].toUpperCase() + v.slice(1),
      input: v,
      tone: 'choice' as const,
    }))
  }
  return [] // location slot (free text / geocoder) or CircleBar's persist_offer
}

function relationshipReplies(session: ChatSessionState): QuickReply[] {
  const rc = session.intake.relationship_context as Partial<RelationshipContext> | null | undefined
  if (!rc?.type) {
    return (Object.keys(RELATIONSHIP_LABELS) as RelationshipContext['type'][]).map((v) => ({
      label: RELATIONSHIP_LABELS[v],
      input: v,
      echo: RELATIONSHIP_LABELS[v],
      tone: 'choice' as const,
    }))
  }
  if (!rc.mapping_goal) return [] // mapping goal is free text
  if (!rc.sensitivity_level) {
    return (['low', 'medium', 'high'] as const).map((v) => ({
      label: v[0].toUpperCase() + v.slice(1),
      input: v,
      tone: 'choice' as const,
    }))
  }
  return []
}

function languageLevelReplies(session: ChatSessionState): QuickReply[] {
  const { intake } = session
  if (!intake.language) {
    return [{ label: 'Default — English', input: 'default', tone: 'ghost' }]
  }
  if (!intake.report_level) {
    const fallback = session.seed.kind === 'witness' ? (session.seed.level ?? 'L0') : 'L0'
    return [
      { label: `Default — ${fallback}`, input: 'default', echo: `Default — ${fallback}`, tone: 'ghost' },
      ...(['L0', 'L1', 'L2', 'L3', 'L4', 'L5'] as const).map((v) => ({ label: v, input: v, tone: 'choice' as const })),
    ]
  }
  if (intake.consciousness_level === undefined) {
    return [
      { label: 'Default — C2', input: 'default', echo: 'Default — C2', tone: 'ghost' },
      ...([0, 1, 2, 3, 4, 5] as const).map((n) => ({
        label: `C${n}`,
        input: String(n),
        echo: `C${n}`,
        tone: 'choice' as const,
      })),
    ]
  }
  return []
}

function modeReplies(session: ChatSessionState): QuickReply[] {
  const seed = session.seed
  if ((seed.kind === 'workflow' || seed.kind === 'engine') && seed.needsIntention) {
    if (typeof session.intake.options?.intention !== 'string') return [] // free text
  }
  if (seed.kind === 'daily') {
    const asked = !!session.intake.options && Object.prototype.hasOwnProperty.call(session.intake.options, 'locationQuery')
    if (!asked) return [{ label: 'Use my default sky', input: 'skip', tone: 'ghost' }]
  }
  // Every kind ends the mode chapter at the fixed-capability confirm gate.
  return [confirm()]
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

/**
 * Chips valid at the session's current beat, in reading order (escape /
 * default chips trail the affirmative ones). Empty for free-text beats,
 * terminal chapters, and beats another component owns.
 */
export function quickRepliesFor(session: ChatSessionState): QuickReply[] {
  switch (session.chapter) {
    case 'surface':
      return [confirm('Confirm — open the doorway')]
    case 'subjects':
      return subjectsReplies(session)
    case 'relationship':
      return relationshipReplies(session)
    case 'language_level':
      return languageLevelReplies(session)
    case 'mode':
      return modeReplies(session)
    case 'assembly': {
      // ChatSessionState.seed is typed ChildRun; info/threshold seeds arrive
      // via the machine's documented cast (see stateMachine.ts).
      const kind = (session.seed as { kind: string }).kind
      const label = kind === 'threshold' ? 'Confirm — hold this pattern' : 'Confirm — hand off to the engines'
      return [{ label, input: 'yes', tone: 'growth' }]
    }
    default:
      return [] // awakening / handoff / complete
  }
}
