import type { ReadingEvidence } from '../../lib/readings'

const KIND_LABEL: Record<ReadingEvidence['kind'], string> = {
  deterministic: 'Computed',
  witness: 'Witness',
  retrieval: 'Synthesis memory',
  historical: 'Historical',
  system: 'System',
}

export function EvidenceLedger({ evidence }: { evidence: ReadingEvidence[] }) {
  if (evidence.length === 0) return null
  return (
    <section className="console-card p-4" aria-labelledby="reading-evidence-title">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="console-eyebrow">Evidence ledger</p>
          <h2 id="reading-evidence-title" className="mt-1 font-serif text-sm uppercase tracking-[0.16em] text-parchment">
            What supports this reading
          </h2>
        </div>
        <span className="text-xs uppercase tracking-[0.16em] text-metadata">{evidence.length} entries</span>
      </div>
      <ol className="space-y-2">
        {evidence.map((item) => (
          <li key={item.id} className="grid gap-1 border-t border-gold/10 pt-2 sm:grid-cols-[8rem_1fr_auto] sm:gap-3">
            <span className="text-xs uppercase tracking-[0.16em] text-gold">{KIND_LABEL[item.kind]}</span>
            <span>
              <strong className="block text-xs font-medium text-parchment/90">{item.label}</strong>
              <span className="text-xs leading-relaxed text-secondary">{item.detail}</span>
            </span>
            <span className="self-start rounded-full border border-parchment/10 px-2 py-0.5 text-xs uppercase tracking-[0.14em] text-metadata">
              {item.confidence}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
