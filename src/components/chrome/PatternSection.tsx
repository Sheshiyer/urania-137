import { FormEvent, KeyboardEvent, useEffect, useState } from 'react'
import { navigate } from '../../hooks/useHashRoute'
import { getSelfSubject, updateSubject } from '../../lib/subjectsApi'
import type { SubjectProfile } from '../../types/chat'
import { DefinitionRow } from '../ui/DefinitionRow'
import {
  NOON_CONVENTION,
  PatternDraft,
  TIME_CONFIDENCES,
  buildPatch,
  draftFromProfile,
  validateDraft,
} from './patternDraft'

/**
 * "Your pattern" (Settings W4) — the caller's Threshold (`self`) profile,
 * read via getSelfSubject when the Settings body mounts (the modal only
 * mounts its body while open, so this fetch is on demand). Four quiet rows,
 * an inline edit form validated with the state machine's own rules, a soft
 * empty state that offers the Threshold, and a subtle "re-cross" ritual link.
 * No delete affordance — forgetting is not a Settings gesture.
 *
 * Load errors fail quiet: the section simply doesn't render, leaving the
 * rest of the card intact.
 */
export function PatternSection({ onClose }: { onClose: () => void }) {
  const [profile, setProfile] = useState<SubjectProfile | null>(null)
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [draft, setDraft] = useState<PatternDraft | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    getSelfSubject()
      .then((p) => {
        if (cancelled) return
        setProfile(p)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const crossThreshold = () => {
    onClose()
    navigate('/threshold')
  }

  if (status === 'error') return null

  if (status === 'loading') {
    return (
      <div className="rounded-lg border border-gold/15 bg-void/50 px-4 py-3">
        <div className="font-display text-xs uppercase tracking-[0.22em] text-metadata">Your pattern</div>
        <div className="mt-1 text-sm text-secondary">Reading your pattern…</div>
      </div>
    )
  }

  // Not yet crossed — the Threshold is offered, never forced.
  if (!profile) {
    return (
      <div className="rounded-lg border border-gold/15 bg-void/50 px-4 py-4 text-center">
        <p className="text-sm text-secondary">You haven't crossed the Threshold yet.</p>
        <button
          type="button"
          onClick={crossThreshold}
          className="mt-3 rounded-full border border-gold px-5 py-2 font-display text-xs font-medium uppercase tracking-[0.24em] text-gold transition-all duration-300 hover:bg-gold hover:text-void"
        >
          Cross the Threshold
        </button>
      </div>
    )
  }

  const startEdit = () => {
    setDraft(draftFromProfile(profile))
    setFormError(null)
  }
  const cancelEdit = () => {
    setDraft(null)
    setFormError(null)
  }

  const save = async () => {
    if (!draft || saving) return
    const problem = validateDraft(draft)
    if (problem) {
      setFormError(problem)
      return
    }
    const patch = buildPatch(profile, draft)
    if (Object.keys(patch).length === 0) {
      cancelEdit()
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const updated = await updateSubject(profile.id, patch)
      setProfile(updated)
      setDraft(null)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'The pattern would not take the change.')
    } finally {
      setSaving(false)
    }
  }

  // ----- edit mode ---------------------------------------------------------

  if (draft) {
    const set =
      (key: keyof PatternDraft) =>
      (e: { target: { value: string } }) =>
        setDraft((d) => (d ? { ...d, [key]: e.target.value } : d))

    const pickConfidence = (c: PatternDraft['birth_time_confidence']) =>
      setDraft((d) =>
        d ? { ...d, birth_time_confidence: c, birth_time: c === 'unknown' ? NOON_CONVENTION : d.birth_time } : d,
      )

    const onSubmit = (e: FormEvent) => {
      e.preventDefault()
      void save()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        cancelEdit()
      }
    }

    const field = 'w-full border-b border-silver/30 bg-transparent py-1.5 font-serif text-sm text-parchment transition-colors placeholder:text-silver/40 focus:border-gold focus:outline-none disabled:opacity-40'
    const chip = (on: boolean) =>
      `rounded-full border px-3 py-1 font-display text-xs font-medium uppercase tracking-[0.18em] transition-all duration-300 disabled:cursor-default disabled:opacity-40 ${
        on ? 'border-gold bg-gold/10 text-gold' : 'border-silver/30 text-silver hover:border-gold/50 hover:text-parchment'
      }`

    return (
      <form
        onSubmit={onSubmit}
        onKeyDown={onKeyDown}
        className="space-y-3 rounded-lg border border-gold/15 bg-void/50 px-4 py-3.5"
      >
        <div className="font-display text-xs uppercase tracking-[0.22em] text-metadata">Your pattern</div>

        <label className="block">
          <span className="font-display text-xs uppercase tracking-[0.22em] text-metadata">Name</span>
          <input className={field} value={draft.name} onChange={set('name')} autoFocus disabled={saving} />
        </label>

        <label className="block">
          <span className="font-display text-xs uppercase tracking-[0.22em] text-metadata">Birth date</span>
          <input
            className={field}
            value={draft.birth_date}
            onChange={set('birth_date')}
            placeholder="YYYY-MM-DD"
            inputMode="numeric"
            disabled={saving}
          />
        </label>

        <div>
          <span className="font-display text-xs uppercase tracking-[0.22em] text-metadata">Birth time</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {TIME_CONFIDENCES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => pickConfidence(c)}
                disabled={saving}
                aria-pressed={draft.birth_time_confidence === c}
                className={chip(draft.birth_time_confidence === c)}
              >
                {c}
              </button>
            ))}
          </div>
          {draft.birth_time_confidence === 'unknown' ? (
            <p className="mt-1.5 text-xs text-secondary">12:00 — the noon convention.</p>
          ) : (
            <input
              className={`${field} mt-1`}
              value={draft.birth_time}
              onChange={set('birth_time')}
              placeholder="HH:MM"
              inputMode="numeric"
              disabled={saving}
              aria-label="Birth time, 24-hour"
            />
          )}
        </div>

        <label className="block">
          <span className="font-display text-xs uppercase tracking-[0.22em] text-metadata">Birth place</span>
          <input
            className={field}
            value={draft.birth_location_query}
            onChange={set('birth_location_query')}
            placeholder="City, country"
            disabled={saving}
          />
        </label>

        {formError ? <p className="text-xs text-evidence-copy-unresolved">{formError}</p> : null}

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={cancelEdit}
            disabled={saving}
            className="font-display text-xs uppercase tracking-[0.22em] text-secondary transition-colors duration-300 hover:text-parchment disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full border border-gold px-4 py-1.5 font-display text-xs font-medium uppercase tracking-[0.22em] text-gold transition-all duration-300 hover:bg-gold hover:text-void disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gold"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    )
  }

  // ----- read mode ---------------------------------------------------------

  const timeDisplay =
    profile.birth_time_confidence === 'unknown'
      ? `${profile.birth_time} (noon convention)`
      : `${profile.birth_time} (${profile.birth_time_confidence})`

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-gold/15 bg-void/50">
        <div className="flex items-center justify-between gap-4 px-4 py-2.5">
          <span className="font-display text-xs uppercase tracking-[0.22em] text-metadata">Your pattern</span>
          <button
            type="button"
            onClick={startEdit}
            className="font-display text-xs uppercase tracking-[0.22em] text-metadata transition-colors duration-300 hover:text-gold"
            aria-label="Edit your pattern"
          >
            edit
          </button>
        </div>
        <dl className="divide-y divide-gold/10 border-t border-gold/10">
          <DefinitionRow label="Name" value={profile.name} />
          <DefinitionRow label="Birth date" value={profile.birth_date} />
          <DefinitionRow label="Birth time" value={timeDisplay} />
          <DefinitionRow label="Place" value={profile.normalized_location?.display_name || profile.birth_location_query || '—'} />
        </dl>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={crossThreshold}
          className="font-display text-xs uppercase tracking-[0.24em] text-metadata transition-colors duration-300 hover:text-gold"
        >
          re-cross the Threshold
        </button>
      </div>
    </div>
  )
}
