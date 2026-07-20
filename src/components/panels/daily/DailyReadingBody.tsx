import { DailyReading } from '../../../lib/daily/source'

/**
 * The layered reading body (T-053) — the four base movements always, the native
 * overlay (visually distinguished) only when present. Prose, never a JSON block.
 */
export function DailyReadingBody({ reading }: { reading: DailyReading }) {
  return (
    <div className="space-y-5">
      {reading.passes.map((p) => (
        <section
          key={p.id}
          className={p.id === 'native' ? 'rounded-xl border border-gold/25 bg-gold/[0.06] p-4' : ''}
        >
          <h3 className="font-display text-[11px] uppercase tracking-[0.22em] text-gold">{p.title}</h3>
          <p className="mt-2 leading-relaxed text-parchment/90">{p.output}</p>
        </section>
      ))}
      <p className="pt-1 text-[10px] uppercase tracking-[0.2em] text-silver/45">
        {reading.meta.source} · {reading.engines_used.join(' + ')}
      </p>
    </div>
  )
}
