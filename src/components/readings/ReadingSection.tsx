import type { ReadingSection as ReadingSectionModel } from '../../lib/readings'
import { ReadingBody } from './ReadingBody'

const KIND_LABEL: Record<ReadingSectionModel['evidenceKind'], string> = {
  deterministic: 'Computed',
  witness: 'Witness',
  system: 'System',
}

export function ReadingSection({
  section,
  index,
  compact = false,
}: {
  section: ReadingSectionModel
  index: number
  compact?: boolean
}) {
  return (
    <section
      id={`reading-section-${section.id}`}
      className={compact ? 'space-y-2' : 'border-l border-gold/20 py-2 pl-5 sm:pl-7'}
      aria-labelledby={`reading-section-title-${section.id}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-display text-[9px] uppercase tracking-[0.24em] text-gold/55">
          {String(index + 1).padStart(2, '0')}
        </span>
        <h3
          id={`reading-section-title-${section.id}`}
          className="font-serif text-sm uppercase tracking-[0.14em] text-gold sm:text-base"
        >
          {section.title}
        </h3>
        <span className="rounded-full border border-parchment/10 px-2 py-0.5 text-[8px] uppercase tracking-[0.18em] text-silver/60">
          {KIND_LABEL[section.evidenceKind]}
        </span>
      </div>
      <ReadingBody body={section.body} />
    </section>
  )
}
