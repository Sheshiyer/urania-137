import type { ReadingSequenceElement } from '../../../lib/readings'
import { ElementFrame } from '../elements/ElementFrame'

export function NestedPeriodSpiral({ element }: { element: ReadingSequenceElement }) {
  const canonical = element.steps.every((step) => step.start && step.end)
  return (
    <ElementFrame
      element={element}
      encoding="Explicit period nesting is shown in source order; the canonical start and end boundaries remain printed."
    >
      <div data-engine-artifact="nested-period-spiral">
        {canonical ? (
          <div className="space-y-2" aria-hidden="true">
            {element.steps.map((step, index) => (
              <div
                key={step.id}
                className="border-l-2 border-gold/35 bg-gold/5 p-3"
                data-period-depth={index}
                style={{ marginInlineStart: `${Math.min(index, 5) * 1.25}rem` }}
              >
                <p className="font-serif text-sm text-reading-ink">
                  {step.label}{step.value ? ` · ${step.value}` : ''}
                </p>
                <p className="text-[10px] text-reading-muted">{step.start} → {step.end}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="border border-amber-300/25 p-3 text-xs text-amber-100/80">
            Explicit start and end boundaries are required for the nested period view.
          </p>
        )}
        <table className="mt-4 w-full text-left text-xs">
          <caption className="sr-only">Canonical Vimshottari timeline</caption>
          <thead><tr><th scope="col">Period</th><th scope="col">Planet / value</th><th scope="col">Start</th><th scope="col">End</th></tr></thead>
          <tbody>
            {element.steps.map((step) => (
              <tr key={step.id}><th scope="row">{step.label}</th><td>{step.value ?? 'Not supplied'}</td><td>{step.start ?? 'Not supplied'}</td><td>{step.end ?? 'Not supplied'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </ElementFrame>
  )
}
