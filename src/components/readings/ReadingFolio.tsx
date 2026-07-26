import type { ReadingDocument } from '../../lib/readings'
import { EvidenceLedger } from './EvidenceLedger'
import { PatternConstellation } from './PatternConstellation'
import { ReadingAtlas } from './ReadingAtlas'
import { ReadingSection } from './ReadingSection'
import { SystemStack } from './SystemStack'
import { TimingSpine } from './TimingSpine'
import { ReadingBody } from './ReadingBody'
import { ReadingElementField, ReadingSourcePayload } from './elements'

function dateLabel(timestamp: number | null): string {
  if (timestamp === null) return 'Current reading'
  return new Date(timestamp).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ReadingFolio({
  document,
  variant = 'folio',
}: {
  document: ReadingDocument
  variant?: 'thread' | 'folio'
}) {
  const thread = variant === 'thread'
  const hasElements = document.elements.length > 0
  const hasRawElement = document.elements.some((element) => element.kind === 'raw')
  return (
    <article
      className={thread ? 'space-y-5' : 'space-y-5 pb-6'}
      data-reading-origin={document.origin}
      data-reading-structure={document.structureSource}
      aria-labelledby={`reading-title-${document.id}`}
    >
      {!thread && (
        <header className="border-b border-gold/15 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] uppercase tracking-[0.18em] text-silver/60">
            <span>{document.nodeLabel}</span>
            <span>{dateLabel(document.createdAt)}</span>
          </div>
          <h1 id={`reading-title-${document.id}`} className="mt-2 font-serif text-xl uppercase tracking-[0.16em] text-parchment sm:text-2xl">
            {document.title}
          </h1>
          <dl className="mt-3 grid gap-2 text-[10px] sm:grid-cols-2">
            <div className="border-l border-gold/20 pl-3">
              <dt className="uppercase tracking-[0.16em] text-gold/55">Owned by</dt>
              <dd className="mt-0.5 text-silver/80">{document.owner.email ?? document.owner.label}</dd>
            </div>
            <div className="border-l border-gold/20 pl-3">
              <dt className="uppercase tracking-[0.16em] text-gold/55">Reading subject</dt>
              <dd className="mt-0.5 text-silver/80">
                {document.subject.label} · {document.subject.kind}
              </dd>
            </div>
          </dl>
        </header>
      )}

      {!thread && <ReadingAtlas document={document} />}
      <SystemStack systems={document.systems} compact={thread} />
      {hasElements && <ReadingElementField elements={document.elements} />}

      {document.structureSource === 'native' ? (
        <div className={thread ? 'space-y-5' : 'space-y-7'} aria-label="Reading sections">
          {document.sections.map((section, index) => (
            <ReadingSection key={section.id} section={section} index={index} compact={thread} />
          ))}
        </div>
      ) : !hasElements ? (
        <section className={thread ? '' : 'border-l border-gold/20 py-2 pl-5 sm:pl-7'} aria-labelledby={`flat-reading-title-${document.id}`}>
          {!thread && (
            <h2 id={`flat-reading-title-${document.id}`} className="mb-3 font-serif text-sm uppercase tracking-[0.16em] text-gold">
              Stored reading
            </h2>
          )}
          <ReadingBody body={document.body ?? ''} />
        </section>
      ) : null}

      {document.sourcePayload !== null && !hasRawElement && <ReadingSourcePayload payload={document.sourcePayload} />}

      {!thread && (
        <div className="grid gap-4 lg:grid-cols-2">
          <EvidenceLedger evidence={document.evidence} />
          <SystemStack systems={document.systems} />
          <PatternConstellation patterns={document.patterns} />
          <TimingSpine moments={document.moments} />
        </div>
      )}

      {document.bridgeQuestion && (
        <aside className="border-y border-gold/15 py-5 text-center">
          <p className="console-eyebrow">Bridge question</p>
          <p className="mx-auto mt-2 max-w-2xl font-serif text-base leading-relaxed text-parchment/90">{document.bridgeQuestion}</p>
        </aside>
      )}
    </article>
  )
}
