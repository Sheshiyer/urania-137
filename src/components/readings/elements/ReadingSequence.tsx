import type { ReadingSequenceElement } from '../../../lib/readings'
import { ElementFrame } from './ElementFrame'

function range(start?: string, end?: string, at?: string): string | null {
  if (at) return at
  if (start || end) return `${start ?? 'Start not supplied'} → ${end ?? 'End not supplied'}`
  return null
}

export function ReadingSequence({ element }: { element: ReadingSequenceElement }) {
  return (
    <ElementFrame
      element={element}
      encoding={element.sequenceType === 'temporal' ? 'Vertical order follows the explicit source sequence; dates are printed beside each step.' : 'Vertical order follows the named source sequence.'}
    >
      <ol className="relative space-y-4 border-l border-gold/25 pl-5">
        {element.steps.map((step, index) => {
          const time = range(step.start, step.end, step.at)
          return (
            <li key={step.id} className="relative">
              <span className="absolute -left-[1.54rem] top-1 grid h-3 w-3 place-items-center rounded-full border border-gold bg-void text-[7px] text-gold" aria-hidden="true">
                {index + 1}
              </span>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h4 className="text-xs text-parchment/90">{step.label}</h4>
                {step.value && <span className="font-serif text-sm text-gold">{step.value}</span>}
                {step.status && <span className="text-xs uppercase tracking-[0.14em] text-silver/60">{step.status}</span>}
              </div>
              {time && <p className="mt-1 break-words font-mono text-xs tabular-nums text-silver/55">{time}</p>}
              {step.detail && <p className="mt-1 text-xs leading-relaxed text-silver/70">{step.detail}</p>}
            </li>
          )
        })}
      </ol>
    </ElementFrame>
  )
}
