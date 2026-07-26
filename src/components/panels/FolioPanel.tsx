import { useEffect, useState } from 'react'
import { Star, Download, Trash2, FileText, RefreshCw, AlertTriangle } from 'lucide-react'
import { SelemeneChild } from '../../types'
import { useFolioState } from '../../hooks/useFolio'
import { toggleFavorite, removeEntry, exportEntry, refreshFolio, setFolioSearch, setFolioFavoritesOnly } from '../../lib/folioStore'
import type { User } from '../../lib/api/contract'
import type { FolioEntry } from '../../lib/folioStore'
import { folioEntryToReadingDocument } from '../../lib/readings'
import { ReadingFolio } from '../readings'

const FORMATS = ['markdown', 'docx', 'pdf'] as const

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Placeholder rows shown while the D1-backed list is loading. */
function LoadingSkeleton() {
  return (
    <ul className="space-y-2" aria-label="Loading saved readings">
      {[0, 1, 2].map((i) => (
        <li key={i} className="animate-pulse rounded-sm border border-gold/10 bg-void/50 px-3 py-2">
          <div className="h-3.5 w-2/3 rounded bg-gold/10" />
          <div className="mt-2 h-2.5 w-1/3 rounded bg-gold/5" />
        </li>
      ))}
    </ul>
  )
}

function ArchivedReading({ entry, owner }: { entry: FolioEntry; owner: User | null }) {
  const document = folioEntryToReadingDocument(entry, {
    owner: {
      id: owner?.id ?? null,
      email: owner?.email ?? null,
      label: owner?.email ?? 'Authenticated account',
    },
  })
  return (
    <div className="mx-3 mb-3 max-h-[68vh] overflow-auto border border-gold/10 bg-void/70 p-3 sm:p-5">
      <ReadingFolio document={document} />
    </div>
  )
}

/**
 * The Folio Archive surface — saved reports served per-user from D1 via
 * /api/folio, with server-side search + favorites, per-entry export
 * (markdown/docx/pdf) and delete. The clicked child sets the initial mode
 * (Search focuses the box, Favorites filters, an export child preselects that
 * format). Renders loading / empty / error states for the async data source.
 */
export function FolioPanel({ child, owner }: { child: SelemeneChild | null; owner: User | null }) {
  const { entries, status, error } = useFolioState()
  const onlyFavorites = child?.id === 'favorites'
  const defaultFormat = (child?.format ?? (child?.id === 'docx' ? 'docx' : child?.id === 'pdf' ? 'pdf' : child?.id === 'markdown' ? 'markdown' : undefined)) as
    | (typeof FORMATS)[number]
    | undefined
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  // Server-side filters: the store refetches /api/folio?search=&favorites=.
  useEffect(() => setFolioFavoritesOnly(onlyFavorites), [onlyFavorites])
  useEffect(() => setFolioSearch(query), [query])

  const loading = status === 'loading' || status === 'idle'
  const showSkeleton = loading && entries.length === 0
  const showError = status === 'error' && entries.length === 0

  return (
    <div className="space-y-3">
      <input
        autoFocus={child?.id === 'search'}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search saved readings…"
        className="w-full rounded-sm border border-gold/20 bg-void/50 px-3 py-2 text-sm text-parchment placeholder:text-silver/50 focus:border-gold/50 focus:outline-none"
        aria-label="Search saved reports"
      />

      {error && !showError && (
        <p className="flex items-center gap-1.5 rounded-sm border border-terracotta/30 bg-terracotta/10 px-3 py-2 text-[11px] text-evidence-copy-unresolved">
          <AlertTriangle className="h-3 w-3 shrink-0" /> {error}
        </p>
      )}

      {showSkeleton ? (
        <LoadingSkeleton />
      ) : showError ? (
        <div className="py-8 text-center">
          <p className="flex items-center justify-center gap-1.5 text-sm text-evidence-copy-unresolved">
            <AlertTriangle className="h-4 w-4" /> Could not load your saved readings.
          </p>
          <p className="mt-1 text-[11px] text-silver/70">{error}</p>
          <button
            onClick={() => void refreshFolio()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-sm border border-gold/20 px-3 py-1.5 text-xs text-parchment hover:border-gold/50"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      ) : entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-silver">
          {query.trim()
            ? 'No matches.'
            : onlyFavorites
              ? 'No favorites yet — star a saved report and it lands here.'
              : 'No saved readings yet — open any reading doorway and its completed record lands here.'}
        </p>
      ) : (
        <ul className={`max-h-[46vh] space-y-2 overflow-auto pr-1 ${loading ? 'opacity-60' : ''}`}>
          {entries.map((e) => (
            <li key={e.id} className="rounded-sm border border-gold/10 bg-void/50">
              <div className="flex items-center gap-2 px-3 py-2">
                <button onClick={() => toggleFavorite(e.id)} aria-label={e.favorite ? 'Unfavorite' : 'Favorite'} className="shrink-0">
                  <Star className={`h-4 w-4 ${e.favorite ? 'fill-gold text-gold' : 'text-silver hover:text-parchment'}`} />
                </button>
                <button onClick={() => setOpenId(openId === e.id ? null : e.id)} className="min-w-0 flex-1 text-left">
                  <div className="truncate text-sm text-parchment">{e.title}</div>
                  <div className="text-[11px] text-silver/70">
                    {e.nodeLabel} · {fmtDate(e.createdAt)}
                  </div>
                </button>
                {FORMATS.map((f) => (
                  <button
                    key={f}
                    onClick={() => exportEntry(e, f)}
                    title={`Export ${f}`}
                    className={`hidden shrink-0 rounded px-1.5 py-1 text-[10px] uppercase tracking-wider sm:block ${
                      defaultFormat === f ? 'bg-gold/20 text-gold' : 'text-silver/70 hover:text-parchment'
                    }`}
                  >
                    {f === 'markdown' ? 'md' : f}
                  </button>
                ))}
                <button onClick={() => exportEntry(e, defaultFormat ?? 'markdown')} title="Download" className="shrink-0 text-silver hover:text-parchment sm:hidden">
                  <Download className="h-4 w-4" />
                </button>
                <button onClick={() => removeEntry(e.id)} title="Delete" className="shrink-0 text-silver hover:text-evidence-copy-unresolved">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {openId === e.id && (
                <ArchivedReading entry={e} owner={owner} />
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-silver/60">
        <FileText className="h-3 w-3" /> {entries.length} saved · synced to your account.
      </p>
    </div>
  )
}
