import { WORKFLOW_VISUAL_REGISTRY } from '../../lib/readings/engineVisualRegistry'
import { EngineReading } from './EngineReading'
import { EvidenceDrawer } from './EvidenceDrawer'
import { SystemRunLedger, type SystemRunEntry } from './SystemRunLedger'

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function failedEnvelope(value: unknown): boolean {
  const item = record(value)
  if (!item) return true
  return Boolean(item.error ?? item._error ?? item.failed)
    || (typeof item.status === 'string' && ['failed', 'error', 'rejected'].includes(item.status.toLowerCase()))
}

export function WorkflowReading({ envelope }: { envelope: unknown }) {
  const source = record(envelope)
  const workflowId = typeof source?.workflow_id === 'string' ? source.workflow_id : 'unknown-workflow'
  const contract = WORKFLOW_VISUAL_REGISTRY[workflowId]
  const outputs = record(source?.engine_outputs) ?? record(source?.engine_results) ?? {}
  const declared = contract?.engineIds ?? []
  const entries: SystemRunEntry[] = declared.map((id) => ({ id, state: 'declared' }))
  const returned: Array<{ id: string; envelope: unknown }> = []

  for (const [id, output] of Object.entries(outputs)) {
    if (failedEnvelope(output)) entries.push({ id, state: 'failed' })
    else {
      entries.push({ id, state: 'returned' })
      returned.push({ id, envelope: output })
    }
  }
  for (const id of declared) {
    if (Object.prototype.hasOwnProperty.call(outputs, id)) continue
    const status = ENGINE_STATUS[id] === 'capture-gated' ? 'capture-gated' : 'missing'
    entries.push({ id, state: status })
  }
  const expanded = workflowId === 'full-spectrum' ? returned.slice(0, 5) : returned
  const additional = workflowId === 'full-spectrum' ? returned.slice(5) : []

  return (
    <article className="min-w-0 space-y-5" data-workflow-reading={workflowId}>
      <header>
        <p className="console-eyebrow">Workflow reading · proposed composition</p>
        <h1 className="mt-1 font-serif text-xl text-reading-ink">{contract?.surface ?? workflowId}</h1>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-reading-muted">
          {contract?.nonVisual.label ?? 'Returned systems remain separate and source ordered.'}
        </p>
      </header>
      <SystemRunLedger entries={entries} />
      <section className="space-y-4" aria-label="Returned workflow engine readings">
        {expanded.map(({ id, envelope: output }) => {
          const sourceOutput = record(output)
          const normalized = sourceOutput && typeof sourceOutput.engine_id !== 'string'
            ? { ...sourceOutput, engine_id: id }
            : output
          return <EngineReading key={id} envelope={normalized} state="returned" />
        })}
      </section>
      {additional.length > 0 && (
        <section className="console-card p-4" aria-labelledby="additional-returned-systems-title">
          <h2 id="additional-returned-systems-title" className="font-serif text-base text-reading-ink">
            Additional returned systems
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-reading-muted">
            Full Spectrum keeps five instruments expanded at once. The complete returned payload remains in Technical source.
          </p>
          <ul className="mt-3 grid gap-2 text-xs text-reading-ink sm:grid-cols-2">
            {additional.map(({ id }) => <li key={id}>{id}</li>)}
          </ul>
        </section>
      )}
      <EvidenceDrawer payload={envelope} />
    </article>
  )
}

const ENGINE_STATUS: Record<string, 'capture-gated' | 'other'> = {
  biofield: 'capture-gated',
  'biofield-capture': 'capture-gated',
  'face-reading': 'capture-gated',
}
