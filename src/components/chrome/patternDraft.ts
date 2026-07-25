/**
 * "Your pattern" (Settings W4) — the pure draft/patch logic behind the
 * PatternSection edit form. Validation reuses the state machine's own rules
 * (`isValidISODate` / `isValidTime`) so the client rejects exactly what the
 * server would; `buildPatch` emits only the fields that actually changed,
 * and mirrors the machine's gardener rule that an unknown birth time keeps
 * the noon convention (12:00).
 */

import { isValidISODate, isValidTime } from '../../lib/chat/stateMachine'
import type { SubjectWrite } from '../../lib/subjectsApi'
import type { SubjectProfile } from '../../types/chat'

export type TimeConfidence = SubjectProfile['birth_time_confidence']

/** The machine's `TIME_CONFIDENCES` order. */
export const TIME_CONFIDENCES: readonly TimeConfidence[] = ['exact', 'approximate', 'unknown']

/** The gardener rule: an unknown time is recorded as noon, never warned about. */
export const NOON_CONVENTION = '12:00'

export interface PatternDraft {
  name: string
  birth_date: string
  birth_time: string
  birth_time_confidence: TimeConfidence
  birth_location_query: string
}

export function draftFromProfile(p: SubjectProfile): PatternDraft {
  return {
    name: p.name,
    birth_date: p.birth_date,
    birth_time: p.birth_time,
    birth_time_confidence: p.birth_time_confidence,
    birth_location_query: p.birth_location_query,
  }
}

/** Trim whitespace and enforce the noon convention for unknown times. */
export function normalizeDraft(d: PatternDraft): PatternDraft {
  const trimmed: PatternDraft = {
    name: d.name.trim(),
    birth_date: d.birth_date.trim(),
    birth_time: d.birth_time.trim(),
    birth_time_confidence: d.birth_time_confidence,
    birth_location_query: d.birth_location_query.trim(),
  }
  return trimmed.birth_time_confidence === 'unknown' ? { ...trimmed, birth_time: NOON_CONVENTION } : trimmed
}

/**
 * Local validation — same rules (and near-same phrasing) as the state
 * machine, so the caller gets the machine's answer before the network does.
 * Returns the first problem, or null when the draft is recordable.
 */
export function validateDraft(d: PatternDraft): string | null {
  const v = normalizeDraft(d)
  if (!v.name) return 'name cannot be empty.'
  if (!isValidISODate(v.birth_date)) return 'birth_date must be a real date in YYYY-MM-DD form.'
  if (!isValidTime(v.birth_time)) return 'birth_time must be HH:MM (24-hour).'
  if (!v.birth_location_query) return 'birth place cannot be empty.'
  return null
}

/** Field-wise patch: only what changed, after normalisation. */
export function buildPatch(profile: SubjectProfile, draft: PatternDraft): Partial<SubjectWrite> {
  const d = normalizeDraft(draft)
  const patch: Partial<SubjectWrite> = {}
  if (d.name !== profile.name) patch.name = d.name
  if (d.birth_date !== profile.birth_date) patch.birth_date = d.birth_date
  if (d.birth_time !== profile.birth_time) patch.birth_time = d.birth_time
  if (d.birth_time_confidence !== profile.birth_time_confidence) patch.birth_time_confidence = d.birth_time_confidence
  if (d.birth_location_query !== profile.birth_location_query) patch.birth_location_query = d.birth_location_query
  return patch
}
