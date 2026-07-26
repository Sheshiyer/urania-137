import { useMemo, useState } from 'react'
import { Search, Compass, Share2 } from 'lucide-react'
import { SELEMENE_NODES } from '../../data/selemeneNodes'
import { Route, navigate } from '../../hooks/useHashRoute'
import type { User } from '../../lib/api/contract'
import { IdentityChip } from './IdentityChip'

/**
 * The console top bar from the reference moodboard: the two-tier URANIA 137 /
 * NOESIS wordmark lockup, a MAP · NODES · PATHS · ARCHIVE nav with diamond
 * separators and a live node search, and the gold hairline with a center
 * diamond that rules the bar off from the field. MAP → home, ARCHIVE → Folio,
 * and search → jump to a node are wired; NODES/PATHS + icons are presentational
 * dressing. Every destination is also reachable by clicking the graph, so the
 * graph stays the interface (ISA ISC-10).
 */
export function TopNav({ route, me }: { route: Route; me: User | null }) {
  const activeId = route.view === 'node' ? route.nodeId : null

  const items: { key: string; label: string; onClick?: () => void; active?: boolean }[] = [
    { key: 'map', label: 'Map', onClick: () => navigate('/'), active: route.view === 'home' },
    { key: 'nodes', label: 'Nodes' },
    { key: 'paths', label: 'Paths' },
    { key: 'archive', label: 'Archive', onClick: () => navigate('/node/folio'), active: activeId === 'folio' },
  ]

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40">
      <div className="flex items-start justify-between px-6 pt-4 sm:px-10">
        {/* Two-tier wordmark lockup (the moodboard header): URANIA 137 over NOESIS */}
        <button
          onClick={() => navigate('/')}
          className="pointer-events-auto group flex flex-col items-start text-left"
          aria-label="Urania 137 — home"
        >
          <span className="font-serif text-sm font-semibold uppercase tracking-[0.24em] text-parchment transition-colors group-hover:text-gold sm:text-base">
            Urania <span className="text-gold">137</span>
          </span>
          <span className="mt-0.5 font-display text-[8px] uppercase tracking-[0.5em] text-gold/70 transition-colors group-hover:text-gold">
            Noesis
          </span>
        </button>

        {/* Nav + search + identity */}
        <div className="pointer-events-auto flex items-center gap-3 pt-1 sm:gap-5">
          <nav className="hidden items-center gap-4 md:flex" aria-label="Console sections">
            {items.map((it, i) => (
              <span key={it.key} className="flex items-center gap-4">
                {i > 0 && <span className="h-1 w-1 rotate-45 border border-gold/40" aria-hidden="true" />}
                <button
                  onClick={it.onClick}
                  disabled={!it.onClick}
                  className={[
                    'relative font-display text-[11px] uppercase tracking-[0.24em] transition-colors',
                    it.active ? 'text-gold' : it.onClick ? 'text-silver hover:text-parchment' : 'cursor-default text-silver/45',
                  ].join(' ')}
                >
                  {it.label}
                  {it.active && <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rotate-45 bg-gold" aria-hidden="true" />}
                </button>
              </span>
            ))}
          </nav>
          <NodeSearch activeId={activeId} />
          <div className="hidden items-center gap-3 text-silver/50 sm:flex" aria-hidden="true">
            <Compass className="h-4 w-4" />
            <Share2 className="h-4 w-4" />
          </div>
          <IdentityChip me={me} />
        </div>
      </div>

      {/* Gold hairline ruling the bar off from the field, with a center diamond
          and end caps — the rule seen across the reference pages. */}
      <div className="mt-3 flex items-center px-6 sm:px-10" aria-hidden="true">
        <span className="h-1 w-1 rotate-45 border border-gold/50" />
        <span className="h-px flex-1 bg-gradient-to-r from-gold/40 via-gold/15 to-gold/15" />
        <span className="mx-2 h-1.5 w-1.5 rotate-45 border border-gold/70" />
        <span className="h-px flex-1 bg-gradient-to-l from-gold/40 via-gold/15 to-gold/15" />
        <span className="h-1 w-1 rotate-45 border border-gold/50" />
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
      <div className="flex items-center gap-2 border-b border-gold/25 bg-transparent px-1 py-1.5 transition-colors focus-within:border-gold/70">
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
        <ul className="console-card absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-sm py-1 shadow-2xl shadow-void">
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
