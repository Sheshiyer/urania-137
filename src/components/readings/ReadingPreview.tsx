import type { ReadingDocument } from '../../lib/readings'
import { ReadingCanvas } from './ReadingCanvas'
import { ReadingElementField } from './elements'

function previewExcerpt(document: ReadingDocument): string | null {
  const source = document.sections[0]?.body ?? document.body ?? document.bridgeQuestion
  if (!source) return null

  const text = source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*(?:[-*]|\d+[.)])\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) return null
  return text.length > 220 ? `${text.slice(0, 217).trimEnd()}…` : text
}

export function ReadingPreview({ document }: { document: ReadingDocument }) {
  const primaryElement = document.elements.find((element) => element.kind !== 'raw')
  const excerpt = previewExcerpt(document)
  const canonicalHref = document.archive.entryId
    ? `#/readings/${encodeURIComponent(document.archive.entryId)}`
    : null

  return (
    <ReadingCanvas density="thread">
      <article
        className="min-w-0 space-y-5 p-4 text-reading-ink sm:p-6"
        data-reading-origin={document.origin}
        data-reading-preview
        aria-labelledby={`reading-preview-title-${document.id}`}
      >
        <header className="border-b border-reading-rule/35 pb-4">
          <p className="font-display text-xs uppercase tracking-[0.2em] text-reading-muted">
            Reading preview · {document.nodeLabel}
          </p>
          <h1
            id={`reading-preview-title-${document.id}`}
            className="mt-2 font-serif text-xl leading-tight text-reading-ink"
          >
            {document.title}
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-reading-muted">
            {document.systems.length > 0 ? document.systems.join(' · ') : 'Narrative reading'}
            {' · '}
            {document.archive.entryId ? 'Saved in Folio' : 'Ready in this thread'}
          </p>
        </header>

        {primaryElement && <ReadingElementField elements={[primaryElement]} />}

        {excerpt && (
          <section aria-label="Reading excerpt" className="max-w-[var(--reading-measure)]">
            <p className="font-display text-xs uppercase tracking-[0.2em] text-reading-muted">
              {document.sections[0]?.title ?? 'Orientation'}
            </p>
            <p className="mt-2 break-words text-base leading-7 text-reading-ink">{excerpt}</p>
          </section>
        )}

        {!primaryElement && !excerpt && (
          <section
            aria-label="Source-only reading orientation"
            className="max-w-[var(--reading-measure)] border-l border-reading-rule/40 py-1 pl-4"
          >
            <p className="font-display text-xs uppercase tracking-[0.2em] text-reading-muted">
              Source record received
            </p>
            <p className="mt-2 text-sm leading-6 text-reading-muted">
              This engine returned technical source without reader-ready narrative. Its privacy-filtered record remains in the canonical Source layer.
            </p>
          </section>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-reading-rule/35 pt-4">
          <span className="text-xs leading-relaxed text-reading-muted">
            The full Reading, Evidence, and Source layers remain in the canonical document.
          </span>
          {canonicalHref ? (
            <a
              href={canonicalHref}
              className="inline-flex min-h-11 items-center border border-reading-rule/55 px-4 py-2 font-display text-xs uppercase tracking-[0.2em] text-reading-ink underline decoration-reading-rule/60 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-reading-rule"
            >
              Open reading
            </a>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex min-h-11 items-center border border-reading-rule/35 px-4 py-2 font-display text-xs uppercase tracking-[0.2em] text-reading-muted"
            >
              Open reading · save pending
            </span>
          )}
        </footer>
      </article>
    </ReadingCanvas>
  )
}
