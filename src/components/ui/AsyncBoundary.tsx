import type { ReactNode } from 'react'

export type AsyncViewState =
  | { status: 'ready' }
  | { status: 'loading'; message: string }
  | { status: 'empty'; message: string }
  | { status: 'partial'; message: string }
  | { status: 'stale'; message: string }
  | { status: 'denied'; message: string }
  | { status: 'error'; message: string; onRetry?: () => void }

const STATUS_LABEL = {
  loading: 'Loading',
  empty: 'Nothing recorded',
  partial: 'Partial record',
  stale: 'Earlier copy',
  denied: 'Access unavailable',
  error: 'Unable to load',
} as const

const STATUS_ICON = {
  loading: '✦',
  empty: '◇',
  partial: '◐',
  stale: '↺',
  denied: '⊘',
  error: '!',
} as const

const STATUS_TONE = {
  loading: 'border-gold/20 text-secondary',
  empty: 'border-gold/25 text-secondary',
  partial: 'border-gold/35 text-secondary',
  stale: 'border-evidence-unresolved/35 text-secondary',
  denied: 'border-evidence-unresolved/35 text-secondary',
  error: 'border-evidence-unresolved/45 text-primary',
} as const

export function AsyncBoundary({
  state,
  children,
}: {
  state: AsyncViewState
  children: ReactNode
}) {
  if (state.status === 'ready') return <>{children}</>

  const isError = state.status === 'error'

  return (
    <section
      className={`instrument-panel space-y-3 ${STATUS_TONE[state.status]}`}
      data-async-state={state.status}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      aria-atomic="true"
      aria-busy={state.status === 'loading' ? 'true' : undefined}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center border border-current/40 font-mono text-xs"
          data-async-icon={state.status}
          aria-hidden="true"
        >
          {STATUS_ICON[state.status]}
        </span>
        <div className="min-w-0 space-y-1">
          <h2 className="font-display text-xs uppercase tracking-[0.2em] text-primary">
            {STATUS_LABEL[state.status]}
          </h2>
          <p className="text-sm leading-relaxed">{state.message}</p>
        </div>
      </div>

      {isError && state.onRetry && (
        <button type="button" className="btn-secondary" onClick={state.onRetry}>
          Try again
        </button>
      )}
    </section>
  )
}
