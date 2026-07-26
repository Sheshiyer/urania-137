import type { ReadingFactGridElement } from '../../../lib/readings'
import { ElementFrame } from '../elements/ElementFrame'

export function FiveLimbMandala({ element }: { element: ReadingFactGridElement }) {
  const limbs = element.facts.slice(0, 5)
  const complete = limbs.length === 5
  return (
    <ElementFrame
      element={element}
      encoding="Five supplied limb memberships occupy five equal placements; no transition or rank is inferred."
    >
      <div data-engine-artifact="five-limb-mandala">
        {complete ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-hidden="true">
            {limbs.map((limb, index) => (
              <div
                key={limb.id}
                className="grid min-h-24 place-items-center border border-gold/25 bg-gold/5 p-3 text-center"
                data-limb={index + 1}
              >
                <span className="font-serif text-sm text-reading-ink">{limb.label}</span>
                <span className="mt-1 block text-xs text-reading-muted">{limb.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="border border-amber-300/25 p-3 text-xs text-amber-100/80">
            Five source limbs are required; the available values remain in the table.
          </p>
        )}
        <table className="mt-4 w-full text-left text-xs">
          <caption className="sr-only">Five Panchanga limb values</caption>
          <thead><tr><th scope="col">Limb</th><th scope="col">Source value</th></tr></thead>
          <tbody>
            {limbs.map((limb) => <tr key={limb.id}><th scope="row">{limb.label}</th><td>{limb.value}</td></tr>)}
          </tbody>
        </table>
      </div>
    </ElementFrame>
  )
}
