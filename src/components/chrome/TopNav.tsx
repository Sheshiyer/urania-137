import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { SELEMENE_NODES } from '../../data/selemeneNodes'
import { Route, navigate } from '../../hooks/useHashRoute'
import type { User } from '../../lib/api/contract'
import { BEGIN_READING_EVENT } from '../../pages/HomePage'
import { IdentityChip } from './IdentityChip'

/**
 * The compact global product routes. Folio has one canonical destination;
 * Begin returns to the map and opens its real runnable-doorway index.
 */
export function TopNav({ route, me }: { route: Route; me: User | null }) {
  const activeId = route.view === 'node' ? route.nodeId : null

  const requestBeginReading = () => {
    if (route.view === 'home') {
      window.dispatchEvent(new Event(BEGIN_READING_EVENT))
      return
    }
    navigate('/')
    window.setTimeout(() => window.dispatchEvent(new Event(BEGIN_READING_EVENT)), 0)
  }

  const items: { key: string; label: string; onClick: () => void; active?: boolean }[] = [
    { key: 'map', label: 'Map', onClick: () => navigate('/'), active: route.view === 'home' },
    { key: 'folio', label: 'Folio', onClick: () => navigate('/readings'), active: route.view === 'readings' },
    { key: 'begin', label: 'Begin', onClick: requestBeginReading },
    { key: 'settings', label: 'Settings', onClick: () => navigate('/settings'), active: route.view === 'settings' },
  ]

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40">
      <div className="flex items-start justify-between gap-2 px-4 pt-3 sm:px-10 sm:pt-4">
        {/* Two-tier wordmark lockup (the moodboard header): URANIA 137 over NOESIS */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="pointer-events-auto group flex shrink-0 flex-col items-start text-left"
          aria-label="Urania 137 — home"
        >
          <span className="font-serif text-xs font-semibold uppercase tracking-[0.16em] text-parchment transition-colors group-hover:text-gold sm:text-base sm:tracking-[0.24em]">
            Urania <span className="text-gold">137</span>
          </span>
          <span className="mt-0.5 font-display text-[7px] uppercase tracking-[0.38em] text-gold/70 transition-colors group-hover:text-gold sm:text-[8px] sm:tracking-[0.5em]">
            Noesis
          </span>
        </button>

        {/* Nav + search + identity */}
        <div className="pointer-events-auto flex min-w-0 items-center gap-2 sm:gap-4 sm:pt-1">
          <nav className="hidden items-center gap-3 md:flex" aria-label="Product sections">
            {items.map((it, i) => (
              <span key={it.key} className="flex items-center gap-3">
                {i > 0 && (
                  <span className="h-1 w-1 rotate-45 border border-gold/40" aria-hidden="true" />
                )}
                <button
                  type="button"
                  onClick={it.onClick}
                  aria-current={it.active ? 'page' : undefined}
                  className={`relative min-h-11 font-display text-[10px] uppercase tracking-[0.18em] transition-colors ${
                    it.active ? 'text-gold' : 'text-silver hover:text-parchment'
                  }`}
                >
                  {it.label}
                  {it.active && (
                    <span
                      className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rotate-45 bg-gold"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </span>
            ))}
          </nav>
          <nav className="flex min-w-0 items-center gap-1 md:hidden" aria-label="Product sections">
            {items.map((it) => (
              <button
                key={it.key}
                type="button"
                onClick={it.onClick}
                aria-current={it.active ? 'page' : undefined}
                className={`min-h-11 px-0.5 font-display text-[8px] uppercase tracking-[0.08em] transition-colors ${
                  it.active ? 'text-gold' : 'text-silver hover:text-parchment'
                }`}
              >
                {it.label}
              </button>
            ))}
          </nav>
          <div className="hidden xl:block">
            <NodeSearch activeId={activeId} />
          </div>
          <IdentityChip me={me} />
        </div>
      </div>

      {/* Gold hairline ruling the bar off from the field, with a center diamond
          and end caps — the rule seen across the reference pages. */}
      <div className="mt-2 flex items-center px-4 sm:mt-3 sm:px-10" aria-hidden="true">
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
