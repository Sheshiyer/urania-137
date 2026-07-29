import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { SELEMENE_NODES } from '../../data/selemeneNodes'
import { Route, navigate } from '../../hooks/useHashRoute'
import type { User } from '../../lib/api/contract'
import { IdentityChip } from './IdentityChip'

/**
 * The compact global product routes. Folio has one canonical destination;
 * Begin opens the stable conversation route and its real doorway index.
 */
export function TopNav({
  route,
  me,
  operator,
}: {
  route: Route
  me: User | null
  operator: boolean
}) {
  const activeId = route.view === 'node' ? route.nodeId : null
  const [mobileOpen, setMobileOpen] = useState(false)

  const items: { key: string; label: string; onClick: () => void; active?: boolean }[] = [
    { key: 'map', label: 'Map', onClick: () => navigate('/'), active: route.view === 'home' },
    { key: 'folio', label: 'Folio', onClick: () => navigate('/readings'), active: route.view === 'readings' },
    { key: 'begin', label: 'Begin', onClick: () => navigate('/chat'), active: route.view === 'chat' },
    { key: 'settings', label: 'Settings', onClick: () => navigate('/settings'), active: route.view === 'settings' },
  ]
  if (operator) {
    items.push({
      key: 'operator',
      label: 'Operator',
      onClick: () => navigate('/node/engine/live-status'),
      active:
        route.view === 'node' &&
        route.nodeId === 'engine' &&
        route.childId === 'live-status',
    })
  }
  const mobileEntries = items

  const invokeMobile = (action: () => void) => {
    setMobileOpen(false)
    action()
  }

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-gold/10 bg-void">
      <div className="flex min-h-[4.75rem] items-center justify-between gap-3 px-5 sm:px-10">
        {/* Two-tier wordmark lockup (the moodboard header): URANIA 137 over NOESIS */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="group flex min-h-11 min-w-11 shrink-0 flex-col items-start justify-center text-left"
          aria-label="Urania 137 — home"
        >
          <span className="font-serif text-xs font-semibold uppercase tracking-[0.16em] text-parchment transition-colors group-hover:text-gold sm:text-base sm:tracking-[0.24em]">
            Urania <span className="text-gold">137</span>
          </span>
          <span className="mt-0.5 font-display text-[7px] uppercase tracking-[0.38em] text-gold transition-colors sm:text-[8px] sm:tracking-[0.5em]">
            Noesis
          </span>
        </button>

        {/* Nav + search + identity */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
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
                  className={`relative min-h-11 min-w-11 font-display text-[10px] uppercase tracking-[0.18em] transition-colors ${
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
          <div className="hidden xl:block">
            <NodeSearch activeId={activeId} />
          </div>
          <IdentityChip me={me} />
          {mobileOpen ? (
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center text-silver transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold md:hidden"
              aria-label="Close navigation menu"
              aria-expanded="true"
              aria-controls="mobile-product-navigation"
              onClick={() => setMobileOpen(false)}
            >
              <span className="font-serif text-2xl font-light leading-none" aria-hidden="true">×</span>
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center text-silver transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold md:hidden"
              aria-label="Open navigation menu"
              aria-expanded="false"
              aria-controls="mobile-product-navigation"
              onClick={() => setMobileOpen(true)}
            >
              <span className="flex w-5 flex-col gap-1" aria-hidden="true">
                <span className="h-px w-full bg-current" />
                <span className="h-px w-full bg-current" />
                <span className="h-px w-full bg-current" />
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Gold hairline ruling the bar off from the field, with a center diamond
          and end caps — the rule seen across the reference pages. */}
      <div className="flex items-center px-5 sm:px-10" aria-hidden="true">
        <span className="h-1 w-1 rotate-45 border border-gold/50" />
        <span className="h-px flex-1 bg-gradient-to-r from-gold/40 via-gold/15 to-gold/15" />
        <span className="mx-2 h-1.5 w-1.5 rotate-45 border border-gold/70" />
        <span className="h-px flex-1 bg-gradient-to-l from-gold/40 via-gold/15 to-gold/15" />
        <span className="h-1 w-1 rotate-45 border border-gold/50" />
      </div>

      {mobileOpen && (
        <nav
          id="mobile-product-navigation"
          className="grid gap-px border-t border-gold/15 bg-gold/15 px-5 py-px md:hidden"
          aria-label="Product sections"
        >
          {mobileEntries.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => invokeMobile(entry.onClick)}
              aria-current={entry.active ? 'page' : undefined}
              className={`flex min-h-11 items-center justify-between bg-void/95 px-3 text-left font-display text-[10px] uppercase tracking-[0.2em] transition-colors ${
                entry.active
                  ? 'text-gold'
                  : 'text-silver hover:bg-surface hover:text-parchment'
              }`}
            >
              {entry.label}
              <span
                className={`h-1.5 w-1.5 rotate-45 border ${
                  entry.active ? 'border-gold bg-gold' : 'border-gold/45'
                }`}
                aria-hidden="true"
              />
            </button>
          ))}
          {me && (
            <a
              href="/api/logout"
              className="flex min-h-11 items-center justify-between bg-void/95 px-3 font-display text-[10px] uppercase tracking-[0.2em] text-silver transition-colors hover:bg-surface hover:text-gold"
            >
              Log out
              <span className="truncate pl-4 text-[9px] text-secondary">
                {me.email}
              </span>
            </a>
          )}
        </nav>
      )}
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
          className="min-h-11 min-w-11 w-24 bg-transparent font-display text-[11px] uppercase tracking-[0.14em] text-parchment placeholder:text-silver/50 focus:outline-none sm:w-32"
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
