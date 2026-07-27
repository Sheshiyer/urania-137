import type { ReadingFactGridElement, ReadingSequenceElement } from '../../../lib/readings'
import { ElementFrame } from '../elements/ElementFrame'

export function DoshaClock({
  element,
}: {
  element: ReadingFactGridElement | ReadingSequenceElement
}) {
  const isWindow = element.kind === 'fact-grid'
  return (
    <ElementFrame
      element={element}
      encoding="Only the current supplied window or explicit upcoming transitions are positioned; no missing periods are interpolated."
    >
      <div data-engine-artifact="dosha-clock">
        <h4 className="font-serif text-sm text-reading-ink">
          {isWindow ? 'Current source window' : 'Explicit source transitions'}
        </h4>
        {isWindow ? (
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {element.facts.map((fact) => (
              <div key={fact.id} className="border border-gold/15 p-3">
                <dt className="text-[9px] uppercase tracking-[0.12em] text-reading-muted">{fact.label}</dt>
                <dd className="mt-1 text-sm text-reading-ink">{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <table className="mt-3 w-full text-left text-xs">
            <caption className="sr-only">Explicit Vedic clock transitions</caption>
            <thead><tr><th scope="col">Time</th><th scope="col">Transition</th></tr></thead>
            <tbody>
              {element.steps.map((step) => <tr key={step.id}><th scope="row">{step.label}</th><td>{step.value}</td></tr>)}
            </tbody>
          </table>
        )}
      </div>
    </ElementFrame>
  )
}
