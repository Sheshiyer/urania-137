import { useId } from 'react'
import type { ReadingElement } from '../../../lib/readings'
import { ReadingComposition } from './ReadingComposition'

export function ReadingElementField({ elements }: { elements: ReadingElement[] }) {
  if (elements.length === 0) return null
  const titleId = `reading-element-field-${useId().replace(/:/g, '')}`
  return (
    <section aria-labelledby={titleId} className="min-w-0 space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-display text-[9px] uppercase tracking-[0.2em] text-reading-muted">Reading field</p>
          <h2 id={titleId} className="mt-1 font-serif text-lg leading-tight text-reading-ink">
            Source-shaped elements
          </h2>
        </div>
        <p className="max-w-sm text-[10px] leading-relaxed text-reading-muted">
          Each element is derived from explicit engine structure; the source remains available below.
        </p>
      </header>
      <ReadingComposition elements={elements} />
    </section>
  )
}
