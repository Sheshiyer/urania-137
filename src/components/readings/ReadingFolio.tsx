import type { ReadingDocument } from '../../lib/readings'
import { EvidenceLedger } from './EvidenceLedger'
import { PatternConstellation } from './PatternConstellation'
import { ReadingAtlas } from './ReadingAtlas'
import { ReadingCanvas } from './ReadingCanvas'
import { ReadingLayerNav, readingLayerId } from './ReadingLayerNav'
import { ReadingPreview } from './ReadingPreview'
import { ReadingSection } from './ReadingSection'
import { SystemStack } from './SystemStack'
import { TimingSpine } from './TimingSpine'
import { ReadingBody } from './ReadingBody'
import { ReadingElementField, ReadingSourcePayload } from './elements'

export interface ReadingFolioEvidenceContext {
  accessReason: string | null
  checksum: string | null
}

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
  evidenceContext,
}: {
  document: ReadingDocument
  variant?: 'thread' | 'folio'
  evidenceContext?: ReadingFolioEvidenceContext
}) {
  const thread = variant === 'thread'
  if (thread) return <ReadingPreview document={document} />

  const visualElements = document.elements.filter((element) => element.kind !== 'raw')
  const rawElements = document.elements.filter((element) => element.kind === 'raw')
  const hasVisualElements = visualElements.length > 0
  const rawOnlyFlatDocument = document.structureSource === 'flat'
    && rawElements.length > 0
    && !hasVisualElements
  const sourcePayload = document.sourcePayload ?? (
    rawElements.length === 1
      ? rawElements[0].value
      : rawElements.length > 1
        ? Object.fromEntries(rawElements.map((element) => [element.title, element.value]))
        : null
  )

  return (
    <ReadingCanvas density="folio">
      <article
        className="min-w-0"
        data-reading-origin={document.origin}
        data-reading-structure={document.structureSource}
        aria-labelledby={`reading-title-${document.id}`}
      >
        <ReadingLayerNav readingId={document.id} />

        <section
          id={readingLayerId(document.id, 'reading')}
          data-reading-layer="reading"
          aria-label="Reading"
          tabIndex={-1}
          className="min-w-0 space-y-7 px-4 py-6 text-reading-ink sm:px-7 sm:py-8"
        >
          <header className="border-b border-reading-rule/35 pb-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] uppercase tracking-[0.18em] text-reading-muted">
              <span>{document.nodeLabel}</span>
              <span>{dateLabel(document.createdAt)}</span>
            </div>
            <h1
              id={`reading-title-${document.id}`}
              className="mt-2 font-serif text-2xl leading-tight text-reading-ink sm:text-3xl"
            >
              {document.title}
            </h1>
            <p className="mt-3 max-w-[var(--reading-measure)] text-sm leading-6 text-reading-muted">
              The Reading layer holds source-shaped orientation and narrative. Supporting provenance follows in Evidence; the privacy-filtered record remains collapsed in Source.
            </p>
          </header>

          <ReadingAtlas document={document} />
          {hasVisualElements && <ReadingElementField elements={visualElements} />}

          {document.structureSource === 'native' ? (
            <div className="space-y-7" aria-label="Reading sections">
              {document.sections.map((section, index) => (
                <ReadingSection key={section.id} section={section} index={index} />
              ))}
            </div>
          ) : !hasVisualElements && !rawOnlyFlatDocument ? (
            <section
              className="border-l border-reading-rule/35 py-2 pl-5 sm:pl-7"
              aria-label="Stored reading"
            >
              <p className="mb-3 font-display text-[9px] uppercase tracking-[0.18em] text-reading-muted">
                Stored reading
              </p>
              <ReadingBody body={document.body ?? ''} />
            </section>
          ) : rawOnlyFlatDocument ? (
            <section
              className="border-l border-reading-rule/35 py-2 pl-5 sm:pl-7"
              aria-label="Source-only stored record"
            >
              <p className="font-display text-[9px] uppercase tracking-[0.18em] text-reading-muted">
                Source-only stored record
              </p>
              <p className="mt-2 max-w-[var(--reading-measure)] text-sm leading-6 text-reading-muted">
                This flat record contains technical source rather than narrative. Its privacy-filtered payload is available in the collapsed Source layer.
              </p>
            </section>
          ) : null}

          {document.bridgeQuestion && (
            <aside className="border-y border-reading-rule/35 py-5 text-center">
              <p className="font-display text-[9px] uppercase tracking-[0.2em] text-reading-muted">
                Bridge question
              </p>
              <p className="mx-auto mt-2 max-w-[var(--reading-measure)] font-serif text-lg leading-relaxed text-reading-ink">
                {document.bridgeQuestion}
              </p>
            </aside>
          )}
        </section>

        <section
          id={readingLayerId(document.id, 'evidence')}
          data-reading-layer="evidence"
          aria-label="Evidence"
          tabIndex={-1}
          className="min-w-0 space-y-5 bg-void px-4 py-6 text-parchment sm:px-7 sm:py-8"
        >
          <header className="border-b border-gold/25 pb-4">
            <p className="font-display text-[9px] uppercase tracking-[0.22em] text-gold">
              Evidence
            </p>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-silver">
              Systems, identities, provenance, confidence, timing, and convergence remain explicit rather than borrowing certainty from the narrative.
            </p>
          </header>

          <dl className="grid gap-3 border-y border-gold/15 py-4 text-xs sm:grid-cols-2">
            <div className="min-w-0 border-l border-gold/30 pl-3">
              <dt className="font-display text-[9px] uppercase tracking-[0.16em] text-gold">
                Owner
              </dt>
              <dd className="mt-1 break-words text-parchment">
                {document.owner.email ?? document.owner.label}
              </dd>
            </div>
            <div className="min-w-0 border-l border-gold/30 pl-3">
              <dt className="font-display text-[9px] uppercase tracking-[0.16em] text-gold">
                Subject
              </dt>
              <dd className="mt-1 break-words text-parchment">
                {document.subject.label} · {document.subject.kind}
              </dd>
            </div>
            <div className="min-w-0 border-l border-gold/30 pl-3">
              <dt className="font-display text-[9px] uppercase tracking-[0.16em] text-gold">
                Provenance
              </dt>
              <dd className="mt-1 break-words text-parchment">
                {document.origin} · {document.mode}
              </dd>
            </div>
            <div className="min-w-0 border-l border-gold/30 pl-3">
              <dt className="font-display text-[9px] uppercase tracking-[0.16em] text-gold">
                Canonical identity
              </dt>
              <dd className="mt-1 break-words text-parchment">
                {document.archive.entryId ?? 'Not yet bound'}
              </dd>
            </div>
            <div className="min-w-0 border-l border-gold/30 pl-3">
              <dt className="font-display text-[9px] uppercase tracking-[0.16em] text-gold">
                Access reason
              </dt>
              <dd className="mt-1 break-words text-parchment">
                {evidenceContext?.accessReason ?? 'Access reason unavailable'}
              </dd>
            </div>
            <div className="min-w-0 border-l border-gold/30 pl-3">
              <dt className="font-display text-[9px] uppercase tracking-[0.16em] text-gold">
                Checksum
              </dt>
              <dd className="mt-1 break-words text-parchment">
                {evidenceContext?.checksum ?? 'Checksum unavailable'}
              </dd>
            </div>
          </dl>

          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <EvidenceLedger evidence={document.evidence} />
            <SystemStack systems={document.systems} />
            <PatternConstellation patterns={document.patterns} />
            <TimingSpine moments={document.moments} />
          </div>
        </section>

        <section
          id={readingLayerId(document.id, 'source')}
          data-reading-layer="source"
          aria-label="Source"
          tabIndex={-1}
          className="min-w-0 bg-void px-4 pb-7 text-parchment sm:px-7 sm:pb-8"
        >
          <ReadingSourcePayload payload={sourcePayload} />
        </section>
      </article>
    </ReadingCanvas>
  )
}
