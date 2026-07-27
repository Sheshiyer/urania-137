import type { ReadingSpreadElement } from '../../../lib/readings'
import { ElementFrame } from './ElementFrame'

export function ReadingSpread({ element }: { element: ReadingSpreadElement }) {
  return (
    <ElementFrame element={element} encoding="Cards or hexagrams retain the exact position order supplied by the source.">
      <ol
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))' }}
      >
        {element.positions.map((position, index) => (
          <li key={position.id} className="border border-gold/15 bg-void/45 p-3">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-gold/35 font-mono text-xs tabular-nums text-gold">{index + 1}</span>
              <span className="font-display text-xs uppercase tracking-[0.16em] text-gold/80">{position.label}</span>
            </div>
            <p className="mt-3 font-serif text-base text-parchment">{position.value}</p>
            {position.status && (
              <p className="mt-1 font-display text-xs uppercase tracking-[0.16em] text-evidence-copy-witness">
                {position.status}
              </p>
            )}
            {position.detail && <p className="mt-2 text-pretty text-xs leading-relaxed text-silver/70">{position.detail}</p>}
          </li>
        ))}
      </ol>
    </ElementFrame>
  )
}
