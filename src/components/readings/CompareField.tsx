import type { ReadingDocument, ReadingRelationsElement } from '../../lib/readings'
import { ReadingRelations } from './elements/ReadingRelations'

function ParticipantSide({
  participant,
  grantLabel,
}: {
  participant: NonNullable<ReadingDocument['subject']['participants']>[number]
  grantLabel: string
}) {
  return (
    <section
      className="min-w-0 border border-reading-rule/45 bg-reading-paper/40 p-4 sm:p-5"
      data-compare-side={participant.role}
      data-compare-weight="equal"
      data-compare-order="identity,subject,grant"
      aria-label={`${participant.label}, ${participant.role} participant`}
    >
      <p className="font-display text-[9px] uppercase tracking-[0.2em] text-reading-muted">
        {participant.role}
      </p>
      <h2 className="mt-2 break-words font-serif text-xl leading-tight text-reading-ink">
        {participant.label}
      </h2>
      <dl className="mt-4 space-y-3 border-t border-reading-rule/35 pt-4 text-xs">
        <div>
          <dt className="font-display text-[9px] uppercase tracking-[0.16em] text-reading-muted">
            Bound subject
          </dt>
          <dd className="mt-1 break-words text-reading-ink">
            {participant.id ?? 'Subject identifier unavailable'}
          </dd>
        </div>
        <div>
          <dt className="font-display text-[9px] uppercase tracking-[0.16em] text-reading-muted">
            Access
          </dt>
          <dd className="mt-1 text-reading-ink">{grantLabel}</dd>
        </div>
      </dl>
    </section>
  )
}

export function CompareField({ document }: { document: ReadingDocument }) {
  const access = document.access
  const participants = document.subject.participants
  if (
    document.subject.kind !== 'dyad'
    || access?.reason !== 'participant-grant'
    || !participants
  ) {
    return null
  }

  const relationElements = document.elements.filter(
    (element): element is ReadingRelationsElement => element.kind === 'relations',
  )
  const grantLabel = access.state === 'current'
    ? 'Current participant grant'
    : 'Historical participant grant'

  return (
    <section className="min-w-0 space-y-4" aria-labelledby={`compare-title-${document.id}`}>
      <header className="text-center">
        <p className="font-display text-[9px] uppercase tracking-[0.2em] text-reading-muted">
          Symmetrical dyad
        </p>
        <h2 id={`compare-title-${document.id}`} className="mt-1 font-serif text-xl text-reading-ink">
          Two subjects · one consented field
        </h2>
      </header>
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.72fr)_minmax(0,1fr)] lg:items-stretch">
        <ParticipantSide participant={participants[0]} grantLabel={grantLabel} />
        <div className="min-w-0 space-y-3" data-compare-relations="between">
          {relationElements.length ? relationElements.map((element) => (
            <ReadingRelations key={element.id} element={element} />
          )) : (
            <div className="flex h-full min-h-32 items-center justify-center border-y border-reading-rule/45 px-4 text-center">
              <p className="text-xs leading-relaxed text-reading-muted">
                No named relation edges were returned in this grant.
              </p>
            </div>
          )}
        </div>
        <ParticipantSide participant={participants[1]} grantLabel={grantLabel} />
      </div>
    </section>
  )
}
