import { describe, expect, it } from 'vitest'
import {
  buildWitnessInterpretRequest,
  classifyWitnessResponse,
  generateWitnessIdempotencyKey,
  type WitnessTurn,
} from './WitnessRun'
import type { InterpretationResponse } from '../../lib/readings/witnessContract'

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

describe('buildWitnessInterpretRequest', () => {
  it('sends only the minimal public contract fields', () => {
    const body = buildWitnessInterpretRequest({
      readingId: 'reading-1',
      route: 'pattern',
      question: '  What stands out?  ',
      depth: 2,
      idempotencyKey: 'key-1',
    })
    expect(body).toEqual({
      readingId: 'reading-1',
      route: 'pattern',
      question: 'What stands out?',
      depth: 2,
      idempotencyKey: 'key-1',
    })
    expect(Object.keys(body).sort()).toEqual(
      ['depth', 'idempotencyKey', 'question', 'readingId', 'route'].sort(),
    )
  })
})

describe('generateWitnessIdempotencyKey', () => {
  it('produces a unique key each call', () => {
    const a = generateWitnessIdempotencyKey()
    const b = generateWitnessIdempotencyKey()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^witness-/)
  })
})

describe('classifyWitnessResponse', () => {
  const turn: WitnessTurn = {
    id: 'turn-1',
    route: 'pattern',
    question: 'What stands out?',
    depth: 1,
    status: 'pending',
  }

  it('marks a successful non-degraded response as answered', () => {
    const result = classifyWitnessResponse(turn, { ok: true, response: baseResponse() })
    expect(result.status).toBe('answered')
    expect(result.response?.answer).toContain('7 beside 3')
    expect(result.errorMessage).toBeUndefined()
  })

  it('marks a degraded response as degraded, preserving the failure reason', () => {
    const response = baseResponse({ degraded: true, failure: 'model-unavailable', claims: [] })
    const result = classifyWitnessResponse(turn, { ok: true, response })
    expect(result.status).toBe('degraded')
    expect(result.response?.failure).toBe('model-unavailable')
  })

  it('marks a transport failure as an error, carrying the message', () => {
    const result = classifyWitnessResponse(turn, { ok: false, errorMessage: 'network down' })
    expect(result.status).toBe('error')
    expect(result.errorMessage).toBe('network down')
    expect(result.response).toBeUndefined()
  })
})
