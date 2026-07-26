import { useId } from 'react'
import type { ReadingCaptureObservation } from '../../../lib/readings'

export function QualityPanel({
  body,
  observations,
}: {
  body: string
  observations: ReadingCaptureObservation[]
}) {
  const titleId = `capture-quality-${useId().replace(/:/g, '')}`
  return (
    <section className="border border-violetglow/20 p-3" aria-labelledby={titleId}>
      <h4 id={titleId} className="font-serif text-sm text-reading-ink">Consent and quality</h4>
      <p className="mt-2 text-xs leading-relaxed text-reading-muted">{body}</p>
      {observations.length > 0 && (
        <dl className="mt-3 space-y-2">
          {observations.map((item) => (
            <div key={item.id}>
              <dt className="text-[9px] uppercase tracking-[0.12em] text-reading-muted">{item.label}</dt>
              <dd className="text-xs text-reading-ink">{item.value} · {item.sourcePath}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
