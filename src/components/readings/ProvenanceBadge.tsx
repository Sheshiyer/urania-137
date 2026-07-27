import type { EngineVisualContract } from '../../lib/readings/engineVisualRegistry'

const LABEL: Record<EngineVisualContract['provenance'], string> = {
  'observed-data': 'Observed corpus shape',
  'source-contract': 'Source contract',
}

export function ProvenanceBadge({
  provenance,
}: {
  provenance: EngineVisualContract['provenance']
}) {
  return (
    <span
      className="inline-flex min-h-6 items-center rounded-full border border-parchment/10 px-2 py-0.5 text-xs uppercase tracking-[0.12em] text-reading-muted"
      data-provenance={provenance}
    >
      {LABEL[provenance]}
    </span>
  )
}
