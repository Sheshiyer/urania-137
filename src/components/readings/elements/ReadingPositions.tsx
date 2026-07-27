import type { ReadingPositionsElement } from '../../../lib/readings'
import { ElementFrame } from './ElementFrame'

function degree(value: number | undefined): string {
  return value === undefined ? '—' : `${value.toFixed(2)}°`
}

export function ReadingPositions({ element }: { element: ReadingPositionsElement }) {
  return (
    <ElementFrame element={element}>
      <div className="grid gap-2 sm:hidden">
        {element.positions.map((position) => (
          <section
            key={position.id}
            className="min-w-0 border border-gold/15 bg-void/80 p-3"
            aria-label={`${position.label} source position`}
          >
            <h4 className="[overflow-wrap:anywhere] font-serif text-sm text-parchment">
              {position.label}
            </h4>
            <dl className="mt-3 grid min-w-0 grid-cols-2 gap-x-3 gap-y-2 text-xs">
              {[
                ['Sign', position.sign ?? '—'],
                ['Degree', degree(position.degree)],
                ['Longitude', degree(position.longitude)],
                ['Motion', position.isRetrograde === undefined ? 'Not supplied' : position.isRetrograde ? 'Retrograde' : 'Direct'],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0 border-l border-gold/20 pl-2">
                  <dt className="[overflow-wrap:anywhere] font-display uppercase tracking-[0.08em] text-gold/80">{label}</dt>
                  <dd className="mt-1 [overflow-wrap:anywhere] text-parchment/85">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <div
        className="hidden min-w-0 max-w-full overflow-x-auto sm:block"
        role="region"
        aria-label={`${element.title} position table`}
        tabIndex={0}
      >
        <table className="w-full min-w-[34rem] border-collapse text-left text-[11px]">
          <caption className="sr-only">{element.title}: source positions and retrograde state</caption>
          <thead className="border-b border-gold/20 font-display text-xs uppercase tracking-[0.16em] text-gold/80">
            <tr>
              <th scope="col" className="px-2 py-2 font-normal">Point</th>
              <th scope="col" className="px-2 py-2 font-normal">Sign</th>
              <th scope="col" className="px-2 py-2 font-normal">Degree</th>
              <th scope="col" className="px-2 py-2 font-normal">Longitude</th>
              <th scope="col" className="px-2 py-2 font-normal">Motion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold/10 text-parchment/85">
            {element.positions.map((position) => (
              <tr key={position.id}>
                <th scope="row" className="px-2 py-2.5 font-medium text-parchment">{position.label}</th>
                <td className="px-2 py-2.5">{position.sign ?? '—'}</td>
                <td className="px-2 py-2.5 tabular-nums">{degree(position.degree)}</td>
                <td className="px-2 py-2.5 tabular-nums">{degree(position.longitude)}</td>
                <td className="px-2 py-2.5">{position.isRetrograde === undefined ? 'Not supplied' : position.isRetrograde ? 'Retrograde' : 'Direct'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ElementFrame>
  )
}
