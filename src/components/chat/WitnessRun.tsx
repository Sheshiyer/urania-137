import { useCallback, useRef, useState } from 'react'
import { AlertTriangle, RefreshCw, Send } from 'lucide-react'
import type { InterpretationResponse, InterpretationRoute } from '../../lib/readings/witnessContract'

/**
 * WitnessRun — a focused chat surface over ONE canonical Folio reading. Each
 * submit is a brand-new immutable interpretation row (migration 0008), never
 * an edit to a prior one; there is no client-held conversation state beyond
 * the list of turns already returned by the server. The browser sends only
 * the minimal public contract (readingId, route, question, depth,
 * idempotencyKey) — never reading content, owner, history, provider/model,
 * prompt, provenance, or context. All of that is server-assembled.
 */

export const WITNESS_DEPTHS = [0, 1, 2, 3, 4, 5] as const
export type WitnessDepth = (typeof WITNESS_DEPTHS)[number]

export const WITNESS_ROUTES: readonly InterpretationRoute[] = [
  'pattern',
  'embodied',
  'synthesis',
  'navigate',
]

export interface WitnessInterpretRequestBody {
  readingId: string
  route: InterpretationRoute
  question: string
  depth: WitnessDepth
  idempotencyKey: string
}

type WitnessRecoveryMode = 'retry' | 'continue-standard'

/** Builds the exact minimal request body sent to POST /api/chat/interpret. */
export function buildWitnessInterpretRequest(input: {
  readingId: string
  route: InterpretationRoute
  question: string
  depth: WitnessDepth
  idempotencyKey: string
}): WitnessInterpretRequestBody {
  return {
    readingId: input.readingId,
    route: input.route,
    question: input.question.trim(),
    depth: input.depth,
    idempotencyKey: input.idempotencyKey,
  }
}

/** Reuses the same request shape for retries and continuation attempts. */
export function buildWitnessRecoveryRequest(input: {
  readingId: string
  turn: Pick<WitnessTurn, 'route' | 'question' | 'depth'>
  idempotencyKey: string
}): WitnessInterpretRequestBody {
  return buildWitnessInterpretRequest({
    readingId: input.readingId,
    route: input.turn.route,
    question: input.turn.question,
    depth: input.turn.depth,
    idempotencyKey: input.idempotencyKey,
  })
}

/** A locally-generated idempotency key — one per submit, never reused. */
export function generateWitnessIdempotencyKey(): string {
  return `witness-${crypto.randomUUID()}`
}

export type WitnessTurnStatus = 'pending' | 'answered' | 'degraded' | 'error'

/**
 * Reader-safe failure categories. Raw caught errors (network stack traces,
 * transport/provider internals, endpoint names, etc.) are never surfaced —
 * every failure is mapped into one of these stable, non-technical messages
 * before it reaches state or the DOM.
 */
export type WitnessFailureCategory = 'unreachable' | 'timeout' | 'unknown'

const FAILURE_COPY: Record<WitnessFailureCategory, string> = {
  unreachable: 'This reading could not be reached. You can retry the question.',
  timeout: 'This took longer than expected. You can retry the question.',
  unknown: 'Something interrupted this reading. You can retry the question.',
}

/** Maps any thrown value to a stable, reader-safe failure category + copy. Never echoes the raw error. */
export function classifyWitnessFailure(error: unknown): {
  category: WitnessFailureCategory
  message: string
} {
  let category: WitnessFailureCategory = 'unknown'
  if (error instanceof Error) {
    const name = error.name.toLowerCase()
    const message = error.message.toLowerCase()
    if (name.includes('timeout') || message.includes('timeout') || message.includes('timed out')) {
      category = 'timeout'
    } else if (
      name.includes('typeerror') ||
      message.includes('fetch') ||
      message.includes('network')
    ) {
      category = 'unreachable'
    }
  }
  return { category, message: FAILURE_COPY[category] }
}

export interface WitnessTurn {
  id: string
  route: InterpretationRoute
  question: string
  depth: WitnessDepth
  status: WitnessTurnStatus
  response?: InterpretationResponse
  errorMessage?: string
  failureCategory?: WitnessFailureCategory
  /** True once the reader has explicitly chosen to continue past a degraded (native-fallback) answer. */
  acknowledgedDegraded?: boolean
  /** True while a retry/continue for this specific turn is in flight — guards against duplicate submits. */
  recovering?: boolean
}

/** Pure classification of a fetch outcome into the turn's terminal shape. */
export function classifyWitnessResponse(
  turn: WitnessTurn,
  outcome:
    | { ok: true; response: InterpretationResponse }
    | { ok: false; errorMessage: string; failureCategory?: WitnessFailureCategory },
): WitnessTurn {
  if (!outcome.ok) {
    return {
      ...turn,
      status: 'error',
      errorMessage: outcome.errorMessage,
      failureCategory: outcome.failureCategory ?? 'unknown',
      recovering: false,
    }
  }
  return {
    ...turn,
    status: outcome.response.degraded ? 'degraded' : 'answered',
    response: outcome.response,
    errorMessage: undefined,
    failureCategory: undefined,
    acknowledgedDegraded: false,
    recovering: false,
  }
}

/** Pure helper to replace a single turn by id with deterministic updates. */
export function replaceWitnessTurn(
  turns: readonly WitnessTurn[],
  turnId: string,
  replaceWith: (turn: WitnessTurn) => WitnessTurn,
): WitnessTurn[] {
  return turns.map((turn) => (turn.id === turnId ? replaceWith(turn) : turn))
}

/**
 * Pure guard for retry/fallback dispatch: refuses to start a second recovery
 * attempt for a turn that is already pending/recovering, so a duplicate click
 * (or a slow first attempt) can never fire a second in-flight request for the
 * same turn.
 */
export function canRecoverWitnessTurn(turn: WitnessTurn): boolean {
  if (turn.status === 'pending') return false
  if (turn.recovering) return false
  return turn.status === 'error' || turn.status === 'degraded'
}

/** Selects a recovery target before any queued React state update runs. */
export function selectWitnessRecoveryTarget(
  turns: readonly WitnessTurn[],
  turnId: string,
  recoveringTurnIds: ReadonlySet<string>,
): WitnessTurn | undefined {
  if (recoveringTurnIds.has(turnId)) return undefined
  const target = turns.find((turn) => turn.id === turnId)
  return target && canRecoverWitnessTurn(target) ? target : undefined
}

export interface WitnessRunProps {
  readingId: string
  onSubmit: (body: WitnessInterpretRequestBody) => Promise<InterpretationResponse>
  onContinueStandard?: (body: WitnessInterpretRequestBody) => Promise<InterpretationResponse>
}

const ROUTE_LABEL: Record<InterpretationRoute, string> = {
  pattern: 'Pattern',
  embodied: 'Embodied',
  synthesis: 'Synthesis',
  navigate: 'Navigate',
}

function claimStatusLabel(status: string): string {
  return status === 'source-grounded' ? 'Source-grounded' : 'Interpretive synthesis'
}

function DegradedFailureLabel(): string {
  return 'The optional interpretive layer did not respond in time. The reading itself remains available.'
}

export function WitnessTurnCard({
  turn,
  onRetry,
  onContinueWithFallback,
}: {
  turn: WitnessTurn
  onRetry: (turnId: string) => void
  onContinueWithFallback: (turnId: string) => void
}) {
  const canRecover = canRecoverWitnessTurn(turn)
  const showDegradedFallback = turn.status === 'degraded' && !turn.acknowledgedDegraded

  return (
    <li
      className="border-l border-gold/30 pl-4"
      data-witness-turn-status={turn.status}
      data-witness-turn-recovering={turn.recovering ? 'true' : 'false'}
      aria-label={`Witness turn: ${turn.question}`}
    >
      <p className="font-display text-xs uppercase tracking-[0.16em] text-gold">
        {ROUTE_LABEL[turn.route]} · L{turn.depth}
      </p>
      <p className="mt-1 font-serif text-sm text-parchment">{turn.question}</p>

      {turn.status === 'pending' && (
        <p className="mt-2 text-xs text-secondary" role="status" aria-live="polite">
          Interpreting…
        </p>
      )}

      {(turn.status === 'error' || turn.status === 'degraded') && turn.recovering && (
        <p className="mt-2 text-xs text-silver" role="status" aria-live="polite">
          Interpreting this turn again…
        </p>
      )}

      {turn.status === 'error' && (
        <div className="mt-2 space-y-2" role="alert" aria-label="Reading turn failed">
          <p className="flex items-center gap-2 text-xs text-evidence-unresolved">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            {turn.errorMessage}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              role="button"
              aria-label={`Retry: ${turn.question}`}
              disabled={!canRecover}
              onClick={() => onRetry(turn.id)}
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-gold/40 px-3 text-xs uppercase tracking-[0.14em] text-gold disabled:opacity-40"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {turn.recovering ? 'Retrying…' : 'Retry'}
            </button>
            <button
              type="button"
              role="button"
              aria-label={`Continue with standard reading: ${turn.question}`}
              disabled={!canRecover}
              onClick={() => onContinueWithFallback(turn.id)}
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-gold/25 px-3 text-xs uppercase tracking-[0.14em] text-secondary disabled:opacity-40"
            >
              Continue with standard reading
            </button>
          </div>
        </div>
      )}

      {turn.response && (
        <div className="mt-2 space-y-3">
          {turn.status === 'degraded' && (
            <div className="space-y-2" role="status">
              <p className="text-xs text-evidence-unresolved">{DegradedFailureLabel()}</p>
              {showDegradedFallback && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    role="button"
                    aria-label={`Continue with standard reading: ${turn.question}`}
                    disabled={!canRecover}
                    onClick={() => onContinueWithFallback(turn.id)}
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-gold/40 px-3 text-xs uppercase tracking-[0.14em] text-gold disabled:opacity-40"
                  >
                    Continue with standard reading
                  </button>
                  <button
                    type="button"
                    role="button"
                    aria-label={`Retry: ${turn.question}`}
                    disabled={!canRecover}
                    onClick={() => onRetry(turn.id)}
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-gold/25 px-3 text-xs uppercase tracking-[0.14em] text-secondary disabled:opacity-40"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    {turn.recovering ? 'Retrying…' : 'Retry'}
                  </button>
                </div>
              )}
            </div>
          )}

          <p className="text-sm leading-relaxed text-parchment">{turn.response.answer}</p>

          {turn.response.claims.length > 0 && (
            <div>
              <p className="font-display text-xs uppercase tracking-[0.14em] text-silver">Claims</p>
              <ul className="mt-1 space-y-1">
                {turn.response.claims.map((claim, index) => (
                  <li key={index} className="text-xs leading-relaxed text-secondary">
                    {claim.text}{' '}
                    <span className="text-silver">
                      ({claimStatusLabel(claim.status)} · {claim.evidenceIds.join(', ')})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {turn.response.targets.length > 0 && (
            <div>
              <p className="font-display text-xs uppercase tracking-[0.14em] text-silver">Source refs</p>
              <ul className="mt-1 space-y-1">
                {turn.response.targets.map((target, index) => (
                  <li key={index} className="text-xs text-secondary">
                    {target.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <details className="text-xs text-silver">
            <summary className="cursor-pointer font-display uppercase tracking-[0.14em]">
              Context · fact-lock · provenance
            </summary>
            <dl className="mt-2 space-y-1">
              <div>
                <dt className="inline text-silver">Agent: </dt>
                <dd className="inline">{turn.response.provenance.agentId}</dd>
              </div>
              <div>
                <dt className="inline text-silver">Model: </dt>
                <dd className="inline">{turn.response.provenance.model}</dd>
              </div>
              <div>
                <dt className="inline text-silver">Evidence ids: </dt>
                <dd className="inline">{turn.response.provenance.evidenceIds.join(', ') || 'none'}</dd>
              </div>
            </dl>
          </details>
        </div>
      )}
    </li>
  )
}

/**
 * The chat surface itself. `onSubmit` is injected so the component has zero
 * fetch knowledge — the caller (ConversationPage) owns the network call and
 * decides how the minimal request body is dispatched.
 */
export function WitnessRun({
  readingId,
  onSubmit,
  onContinueStandard = onSubmit,
}: WitnessRunProps) {
  const [route, setRoute] = useState<InterpretationRoute>('pattern')
  const [depth, setDepth] = useState<WitnessDepth>(1)
  const [question, setQuestion] = useState('')
  const [turns, setTurns] = useState<WitnessTurn[]>([])
  const [submitting, setSubmitting] = useState(false)
  const recoveringTurnIds = useRef<Set<string>>(new Set())

  const submit = useCallback(async () => {
    const trimmed = question.trim()
    if (!trimmed || submitting) return
    const id = generateWitnessIdempotencyKey()
    const pending: WitnessTurn = { id, route, question: trimmed, depth, status: 'pending' }
    setTurns((prev) => [...prev, pending])
    setQuestion('')
    setSubmitting(true)
    try {
      const body = buildWitnessInterpretRequest({
        readingId,
        route,
        question: trimmed,
        depth,
        idempotencyKey: id,
      })
      const response = await onSubmit(body)
      setTurns((prev) =>
        replaceWitnessTurn(prev, id, (turn) => classifyWitnessResponse(turn, { ok: true, response })),
      )
    } catch (error) {
      const { message, category } = classifyWitnessFailure(error)
      setTurns((prev) =>
        replaceWitnessTurn(prev, id, (turn) =>
          classifyWitnessResponse(turn, { ok: false, errorMessage: message, failureCategory: category }),
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }, [depth, onSubmit, question, readingId, route, submitting])

  /**
   * Shared recovery path for both "Retry" and "Continue with standard reading":
   * both re-dispatch the same question/route/depth as the original turn, with
   * a fresh idempotency key via the exact request shape.
   */
  const recoverTurn = useCallback(
    async (turnId: string, mode: WitnessRecoveryMode) => {
      const target = selectWitnessRecoveryTarget(turns, turnId, recoveringTurnIds.current)
      if (!target) return
      recoveringTurnIds.current.add(turnId)
      setTurns((prev) =>
        replaceWitnessTurn(prev, turnId, (turn) => ({ ...turn, recovering: true })),
      )

      const freshIdempotencyKey = generateWitnessIdempotencyKey()
      const body = buildWitnessRecoveryRequest({
        readingId,
        turn: target,
        idempotencyKey: freshIdempotencyKey,
      })
      const recoveryRequest = mode === 'continue-standard' ? onContinueStandard : onSubmit

      try {
        const response = await recoveryRequest(body)
        setTurns((prev) =>
          replaceWitnessTurn(prev, turnId, (turn) => classifyWitnessResponse(turn, { ok: true, response })),
        )
      } catch (error) {
        const { message, category } = classifyWitnessFailure(error)
        setTurns((prev) =>
          replaceWitnessTurn(prev, turnId, (turn) =>
            classifyWitnessResponse(turn, {
              ok: false,
              errorMessage: message,
              failureCategory: category,
            }),
          ),
        )
      } finally {
        recoveringTurnIds.current.delete(turnId)
      }
    },
    [onSubmit, onContinueStandard, readingId, turns],
  )

  /**
   * Continue with standard reading now re-uses the network recovery path, rather
   * than local-only acknowledgement. This keeps prior turns and provenance
   * while preserving the minimal contract and generating a fresh idempotency key.
   */
  const continueWithFallback = useCallback(
    (turnId: string) => {
      void recoverTurn(turnId, 'continue-standard')
    },
    [recoverTurn],
  )

  return (
    <div data-witness-run aria-label="Witness reading chat" className="space-y-5">
      <ol className="space-y-5">
        {turns.map((turn) => (
          <WitnessTurnCard
            key={turn.id}
            turn={turn}
            onRetry={(id) => void recoverTurn(id, 'retry')}
            onContinueWithFallback={continueWithFallback}
          />
        ))}
      </ol>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
        className="space-y-3 border-t border-gold/20 pt-4"
      >
        <div className="flex flex-wrap gap-2">
          {WITNESS_ROUTES.map((candidate) => (
            <button
              key={candidate}
              type="button"
              aria-pressed={route === candidate}
              onClick={() => setRoute(candidate)}
              className={[
                'min-h-9 rounded-full border px-3 text-xs uppercase tracking-[0.14em]',
                route === candidate
                  ? 'border-gold text-gold'
                  : 'border-gold/25 text-secondary hover:border-gold/50',
              ].join(' ')}
            >
              {ROUTE_LABEL[candidate]}
            </button>
          ))}
          <label className="flex items-center gap-2 text-xs text-secondary">
            Depth
            <select
              aria-label="Interpretation depth"
              value={depth}
              onChange={(event) => setDepth(Number(event.target.value) as WitnessDepth)}
              className="min-h-9 rounded border border-gold/25 bg-transparent px-2 text-parchment"
            >
              {WITNESS_DEPTHS.map((value) => (
                <option key={value} value={value}>
                  L{value}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-end gap-2">
          <label className="sr-only" htmlFor="witness-question">
            Ask about this reading
          </label>
          <textarea
            id="witness-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask a follow-up about this reading…"
            rows={2}
            className="min-h-11 flex-1 resize-none rounded border border-gold/25 bg-transparent px-3 py-2 text-sm text-parchment placeholder:text-silver/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
          <button
            type="submit"
            disabled={submitting || !question.trim()}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-gold/40 px-4 text-xs uppercase tracking-[0.16em] text-gold disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            Ask
          </button>
        </div>
      </form>
    </div>
  )
}
