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
import { navigate } from '../hooks/useHashRoute'
import { PageFrame } from '../components/layout/PageFrame'
import { AsyncBoundary } from '../components/ui/AsyncBoundary'
import {
  ReadingFolio,
  ReadingLibraryMap,
  ReadingTrustPanel,
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

function ReadyFolio({
  view,
  me,
  checksum,
  onSelect,
}: {
  view: Extract<FolioView, { status: 'ready' }>
  me: User | null
  checksum: string | null
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
      <ReadingLibraryMap
        readings={view.entries}
        selectedId={selected?.id ?? null}
        onSelect={onSelect}
        onToggleFavorite={toggleFavorite}
      />

      {selected && document ? (
        <div className="grid min-w-0 gap-7 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section aria-labelledby="opened-reading-title">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="console-eyebrow">Canonical record</p>
                <h2
                  id="opened-reading-title"
                  className="mt-1 font-serif text-lg uppercase tracking-[0.14em] text-parchment"
                >
                  Reading
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/readings')}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-display text-xs uppercase tracking-[0.18em] text-secondary transition-colors duration-300 hover:text-interaction-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interaction-focus"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Browse Folio
              </button>
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
        </div>
      ) : (
        <aside className="console-card p-5">
          <p className="console-eyebrow">One record, many doorways</p>
          <h2 className="mt-2 font-serif text-base uppercase tracking-[0.14em] text-parchment">
            Select a Reading
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
            Conversation composes one owner-scoped Folio row. Map, list, and direct canonical URL reopen that same identity and body without making a display copy.
          </p>
        </aside>
      )}
    </div>
  )
}

export function ReadingLibraryPage({
  me,
  readingId,
}: {
  me: User | null
  readingId: string | null
}) {
  const { entries, status, error, httpStatus } = useFolioState()
  const [query, setQuery] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  // A direct canonical URL starts from the unfiltered owner-scoped Folio.
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

  return (
    <div className="min-h-screen overflow-x-hidden bg-void">
      <PageFrame />
      <main
        id="main-content"
        className="relative z-10 mx-auto w-full max-w-[96rem] px-5 pb-20 pt-24 sm:px-10 lg:px-14"
      >
        <header className="grid gap-8 border-b border-gold/15 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="console-eyebrow">Folio · fallback & recovery</p>
            <h1 className="mt-3 font-display text-3xl font-light tracking-[0.12em] text-parchment sm:text-5xl">
              Browse Folio
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-secondary">
              Begin through conversation. Return here to browse, verify, or recover the exact canonical Reading.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="#/node/folio"
              className="btn-ghost cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interaction-focus"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Folio map
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
          </div>
        </section>

        <div className="mt-7">
          <AsyncBoundary state={boundary}>
            {view.status === 'ready' ? (
              <ReadyFolio
                view={view}
                me={me}
                checksum={checksum}
                onSelect={openReading}
              />
            ) : null}
          </AsyncBoundary>
        </div>
      </main>
    </div>
  )
}
