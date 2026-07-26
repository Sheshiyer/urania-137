export type ReadingRunState =
  | 'declared'
  | 'returned'
  | 'missing'
  | 'failed'
  | 'capture-gated'
  | 'loading'
  | 'empty'
  | 'partial'
  | 'complete'
  | 'stale'

const LABELS: Record<ReadingRunState, string> = {
  declared: 'Declared',
  returned: 'Returned',
  missing: 'Missing',
  failed: 'Failed',
  'capture-gated': 'Capture gated',
  loading: 'Loading',
  empty: 'Empty',
  partial: 'Partial',
  complete: 'Complete',
  stale: 'Stale',
}

const TREATMENT: Record<ReadingRunState, string> = {
  declared: 'border-gold/25 text-gold/75',
  returned: 'border-cyan/25 text-cyan/75',
  missing: 'border-parchment/15 text-reading-muted',
  failed: 'border-rose-400/30 text-rose-300/80',
  'capture-gated': 'border-violetglow/30 text-evidence-copy-witness',
  loading: 'border-parchment/15 text-reading-muted',
  empty: 'border-parchment/15 text-reading-muted',
  partial: 'border-amber-300/30 text-amber-200/80',
  complete: 'border-evidence-copy-computed/30 text-evidence-copy-computed',
  stale: 'border-amber-300/25 text-amber-200/70',
}

export function RunStateBadge({ state }: { state: ReadingRunState }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-full border px-2 py-0.5 font-display text-[8px] uppercase tracking-[0.14em] ${TREATMENT[state]}`}
      data-run-state={state}
    >
      {LABELS[state]}
    </span>
  )
}
