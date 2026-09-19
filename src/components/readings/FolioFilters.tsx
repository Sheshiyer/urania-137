import type { ReadingDTO } from '../../lib/api/contract'
import { navigate, buildFolioPath, type FolioQuery } from '../../hooks/useHashRoute'
import { withViewTransition } from '../../lib/viewTransition'

type F = 'nodeId' | 'mode'
const cnt = (es: readonly ReadingDTO[], f: F, v: string) => es.filter((e) => e[f] === v).length
const uniq = (es: readonly ReadingDTO[], f: F) => [...new Set(es.map((e) => e[f]))].sort()

const PILL = 'inline-flex min-h-9 items-center gap-1.5 rounded-pill border px-3 py-1 font-display text-meta uppercase tracking-[0.16em] transition-colors'
const PILL_ON = `${PILL} border-gold/50 bg-gold/15 text-gold`
const PILL_OFF = `${PILL} border-gold/15 text-silver hover:border-gold/40 hover:text-parchment`

export function FolioFilters({
  query,
  allEntries,
}: {
  query: FolioQuery
  allEntries: readonly ReadingDTO[]
}) {
  const lenses = uniq(allEntries, 'nodeId')
  const kinds = uniq(allEntries, 'mode')
  const favCount = allEntries.filter((e) => e.favorite).length

  const setFilter = (patch: Partial<FolioQuery>) => {
    withViewTransition(() => navigate(buildFolioPath({ ...query, ...patch })))
  }

  const hasActive = query.lens !== null || query.kind !== null || query.favorites

  return (
    <div className="flex flex-wrap items-center gap-2">
      {lenses.map((lens) => {
        const count = cnt(allEntries, 'nodeId', lens)
        if (count === 0) return null
        const active = query.lens === lens
        return (
          <button
            key={lens}
            type="button"
            onClick={() => setFilter({ lens: active ? null : lens })}
            aria-pressed={active}
            className={active ? PILL_ON : PILL_OFF}
          >
            {lens}
            <span className="text-metadata">{count}</span>
          </button>
        )
      })}

      {kinds.map((kind) => {
        const count = cnt(allEntries, 'mode', kind)
        if (count === 0) return null
        const active = query.kind === kind
        return (
          <button
            key={kind}
            type="button"
            onClick={() => setFilter({ kind: active ? null : kind })}
            aria-pressed={active}
            className={active ? PILL_ON : PILL_OFF}
          >
            {kind}
            <span className="text-metadata">{count}</span>
          </button>
        )
      })}

      {favCount > 0 && (
        <button
          type="button"
          onClick={() => setFilter({ favorites: !query.favorites })}
          aria-pressed={query.favorites}
          className={query.favorites ? PILL_ON : PILL_OFF}
        >
          Favorites
          <span className="text-metadata">{favCount}</span>
        </button>
      )}

      {hasActive && (
        <button
          type="button"
          onClick={() => setFilter({ lens: null, kind: null, favorites: false })}
          className="inline-flex min-h-9 items-center gap-1 rounded-pill border border-gold/15 px-3 py-1 font-display text-meta uppercase tracking-[0.16em] text-silver transition-colors hover:border-gold/40 hover:text-parchment"
        >
          Clear
          <span aria-hidden="true" className="text-metadata">×</span>
        </button>
      )}
    </div>
  )
}
