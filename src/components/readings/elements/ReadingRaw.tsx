import type { ReadingRawElement } from '../../../lib/readings'
import { elementDomId } from './ElementFrame'
import { privacySafeSourceJson } from './ReadingSourcePayload'

export function ReadingRaw({ element }: { element: ReadingRawElement }) {
  const id = `reading-raw-${elementDomId(element.id)}`
  return (
    <details className="console-card min-w-0 p-4" data-reading-element="raw">
      <summary id={id} className="min-h-11 cursor-pointer font-display text-xs uppercase tracking-[0.18em] text-gold marker:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
        {element.title} · generic source
      </summary>
      <p className="mt-2 text-xs leading-relaxed text-silver/65">
        No named visual adapter exists for this source shape. A privacy-filtered source record remains available without inferred meaning.
      </p>
      <div
        className="mt-3 min-w-0 max-w-full overflow-auto"
        role="region"
        aria-label={`${element.title} privacy-filtered source`}
        tabIndex={0}
      >
        <pre className="max-h-80 w-full max-w-full whitespace-pre-wrap break-all border border-gold/10 bg-void/80 p-3 font-mono text-xs leading-relaxed text-parchment/75">
          <code>{privacySafeSourceJson(element.value)}</code>
        </pre>
      </div>
    </details>
  )
}
