import type { ReadingArtifactElement, ReadingFactGridElement } from '../../../lib/readings'
import { ElementFrame } from '../elements/ElementFrame'

function safeText(value: string): string {
  return /<\s*(?:svg|html|script)\b|on\w+\s*=/i.test(value)
    ? '[Executable markup omitted]'
    : value
}

export function SafeGeometryPreview({
  element,
}: {
  element: ReadingArtifactElement | ReadingFactGridElement
}) {
  const items = element.kind === 'artifact'
    ? element.items.map((item) => ({
        id: item.id,
        label: item.label,
        value: item.value,
        sourcePath: item.sourcePath,
      }))
    : element.facts.map((fact) => ({
        id: fact.id,
        label: fact.label,
        value: fact.value,
        sourcePath: element.sourcePath,
      }))
  return (
    <ElementFrame
      element={element}
      encoding="Source method and construction steps are printed as text; arbitrary SVG and HTML are never executed."
    >
      <div data-engine-artifact="safe-geometry-preview">
        <div className="grid min-h-32 place-items-center border border-gold/25 bg-gold/5 p-5 text-center" aria-hidden="true">
          <span className="font-serif text-lg text-parchment">Source-shaped artifact</span>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="border border-gold/15 p-3">
              <dt className="text-xs uppercase tracking-[0.12em] text-metadata">{item.label}</dt>
              <dd className="mt-1 break-words text-xs text-parchment">{safeText(item.value)}</dd>
              <dd className="mt-2 break-all text-xs text-metadata">{item.sourcePath}</dd>
            </div>
          ))}
        </dl>
        {element.kind === 'artifact' && element.steps.length > 0 && (
          <ol className="mt-4 space-y-2 text-xs text-parchment">
            {element.steps.map((step) => <li key={step.id}>{step.label} · {step.sourcePath}</li>)}
          </ol>
        )}
      </div>
    </ElementFrame>
  )
}
