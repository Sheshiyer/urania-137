import type { ReadingNumberCodesElement } from '../../../lib/readings'
import { ElementFrame } from './ElementFrame'

export function ReadingNumberCodes({ element }: { element: ReadingNumberCodesElement }) {
  return (
    <ElementFrame element={element} encoding="The large numeral is the computed code; the smaller trail preserves its source reduction.">
      <ol
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 11rem), 1fr))' }}
      >
        {element.codes.map((code) => (
          <li key={code.id} className="border border-gold/15 bg-void/45 p-3">
            <div className="flex items-start justify-between gap-3">
              <span className="font-display text-[9px] uppercase tracking-[0.16em] text-gold/65">{code.label}</span>
              {code.isMaster && <span className="text-[8px] uppercase tracking-[0.14em] text-violetglow">Master source value</span>}
            </div>
            <p className="mt-2 font-serif text-3xl tabular-nums text-parchment">{code.value}</p>
            {code.reduction.length > 0 && (
              <p className="mt-1 font-mono text-[10px] tabular-nums text-silver/60" aria-label={`Reduction ${code.reduction.join(' to ')}`}>
                {code.reduction.join(' → ')}
              </p>
            )}
            {code.detail && <p className="mt-3 text-pretty text-[11px] leading-relaxed text-silver/75">{code.detail}</p>}
          </li>
        ))}
      </ol>
    </ElementFrame>
  )
}
