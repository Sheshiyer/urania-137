import { useId } from 'react'
import type { ReadingCaptureObservation } from '../../../lib/readings'

export function MetricField({ observations }: { observations: ReadingCaptureObservation[] }) {
  if (observations.length === 0) return null
  const titleId = `capture-metric-field-${useId().replace(/:/g, '')}`
  return (
    <section aria-labelledby={titleId}>
      <h4 id={titleId} className="font-serif text-sm text-reading-ink">Metric field</h4>
      <table className="mt-2 w-full text-left text-xs">
        <caption className="sr-only">Persisted capture metrics</caption>
        <thead><tr><th scope="col">Metric</th><th scope="col">Value</th><th scope="col">Source</th></tr></thead>
        <tbody>
          {observations.map((item) => (
            <tr key={item.id}><th scope="row">{item.label}</th><td>{item.value}</td><td className="break-all">{item.sourcePath}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
