import type { ReadingSpreadElement } from '../../../lib/readings'
import { ElementFrame } from '../elements/ElementFrame'

export function HexagramTransition({ element }: { element: ReadingSpreadElement }) {
  const primary = element.positions.find(({ label }) => label === 'Primary hexagram')
  const relating = element.positions.find(({ label }) => label === 'Relating hexagram')
  const changing = element.positions.filter(({ label }) => label.startsWith('Changing line '))
  const complete = Boolean(primary && relating)
  return (
    <ElementFrame
      element={element}
      encoding="Primary and relating hexagrams are connected only when both are supplied; changing lines retain source order."
    >
      <div data-engine-artifact="hexagram-transition">
        {complete ? (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3" aria-hidden="true">
            <div className="border border-gold/25 p-3 text-center text-sm text-reading-ink">{primary?.value}</div>
            <div className="text-reading-muted">→</div>
            <div className="border border-gold/25 p-3 text-center text-sm text-reading-ink">{relating?.value}</div>
          </div>
        ) : (
          <p className="border border-amber-300/25 p-3 text-xs text-amber-100/80">
            Primary and relating hexagrams are both required for transition geometry.
          </p>
        )}
        <table className="mt-4 w-full text-left text-xs">
          <caption className="sr-only">I Ching transition and changing lines</caption>
          <thead><tr><th scope="col">Source position</th><th scope="col">Value</th></tr></thead>
          <tbody>
            {[...(primary ? [primary] : []), ...changing, ...(relating ? [relating] : [])].map((position) => (
              <tr key={position.id}><th scope="row">{position.label}</th><td>{position.value}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </ElementFrame>
  )
}
