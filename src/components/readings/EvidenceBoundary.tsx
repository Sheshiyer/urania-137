import type { ReactNode } from 'react'
import type { EngineVisualStatus } from '../../lib/readings/engineVisualRegistry'
import { RunStateBadge } from './RunStateBadge'

export function EvidenceBoundary({
  status,
  persisted,
  children,
}: {
  status: EngineVisualStatus
  persisted: boolean
  children: ReactNode
}) {
  if (status === 'capture-gated' && !persisted) {
    return (
      <section
        className="border border-violetglow/25 bg-violetglow/5 p-4"
        data-evidence-boundary="capture-required"
      >
        <RunStateBadge state="capture-gated" />
        <h3 className="mt-3 font-serif text-base text-reading-ink">Capture evidence required</h3>
        <p className="mt-2 text-xs leading-relaxed text-reading-muted">
          A verified persisted capture is required before computed visual treatment is available.
        </p>
      </section>
    )
  }
  return (
    <div data-evidence-treatment={status === 'capture-gated' ? 'verified-persisted' : 'source-shaped'}>
      {children}
    </div>
  )
}
