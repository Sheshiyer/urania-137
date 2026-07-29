import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { InterpretationResponse } from '../../lib/readings/witnessContract'
import {
  buildWitnessRecoveryRequest,
  canRecoverWitnessTurn,
  generateWitnessIdempotencyKey,
  replaceWitnessTurn,
  classifyWitnessResponse,
  selectWitnessRecoveryTarget,
  WitnessTurnCard,
  type WitnessTurn,
} from './WitnessRun'

function baseResponse(overrides: Partial<InterpretationResponse> = {}): InterpretationResponse {
  return {
    route: 'pattern',
    agentId: 'aletheios',
    answer: 'The reading places 7 beside 3.',
    claims: [],
    question: null,
    targets: [],
    provenance: {
      readingId: 'reading-1',
      nodeId: 'birth-witness',
      agentId: 'aletheios',
      evidenceIds: [],
      model: 'selemene-llm-proxy',
    },
    degraded: false,
    ...overrides,
  }
}

describe('WitnessRun recovery helpers', () => {
  it('builds recovery request with preserved route, question, and depth', () => {
    const turn = { route: 'embodied' as const, question: 'What stands out?', depth: 2 as const }

    const firstBody = buildWitnessRecoveryRequest({
      readingId: 'reading-1',
      turn,
      idempotencyKey: 'witness-first',
    })
    const secondBody = buildWitnessRecoveryRequest({
      readingId: 'reading-1',
      turn,
      idempotencyKey: 'witness-second',
    })

    expect(firstBody).toEqual({
      readingId: 'reading-1',
      route: 'embodied',
      question: 'What stands out?',
      depth: 2,
      idempotencyKey: 'witness-first',
    })
    expect(secondBody).toEqual({
      readingId: 'reading-1',
      route: 'embodied',
      question: 'What stands out?',
      depth: 2,
      idempotencyKey: 'witness-second',
    })
    expect(firstBody.idempotencyKey).not.toBe(secondBody.idempotencyKey)
  })

  it('generates fresh idempotency keys', () => {
    const first = generateWitnessIdempotencyKey()
    const second = generateWitnessIdempotencyKey()
    expect(first).not.toBe(second)
    expect(first).toMatch(/^witness-/)
    expect(second).toMatch(/^witness-/)
  })

  it('prevents duplicate recovery while a turn is already pending or recovering', () => {
    const pending: WitnessTurn = {
      id: 't1',
      route: 'pattern',
      question: 'Ask once',
      depth: 1,
      status: 'pending',
    }
    const recovering: WitnessTurn = {
      id: 't2',
      route: 'pattern',
      question: 'Ask twice',
      depth: 1,
      status: 'error',
      recovering: true,
    }

    expect(canRecoverWitnessTurn(pending)).toBe(false)
    expect(canRecoverWitnessTurn(recovering)).toBe(false)
    expect(canRecoverWitnessTurn({ ...pending, status: 'error' })).toBe(true)
  })

  it('selects the recovery target before queued state updates and claims it once', () => {
    const recoverable: WitnessTurn = {
      id: 'recoverable',
      route: 'synthesis',
      question: 'Try this again',
      depth: 3,
      status: 'error',
    }
    const inFlight = new Set<string>()

    expect(selectWitnessRecoveryTarget([recoverable], recoverable.id, inFlight)).toBe(recoverable)
    inFlight.add(recoverable.id)
    expect(selectWitnessRecoveryTarget([recoverable], recoverable.id, inFlight)).toBeUndefined()
  })

  it('retains prior turns and only updates targeted recovery response', () => {
    const prior: WitnessTurn[] = [
      {
        id: 'first',
        route: 'pattern',
        question: 'Keep this turn',
        depth: 1,
        status: 'answered',
        response: baseResponse(),
      },
      {
        id: 'recoverable',
        route: 'synthesis',
        question: 'Retry this turn',
        depth: 3,
        status: 'error',
        errorMessage: 'Transient failure',
      },
      {
        id: 'third',
        route: 'navigate',
        question: 'And keep this one too',
        depth: 1,
        status: 'answered',
        response: baseResponse({ answer: 'Second answer' }),
      },
    ]

    const next = replaceWitnessTurn(
      prior,
      'recoverable',
      (turn) =>
        classifyWitnessResponse(turn, {
          ok: true,
          response: baseResponse({ answer: 'Recovered answer' }),
        }),
    )

    expect(next).toHaveLength(prior.length)
    expect(next[0]).toBe(prior[0])
    expect(next[2]).toBe(prior[2])
    expect(next[1]).not.toBe(prior[1])
    expect(next[1]).toMatchObject({
      id: 'recoverable',
      status: 'answered',
      response: expect.objectContaining({ answer: 'Recovered answer' }),
    })
  })
})

describe('WitnessRun recovery UI copy', () => {
  const failedTurn: WitnessTurn = {
    id: 'error-1',
    route: 'pattern',
    question: 'Where does this lead?',
    depth: 2,
    status: 'error',
    errorMessage: 'Something interrupted this reading. You can retry the question.',
    recovering: false,
  }

  const disabledErrorTurn: WitnessTurn = {
    id: 'error-2',
    route: 'embodied',
    question: 'Where does this lead?',
    depth: 1,
    status: 'error',
    errorMessage: 'This reading could not be reached. You can retry the question.',
    recovering: true,
  }

  it('renders stable reader-safe failed-turn copy without raw internals', () => {
    const markup = renderToStaticMarkup(
      createElement(WitnessTurnCard, {
        turn: failedTurn,
        onRetry: () => undefined,
        onContinueWithFallback: () => undefined,
      }),
    )

    expect(markup).toContain('Something interrupted this reading. You can retry the question.')
    expect(markup).not.toContain('AgentScope')
    expect(markup).not.toContain('remote')
    expect(markup).not.toContain('endpoint')
    expect(markup).not.toContain('token')
    expect(markup).not.toContain('trace')
    expect(markup).not.toContain('provider')
    expect(markup).not.toContain('transport')
    expect(markup).not.toContain('NDJSON')
    expect(markup).not.toContain('URL')
    expect(markup).not.toContain('bearer')
  })

  it('exposes accessible retry and standard-reading actions for failed turn', () => {
    const markup = renderToStaticMarkup(
      createElement(WitnessTurnCard, {
        turn: failedTurn,
        onRetry: () => undefined,
        onContinueWithFallback: () => undefined,
      }),
    )

    expect(markup).toContain('aria-label="Retry: Where does this lead?"')
    expect(markup).toContain('aria-label="Continue with standard reading: Where does this lead?"')
  })

  it('disables controls and shows recovery status while a recovery is in progress', () => {
    const markup = renderToStaticMarkup(
      createElement(WitnessTurnCard, {
        turn: disabledErrorTurn,
        onRetry: () => undefined,
        onContinueWithFallback: () => undefined,
      }),
    )

    expect(markup).toContain('Interpreting this turn again…')
    expect(markup).toContain('disabled=""')
    expect(markup).toContain('aria-label="Retry: Where does this lead?"')
    expect(markup).toContain('aria-label="Continue with standard reading: Where does this lead?"')
  })
})
