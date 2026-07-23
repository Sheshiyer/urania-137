import type { AssetGenerateResponse, EngineResult, GeneratedReport, WorkflowResult } from '../../types'
import type { DailyReading } from '../daily/source'
import { deterministicMarkdown } from '../../hooks/useDeterministicRun'

/**
 * Result-message mapping (Phase 3) — pure derivation from the three submit
 * hooks' state to the in-thread presentation model ChatSheet renders after a
 * handoff. Result chapters are CLIENT-SIDE PRESENTATION ONLY: they derive
 * from the engine response, are never persisted as chat turns, and the
 * reading's durable copy is the Folio row the hook already saved.
 *
 * The mapping preserves the modal era's surfacing semantics exactly:
 * witness/daily readings render ONE chapter per pass (the `{id, title,
 * output}` pass model — pass title as the chapter heading, output as the
 * body); deterministic results render the same fenced-json markdown the
 * Folio archive stores (`deterministicMarkdown`, byte-identical) as a single
 * chapter; engine/save failures surface as an error with a retry path,
 * never silently.
 */

/** One narrator-style chapter in the result thread. */
export interface ResultChapter {
  id: string
  /** Small chapter heading (pass title / child label). */
  title: string
  /** Pre-wrap body (pass output / fenced-json markdown). */
  body: string
}

export interface ThreadResult {
  kind: 'witness' | 'daily' | 'deterministic'
  /** composing = the engines are running; complete = chapters render; error = retryable failure. */
  status: 'composing' | 'complete' | 'error'
  chapters: ResultChapter[]
  /** Engine/run failure text (witness report error, det error, daily error). */
  error: string | null
  /** Folio save failure AFTER a complete reading (witness saveError) — the reading stays whole. */
  saveError: string | null
  /** Small provenance line (engines used / daily source), mirroring the modal-era footers. */
  footer?: string
  /** Dropped-engine honesty line (workflows omit failing engines silently). */
  warning?: string
}

const composing = (kind: ThreadResult['kind']): ThreadResult => ({ kind, status: 'composing', chapters: [], error: null, saveError: null })
const failed = (kind: ThreadResult['kind'], error: string): ThreadResult => ({ kind, status: 'error', chapters: [], error, saveError: null })

// ---------------------------------------------------------------------------
// Witness — useReportGenerator's activeReport
// ---------------------------------------------------------------------------

export function witnessThreadResult(report: GeneratedReport | null, saveError: string | null): ThreadResult | null {
  if (!report) return null
  if (report.status === 'generating') return composing('witness')
  if (report.status === 'error') return failed('witness', report.content || 'The engines did not answer.')

  const raw = report.raw as AssetGenerateResponse | undefined
  // One chapter per pass; a response without a pass list falls back to the
  // single assembled body (exactly what the result modal rendered).
  const chapters: ResultChapter[] = raw?.passes?.length
    ? raw.passes.map((p) => ({ id: p.id, title: p.title, body: p.output }))
    : [{ id: 'assembled', title: report.title, body: report.content }]
  const footer = raw?.engines_used?.length ? `Engines: ${raw.engines_used.join(', ')} · register ${raw.register}` : undefined
  return { kind: 'witness', status: 'complete', chapters, error: null, saveError, footer }
}

// ---------------------------------------------------------------------------
// Daily — useDailyReading's run state (structural subset; the hook owns it)
// ---------------------------------------------------------------------------

export interface DailyRunState {
  status: 'idle' | 'loading' | 'complete' | 'error'
  reading: DailyReading | null
  error: string | null
}

export function dailyThreadResult(state: DailyRunState): ThreadResult | null {
  if (state.status === 'idle') return null
  if (state.status === 'loading') return composing('daily')
  if (state.status === 'error') return failed('daily', state.error ?? 'The sky could not be read.')
  const reading = state.reading
  if (!reading) return null
  return {
    kind: 'daily',
    status: 'complete',
    chapters: reading.passes.map((p) => ({ id: p.id, title: p.title, body: p.output })),
    error: null,
    saveError: null,
    footer: `${reading.meta.source} · ${reading.engines_used.join(' + ')}`,
  }
}

// ---------------------------------------------------------------------------
// Deterministic — useDeterministicRun's state (workflow or single engine)
// ---------------------------------------------------------------------------

export interface DeterministicRunState {
  busy: boolean
  error: string | null
  workflow: WorkflowResult | null
  engine: EngineResult | null
  declaredEngines: string[]
}

export function deterministicThreadResult(state: DeterministicRunState, label: string): ThreadResult | null {
  if (state.busy) return composing('deterministic')
  // The modal era showed the error INSTEAD of the result (a save failure
  // folds into `error`); preserve that — the retry re-fires the same run.
  if (state.error) return failed('deterministic', state.error)

  const payload = state.workflow ?? state.engine
  if (!payload) return null
  const id = state.workflow ? state.workflow.workflow_id : (state.engine as EngineResult).engine_id

  // A failing engine is simply absent from engine_outputs — say so rather
  // than quietly showing a short result (same honesty as DeterministicResult).
  let warning: string | undefined
  if (state.workflow) {
    const returned = Object.keys(state.workflow.engine_outputs ?? {})
    const missing = state.declaredEngines.filter((e) => !returned.includes(e))
    if (missing.length > 0) {
      warning = `The engine returned no output for ${missing.join(', ')} — the workflow declares it but drops it silently when it errors.`
    }
  }

  return {
    kind: 'deterministic',
    status: 'complete',
    chapters: [{ id, title: label, body: deterministicMarkdown(payload) }],
    error: null,
    saveError: null,
    warning,
  }
}
