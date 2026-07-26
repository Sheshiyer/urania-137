import type { ReactNode } from 'react'
import type { ReadingElement } from '../../../lib/readings'

export function elementDomId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '-')
}

export function ElementFrame({
  element,
  encoding,
  children,
}: {
  element: ReadingElement
  encoding?: string
  children: ReactNode
}) {
  const titleId = `reading-element-${elementDomId(element.id)}`
  return (
    <section className="console-card min-w-0 p-4 sm:p-5" aria-labelledby={titleId} data-reading-element={element.kind}>
      <header className="mb-4 border-b border-gold/10 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="console-eyebrow">{element.sourceSystem}</p>
          <span className="rounded-full border border-parchment/10 px-2 py-0.5 text-[8px] uppercase tracking-[0.16em] text-silver/65">
            {element.confidence}
          </span>
        </div>
        <h3 id={titleId} className="mt-1 text-balance font-serif text-sm uppercase tracking-[0.14em] text-parchment sm:text-base">
          {element.title}
        </h3>
        <p className="mt-1 break-all font-mono text-[9px] text-silver/45">{element.sourcePath}</p>
        {encoding && <p className="mt-2 text-[10px] leading-relaxed text-silver/65">{encoding}</p>}
      </header>
      {children}
    </section>
  )
}
