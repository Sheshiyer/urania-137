import { useId } from 'react'
import type { ReadingCaptureObservation } from '../../../lib/readings'

export function ChakraSpectrum({ observations }: { observations: ReadingCaptureObservation[] }) {
  if (observations.length === 0) return null
  const titleId = `chakra-spectrum-${useId().replace(/:/g, '')}`
  return (
    <section aria-labelledby={titleId}>
      <h4 id={titleId} className="font-serif text-sm text-parchment">Chakra spectrum</h4>
      <div className="mt-2 space-y-2" aria-hidden="true">
        {observations.map((item) => (
          <div key={item.id} className="grid grid-cols-[minmax(8rem,1fr)_2fr] items-center gap-3">
            <span className="text-xs text-metadata">{item.label}</span>
            <span className="border-l-2 border-violetglow/35 bg-violetglow/5 p-2 text-xs text-parchment">{item.value}</span>
          </div>
        ))}
      </div>
      <table className="mt-3 w-full text-left text-xs">
        <caption className="sr-only">Persisted chakra observations</caption>
        <tbody>{observations.map((item) => <tr key={item.id}><th scope="row">{item.label}</th><td>{item.value}</td><td>{item.sourcePath}</td></tr>)}</tbody>
      </table>
    </section>
  )
}
