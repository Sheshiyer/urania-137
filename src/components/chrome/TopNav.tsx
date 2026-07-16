import { useMemo, useState } from 'react'
import { Search, Compass, Share2 } from 'lucide-react'
import { SELEMENE_NODES } from '../../data/selemeneNodes'
import { Route, navigate } from '../../hooks/useHashRoute'

/**
 * The console top bar from the reference moodboard: the URANIA 137 wordmark and
 * a MAP · NODES · PATHS · ARCHIVE nav with a live node search. MAP → home,
 * ARCHIVE → Folio, and search → jump to a node are wired; NODES/PATHS + icons are
 * presentational dressing. Every destination is also reachable by clicking the
 * graph, so the graph stays the interface (ISA ISC-10).
 */
export function TopNav({ route }: { route: Route }) {
  const activeId = route.view === 'node' ? route.nodeId : null

  const items: { key: string; label: string; onClick?: () => void; active?: boolean }[] = [
    { key: 'map', label: 'Map', onClick: () => navigate('/'), active: route.view === 'home' },
    { key: 'nodes', label: 'Nodes' },
    { key: 'paths', label: 'Paths' },
    { key: 'archive', label: 'Archive', onClick: () => navigate('/node/folio'), active: activeId === 'folio' },
  ]

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-5 py-3 sm:px-8">
      {/* Wordmark */}
      <button
        onClick={() => navigate('/')}
        className="pointer-events-auto flex items-baseline gap-2 font-serif uppercase tracking-[0.22em] text-parchment transition-colors hover:text-gold"
        aria-label="Urania 137 — home"
      >
        <span className="text-sm font-semibold sm:text-base">Urania</span>
        <span className="text-sm font-semibold text-gold sm:text-base">137</span>
      </button>

      {/* Nav + search */}
      <div className="pointer-events-auto flex items-center gap-3 sm:gap-5">
        <nav className="hidden items-center gap-5 md:flex" aria-label="Console sections">
          {items.map((it) => (
            <button
              key={it.key}
              onClick={it.onClick}
              disabled={!it.onClick}
              className={[
                'font-display text-[11px] uppercase tracking-[0.22em] transition-colors',
                it.active ? 'text-gold' : it.onClick ? 'text-silver hover:text-parchment' : 'cursor-default text-silver/45',
              ].join(' ')}
            >
              {it.label}
            </button>
          ))}
        </nav>
        <NodeSearch activeId={activeId} />
        <div className="hidden items-center gap-3 text-silver/50 sm:flex" aria-hidden="true">
          <Compass className="h-4 w-4" />
          <Share2 className="h-4 w-4" />
        </div>
      </div>
    </header>
  )
}

/** A small live search that filters the seven nodes and jumps to one. */
function NodeSearch({ activeId }: { activeId: string | null }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return []
    return SELEMENE_NODES.filter(
      (n) => n.label.toLowerCase().includes(term) || n.children?.some((c) => c.label.toLowerCase().includes(term)),
    ).slice(0, 6)
  }, [q])

  const go = (id: string) => {
    setQ('')
    setOpen(false)
    navigate(id === activeId ? `/node/${id}` : `/node/${id}`)
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-full border border-gold/20 bg-void/50 px-3 py-1.5 backdrop-blur-sm transition-colors focus-within:border-gold/50">
        <Search className="h-3.5 w-3.5 text-silver" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder="Search nodes…"
          className="w-24 bg-transparent font-display text-[11px] uppercase tracking-[0.14em] text-parchment placeholder:text-silver/50 focus:outline-none sm:w-32"
          aria-label="Search stellar nodes"
        />
      </div>
      {open && matches.length > 0 && (
        <ul className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-gold/20 bg-surface/95 py-1 shadow-2xl shadow-gold/10 backdrop-blur-md">
          {matches.map((n) => (
            <li key={n.id}>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(n.id)}
                className="flex w-full items-center justify-between px-4 py-2 text-left font-display text-[11px] uppercase tracking-[0.16em] text-silver transition-colors hover:bg-gold/10 hover:text-parchment"
              >
                {n.label}
                <span className="h-1.5 w-1.5 rotate-45 border border-gold/60" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
