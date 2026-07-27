import type { ReadingMoment } from '../../lib/readings'

export function TimingSpine({ moments }: { moments: ReadingMoment[] }) {
  if (moments.length === 0) return null
  return (
    <section className="console-card p-4" aria-labelledby="reading-timing-title">
      <p className="console-eyebrow">Timing spine</p>
      <h2 id="reading-timing-title" className="mt-1 font-serif text-sm uppercase tracking-[0.16em] text-parchment">
        Sequence recorded by the reading
      </h2>
      <ol className="relative mt-4 space-y-4 border-l border-gold/25 pl-5">
        {moments.map((moment) => (
          <li key={moment.id} className="relative">
            <span className="absolute -left-[1.52rem] top-1 h-2 w-2 rounded-full border border-gold bg-void" aria-hidden="true" />
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-xs text-parchment/90">{moment.label}</h3>
              <span className="text-xs uppercase tracking-[0.16em] text-gold/55">{moment.status}</span>
            </div>
            {moment.detail && <p className="mt-1 text-[11px] leading-relaxed text-silver/70">{moment.detail}</p>}
          </li>
        ))}
      </ol>
    </section>
  )
}
