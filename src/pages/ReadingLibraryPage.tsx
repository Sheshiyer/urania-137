import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  MessageCircle,
  Search,
  Star,
} from 'lucide-react'
import type { ReadingDTO, User } from '../lib/api/contract'
import {
  refreshFolio,
  setFolioFavoritesOnly,
  setFolioSearch,
  toggleFavorite,
} from '../lib/folioStore'
import {
  folioEntryToReadingDocument,
} from '../lib/readings'
import { canonicalReadingChecksum } from '../lib/readings/canonical'
import {
  deriveFolioView,
  folioAccessFromStatus,
  folioBoundaryState,
  type FolioView,
} from '../lib/readings/folioView'
import { useFolioState } from '../hooks/useFolio'
import { EMPTY_FOLIO_QUERY, buildConversationPath, buildFolioPath, navigate, type FolioQuery, type FolioLensView } from '../hooks/useHashRoute'
import { withViewTransition } from '../lib/viewTransition'
import { PageFrame } from '../components/layout/PageFrame'
import { AsyncBoundary } from '../components/ui/AsyncBoundary'
import { CopyButton } from '../components/ui/CopyButton'
import {
  ReadingFolio,
  ReadingLibraryMap,
  ReadingTrustPanel,
  FolioGallery,
  FolioFilters,
} from '../components/readings'

function useCanonicalChecksum(entry: ReadingDTO | null): string | null {
  const [checksum, setChecksum] = useState<string | null>(null)

  useEffect(() => {
    let current = true
    setChecksum(null)
    if (entry) {
      void canonicalReadingChecksum(entry)
        .then((value) => {
          if (current) setChecksum(value)
        })
        .catch(() => {
          if (current) setChecksum(null)
        })
    }
    return () => {
      current = false
    }
  }, [entry])

  return checksum
}

function accessReason(me: User | null): string {
  return me?.email
    ? `Signed in as the owner (${me.email})`
    : 'Owner-scoped authenticated Folio access'
}

const LENS_VIEWS: readonly FolioLensView[] = ['grid', 'map', 'list']
const ACTION_BTN = 'inline-flex min-h-11 min-w-11 items-center gap-2 font-display text-xs uppercase tracking-[0.18em] transition-colors'

function ReadyFolio({
  view,
  me,
  checksum,
  lensView,
  routeQuery,
  allEntries,
  onSelect,
}: {
  view: Extract<FolioView, { status: 'ready' }>
  me: User | null
  checksum: string | null
  lensView: FolioLensView
  routeQuery: FolioQuery
  allEntries: readonly ReadingDTO[]
  onSelect: (id: string) => void
}) {
  const selected = view.selected
  const document = selected
    ? folioEntryToReadingDocument(selected, {
        owner: {
          id: me?.id ?? null,
          email: me?.email ?? null,
          label: me?.email ?? 'Authenticated Folio owner',
        },
      })
    : null
  const trustedAccess = accessReason(me)
  const evidenceContext = {
    accessReason: trustedAccess,
    checksum: checksum ? `sha256:${checksum}` : null,
  }

  return (
    <div className="space-y-7">
      <FolioFilters query={routeQuery} allEntries={allEntries} />

      {lensView === 'grid' && (
        <FolioGallery
          entries={view.entries}
          selectedId={selected?.id ?? null}
          onSelect={onSelect}
        />
      )}

      {lensView === 'map' && (
        <ReadingLibraryMap
          readings={view.entries}
          selectedId={selected?.id ?? null}
          onSelect={onSelect}
          onToggleFavorite={toggleFavorite}
        />
      )}

      {lensView === 'list' && (
        <div className="space-y-1">
          {view.entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => onSelect(entry.id)}
              className={`flex w-full items-center gap-3 rounded-tile px-3 py-2.5 text-left transition-colors ${
                selected?.id === entry.id
                  ? 'bg-gold/15 text-parchment'
                  : 'text-silver hover:bg-gold/10 hover:text-parchment'
              }`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rotate-45 border ${
                entry.favorite ? 'border-gold bg-gold' : 'border-gold/40'
              }`} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-serif text-small">{entry.title}</span>
              <span className="shrink-0 font-display text-meta uppercase tracking-[0.14em] text-metadata">{entry.nodeLabel}</span>
            </button>
          ))}
        </div>
      )}

      {selected && document ? (
        <div className="grid min-w-0 gap-7 2xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="min-w-0" aria-labelledby="opened-reading-title">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="console-eyebrow">Canonical record</p>
                <h2
                  id="opened-reading-title"
                  className="mt-1 break-words font-serif text-lg uppercase tracking-[0.14em] text-parchment"
                >
                  Reading
                </h2>
              </div>
            </div>
            <div className="console-card min-w-0 p-3 sm:p-6">
              <ReadingFolio
                document={document}
                evidenceContext={evidenceContext}
              />
            </div>
          </section>

          <ReadingTrustPanel
            entry={selected}
            owner={me}
            accessReason={trustedAccess}
            checksum={checksum}
          />

          <div className="pointer-events-none sticky bottom-4 z-30 col-span-full flex justify-center px-3">
            <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-pill border border-gold/20 bg-surface/90 px-4 py-1.5 shadow-capsule backdrop-blur-md sm:gap-4 sm:px-6">
              <a
                href={`#${buildConversationPath({
                  readingId: selected.id,
                  returnTo: `/readings/${encodeURIComponent(selected.id)}`,
                })}`}
                data-reading-relation="continue-in-conversation"
                className={`${ACTION_BTN} text-gold hover:text-parchment`}
              >
                <span className="h-1.5 w-1.5 rotate-45 border border-gold bg-gold" aria-hidden="true" />
                Continue in conversation
              </a>
              {checksum && (
                <CopyButton value={`sha256:${checksum}`} label="Copy checksum" />
              )}
              <button
                type="button"
                onClick={() => navigate('/readings')}
                className={`${ACTION_BTN} text-silver hover:text-parchment`}
              >
                <span className="h-1.5 w-1.5 rotate-45 border border-gold/40" aria-hidden="true" />
                Browse Folio
              </button>
            </div>
          </div>
        </div>
      ) : (
        <aside className="console-card p-5">
          <p className="console-eyebrow">One record, many doorways</p>
          <h2 className="mt-2 font-serif text-base uppercase tracking-[0.14em] text-parchment">
            Select a Reading
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
            Each conversation composes one canonical Folio row. Map, list, or direct URL reopen the same record.
          </p>
        </aside>
      )}
    </div>
  )
}

export function ReadingLibraryPage({
  me,
  readingId,
  query: routeQuery = EMPTY_FOLIO_QUERY,
}: {
  me: User | null
  readingId: string | null
  query?: FolioQuery
}) {
  const { entries, status, error, httpStatus } = useFolioState()
  const [query, setQuery] = useState(routeQuery.q)
  const [favoritesOnly, setFavoritesOnly] = useState(routeQuery.favorites)
  const lensView: FolioLensView = routeQuery.view ?? 'grid'

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

  const view = useMemo(
    () => deriveFolioView({
      status,
      entries,
      error,
      readingId,
      filtered: Boolean(query.trim()) || favoritesOnly,
      access: folioAccessFromStatus(httpStatus),
    }),
    [entries, error, favoritesOnly, httpStatus, query, readingId, status],
  )
  const selected = view.status === 'ready' ? view.selected : null
  const checksum = useCanonicalChecksum(selected)
  const boundary = folioBoundaryState(view, () => void refreshFolio())
  const openReading = (id: string) => navigate(`/readings/${encodeURIComponent(id)}`)
  const startSearch = (value: string) => {
    if (readingId) navigate('/readings')
    setQuery(value)
  }

  const switchLens = (next: FolioLensView) => {
    withViewTransition(() => navigate(buildFolioPath({ ...routeQuery, view: next })))
  }

  return (
    <div className="min-h-full bg-void">
      <PageFrame />
      <main
        id="main-content"
        className="relative z-10 mx-auto w-full max-w-[112rem] px-5 pb-20 pt-8 sm:px-10 sm:pt-10 lg:px-14"
      >
        <header className="grid gap-8 border-b border-gold/15 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="console-eyebrow">Folio · fallback & recovery</p>
            <h1 className="mt-3 font-display text-3xl font-light tracking-[0.12em] text-parchment sm:text-5xl">
              Browse Folio
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-secondary">
              Begin through conversation. Return here to browse, verify, or recover a canonical Reading.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="#/node/folio"
              className="btn-ghost"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Folio map
            </a>
            <a
              href={`#${buildConversationPath({ returnTo: '/readings' })}`}
              className="btn-primary"
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Begin in chat
            </a>
          </div>
        </header>

        <section className="mt-7" aria-label="Browse Folio controls">
          <div className="console-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
            <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 border-b border-gold/25 px-2 py-2 focus-within:border-interaction-focus">
              <Search className="h-4 w-4 shrink-0 text-silver" aria-hidden="true" />
              <span className="sr-only">Search canonical readings</span>
              <input
                aria-label="Search canonical readings"
                value={query}
                onChange={(event) => startSearch(event.target.value)}
                placeholder="Search titles, nodes, and stored reading text…"
                className="min-h-11 w-full bg-transparent text-sm text-parchment placeholder:text-silver/45 focus:outline-none"
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
                'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border px-4 py-2 font-display text-xs uppercase tracking-[0.18em]',
                'transition-colors duration-300 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interaction-focus',
                favoritesOnly
                  ? 'border-interaction-selected bg-interaction-flow/20 text-primary'
                  : 'border-gold/25 text-secondary hover:border-interaction-active hover:text-primary',
              ].join(' ')}
            >
              <Star className={`h-3.5 w-3.5 ${favoritesOnly ? 'fill-gold text-gold' : ''}`} aria-hidden="true" />
              Favorites
            </button>

            <div className="flex border border-gold/20 p-0.5" role="group" aria-label="Folio view">
              {LENS_VIEWS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => switchLens(v)}
                  aria-pressed={lensView === v}
                  className={`min-h-9 px-2.5 font-display text-meta uppercase tracking-[0.14em] transition-colors ${
                    lensView === v
                      ? 'bg-gold/15 text-gold'
                      : 'text-silver hover:text-parchment'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-7">
          <AsyncBoundary state={boundary}>
            {view.status === 'ready' ? (
              <ReadyFolio
                view={view}
                me={me}
                checksum={checksum}
                lensView={lensView}
                routeQuery={routeQuery}
                allEntries={entries}
                onSelect={openReading}
              />
            ) : null}
          </AsyncBoundary>
        </div>
      </main>
    </div>
  )
}
