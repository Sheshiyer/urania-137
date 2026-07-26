import type { ReadingRawElement } from '../../../lib/readings'
import { elementDomId } from './ElementFrame'
import { privacySafeSourceJson } from './ReadingSourcePayload'

export function ReadingRaw({ element }: { element: ReadingRawElement }) {
  const id = `reading-raw-${elementDomId(element.id)}`
  return (
    <details className="console-card min-w-0 p-4" data-reading-element="raw">
      <summary id={id} className="min-h-10 cursor-pointer font-display text-[9px] uppercase tracking-[0.18em] text-gold marker:text-gold">
        {element.title} · generic source
      </summary>
      <p className="mt-2 text-[10px] leading-relaxed text-silver/65">
        No named visual adapter exists for this source shape. A privacy-filtered source record remains available without inferred meaning.
      </p>
      <pre className="mt-3 max-h-80 overflow-auto border border-gold/10 bg-void/80 p-3 font-mono text-[10px] leading-relaxed text-parchment/75">
        <code>{privacySafeSourceJson(element.value)}</code>
      </pre>
    </details>
  )
}
