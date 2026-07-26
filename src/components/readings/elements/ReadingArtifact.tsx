import type { ReadingArtifactElement } from '../../../lib/readings'
import { ElementFrame } from './ElementFrame'

const STATUS_LABEL: Record<ReadingArtifactElement['status'], string> = {
  available: 'Source artifact recorded',
  missing: 'Artifact fields not supplied',
  failed: 'Artifact failed',
}

export function ReadingArtifact({ element }: { element: ReadingArtifactElement }) {
  return (
    <ElementFrame
      element={element}
      encoding="The intention, method, and ordered instructions are printed exactly from named source fields; no SVG or HTML is executed."
    >
      <p className="mb-3 border-l-2 border-gold/30 px-3 text-[10px] uppercase tracking-[0.13em] text-silver/65">
        {STATUS_LABEL[element.status]}
      </p>
      <dl className="grid gap-px overflow-hidden border border-gold/15 bg-gold/15 sm:grid-cols-2">
        {element.items.map((item) => (
          <div key={item.id} className="min-w-0 bg-void/90 p-3" data-artifact-status={item.status}>
            <dt className="font-display text-[8px] uppercase tracking-[0.16em] text-gold/65">{item.label}</dt>
            <dd className="mt-1 break-words text-sm text-parchment/90">{item.value}</dd>
            {item.detail && <dd className="mt-1 text-[10px] leading-relaxed text-silver/65">{item.detail}</dd>}
            <dd className="mt-2 break-all font-mono text-[8px] text-silver/40">{item.sourcePath}</dd>
          </div>
        ))}
      </dl>
      {element.steps.length > 0 && (
        <section className="mt-4" aria-label="Source-supplied sigil method steps">
          <h4 className="font-display text-[9px] uppercase tracking-[0.17em] text-gold/70">Method and guidance steps</h4>
          <ol className="mt-3 space-y-3 border-l border-gold/25 pl-5">
            {element.steps.map((step, index) => (
              <li key={step.id} className="relative" data-artifact-status={step.status}>
                <span className="absolute -left-[1.54rem] top-1 grid h-3 w-3 place-items-center rounded-full border border-gold bg-void text-[7px] text-gold" aria-hidden="true">
                  {index + 1}
                </span>
                <p className="text-[11px] leading-relaxed text-parchment/85">{step.label}</p>
                <p className="mt-1 break-all font-mono text-[8px] text-silver/40">{step.sourcePath}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </ElementFrame>
  )
}
