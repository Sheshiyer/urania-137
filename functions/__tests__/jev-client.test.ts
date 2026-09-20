import { describe, it, expect, vi, afterEach } from 'vitest'
import { jevSystemOne, createJevClient, JevError, choice, score, noul } from '../lib/jev-client'
import type { JevResult } from '../lib/jev-client'

const API_KEY = 'test-typesafe-key'

function stubFetch(impl: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const spy = vi.fn(impl)
  vi.stubGlobal('fetch', spy)
  return spy
}

const VALID_RESULT: JevResult = {
  model: 'jev-1.13.0',
  answers: {
    is_complete: { type: 'noul', noul: 0.92 },
    quality: {
      type: 'score',
      score: 2.1,
      legend: { '0': 'Empty', '1': 'Partial', '2': 'Adequate', '3': 'Rich' },
      probabilities: { '0': 0.01, '1': 0.12, '2': 0.57, '3': 0.30 },
      confidence: 0.57,
    },
    kind: {
      type: 'choice',
      choice: 'fact-grid',
      probabilities: { 'fact-grid': 0.78, 'positions': 0.15, 'sequence': 0.07 },
      confidence: 0.78,
    },
  },
  usage: { input_tokens: 307, output_tokens: 20 },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('question builders', () => {
  it('choice builds the correct shape', () => {
    const q = choice('What kind?', { a: 'Option A', b: 'Option B' })
    expect(q).toEqual({ type: 'choice', instructions: 'What kind?', criteria: { a: 'Option A', b: 'Option B' } })
  })

  it('score builds the correct shape', () => {
    const q = score('How deep?', ['Shallow', 'Medium', 'Deep'])
    expect(q).toEqual({ type: 'score', instructions: 'How deep?', criteria: ['Shallow', 'Medium', 'Deep'] })
  })

  it('noul builds with and without arguments', () => {
    expect(noul()).toEqual({ type: 'noul' })
    expect(noul('Is it urgent?')).toEqual({ type: 'noul', instructions: 'Is it urgent?' })
    expect(noul('Is it urgent?', { true: 'Yes', false: 'No' })).toEqual({
      type: 'noul', instructions: 'Is it urgent?', criteria: { true: 'Yes', false: 'No' },
    })
  })
})

describe('jevSystemOne', () => {
  it('sends correct request shape and returns typed result', async () => {
    const spy = stubFetch(() => Response.json(VALID_RESULT))
    const result = await jevSystemOne(
      {
        state: { engineId: 'panchanga', payload: { vara_name: 'Monday' } },
        questions: {
          is_complete: noul('Is the response complete?'),
          quality: score('Rate quality', ['Empty', 'Partial', 'Adequate', 'Rich']),
          kind: choice('What kind?', { 'fact-grid': 'Facts', positions: 'Positions', sequence: 'Steps' }),
        },
      },
      { apiKey: API_KEY },
    )

    expect(spy).toHaveBeenCalledTimes(1)
    const [url, init] = spy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.typesafe.ai/v1/systemone')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Authorization']).toBe(`Bearer ${API_KEY}`)

    const body = JSON.parse(init.body as string)
    expect(body.model).toBe('jev-latest')
    expect(body.state.engineId).toBe('panchanga')
    expect(body.questions.is_complete.type).toBe('noul')
    expect(body.questions.quality.type).toBe('score')
    expect(body.questions.kind.type).toBe('choice')

    expect(result.answers.is_complete).toEqual({ type: 'noul', noul: 0.92 })
    expect(result.answers.quality.type).toBe('score')
    expect(result.answers.kind).toEqual(expect.objectContaining({ choice: 'fact-grid' }))
  })

  it('retries once on 429', async () => {
    let calls = 0
    const spy = stubFetch(() => {
      calls++
      if (calls === 1) return new Response('rate limited', { status: 429 })
      return Response.json(VALID_RESULT)
    })

    const result = await jevSystemOne(
      { state: 'test', questions: { q: noul() } },
      { apiKey: API_KEY },
    )
    expect(spy).toHaveBeenCalledTimes(2)
    expect(result.model).toBe('jev-1.13.0')
  })

  it('retries once on 500', async () => {
    let calls = 0
    stubFetch(() => {
      calls++
      if (calls === 1) return new Response('internal error', { status: 500 })
      return Response.json(VALID_RESULT)
    })

    const result = await jevSystemOne(
      { state: 'test', questions: { q: noul() } },
      { apiKey: API_KEY },
    )
    expect(result.model).toBe('jev-1.13.0')
  })

  it('throws JevError on 401 without retry', async () => {
    stubFetch(() => new Response('unauthorized', { status: 401 }))

    await expect(
      jevSystemOne({ state: 'test', questions: { q: noul() } }, { apiKey: 'bad-key' }),
    ).rejects.toThrow(JevError)
  })

  it('throws JevError on 422 without retry', async () => {
    stubFetch(() => new Response('validation failed', { status: 422 }))

    await expect(
      jevSystemOne({ state: 'test', questions: { q: noul() } }, { apiKey: API_KEY }),
    ).rejects.toThrow(JevError)
  })

  it('throws after exhausting retries on persistent 500', async () => {
    stubFetch(() => new Response('down', { status: 500 }))

    await expect(
      jevSystemOne({ state: 'test', questions: { q: noul() } }, { apiKey: API_KEY }),
    ).rejects.toThrow(JevError)
  })
})

describe('createJevClient', () => {
  it('returns null when key is undefined', () => {
    expect(createJevClient(undefined)).toBeNull()
  })

  it('returns null when key is empty string', () => {
    expect(createJevClient('')).toBeNull()
  })

  it('returns a callable client when key is present', async () => {
    stubFetch(() => Response.json(VALID_RESULT))
    const client = createJevClient(API_KEY)
    expect(client).not.toBeNull()
    const result = await client!({ state: 'test', questions: { q: noul() } })
    expect(result.model).toBe('jev-1.13.0')
  })
})
