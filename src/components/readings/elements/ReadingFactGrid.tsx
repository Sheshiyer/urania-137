import type { ReadingFactGridElement } from '../../../lib/readings'
import { ElementFrame } from './ElementFrame'

export function ReadingFactGrid({ element }: { element: ReadingFactGridElement }) {
  return (
    <ElementFrame
      element={element}
      encoding={element.layout === 'limbs' ? 'Five equal cells name the five limbs returned by the panchanga source.' : undefined}
    >
      <dl
        className="grid gap-px overflow-hidden border border-gold/15 bg-gold/15"
        style={{
          gridTemplateColumns:
            element.layout === 'limbs'
              ? 'repeat(auto-fit, minmax(min(100%, 7.5rem), 1fr))'
              : 'repeat(auto-fit, minmax(min(100%, 11rem), 1fr))',
        }}
      >
        {element.facts.map((item) => (
          <div key={item.id} className="min-w-0 bg-void/90 p-3">
            <dt className="font-display text-[9px] uppercase tracking-[0.18em] text-gold/65">{item.label}</dt>
            <dd className="mt-1 text-pretty text-sm text-parchment/90">{item.value}</dd>
            {item.detail && <dd className="mt-1 text-[9px] leading-relaxed text-silver/55">{item.detail}</dd>}
          </div>
        ))}
      </dl>
    </ElementFrame>
  )
}
