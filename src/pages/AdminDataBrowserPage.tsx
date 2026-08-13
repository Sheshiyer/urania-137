import { useCallback, useEffect, useState } from 'react'
import { FolderClosed, Search, FileText, Database } from 'lucide-react'
import { PageFrame } from '../components/layout/PageFrame'
import {
  type CorpusReading,
  type CorpusListResponse,
  type PatternSearchResponse,
  type PatternSearchResult,
  type User,
} from '../lib/api/contract'

type CorpusList = CorpusListResponse

interface PatternSearchList extends PatternSearchResponse {}

type Section = 'corpus' | 'patterns' | null

export function AdminDataBrowserPage({ me, section }: { me: User | null; section: Section }) {
  const [activeSection, setActiveSection] = useState<Section>(section ?? 'corpus')
  const [readings, setReadings] = useState<CorpusReading[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [modeFilter, setModeFilter] = useState<string>('all')

  // Sync URL section change.
  useEffect(() => {
    if (section !== null) setActiveSection(section)
  }, [section])

  const loadCorpus = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm.trim()) params.set('search', searchTerm.trim())
      if (modeFilter !== 'all') params.set('mode', modeFilter)
      const res = await fetch(`/api/corpus?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = (await res.json()) as CorpusList
      setReadings(body.readings)
    } catch (err) {
      // Surface at the user's own console — this is an admin-only page.
      console.error('Corpus load failed:', err)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, modeFilter])

  useEffect(() => {
    if (activeSection === 'corpus') {
      void loadCorpus()
    }
  }, [activeSection, loadCorpus])

  // ---- Pattern search state ----
  const [patternQuery, setPatternQuery] = useState('')
  const [patternResults, setPatternResults] = useState<PatternSearchResult[]>([])
  const [patternLoading, setPatternLoading] = useState(false)
  const [patternDebounce, setPatternDebounce] = useState<NodeJS.Timeout | null>(null)

  const searchPatterns = useCallback(async (q: string) => {
    if (!q.trim()) {
      setPatternResults([])
      return
    }
    setPatternLoading(true)
    try {
      const res = await fetch(`/api/patterns/search?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = (await res.json()) as PatternSearchList
      setPatternResults(body.results as PatternSearchResult[])
    } catch (err) {
      console.error('Pattern search failed:', err)
    } finally {
      setPatternLoading(false)
    }
  }, [])

  const handlePatternSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setPatternQuery(q)
    if (patternDebounce) clearTimeout(patternDebounce)
    const t = setTimeout(() => {
      void searchPatterns(q)
    }, 500)
    setPatternDebounce(t)
  }

  // Cleanup debounce on unmount.
  useEffect(() => {
    return () => {
      if (patternDebounce) clearTimeout(patternDebounce)
    }
  }, [patternDebounce])

  const renderSection = () => {
    switch (activeSection) {
      case 'corpus':
        return (
          <section aria-labelledby="admin-corpus-title">
            <header className="flex items-end justify-between gap-3 border-b border-gold/15 pb-4">
              <div>
                <p className="console-eyebrow">Reading corpus catalogue</p>
                <h2 id="admin-corpus-title" className="mt-2 font-display text-2xl uppercase tracking-[0.1em] text-parchment">
                  Corpus Browser
                </h2>
                <p className="mt-2 text-sm text-secondary">
                  Owner-scoped catalogue of {readings.length} readings. Select a row to view its full R2 body.
                </p>
              </div>
              <button
                onClick={() => void loadCorpus()}
                disabled={loading}
                className="cursor-pointer rounded-full border border-gold/25 p-2 text-silver transition-colors hover:border-gold/60 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-wait disabled:opacity-50"
                aria-label="Refresh corpus list"
              >
                <Database className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block font-display text-xs uppercase tracking-[0.18em] text-metadata">
                  Search
                </label>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void loadCorpus()
                  }}
                  placeholder="Filter by title…"
                  className="mt-1.5 w-full border border-gold/20 bg-void px-3 py-2 text-sm text-parchment placeholder:text-silver/40 focus:border-gold/60 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-display text-xs uppercase tracking-[0.18em] text-metadata">
                  Mode
                </label>
                <select
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value)}
                  className="mt-1.5 w-full border border-gold/20 bg-void px-3 py-2 text-sm text-parchment focus:border-gold/60 focus:outline-none"
                >
                  <option value="all">All modes</option>
                  <option value="Solo">Solo only</option>
                  <option value="Synastry">Synastry only</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => void loadCorpus()}
                  disabled={loading || (!searchTerm && modeFilter === 'all')}
                  className="w-full cursor-pointer rounded-full border border-gold/25 px-4 py-2 font-display text-xs uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-wait disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'Apply'}
                </button>
              </div>
            </div>

            {readings.length === 0 && !loading ? (
              <div className="mt-8 text-center">
                <FolderClosed className="mx-auto h-8 w-8 text-silver/30" aria-hidden="true" />
                <p className="mt-3 text-sm text-secondary">
                  No readings in the catalogue. The corpus may not have been ingested yet.
                </p>
              </div>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full border-collapse border-gold/10 text-sm">
                  <thead>
                    <tr className="border-b border-gold/10">
                      <th className="pb-2 text-left font-display text-xs uppercase tracking-[0.16em] text-metadata">
                        Title
                      </th>
                      <th className="pb-2 text-left font-display text-xs uppercase tracking-[0.16em] text-metadata">
                        Mode
                      </th>
                      <th className="pb-2 text-left font-display text-xs uppercase tracking-[0.16em] text-metadata">
                        SHA-256
                      </th>
                      <th className="pb-2 text-left font-display text-xs uppercase tracking-[0.16em] text-metadata">
                        Source
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold/10">
                    {readings.map((r) => (
                      <tr key={r.id} className="hover:bg-gold/5">
                        <td className="py-3">
                          <a
                            href={`#/admin-data/corpus/${r.sha256}`}
                            className="text-parchment underline decoration-gold/30 decoration-1 underline-offset-2 hover:decoration-gold/60"
                          >
                            {r.title}
                          </a>
                        </td>
                        <td className="py-3 text-silver">{r.mode}</td>
                        <td className="py-3 font-mono text-xs text-silver/60">{r.sha256.slice(0, 16)}…</td>
                        <td className="py-3 text-xs text-silver/60">{r.source_type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )

      case 'patterns':
        return (
          <section aria-labelledby="admin-patterns-title">
            <header className="border-b border-gold/15 pb-4">
              <p className="console-eyebrow">Pattern memory search (Vectorize)</p>
              <h2 id="admin-patterns-title" className="mt-2 font-display text-2xl uppercase tracking-[0.1em] text-parchment">
                Pattern Search
              </h2>
              <p className="mt-2 text-sm text-secondary">
                Search the corpus pattern embeddings. Results are owner-scoped.
                Top-K is hard-capped at 10 to limit query cost.
              </p>
            </header>

            <div className="mt-5">
              <Search className="absolute ml-3 h-4 w-4 text-silver/40" aria-hidden="true" />
              <input
                value={patternQuery}
                onChange={handlePatternSearch}
                placeholder="e.g. moon conjunction in synastry"
                className="w-full border border-gold/20 bg-void px-10 py-2 text-sm text-parchment placeholder:text-silver/40 focus:border-gold/60 focus:outline-none"
              />
            </div>

            {patternLoading && (
              <p className="mt-4 text-xs text-silver/50">Searching patterns…</p>
            )}

            {patternResults.length > 0 && (
              <div className="mt-5 space-y-3">
                {patternResults.map((result) => (
                  <div key={result.id} className="console-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-xs uppercase tracking-[0.16em] text-metadata">
                          {String(result.metadata?.title ?? result.metadata?.reading_sha256 ?? result.id)}
                        </p>
                        <p className="mt-1 truncate text-xs font-mono text-silver/60">
                          {typeof result.metadata?.preview === 'string'
                            ? result.metadata.preview.slice(0, 200)
                            : typeof result.metadata?.preview === 'object' && result.metadata.preview !== null
                              ? String(result.metadata.preview).slice(0, 200)
                              : 'No preview available'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        <span className="font-mono text-xs text-gold">{Math.round(result.score * 10000) / 10000}</span>
                        <span className="font-display text-[10px] uppercase tracking-[0.16em] text-metadata">score</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {patternResults.length === 0 && patternQuery && !patternLoading && (
              <p className="mt-4 text-sm text-secondary">No patterns matched "{patternQuery}".</p>
            )}
          </section>
        )

      default:
        return (
          <section aria-labelledby="admin-default-title">
            <header className="border-b border-gold/15 pb-4">
              <p className="console-eyebrow">Admin Data Browser</p>
              <h2 id="admin-default-title" className="mt-2 font-display text-2xl uppercase tracking-[0.1em] text-parchment">
                Admin Data Browser
              </h2>
              <p className="mt-2 text-sm text-secondary">
                Select a section below.
              </p>
            </header>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => setActiveSection('corpus')}
                className="flex items-start gap-4 rounded-lg border border-gold/20 p-4 text-left transition-colors hover:border-gold/60 hover:bg-gold/5"
              >
                <FileText className="mt-0.5 h-5 w-5 text-gold" aria-hidden="true" />
                <div>
                  <p className="font-display text-sm uppercase tracking-[0.14em] text-parchment">
                    Corpus Browser
                  </p>
                  <p className="mt-1 text-xs text-secondary">
                    Browse the corpus catalogue and view full R2 reading bodies.
                  </p>
                </div>
              </button>
              <button
                onClick={() => setActiveSection('patterns')}
                className="flex items-start gap-4 rounded-lg border border-gold/20 p-4 text-left transition-colors hover:border-gold/60 hover:bg-gold/5"
              >
                <Search className="mt-0.5 h-5 w-5 text-gold" aria-hidden="true" />
                <div>
                  <p className="font-display text-sm uppercase tracking-[0.14em] text-parchment">
                    Pattern Search
                  </p>
                  <p className="mt-1 text-xs text-secondary">
                    Search pattern embeddings via Vectorize similarity.
                  </p>
                </div>
              </button>
            </div>
          </section>
        )
    }
  }

  return (
    <div className="min-h-full overflow-x-hidden bg-void">
      <PageFrame />
      <main id="main-content" className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-24 pt-8 sm:px-10 sm:pt-10 lg:px-14">
        <header className="grid gap-8 border-b border-gold/15 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="console-eyebrow">Admin · {me?.email ?? 'Authenticated account'}</p>
            <h1 className="mt-3 font-display text-3xl font-light tracking-[0.12em] text-parchment sm:text-5xl">
              Admin Data Browser
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-secondary">
              Owner-scoped administration surface for the corpus catalogue (D1 + R2)
              and pattern memory (Vectorize). All data is access-gated behind Cloudflare Access (T-008).
            </p>
          </div>
          <div className="flex items-end gap-3">
            <nav className="flex gap-1.5" role="tablist">
              <button
                onClick={() => setActiveSection(null)}
                className={`px-3 py-1.5 text-xs font-display uppercase tracking-[0.16em] ${
                  activeSection === null
                    ? 'border border-gold/40 bg-void text-gold'
                    : 'border border-gold/20 text-silver hover:border-gold/60 hover:text-parchment'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => setActiveSection('corpus')}
                className={`px-3 py-1.5 text-xs font-display uppercase tracking-[0.16em] ${
                  activeSection === 'corpus'
                    ? 'border border-gold/40 bg-void text-gold'
                    : 'border border-gold/20 text-silver hover:border-gold/60 hover:text-parchment'
                }`}
              >
                Corpus
              </button>
              <button
                onClick={() => setActiveSection('patterns')}
                className={`px-3 py-1.5 text-xs font-display uppercase tracking-[0.16em] ${
                  activeSection === 'patterns'
                    ? 'border border-gold/40 bg-void text-gold'
                    : 'border border-gold/20 text-silver hover:border-gold/60 hover:text-parchment'
                }`}
              >
                Patterns
              </button>
            </nav>
            <a
              href="#/"
              className="btn-ghost cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              Return to map
            </a>
          </div>
        </header>

        <div className="mt-8">{renderSection()}</div>
      </main>
    </div>
  )
}
