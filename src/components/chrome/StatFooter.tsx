export interface Stat {
  label: string
  value: string
}

/**
 * The console stat strip from the reference pages (NODES / CONNECTIONS / PATHS /
 * FREQUENCY on home; SUB-NODES / ACTIVE PATHS / RESONANCE on a node page).
 * Presentational console dressing — not report data.
 *
 * The architecture moodboard sets the stats as open cells directly on the
 * field — no containing pill — with hairline dividers, engraved serif values,
 * and small-caps silver labels. Renders at the lower left via BottomChrome.
 */
export function StatFooter({ stats }: { stats: Stat[] }) {
  return (
    <dl className="pointer-events-auto flex max-w-full items-stretch divide-x divide-gold/20 border-y border-gold/15 bg-void/85">
      {stats.map((s) => (
        <div key={s.label} className="flex min-w-0 flex-col items-center px-3 py-2 sm:px-7 sm:py-2.5">
          <dt className="order-2 mt-1 truncate font-display text-xs uppercase tracking-[0.12em] text-metadata sm:tracking-[0.26em]">{s.label}</dt>
          <dd className="order-1 font-serif text-sm leading-none tracking-[0.06em] text-parchment sm:text-xl">{s.value}</dd>
        </div>
      ))}
    </dl>
  )
}
