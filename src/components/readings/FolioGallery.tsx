import type { ReadingDTO } from '../../lib/api/contract'
import { toggleFavorite } from '../../lib/folioStore'

const V = 'from-violet-400/15 to-violet-400/5'
const C = 'from-cyan-400/15 to-cyan-400/5'
const ACCENT: Record<string, string> = {
  birth: 'from-gold/15 to-gold/5', compat: V, transit: C,
  witness: 'from-amber-400/15 to-amber-400/5', engine: C, bridge: V,
}

const FMT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
const fmtDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, FMT)
const TILE = 'group relative flex flex-col overflow-hidden rounded-card border text-left transition-colors'

export function FolioGallery({
  entries,
  selectedId,
  onSelect,
}: {
  entries: readonly ReadingDTO[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  if (entries.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]">
      {entries.map((entry) => (
        <button
          key={entry.id}
          type="button"
          data-folio-tile={entry.id}
          onClick={() => onSelect(entry.id)}
          className={`${TILE} ${selectedId === entry.id
              ? 'border-gold/60 bg-surface'
              : 'border-gold/15 bg-void hover:border-gold/40 hover:bg-surface/50'
          }`}
        >
          <div className={`h-20 bg-gradient-to-br ${ACCENT[entry.nodeId] ?? 'from-gold/10 to-gold/5'}`} />

          <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-3">
            <p className="line-clamp-2 font-serif text-small leading-snug text-parchment">
              {entry.title}
            </p>
            <div className="mt-auto flex items-center justify-between gap-2">
              <span className="font-display text-meta uppercase tracking-[0.16em] text-metadata">
                {entry.nodeLabel}
              </span>
              <span className="text-meta text-metadata">
                {fmtDate(entry.createdAt)}
              </span>
            </div>
          </div>

          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <button
              type="button"
              aria-label={entry.favorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-pressed={entry.favorite}
              onClick={(e) => {
                e.stopPropagation()
                toggleFavorite(entry.id)
              }}
              className={`flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-sm transition-colors ${
                entry.favorite
                  ? 'border-gold/60 bg-gold/20 text-gold'
                  : 'border-gold/20 bg-void/80 text-silver hover:text-gold'
              }`}
            >
              <span className={`h-2 w-2 rotate-45 ${entry.favorite ? 'bg-gold' : 'border border-current'}`} aria-hidden="true" />
            </button>
          </div>
        </button>
      ))}
    </div>
  )
}
