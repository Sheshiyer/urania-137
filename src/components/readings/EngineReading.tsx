import { extractReadingElements } from '../../lib/readings'
import {
  ENGINE_VISUAL_REGISTRY,
  type EngineVisualContract,
} from '../../lib/readings/engineVisualRegistry'
import { EvidenceBoundary } from './EvidenceBoundary'
import { EvidenceDrawer } from './EvidenceDrawer'
import { ReadingElementField } from './elements/ReadingElementField'
import { ReadingInstrument } from './ReadingInstrument'
import type { ReadingRunState } from './RunStateBadge'

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

const UNKNOWN_CONTRACT: EngineVisualContract = {
  status: 'partial',
  family: 'foundation',
  primary: 'raw',
  secondary: [],
  provenance: 'source-contract',
  nonVisual: {
    kind: 'collapsed-disclosure',
    label: 'Collapsed privacy-filtered technical source.',
    preservesOrder: true,
  },
  atlasComponents: {
    primary: 'UnresolvedFieldState',
    secondary: 'TechnicalSource',
    fallback: 'UnresolvedFieldState',
  },
}

export function EngineReading({
  envelope,
  state,
}: {
  envelope: unknown
  state?: ReadingRunState
}) {
  const source = record(envelope)
  const engineId = typeof source?.engine_id === 'string' ? source.engine_id : 'unknown-engine'
  const contract = ENGINE_VISUAL_REGISTRY[engineId] ?? UNKNOWN_CONTRACT
  const elements = extractReadingElements(envelope).filter((element) => element.kind !== 'raw')
  const hasVerifiedCapture = elements.some((element) =>
    element.kind === 'capture'
    && (element.captureState === 'recorded' || element.captureState === 'analyzed')
    && element.observations.length > 0
    && element.observations.every((observation) => observation.status === 'recorded'))
  const runState = state
    ?? (source && ('error' in source || source.status === 'failed')
      ? 'failed'
      : contract.status === 'capture-gated' && !hasVerifiedCapture
        ? 'capture-gated'
        : contract.status === 'implemented'
          ? 'complete'
          : 'partial')

  return (
    <section data-engine-reading={engineId}>
      <ReadingInstrument
        title={engineId}
        eyebrow="Engine reading"
        state={runState}
        contract={contract}
      >
        <EvidenceBoundary status={contract.status} persisted={hasVerifiedCapture}>
          {elements.length > 0
            ? <ReadingElementField elements={elements} />
            : <p className="text-xs text-reading-muted">No returned source fields are available for this engine.</p>}
        </EvidenceBoundary>
        <EvidenceDrawer payload={envelope} />
      </ReadingInstrument>
    </section>
  )
}
