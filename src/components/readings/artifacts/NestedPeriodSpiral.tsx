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
                <p className="font-serif text-sm text-parchment">
                  {step.label}{step.value ? ` · ${step.value}` : ''}
                </p>
                <p className="text-xs text-metadata">{step.start} → {step.end}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="border border-amber-300/25 p-3 text-xs text-amber-100/80">
            Explicit start and end boundaries are required for the nested period view.
          </p>
        )}
        <table className="mt-4 w-full table-fixed text-left text-xs">
          <caption className="sr-only">Canonical Vimshottari timeline</caption>
          <thead>
            <tr>
              {['Period', 'Planet / value', 'Start', 'End'].map((label) => (
                <th key={label} scope="col" className="px-1.5 py-2 align-top [overflow-wrap:anywhere]">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {element.steps.map((step) => (
              <tr key={step.id}>
                <th scope="row" className="px-1.5 py-2 align-top [overflow-wrap:anywhere]">{step.label}</th>
                <td className="px-1.5 py-2 align-top [overflow-wrap:anywhere]">{step.value ?? 'Not supplied'}</td>
                <td className="px-1.5 py-2 align-top [overflow-wrap:anywhere]">{step.start ?? 'Not supplied'}</td>
                <td className="px-1.5 py-2 align-top [overflow-wrap:anywhere]">{step.end ?? 'Not supplied'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ElementFrame>
  )
}
