import type { ReadingPositionsElement } from '../../../lib/readings'
import { ElementFrame } from './ElementFrame'

function degree(value: number | undefined): string {
  return value === undefined ? '—' : `${value.toFixed(2)}°`
}

export function ReadingPositions({ element }: { element: ReadingPositionsElement }) {
  return (
    <ElementFrame element={element}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left text-[11px]">
          <caption className="sr-only">{element.title}: source positions and retrograde state</caption>
          <thead className="border-b border-gold/20 font-display text-[9px] uppercase tracking-[0.16em] text-gold/65">
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
