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
        <h4 className="font-serif text-sm text-parchment">
          {isWindow ? 'Current source window' : 'Explicit source transitions'}
        </h4>
        {isWindow ? (
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {element.facts.map((fact) => (
              <div key={fact.id} className="border border-gold/15 p-3">
                <dt className="text-xs uppercase tracking-[0.12em] text-metadata">{fact.label}</dt>
                <dd className="mt-1 text-sm text-parchment/90">{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <table className="mt-3 w-full border-collapse text-left text-xs text-parchment/85">
            <caption className="sr-only">Explicit Vedic clock transitions</caption>
            <thead className="text-xs uppercase tracking-[0.12em] text-metadata">
              <tr><th scope="col" className="border-b border-gold/15 py-2 pr-3">Time</th><th scope="col" className="border-b border-gold/15 py-2">Transition</th></tr>
            </thead>
            <tbody>
              {element.steps.map((step) => (
                <tr key={step.id}>
                  <th scope="row" className="border-b border-gold/10 py-2 pr-3 font-mono text-gold/80">{step.label}</th>
                  <td className="border-b border-gold/10 py-2">{step.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ElementFrame>
  )
}
