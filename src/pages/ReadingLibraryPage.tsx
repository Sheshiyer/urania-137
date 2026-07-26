import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  MessageCircle,
  RefreshCw,
  Search,
  Star,
} from 'lucide-react'
import type { User } from '../lib/api/contract'
import {
  refreshFolio,
  setFolioFavoritesOnly,
  setFolioSearch,
  toggleFavorite,
} from '../lib/folioStore'
import { folioEntryToReadingDocument } from '../lib/readings'
import { useFolioState } from '../hooks/useFolio'
import { navigate } from '../hooks/useHashRoute'
import { PageFrame } from '../components/layout/PageFrame'
import {
  ReadingFolio,
  ReadingLibraryMap,
  ReadingTrustPanel,
} from '../components/readings'

function dateLabel(value: number): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function ReadingLibraryPage({
  me,
  readingId,
}: {
  me: User | null
  readingId: string | null
}) {
  const { entries, status, error } = useFolioState()
  const [query, setQuery] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  // A direct canonical-record URL must start from the unfiltered owner archive.
  useEffect(() => {
    setFolioSearch('')
    setFolioFavoritesOnly(false)
    void refreshFolio()
    return () => {
      setFolioSearch('')
      setFolioFavoritesOnly(false)
    }
  }, [])

  useEffect(() => setFolioSearch(query), [query])
  useEffect(() => setFolioFavoritesOnly(favoritesOnly), [favoritesOnly])

  const selected = useMemo(
    () => (readingId ? entries.find((entry) => entry.id === readingId) ?? null : null),
    [entries, readingId],
  )
  const openReading = (id: string) => navigate(`/readings/${encodeURIComponent(id)}`)
  const startSearch = (value: string) => {
    if (readingId) navigate('/readings')
    setQuery(value)
  }

  const document = selected
    ? folioEntryToReadingDocument(selected, {
        owner: {
          id: me?.id ?? null,
          email: me?.email ?? null,
          label: me?.email ?? 'Authenticated Folio owner',
        },
      })
    : null

  return (
    <div className="min-h-screen overflow-x-hidden bg-void">
      <PageFrame />
      <main id="main-content" className="relative z-10 mx-auto w-full max-w-[96rem] px-5 pb-20 pt-24 sm:px-10 lg:px-14">
        <header className="grid gap-8 border-b border-gold/15 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="console-eyebrow">Folio archive · fallback & recovery</p>
            <h1 className="mt-3 font-display text-3xl font-light tracking-[0.12em] text-parchment sm:text-5xl">
              Reading Library
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-silver/75">
              Begin through conversation. Return here when you need to browse, verify, or recover the exact canonical record.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="#/node/folio"
              className="btn-ghost cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Folio graph
            </a>
            <a
              href="#/node/witness"
              className="btn-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-parchment"
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Begin in chat
            </a>
          </div>
        </header>

        <section className="mt-7" aria-label="Reading library controls">
          <div className="console-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
            <label className="flex min-w-0 flex-1 items-center gap-2 border-b border-gold/25 px-2 py-2 focus-within:border-gold/70">
              <Search className="h-4 w-4 shrink-0 text-silver" aria-hidden="true" />
              <span className="sr-only">Search canonical readings</span>
              <input
                value={query}
                onChange={(event) => startSearch(event.target.value)}
                placeholder="Search titles, nodes, and stored reading text…"
                className="w-full bg-transparent text-sm text-parchment placeholder:text-silver/45 focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                if (readingId) navigate('/readings')
                setFavoritesOnly((value) => !value)
              }}
              aria-pressed={favoritesOnly}
              className={[
                'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border px-4 py-2 font-display text-[9px] uppercase tracking-[0.18em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
                favoritesOnly
                  ? 'border-gold bg-gold/10 text-gold'
                  : 'border-gold/25 text-silver hover:border-gold/60 hover:text-parchment',
              ].join(' ')}
            >
              <Star className={`h-3.5 w-3.5 ${favoritesOnly ? 'fill-gold' : ''}`} aria-hidden="true" />
              Favorites
            </button>
          </div>
        </section>

        {error && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border border-terracotta/35 bg-terracotta/10 px-4 py-3 text-sm text-terracotta">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {error}
            </span>
            <button
              type="button"
              onClick={() => void refreshFolio()}
              className="inline-flex cursor-pointer items-center gap-1.5 font-display text-[9px] uppercase tracking-[0.18em] transition-colors hover:text-parchment"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </button>
          </div>
        )}

        {status === 'loading' && entries.length === 0 ? (
          <div className="mt-7 grid min-h-[28rem] place-items-center border border-gold/10 bg-surface/40">
            <p className="font-display text-[10px] uppercase tracking-[0.24em] text-gold/65">Charting your Folio…</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="mt-7 grid min-h-[28rem] place-items-center border border-gold/15 bg-surface/40 px-6 text-center">
            <div>
              <p className="font-serif text-xl uppercase tracking-[0.16em] text-parchment">
                {query || favoritesOnly ? 'No readings match this lens' : 'Your Folio is still quiet'}
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-silver/70">
                {query || favoritesOnly
                  ? 'Clear the search or favorites filter to restore the full constellation.'
                  : 'Open a reading doorway in the graph. The conversation will save its durable record here.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-7">
              <ReadingLibraryMap readings={entries} selectedId={readingId} onSelect={openReading} />
            </div>

            <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <section aria-labelledby="library-records-title">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="console-eyebrow">Canonical records</p>
                    <h2 id="library-records-title" className="mt-1 font-serif text-lg uppercase tracking-[0.14em] text-parchment">
                      {selected ? 'Opened reading' : 'Recent readings'}
                    </h2>
                  </div>
                  <span className="font-mono text-[10px] text-silver/55">{entries.length} visible</span>
                </div>

                {selected && document ? (
                  <div className="console-card p-4 sm:p-6">
                    <button
                      type="button"
                      onClick={() => navigate('/readings')}
                      className="mb-5 inline-flex cursor-pointer items-center gap-2 font-display text-[9px] uppercase tracking-[0.18em] text-silver transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      All records
                    </button>
                    <ReadingFolio document={document} />
                  </div>
                ) : readingId && status !== 'loading' ? (
                  <div className="console-card p-8 text-center">
                    <p className="font-serif text-lg uppercase tracking-[0.14em] text-parchment">Record unavailable</p>
                    <p className="mt-2 text-sm text-silver/70">
                      It may have been removed, or this signed-in account may not own it.
                    </p>
                  </div>
                ) : (
                  <ul className="grid gap-3 md:grid-cols-2">
                    {entries.map((entry) => (
                      <li key={entry.id} className="console-card group flex min-h-40 flex-col transition-[border-color,background-color] hover:border-gold/55 hover:bg-surface">
                        <div className="flex items-start gap-2 p-4 pb-0">
                          <button
                            type="button"
                            onClick={() => openReading(entry.id)}
                            className="min-w-0 flex-1 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                          >
                            <span className="font-display text-[8px] uppercase tracking-[0.18em] text-gold/65">{entry.nodeLabel}</span>
                            <span className="mt-3 block font-serif text-sm uppercase leading-relaxed tracking-[0.12em] text-parchment">
                              {entry.title}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleFavorite(entry.id)}
                            aria-label={entry.favorite ? `Remove ${entry.title} from favorites` : `Favorite ${entry.title}`}
                            className="cursor-pointer text-silver transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                          >
                            <Star className={`h-3.5 w-3.5 ${entry.favorite ? 'fill-gold text-gold' : ''}`} aria-hidden="true" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => openReading(entry.id)}
                          className="mt-auto cursor-pointer px-4 pb-4 pt-3 text-left font-mono text-[9px] text-silver/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                        >
                          {dateLabel(entry.createdAt)} · {entry.id.slice(0, 12)}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <div>
                {selected ? (
                  <ReadingTrustPanel entry={selected} owner={me} />
                ) : (
                  <aside className="console-card sticky top-24 p-5">
                    <p className="console-eyebrow">How this library behaves</p>
                    <h2 className="mt-2 font-serif text-base uppercase tracking-[0.14em] text-parchment">One record, many doorways</h2>
                    <ul className="mt-4 space-y-3 text-xs leading-relaxed text-silver/75">
                      <li className="border-l border-gold/25 pl-3">Chat composes the reading and writes one owner-scoped Folio row.</li>
                      <li className="border-l border-gold/25 pl-3">This library reopens that same ID and body; it never saves a display copy.</li>
                      <li className="border-l border-gold/25 pl-3">Every opened record shows its checksum and why this account can see it.</li>
                    </ul>
                  </aside>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
