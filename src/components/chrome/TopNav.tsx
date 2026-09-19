import { useCallback, useEffect, useRef, useState } from 'react'
import { Route, navigate } from '../../hooks/useHashRoute'
import type { User } from '../../lib/api/contract'
import { MOTION } from '../../styles/tokens'
import { IdentityChip } from './IdentityChip'

/**
 * The capsule masthead — a floating centred bar that narrows on scroll.
 * Replaces the old flat TopNav while keeping every contract string intact.
 *
 * Scroll-shrink: CSS scroll-timeline drives the animation natively where
 * supported; useScrollShrink toggles `.is-shrunk` as the JS fallback,
 * reading scroll position from `[data-route-field]`.
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const capsuleRef = useRef<HTMLDivElement>(null)

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

  // JS scroll-shrink fallback: toggle .is-shrunk based on route field scroll
  useEffect(() => {
    const capsule = capsuleRef.current
    if (!capsule) return
    // If browser supports CSS scroll-timeline, use that instead
    if (CSS.supports?.('animation-timeline', 'scroll()')) {
      capsule.setAttribute('data-scroll-timeline', 'native')
      return
    }
    const scroller = document.querySelector('[data-route-field]') as HTMLElement | null
    if (!scroller) return
    const threshold = MOTION.mastheadShrinkPx
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const shrunk = scroller.scrollTop > threshold
        capsule.classList.toggle('is-shrunk', shrunk)
        ticking = false
      })
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [])

  // Global Cmd+K / Ctrl+K handler
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const openPalette = useCallback(() => setPaletteOpen(true), [])

  return (
    <>
      <header className="sticky top-0 z-40 shrink-0 flex justify-center px-3 pt-3 sm:px-5 sm:pt-4">
        <div
          ref={capsuleRef}
          className="masthead-capsule flex min-h-[3.5rem] w-full items-center justify-between gap-2 rounded-pill border border-gold/20 bg-surface/80 px-4 shadow-capsule backdrop-blur-md sm:gap-4 sm:px-6"
        >
          {/* Two-tier wordmark lockup */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="group flex min-h-11 min-w-11 shrink-0 flex-col items-start justify-center text-left"
            aria-label="Urania 137 — home"
          >
            <span className="font-serif text-xs font-semibold uppercase tracking-[0.16em] text-parchment transition-colors group-hover:text-gold sm:text-sm sm:tracking-[0.24em]">
              Urania <span className="text-gold">137</span>
            </span>
            <span className="mt-0.5 font-display text-[7px] uppercase tracking-[0.38em] text-gold transition-colors sm:text-[8px] sm:tracking-[0.5em]">
              Noesis
            </span>
          </button>

          {/* Centre nav */}
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

          {/* Utility segment: palette hint, identity, hamburger */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={openPalette}
              className="hidden items-center gap-1.5 rounded-pill border border-gold/15 px-2.5 py-1 text-meta text-silver transition-colors hover:border-gold/40 hover:text-parchment sm:flex"
              aria-label="Search stellar nodes"
            >
              <span aria-hidden="true">/</span>
              <kbd className="font-mono text-meta text-metadata">
                {navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}K
              </kbd>
            </button>
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
                <span className="font-serif text-2xl font-light leading-none" aria-hidden="true">x</span>
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
      </header>

      {mobileOpen && (
        <nav
          id="mobile-product-navigation"
          className="sticky top-[4.5rem] z-40 grid gap-px border-t border-gold/15 bg-gold/15 px-3 py-px md:hidden"
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
              Leave the field
              <span className="truncate pl-4 text-[9px] text-secondary">
                {me.email}
              </span>
            </a>
          )}
        </nav>
      )}

      {paletteOpen && <CommandPalettePortal onClose={() => setPaletteOpen(false)} />}
    </>
  )
}

/**
 * Lazy-loads the CommandPalette into its own chunk. The palette UI is rare
 * (user must press Cmd+K) so it stays out of the entry bundle.
 */
import { lazy, Suspense } from 'react'
const LazyCommandPalette = lazy(() =>
  import('./CommandPalette').then((m) => ({ default: m.CommandPalette })),
)

function CommandPalettePortal({ onClose }: { onClose: () => void }) {
  return (
    <Suspense fallback={null}>
      <LazyCommandPalette open onClose={onClose} />
    </Suspense>
  )
}
