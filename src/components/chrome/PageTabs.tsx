const TABS = ['Overview', 'Nodes', 'Paths', 'Relations', 'Insights'] as const

/**
 * The OVERVIEW / NODES / PATHS / RELATIONS / INSIGHTS tab strip on the reference
 * parent pages. OVERVIEW is the live view; the rest are HONEST disabled
 * affordances — real <button disabled> with a "soon" hint, not dead spans.
 * An app shows disabled states; a mockup shows controls that do nothing.
 *
 * The architecture moodboard parks the tabs at the lower RIGHT, diamond-
 * separated, the live tab in gold with a diamond marker. BottomChrome pins it
 * there; it hides below sm, as before.
 */
export function PageTabs() {
  return (
    <nav className="pointer-events-auto hidden items-center gap-4 px-2 sm:flex" aria-label="Node views">
      {TABS.map((t, i) => {
        const live = i === 0
        return (
          <span key={t} className="flex items-center gap-4">
            {i > 0 && <span className="h-1 w-1 rotate-45 border border-gold/30" aria-hidden="true" />}
            <button
              type="button"
              disabled={!live}
              aria-current={live ? 'page' : undefined}
              title={live ? undefined : 'Not yet charted'}
              className={[
                'relative font-display text-[10px] uppercase tracking-[0.24em] transition-colors',
                live ? 'cursor-default text-gold' : 'cursor-not-allowed text-silver/35',
              ].join(' ')}
            >
              {t}
              {live && <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rotate-45 bg-gold" aria-hidden="true" />}
            </button>
          </span>
        )
      })}
    </nav>
  )
}
