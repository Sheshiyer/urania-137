import { useEffect, useMemo, useState } from 'react'
import type { User } from '../../lib/api/contract'
import { dailyThreadResult, deterministicThreadResult } from '../../lib/chat/resultMessages'
import { getSelfSubject } from '../../lib/subjectsApi'
import type { BirthData, SelemeneChild, StellarNode } from '../../types'
import type { SubjectProfile } from '../../types/chat'
import { useDailyReading } from '../../hooks/useDailyReading'
import { useDeterministicRun } from '../../hooks/useDeterministicRun'
import { presentChild } from '../../lib/nodePresentation'
import { ReadingTransition } from '../chat/ReadingTransition'
import { InstrumentDialog } from '../ui/InstrumentDialog'

export type NativeRun = Extract<
  NonNullable<SelemeneChild['run']>,
  { kind: 'engine' | 'workflow' | 'daily' }
>

export interface NativeRunDialogProps {
  node: StellarNode
  child: SelemeneChild & { run: NativeRun }
  owner: User | null
  onClose: () => void
}

function birthDataFromProfile(profile: SubjectProfile): BirthData {
  return {
    name: profile.name,
    date: profile.birth_date,
    time: profile.birth_time,
    latitude: profile.normalized_location.latitude,
    longitude: profile.normalized_location.longitude,
    timezone: profile.normalized_location.timezone,
  }
}

function ownerContext(owner: User | null) {
  return {
    id: owner?.id ?? null,
    email: owner?.email ?? null,
    label: owner?.email ?? 'Authenticated account',
  }
}

function modeFor(run: NativeRun): string {
  switch (run.kind) {
    case 'engine':
      return `engine:${run.engineId}`
    case 'workflow':
      return `workflow:${run.workflowId}`
    case 'daily':
      return 'daily-panchanga'
    default: {
      const unreachable: never = run
      return unreachable
    }
  }
}

function profileSubject(profile: SubjectProfile) {
  return {
    id: profile.id,
    kind: 'self' as const,
    label: profile.name,
  }
}

function NativeRunBody({
  node,
  child,
  owner,
  profile,
}: Omit<NativeRunDialogProps, 'onClose'> & { profile: SubjectProfile }) {
  const birth = useMemo(() => birthDataFromProfile(profile), [profile])
  const det = useDeterministicRun()
  const daily = useDailyReading(birth)
  const [intention, setIntention] = useState('')
  const [lastIntention, setLastIntention] = useState<string | undefined>()

  const run = child.run
  const result =
    run.kind === 'daily'
      ? dailyThreadResult(daily)
      : deterministicThreadResult(det, child.label)
  const needsIntention = run.kind !== 'daily' && Boolean(run.needsIntention)
  const busy = run.kind === 'daily' ? daily.status === 'loading' : det.busy
  const ready = !needsIntention || Boolean(intention.trim())

  const execute = () => {
    if (!ready || busy) return
    if (run.kind === 'daily') {
      void daily.run(daily.location)
      return
    }
    const submittedIntention = needsIntention ? intention.trim() : undefined
    setLastIntention(submittedIntention)
    void det.run(node, child.label, run, birth, submittedIntention)
  }

  const retry = () => {
    if (run.kind === 'daily') {
      void daily.run(daily.location)
      return
    }
    void det.run(node, child.label, run, birth, lastIntention)
  }

  return (
    <div className="space-y-5" data-native-run={run.kind}>
      {!result && (
        <>
          <section
            className="border-l border-emerald/45 bg-emerald/[0.06] px-4 py-3"
            aria-label="Saved subject profile"
          >
            <p className="font-display text-xs uppercase tracking-[0.22em] text-emerald">
              Saved pattern
            </p>
            <p className="mt-2 font-serif text-lg text-parchment">{profile.name}</p>
            <p className="mt-1 text-xs leading-relaxed text-silver">
              {profile.birth_date} · {profile.birth_time} · {profile.birth_location_query}
            </p>
          </section>

          {run.kind === 'daily' && (
            <section className="border-t border-gold/20 pt-4" aria-label="Daily reading location">
              <p className="font-display text-xs uppercase tracking-[0.22em] text-gold">
                Place and hour
              </p>
              <p className="mt-2 text-sm text-parchment">{daily.location.display}</p>
              <p className="mt-1 text-xs text-silver">{daily.location.timezone}</p>
            </section>
          )}

          {needsIntention && (
            <label className="block space-y-2">
              <span className="font-display text-xs uppercase tracking-[0.22em] text-gold">
                Intention required by this Engine
              </span>
              <textarea
                value={intention}
                onChange={(event) => setIntention(event.target.value)}
                rows={3}
                className="w-full border border-gold/20 bg-void/65 px-3 py-2 text-sm text-parchment outline-none focus:border-gold focus-visible:ring-2 focus-visible:ring-gold"
              />
            </label>
          )}

          <button
            type="button"
            onClick={execute}
            disabled={!ready || busy}
            className="min-h-11 w-full border border-gold/45 bg-gold/10 px-4 py-3 font-display text-xs uppercase tracking-[0.22em] text-gold transition-colors hover:bg-gold/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy
              ? 'Computing…'
              : run.kind === 'daily'
                ? 'Read this day'
                : `Run ${child.label}`}
          </button>
        </>
      )}

      {result && (
        <ReadingTransition
          result={result}
          surface="instrument"
          onRetry={retry}
          readingContext={{
            title: `${node.label} — ${child.label}`,
            mode: modeFor(run),
            nodeId: node.id,
            nodeLabel: node.label,
            origin: 'live-engine',
            owner: ownerContext(owner),
            subject: profileSubject(profile),
          }}
        />
      )}
    </div>
  )
}

export function NativeRunDialog({
  node,
  child,
  owner,
  onClose,
}: NativeRunDialogProps) {
  const [profile, setProfile] = useState<SubjectProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void getSelfSubject()
      .then((subject) => {
        if (!live) return
        if (!subject) {
          setError('Complete your saved pattern before opening this instrument.')
        } else {
          setProfile(subject)
        }
      })
      .catch((reason) => {
        if (!live) return
        setError(
          reason instanceof Error
            ? reason.message
            : 'Your saved pattern could not be loaded.',
        )
      })
      .finally(() => {
        if (live) setLoading(false)
      })
    return () => {
      live = false
    }
  }, [])

  return (
    <InstrumentDialog
      open
      title={child.label}
      description={presentChild(child, node.label).purpose}
      eyebrow={`${node.label} · native ${child.run.kind} surface`}
      onClose={onClose}
      headerAlign="start"
      className="max-w-3xl"
      bodyClassName="max-h-[min(72vh,780px)] overflow-y-auto"
      dataNodeId={child.id}
    >
      {loading && (
        <p role="status" className="py-8 text-center font-display text-xs uppercase tracking-[0.22em] text-gold">
          Recalling your saved pattern…
        </p>
      )}
      {error && (
        <p role="alert" className="border-l border-terracotta/45 bg-terracotta/10 p-4 text-sm text-evidence-copy-unresolved">
          {error}
        </p>
      )}
      {profile && (
        <NativeRunBody
          key={`${child.id}:${profile.id}`}
          node={node}
          child={child}
          owner={owner}
          profile={profile}
        />
      )}
    </InstrumentDialog>
  )
}
