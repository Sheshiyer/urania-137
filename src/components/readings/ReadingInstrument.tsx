import type { ReactNode } from 'react'
import type { EngineVisualContract } from '../../lib/readings/engineVisualRegistry'
import { ProvenanceBadge } from './ProvenanceBadge'
import { ResultOrientation } from './ResultOrientation'
import { RunStateBadge, type ReadingRunState } from './RunStateBadge'

export function ReadingInstrument({
  title,
  eyebrow,
  state,
  contract,
  children,
}: {
  title: string
  eyebrow: string
  state: ReadingRunState
  contract: EngineVisualContract
  children: ReactNode
}) {
  return (
    <article className="console-card min-w-0 space-y-4 p-4 sm:p-5">
      <header className="border-b border-reading-rule/35 pb-3">
        <p className="console-eyebrow">{eyebrow}</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h2 className="font-serif text-lg text-reading-ink">{title}</h2>
          <div className="flex flex-wrap gap-2">
            <RunStateBadge state={state} />
            <ProvenanceBadge provenance={contract.provenance} />
          </div>
        </div>
      </header>
      <ResultOrientation
        visual={`${contract.atlasComponents.primary} composed from ${contract.primary} source elements.`}
        nonVisual={contract.nonVisual.label}
      />
      <div className="min-w-0">{children}</div>
    </article>
  )
}
