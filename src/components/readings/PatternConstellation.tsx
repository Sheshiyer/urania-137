import type { ReadingPattern } from '../../lib/readings'

/**
 * Pattern density is explicit: ring count reflects independent source count.
 * Retrieval-derived patterns carry a visible "synthesis memory" label.
 */
export function PatternConstellation({ patterns }: { patterns: ReadingPattern[] }) {
  if (patterns.length === 0) return null
  return (
    <section className="console-card p-4" aria-labelledby="reading-patterns-title">
      <p className="console-eyebrow">Pattern constellation</p>
      <h2 id="reading-patterns-title" className="mt-1 font-serif text-sm uppercase tracking-[0.16em] text-parchment">
        Convergences across sources
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {patterns.map((pattern) => (
          <li key={pattern.id} className="flex items-center gap-3 border border-gold/10 bg-void/35 p-3">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/40 text-xs text-gold"
              style={{ boxShadow: `0 0 0 ${Math.min(pattern.sourceCount, 4) * 2}px rgb(197 160 23 / 0.08)` }}
              aria-label={`${pattern.sourceCount} supporting sources`}
            >
              {pattern.sourceCount}
            </span>
            <span>
              <span className="block text-xs text-parchment/90">{pattern.label}</span>
              {pattern.detail && <span className="mt-0.5 block text-xs leading-relaxed text-silver/70">{pattern.detail}</span>}
              <span className="mt-1 block text-xs uppercase tracking-[0.16em] text-gold/55">
                {pattern.kind === 'retrieval' ? 'Synthesis memory · not a chart fact' : 'Within this reading'}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
