export interface Stat {
  label: string
  value: string
}

/**
 * The console stat strip from the reference pages (NODES / CONNECTIONS / PATHS /
 * FREQUENCY on home; SUB-NODES / ACTIVE PATHS / RESONANCE on a node page).
 * Presentational console dressing — not report data.
 *
 * Positioning is the page's job: it renders inside `BottomChrome` so the strip
 * and the tab rail stack instead of colliding.
 */
export function StatFooter({ stats }: { stats: Stat[] }) {
  return (
    <dl className="flex max-w-full items-stretch divide-x divide-gold/15 rounded-2xl border border-gold/15 bg-void/45 px-1 backdrop-blur-sm sm:px-2">
      {stats.map((s) => (
        <div key={s.label} className="flex min-w-0 flex-col items-center px-2.5 py-2 sm:px-8 sm:py-2.5">
          <dt className="order-2 mt-1 truncate font-display text-[8px] uppercase tracking-[0.12em] text-silver/70 sm:text-[9px] sm:tracking-[0.24em]">{s.label}</dt>
          <dd className="order-1 font-serif text-sm leading-none tracking-[0.06em] text-parchment sm:text-xl">{s.value}</dd>
        </div>
      ))}
    </dl>
  )
}
