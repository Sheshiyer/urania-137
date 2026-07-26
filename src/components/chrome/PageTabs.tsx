const TABS = ['Overview', 'Nodes', 'Paths', 'Relations', 'Insights'] as const

/**
 * The OVERVIEW / NODES / PATHS / RELATIONS / INSIGHTS tab strip on the reference
 * parent pages. Presentational for this pass — OVERVIEW is the live view; the
 * rest echo the reference chrome.
 *
 * The architecture moodboard parks the tabs at the lower RIGHT, diamond-
 * separated, the live tab in gold with a diamond marker. BottomChrome pins it
 * there; it hides below sm, as before.
 */
export function PageTabs() {
  return (
    <nav className="pointer-events-auto hidden items-center gap-4 px-2 sm:flex" aria-label="Node views">
      {TABS.map((t, i) => (
        <span key={t} className="flex items-center gap-4">
          {i > 0 && <span className="h-1 w-1 rotate-45 border border-gold/30" aria-hidden="true" />}
          <span
            className={[
              'relative font-display text-[10px] uppercase tracking-[0.24em]',
              i === 0 ? 'text-gold' : 'text-silver/50',
            ].join(' ')}
          >
            {t}
            {i === 0 && <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rotate-45 bg-gold" aria-hidden="true" />}
          </span>
        </span>
      ))}
    </nav>
  )
}
