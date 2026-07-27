import type { GraphEntry } from '../../types'

export interface RelationListProps {
  entries: readonly GraphEntry[]
  selectedId?: string | null
  onSelect: (id: string) => void
  ariaLabel?: string
}

/** Canonical ordered DOM equivalent of the constellation. */
export function RelationList({
  entries,
  selectedId,
  onSelect,
  ariaLabel = 'Constellation destinations',
}: RelationListProps) {
  return (
    <nav aria-label={ariaLabel}>
      <ol className="mx-auto grid w-full max-w-4xl gap-3 md:grid-cols-2">
        {entries.map((entry, index) => {
          const selected = entry.id === selectedId
          const purpose =
            entry.purpose ?? `Open ${entry.label} through this ${entry.relation}.`

          return (
            <li key={entry.id}>
              <button
                type="button"
                className={[
                  'group relative flex min-h-11 w-full cursor-pointer items-stretch border bg-surface/95 text-left',
                  'transition-[border-color,background-color,box-shadow] duration-300 motion-reduce:transition-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interaction-focus focus-visible:ring-offset-2 focus-visible:ring-offset-void',
                  selected
                    ? 'border-interaction-selected bg-interaction-flow/10'
                    : 'border-gold/25 hover:border-interaction-active hover:bg-gold/5',
                ].join(' ')}
                aria-pressed={selected}
                onClick={() => onSelect(entry.id)}
                data-graph-entry={entry.id}
              >
                <span
                  className="flex min-w-11 shrink-0 items-center justify-center border-r border-gold/20 font-mono text-xs text-metadata"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1 px-4 py-3">
                  <span className="block font-serif text-base uppercase tracking-[0.16em] text-primary">
                    {entry.label}
                  </span>
                  <span className="mt-1 block font-display text-xs uppercase tracking-[0.2em] text-gold">
                    {entry.description}
                  </span>
                  <span className="mt-2 block text-sm leading-6 text-secondary">
                    {purpose}
                  </span>
                  <span className="mt-2 flex items-center justify-between gap-3 font-mono text-xs text-metadata">
                    <span>{entry.relation}</span>
                    <span className="uppercase text-interaction-focus group-hover:text-interaction-active">
                      Enter
                    </span>
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
