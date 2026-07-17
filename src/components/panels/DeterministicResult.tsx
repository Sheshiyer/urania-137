import { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { EngineResult, WorkflowResult } from '../../types'
import { Collapsible } from '../ui/Collapsible'

const title = (k: string) => k.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

/** Render an engine's arbitrary JSON result as readable rows rather than a dump. */
function Value({ v }: { v: unknown }): ReactNode {
  if (v === null || v === undefined) return <span className="text-silver/50">—</span>
  if (typeof v === 'boolean') return <span className={v ? 'text-emerald' : 'text-silver'}>{String(v)}</span>
  if (typeof v === 'number') return <span className="text-parchment">{Number.isInteger(v) ? v : v.toFixed(4)}</span>
  if (typeof v === 'string') return <span className="text-parchment">{v}</span>
  if (Array.isArray(v)) {
    if (v.every((x) => typeof x !== 'object' || x === null)) {
      return <span className="text-parchment">{v.map(String).join(', ')}</span>
    }
    return (
      <div className="space-y-1.5">
        {v.map((x, i) => (
          <div key={i} className="rounded border border-gold/10 bg-void/40 p-2">
            <Value v={x} />
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="space-y-1">
      {Object.entries(v as Record<string, unknown>).map(([k, val]) => (
        <div key={k} className="grid grid-cols-[minmax(90px,38%)_1fr] gap-2 text-xs">
          <span className="truncate font-display uppercase tracking-wider text-silver/70">{title(k)}</span>
          <div className="min-w-0 break-words">
            <Value v={val} />
          </div>
        </div>
      ))}
    </div>
  )
}

function engineBody(e: EngineResult | unknown) {
  const r = (e as EngineResult)?.result
  return r ?? e
}

/**
 * The deterministic surface's result: a workflow's per-engine outputs, or one
 * engine's computation. Real numbers from the live engines — nothing synthesised
 * here.
 */
export function DeterministicResult({
  result,
  engine,
  declaredEngines,
  busy,
  error,
}: {
  result?: WorkflowResult | null
  engine?: EngineResult | null
  /** The workflow's declared engine ids, so a silently-dropped engine is visible. */
  declaredEngines?: string[]
  busy?: boolean
  error?: string | null
}) {
  if (busy) return <p className="py-8 text-center text-sm text-silver">Computing across the engines…</p>
  if (error) return <p className="py-8 text-center text-sm text-terracotta">{error}</p>

  if (engine) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg border border-emerald/20 bg-emerald/10 px-3 py-2 text-sm text-emerald">
          <span className="h-2 w-2 rounded-full bg-emerald" />
          {engine.engine_id}
        </div>
        <div className="rounded-lg border border-gold/10 bg-void/50 p-3">
          <Value v={engineBody(engine)} />
        </div>
      </div>
    )
  }

  if (!result) return null

  const returned = Object.keys(result.engine_outputs ?? {})
  const missing = (declaredEngines ?? []).filter((e) => !returned.includes(e))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-gold/15 bg-void/50 px-4 py-2.5 text-sm">
        <span className="font-display uppercase tracking-widest text-gold">{result.workflow_id}</span>
        <span className="text-silver">
          {returned.length}
          {declaredEngines?.length ? `/${declaredEngines.length}` : ''} engines
        </span>
        <span className="text-silver">{result.total_time_ms?.toFixed?.(2) ?? '—'} ms</span>
      </div>

      {/* The engine composes best-effort — a failing engine is simply absent.
          Say so rather than quietly showing a short result. */}
      {missing.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-terracotta/25 bg-terracotta/10 px-3 py-2 text-xs text-terracotta">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            The engine returned no output for <strong>{missing.join(', ')}</strong> — the workflow declares it but drops it
            silently when it errors.
          </span>
        </div>
      )}

      {returned.map((id) => (
        <Collapsible key={id} title={title(id)} defaultOpen={returned.length <= 3}>
          <Value v={engineBody(result.engine_outputs[id])} />
        </Collapsible>
      ))}

      {result.synthesis ? (
        <Collapsible title="Synthesis" defaultOpen>
          <Value v={result.synthesis} />
        </Collapsible>
      ) : null}
    </div>
  )
}
