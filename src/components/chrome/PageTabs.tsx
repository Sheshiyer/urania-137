const TABS = ['Overview', 'Nodes', 'Paths', 'Relations', 'Insights'] as const

/**
 * The OVERVIEW / NODES / PATHS / RELATIONS / INSIGHTS tab strip on the reference
 * parent pages. Presentational for this pass — OVERVIEW is the live view; the
 * rest echo the reference chrome.
 *
 * Positioning is the page's job: it renders inside `BottomChrome`, stacked above
 * the stat strip, so the two can't overlap each other.
 */
export function PageTabs() {
  return (
    <nav className="hidden items-center gap-7 px-6 sm:flex" aria-label="Node views">
      {TABS.map((t, i) => (
        <span
          key={t}
          className={[
            'font-display text-[10px] uppercase tracking-[0.24em]',
            i === 0 ? 'text-gold' : 'text-silver/50',
          ].join(' ')}
        >
          {t}
          {i === 0 && <span className="mx-auto mt-1.5 block h-px w-6 bg-gold/70" aria-hidden="true" />}
        </span>
      ))}
    </nav>
  )
}
