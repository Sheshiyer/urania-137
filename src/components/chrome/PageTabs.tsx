const TABS = ['Overview', 'Nodes', 'Paths', 'Relations', 'Insights'] as const

/**
 * The OVERVIEW / NODES / PATHS / RELATIONS / INSIGHTS tab strip on the reference
 * parent pages. Presentational for this pass — OVERVIEW is the live view; the
 * rest echo the reference chrome.
 */
export function PageTabs() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[74px] z-20 hidden justify-center sm:flex">
      <nav className="flex items-center gap-7 border-t border-gold/10 px-6 pt-3" aria-label="Node views">
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
    </div>
  )
}
