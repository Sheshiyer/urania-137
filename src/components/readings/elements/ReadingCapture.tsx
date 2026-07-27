import type { ReadingCaptureElement } from '../../../lib/readings'
import { ElementFrame } from './ElementFrame'

const STATE_LABEL: Record<ReadingCaptureElement['captureState'], string> = {
  'capture-required': 'Capture required',
  recorded: 'Capture recorded',
  analyzed: 'Source analysis recorded',
  failed: 'Capture failed',
}

export function ReadingCapture({ element }: { element: ReadingCaptureElement }) {
  return (
    <ElementFrame
      element={element}
      encoding="Every value is printed with its source path and verification state; no diagnostic or interpretive score is added."
    >
      <div className="border-l-2 border-violetglow/35 px-3">
        <p className="font-display text-xs uppercase tracking-[0.16em] text-evidence-copy-witness">
          {STATE_LABEL[element.captureState]}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-silver/75">{element.body}</p>
      </div>
      {element.observations.length > 0 && (
        <dl className="mt-4 grid gap-px overflow-hidden border border-gold/15 bg-gold/15 sm:grid-cols-2">
          {element.observations.map((observation) => (
            <div key={observation.id} className="min-w-0 bg-void/90 p-3" data-capture-status={observation.status}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <dt className="font-display text-xs uppercase tracking-[0.16em] text-gold/80">
                  {observation.label}
                </dt>
                <span className="text-xs uppercase tracking-[0.12em] text-silver/50">{observation.status}</span>
              </div>
              <dd className="mt-1 break-words font-mono text-xs tabular-nums text-parchment/90">{observation.value}</dd>
              {observation.detail && <dd className="mt-1 text-xs leading-relaxed text-silver/60">{observation.detail}</dd>}
              <dd className="mt-2 break-all font-mono text-xs text-silver/40">{observation.sourcePath}</dd>
            </div>
          ))}
        </dl>
      )}
    </ElementFrame>
  )
}
