import { useEffect, useRef, useState } from 'react'
import { UserRound, UserRoundPlus } from 'lucide-react'
import type { RelationshipContext, SubjectInput } from '../../types'
import type { ChatSessionState, SubjectProfile } from '../../types/chat'
import { listSubjects } from '../../lib/subjectsApi'

/**
 * CircleBar (W3-A) — the circle affordances of the doorway chat sheet, shown
 * between the thread and the composer. Two mutually exclusive modes, both
 * derived from the session state the same way the state machine derives them
 * (src/lib/chat/stateMachine.ts):
 *
 *  1. SUBJECT PICKER — at the add_another gate or the name slot of a subject
 *     at index >= 1 in a witness doorway, the caller's stored circle members
 *     render as selectable cards ("Rohan · 1988-06-15 · Mumbai"). Picking one
 *     sends the profile's SubjectInput-shaped object as the turn input (the
 *     machine records the whole subject in one turn); "someone new" just
 *     focuses the composer for the slot-by-slot path. The caller's `self`
 *     profile never appears (it already occupies slot 0 via prefill).
 *     Profiles are fetched lazily the first time the picker is needed, cached
 *     for the sheet's lifetime, and fetch failures are silent (no picker).
 *
 *  2. PERSIST_OFFER CHIPS — when a fresh slot-by-slot subject completes, the
 *     machine's `subjects.persist_offer` question gets quick replies:
 *     "Hold them" sends 'yes', "Just this once" sends 'no'.
 *
 * The handoff-side helpers (`circlePersistIndexes`, `circleRole`) live here
 * too so the whole circle feature reads as one unit.
 */

export interface CircleBarProps {
  session: ChatSessionState
  /** Composer disabled state (loading / streaming / handed off). */
  disabled: boolean
  /** Send a picked profile as the turn input; `label` is the user-bubble text. */
  onPick: (input: SubjectInput, label: string) => void
  /** Send a plain-text quick reply ('yes' / 'no'). */
  onReply: (text: string) => void
  /** "someone new" — focus the composer for the slot-by-slot path. */
  onSomeoneNew: () => void
}

// ---------------------------------------------------------------------------
// Handoff-side helpers (used by ChatSheet at handoff)
// ---------------------------------------------------------------------------

/**
 * Subject indexes the caller chose to hold in their circle. The machine keeps
 * the durable copy in the intake document (`options.circle.persist`) because
 * the functions DAL persists fixed columns + intake only — read the top-level
 * contract field first, fall back to the intake-carried meta.
 */
export function circlePersistIndexes(session: ChatSessionState): number[] {
  if (session.circlePersist?.length) return session.circlePersist
  const raw = session.intake.options?.circle
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []
  const persist = (raw as Record<string, unknown>).persist
  return Array.isArray(persist) ? persist.filter((n): n is number => Number.isInteger(n)) : []
}

/** Profile role for a held circle member, mapped from the reading's relationship taxonomy. */
export function circleRole(type: RelationshipContext['type'] | undefined): string {
  switch (type) {
    case 'family':
      return 'family'
    case 'friends':
      return 'friend'
    case 'business-partners':
      return 'business'
    case 'unmarried-partners':
    case 'married-partners':
      return 'partner'
    case 'custom':
      return 'circle'
    default:
      return 'partner'
  }
}

// ---------------------------------------------------------------------------
// Machine-mirror derivations (UI gating only — the server machine decides)
// ---------------------------------------------------------------------------

type PartialSubject = Partial<SubjectInput>

function subjectComplete(s: PartialSubject | undefined): boolean {
  return Boolean(s?.name && s.birth_date && s.birth_time && s.birth_time_confidence && s.birth_location_query)
}

function circleMetaLists(session: ChatSessionState): { picked: number[]; persist: number[]; declined: number[] } {
  const raw = session.intake.options?.circle
  const list = (v: unknown): number[] => (Array.isArray(v) ? v.filter((n): n is number => Number.isInteger(n)) : [])
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { picked: [], persist: [], declined: [] }
  const o = raw as Record<string, unknown>
  return { picked: list(o.picked), persist: list(o.persist), declined: list(o.declined) }
}

/** Mirror of the machine's persistOfferPending: fresh slot-by-slot subject, index >= 1, beat unanswered. */
function persistOfferPending(session: ChatSessionState): boolean {
  if (session.chapter !== 'subjects') return false
  const idx = session.subjectIndex
  if (idx < 1 || idx < (session.prefilledCount ?? 0)) return false
  const meta = circleMetaLists(session)
  if (meta.picked.includes(idx) || meta.persist.includes(idx) || meta.declined.includes(idx)) return false
  const s = (session.intake.subjects ?? []) as PartialSubject[]
  return subjectComplete(s[idx])
}

/** Mirror of the machine's wholesale eligibility + the picker's gate conditions. */
function pickerEligible(session: ChatSessionState): boolean {
  if (session.chapter !== 'subjects' || session.seed.kind !== 'witness') return false
  const max = session.seed.maxSubjects
  const subjects = (session.intake.subjects ?? []) as PartialSubject[]
  const idx = session.subjectIndex
  const s = subjects[idx]
  if (!s) return subjects.length < max // add_another gate (prefill form: cursor past the end)
  if (!s.name) return idx >= 1 // name slot of a fresh subject beyond the self slot
  // complete subject under the cursor: the add_another gate (persist_offer is
  // mutually exclusive — the chips own that beat).
  return subjectComplete(s) && !persistOfferPending(session) && subjects.length < max
}

/** The SubjectInput-shaped turn input for a picked profile (intake fields are exactly SubjectInput). */
function subjectInputFromProfile(p: SubjectProfile): SubjectInput {
  return {
    role: p.role && p.role !== 'self' ? p.role : 'partner',
    name: p.name,
    birth_date: p.birth_date,
    birth_time: p.birth_time,
    birth_time_confidence: p.birth_time_confidence,
    birth_location_query: p.birth_location_query,
    normalized_location: p.normalized_location,
  }
}

const labelFor = (p: SubjectProfile) => `${p.name} · ${p.birth_date} · ${p.birth_location_query}`

const CHIP =
  'rounded-full border border-gold/20 bg-gold/5 px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.2em] text-parchment transition-colors hover:border-gold/50 hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40'

export function CircleBar({ session, disabled, onPick, onReply, onSomeoneNew }: CircleBarProps) {
  const [profiles, setProfiles] = useState<SubjectProfile[] | null>(null)
  const fetchedRef = useRef(false)

  const showPicker = pickerEligible(session)
  const showPersistOffer = !showPicker && persistOfferPending(session)

  // Lazy one-shot fetch the first time the picker is needed; silent on error.
  useEffect(() => {
    if (!showPicker || fetchedRef.current) return
    fetchedRef.current = true
    let cancelled = false
    listSubjects()
      .then((list) => {
        // The self profile already occupies slot 0 via prefill — circle members only.
        if (!cancelled) setProfiles(list.filter((p) => p.role !== 'self'))
      })
      .catch(() => {
        /* fail silent — no picker on fetch error */
      })
    return () => {
      cancelled = true
    }
  }, [showPicker])

  if (showPersistOffer) {
    return (
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-gold/10 px-5 pt-3 sm:px-8">
        <span className="font-display text-[10px] uppercase tracking-[0.25em] text-gold/60">Hold in your circle?</span>
        <button type="button" className={CHIP} disabled={disabled} onClick={() => onReply('yes')}>
          Hold them
        </button>
        <button type="button" className={CHIP} disabled={disabled} onClick={() => onReply('no')}>
          Just this once
        </button>
      </div>
    )
  }

  if (!showPicker || !profiles || profiles.length === 0) return null

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-gold/10 px-5 pt-3 sm:px-8">
      <p className="font-display text-[10px] uppercase tracking-[0.25em] text-gold/60">From your circle</p>
      <div className="flex flex-wrap items-center gap-2">
        {profiles.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`${CHIP} inline-flex max-w-full items-center gap-1.5 normal-case tracking-normal text-xs`}
            disabled={disabled}
            onClick={() => onPick(subjectInputFromProfile(p), labelFor(p))}
            aria-label={`Pick ${labelFor(p)}`}
          >
            <UserRound className="h-3 w-3 shrink-0 text-gold/70" aria-hidden="true" />
            <span className="truncate">{labelFor(p)}</span>
          </button>
        ))}
        <button type="button" className={`${CHIP} inline-flex items-center gap-1.5`} disabled={disabled} onClick={onSomeoneNew}>
          <UserRoundPlus className="h-3 w-3 text-gold/70" aria-hidden="true" />
          Someone new
        </button>
      </div>
    </div>
  )
}
