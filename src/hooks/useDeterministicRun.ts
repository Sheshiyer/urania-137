import { useCallback, useState } from 'react'
import { BirthData, ChildRun, EngineResult, StellarNode, WorkflowResult } from '../types'
import { calculateEngine, fetchWorkflow, runWorkflow } from '../lib/selemeneApi'
import { saveReport } from '../lib/folioStore'

interface State {
  busy: boolean
  error: string | null
  workflow: WorkflowResult | null
  engine: EngineResult | null
  declaredEngines: string[]
}

const EMPTY: State = { busy: false, error: null, workflow: null, engine: null, declaredEngines: [] }

/** Flatten a deterministic result to text so the Folio can archive/export it. */
function toMarkdown(label: string, payload: unknown): string {
  return `## ${label}\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\`\n`
}

/**
 * Runs the deterministic surface — a composed workflow or a single engine — and
 * archives the result to the Folio, mirroring the witness flow.
 */
export function useDeterministicRun() {
  const [state, setState] = useState<State>(EMPTY)
  const reset = useCallback(() => setState(EMPTY), [])

  const run = useCallback(async (node: StellarNode, label: string, r: ChildRun, birth: BirthData) => {
    setState({ ...EMPTY, busy: true })
    try {
      if (r.kind === 'workflow') {
        // Fetch the definition alongside the run so we can show which declared
        // engines the API dropped instead of silently returning fewer.
        const [result, def] = await Promise.all([
          runWorkflow(r.workflowId, birth),
          fetchWorkflow(r.workflowId).catch(() => null),
        ])
        setState({ busy: false, error: null, workflow: result, engine: null, declaredEngines: def?.engine_ids ?? [] })
        saveReport({
          nodeId: node.id,
          nodeLabel: node.label,
          mode: `workflow:${r.workflowId}`,
          title: `${node.label} — ${label}`,
          content: toMarkdown(`${label} (${r.workflowId})`, result),
        })
      } else if (r.kind === 'engine') {
        const result = await calculateEngine(r.engineId, birth)
        setState({ busy: false, error: null, workflow: null, engine: result, declaredEngines: [] })
        saveReport({
          nodeId: node.id,
          nodeLabel: node.label,
          mode: `engine:${r.engineId}`,
          title: `${node.label} — ${label}`,
          content: toMarkdown(`${label} (${r.engineId})`, result),
        })
      }
    } catch (e) {
      setState({ ...EMPTY, error: e instanceof Error ? e.message : 'Engine call failed' })
    }
  }, [])

  return { ...state, run, reset }
}
