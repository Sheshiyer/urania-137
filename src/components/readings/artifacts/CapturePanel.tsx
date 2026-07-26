import type { ReadingCaptureElement } from '../../../lib/readings'
import { ElementFrame } from '../elements/ElementFrame'
import { ChakraSpectrum } from './ChakraSpectrum'
import { MetricField } from './MetricField'
import { QualityPanel } from './QualityPanel'

function includesAny(value: string, terms: string[]) {
  const normalized = value.toLowerCase()
  return terms.some((term) => normalized.includes(term))
}

export function CapturePanel({ element }: { element: ReadingCaptureElement }) {
  const verified = element.captureState === 'recorded'
    && element.observations.length > 0
    && element.observations.every(({ status }) => status === 'recorded')
  const chakra = element.observations.filter((item) => item.category === 'chakra' || includesAny(`${item.label} ${item.sourcePath}`, ['chakra']))
  const quality = element.observations.filter((item) => item.category === 'quality' || item.category === 'consent' || includesAny(`${item.label} ${item.sourcePath}`, ['quality', 'consent', 'sharpness', 'sufficient']))
  const metrics = element.observations.filter((item) => !chakra.includes(item) && !quality.includes(item))

  return (
    <ElementFrame
      element={element}
      encoding="Only verified persisted capture observations are projected; consent, quality, and source paths remain written."
    >
      <div
        className="space-y-5"
        data-engine-artifact="capture-panel"
        data-capture-treatment={verified ? 'verified-persisted' : 'capture-gated'}
      >
        <p className="text-[9px] uppercase tracking-[0.14em] text-evidence-copy-witness">
          {element.captureState === 'capture-required'
            ? 'Capture required'
            : element.captureState === 'recorded'
              ? 'Capture recorded'
              : element.captureState === 'analyzed'
                ? 'Source analysis recorded'
                : 'Capture failed'}
        </p>
        {!verified ? (
          <section className="border border-violetglow/25 p-3">
            <h4 className="font-serif text-sm text-reading-ink">Capture evidence required</h4>
            <p className="mt-2 text-xs text-reading-muted">{element.body}</p>
          </section>
        ) : (
          <>
            <MetricField observations={metrics} />
            <ChakraSpectrum observations={chakra} />
            <QualityPanel body={element.body} observations={quality} />
          </>
        )}
      </div>
    </ElementFrame>
  )
}
