import { useEffect, useState, type ReactNode, type RefObject } from 'react'
import type { GraphEntry } from '../../types'
import { RelationList } from './RelationList'

type GraphView = 'graph' | 'list'

export interface GraphLensProps {
  entries: readonly GraphEntry[]
  selectedId?: string | null
  onSelect: (id: string) => void
  graph: ReactNode
  ariaLabel: string
  className?: string
  topInset?: number
  bottomInset?: number
  containerRef?: RefObject<HTMLElement | null>
}

const LIST_PREFERENCE_QUERY =
  '(max-width: 48rem), (prefers-reduced-motion: reduce), (prefers-reduced-transparency: reduce)'

function prefersListLens() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true
  }
  return window.matchMedia(LIST_PREFERENCE_QUERY).matches
}

/**
 * Keeps one selection model while changing only its representation. Narrow,
 * reflowed, or reduced-motion/transparency environments begin with the list.
 */
export function GraphLens({
  entries,
  selectedId,
  onSelect,
  graph,
  ariaLabel,
  className,
  topInset = 0,
  bottomInset = 0,
  containerRef,
}: GraphLensProps) {
  const [preferList, setPreferList] = useState(prefersListLens)
  const [requestedView, setRequestedView] = useState<GraphView | null>(null)
  const view = requestedView ?? (preferList ? 'list' : 'graph')

  useEffect(() => {
    const media = window.matchMedia(LIST_PREFERENCE_QUERY)
    const syncPreference = () => setPreferList(media.matches)
    syncPreference()
    media.addEventListener('change', syncPreference)
    return () => media.removeEventListener('change', syncPreference)
  }, [])

  return (
    <section
      ref={containerRef}
      className={className}
      aria-label={`${ariaLabel} view`}
      data-graph-lens={view}
    >
      <div
        className="absolute right-4 z-20 flex border border-gold/30 bg-void/95 p-1 sm:right-8"
        style={{ top: Math.max(topInset + 12, 12) }}
        role="group"
        aria-label="Constellation view"
      >
        {(['graph', 'list'] as const).map((candidate) => (
          <button
            key={candidate}
            type="button"
            className={[
              'min-h-11 min-w-11 cursor-pointer px-3 font-display text-xs uppercase tracking-[0.14em]',
              'transition-colors duration-300 motion-reduce:transition-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interaction-focus',
              view === candidate
                ? 'bg-interaction-flow/20 text-primary'
                : 'text-secondary hover:bg-gold/10 hover:text-interaction-active',
            ].join(' ')}
            aria-pressed={view === candidate}
            onClick={() => setRequestedView(candidate)}
          >
            {candidate}
          </button>
        ))}
      </div>

      {view === 'graph' ? (
        graph
      ) : (
        <div
          data-graph-list-viewport
          className="absolute inset-x-0 overflow-y-auto bg-void px-4 sm:px-8"
          style={{
            top: Math.max(topInset + 76, 88),
            bottom: Math.max(bottomInset, 0),
            paddingBottom: 24,
          }}
        >
          <RelationList
            entries={entries}
            selectedId={selectedId}
            onSelect={onSelect}
            ariaLabel={`${ariaLabel} as an ordered list`}
          />
        </div>
      )}
    </section>
  )
}
