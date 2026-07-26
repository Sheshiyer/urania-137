import type { ReadingSequenceElement } from '../../../lib/readings'
import { ElementFrame } from '../elements/ElementFrame'

const POSITION = ['top', 'right', 'bottom', 'left'] as const

export function ActivationCross({ element }: { element: ReadingSequenceElement }) {
  const complete = element.steps.length === 4
  return (
    <ElementFrame
      element={element}
      encoding="The four supplied activation positions form a cross without adding connections, rank, or interpretation."
    >
      <div data-engine-artifact="activation-cross">
        {complete ? (
          <div
            className="mx-auto grid max-w-sm grid-cols-3 grid-rows-3 gap-2"
            data-activation-geometry="four-source-positions"
            aria-hidden="true"
          >
            {element.steps.map((step, index) => {
              const placement = ['col-start-2 row-start-1', 'col-start-3 row-start-2', 'col-start-2 row-start-3', 'col-start-1 row-start-2'][index]
              return (
                <div
                  key={step.id}
                  className={`${placement} grid min-h-20 place-items-center border border-gold/25 bg-gold/5 p-2 text-center`}
                  data-activation-position={POSITION[index]}
                >
                  <span className="text-[10px] text-reading-muted">{step.label}</span>
                  <span className="font-serif text-sm text-reading-ink">{step.value}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="border border-amber-300/25 p-3 text-xs text-amber-100/80">
            Four source positions are required before cross geometry is shown.
          </p>
        )}
        <ol className="mt-4 space-y-2 text-xs text-reading-ink">
          {element.steps.map((step) => (
            <li key={step.id}>
              <span className="text-reading-muted">{step.label}:</span> {step.value ?? 'Not supplied'}
            </li>
          ))}
        </ol>
      </div>
    </ElementFrame>
  )
}
