import { useMemo, useState } from 'react'
import { Star, Download, Trash2, FileText } from 'lucide-react'
import { SelemeneChild } from '../../types'
import { useFolio } from '../../hooks/useFolio'
import { toggleFavorite, removeEntry, exportEntry } from '../../lib/folioStore'

const FORMATS = ['markdown', 'docx', 'pdf'] as const

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/**
 * The Folio Archive surface — real saved reports from localStorage with search,
 * favorites, per-entry export (markdown/docx/pdf) and delete. The clicked child
 * sets the initial mode (Search focuses the box, Favorites filters, an export
 * child preselects that format).
 */
export function FolioPanel({ child }: { child: SelemeneChild | null }) {
  const entries = useFolio()
  const onlyFavorites = child?.id === 'favorites'
  const defaultFormat = (child?.format ?? (child?.id === 'docx' ? 'docx' : child?.id === 'pdf' ? 'pdf' : child?.id === 'markdown' ? 'markdown' : undefined)) as
    | (typeof FORMATS)[number]
    | undefined
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return entries
      .filter((e) => (onlyFavorites ? e.favorite : true))
      .filter((e) => (term ? e.title.toLowerCase().includes(term) || e.nodeLabel.toLowerCase().includes(term) || e.content.toLowerCase().includes(term) : true))
  }, [entries, query, onlyFavorites])

  return (
    <div className="space-y-3">
      <input
        autoFocus={child?.id === 'search'}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search saved reports…"
        className="w-full rounded-lg border border-gold/20 bg-void/50 px-3 py-2 text-sm text-parchment placeholder:text-silver/50 focus:border-gold/50 focus:outline-none"
        aria-label="Search saved reports"
      />

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-silver">
          {entries.length === 0 ? 'No saved reports yet — generate a report from any node and it lands here.' : 'No matches.'}
        </p>
      ) : (
        <ul className="max-h-[46vh] space-y-2 overflow-auto pr-1">
          {filtered.map((e) => (
            <li key={e.id} className="rounded-lg border border-gold/10 bg-void/50">
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
                <button onClick={() => removeEntry(e.id)} title="Delete" className="shrink-0 text-silver hover:text-terracotta">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {openId === e.id && (
                <pre className="mx-3 mb-3 max-h-52 overflow-auto whitespace-pre-wrap rounded border border-gold/10 bg-void/70 p-3 font-mono text-[11px] leading-relaxed text-parchment/90">
                  {e.content}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-silver/60">
        <FileText className="h-3 w-3" /> {entries.length} saved · stored locally in this browser.
      </p>
    </div>
  )
}
