/**
 * POST /api/selemene/extract — route-level tests for Jev-assisted extraction,
 * driven through onRequest with the dev-identity guard and a stubbed global
 * fetch standing in for the TypeSafe API.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import type { Env } from '../lib/env'
import { onRequest } from '../api/[[path]]'
import type { JevExtraction } from '../lib/jev-extract'

const LOCAL = 'http://localhost:8788'
const TYPESAFE_KEY = 'test-typesafe-key'
const ENGINE = 'https://engine.example'

function makeEnv(over: Record<string, unknown> = {}): Env {
  return {
    CF_ACCESS_AUD: 'aud-tag',
    CF_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com',
    SELEMENE_API_KEY: 'server-key',
    SELEMENE_API_URL: ENGINE,
    DEV_IDENTITY_EMAIL: 'dev@example.com',
    TYPESAFE_API_KEY: TYPESAFE_KEY,
    ...over,
  } as Env
}

function makeCtx(request: Request, env: Env) {
  return { request, env } as unknown as Parameters<typeof onRequest>[0]
}

function stubFetch(impl: (url: string | URL | Request, init?: RequestInit) => Response | Promise<Response>) {
  const spy = vi.fn(impl)
  vi.stubGlobal('fetch', spy)
  return spy
}

function jevExtractionResponse() {
  return Response.json({
    model: 'jev-1.13.0',
    answers: {
      primary_kind: {
        type: 'choice',
        choice: 'fact-grid',
        probabilities: { 'fact-grid': 0.88, positions: 0.07, relations: 0.05 },
        confidence: 0.88,
      },
      field_zodiac_sign: { type: 'noul', noul: 0.97 },
      field_element: { type: 'noul', noul: 0.95 },
      field_ruling_planet: { type: 'noul', noul: 0.93 },
    },
    usage: { input_tokens: 350, output_tokens: 12 },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('POST /api/selemene/extract', () => {
  it('returns extracted elements for an unknown engine payload', async () => {
    const spy = stubFetch((url) => {
      if (String(url).includes('typesafe.ai')) return jevExtractionResponse()
      return new Response('not found', { status: 404 })
    })

    const res = await onRequest(
      makeCtx(
        new Request(`${LOCAL}/api/selemene/extract`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            engineId: 'zodiac-custom',
            payload: {
              zodiac_sign: 'Aries',
              element: 'Fire',
              ruling_planet: 'Mars',
            },
          }),
        }),
        makeEnv(),
      ),
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as JevExtraction
    expect(body.engineId).toBe('zodiac-custom')
    expect(body.classifiedKind).toBe('fact-grid')
    expect(body.kindConfidence).toBeCloseTo(0.88)
    expect(body.elements.length).toBeGreaterThanOrEqual(2)

    const factGrid = body.elements.find((e) => e.kind === 'fact-grid')
    expect(factGrid).toBeDefined()

    const rawEl = body.elements.find((e) => e.kind === 'raw')
    expect(rawEl).toBeDefined()

    expect(spy).toHaveBeenCalledTimes(1)
    const [callUrl, callInit] = spy.mock.calls[0] as [string, RequestInit]
    expect(callUrl).toBe('https://api.typesafe.ai/v1/systemone')
    expect((callInit.headers as Record<string, string>)['Authorization']).toBe(`Bearer ${TYPESAFE_KEY}`)
  })

  it('returns 501 when TYPESAFE_API_KEY is not set', async () => {
    stubFetch(() => new Response('should not be called', { status: 500 }))

    const res = await onRequest(
      makeCtx(
        new Request(`${LOCAL}/api/selemene/extract`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ engineId: 'test', payload: {} }),
        }),
        makeEnv({ TYPESAFE_API_KEY: undefined }),
      ),
    )

    expect(res.status).toBe(501)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.error).toBe('NOT_CONFIGURED')
  })

  it('returns 400 when engineId is missing', async () => {
    stubFetch(() => jevExtractionResponse())

    const res = await onRequest(
      makeCtx(
        new Request(`${LOCAL}/api/selemene/extract`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ payload: { some: 'data' } }),
        }),
        makeEnv(),
      ),
    )

    expect(res.status).toBe(400)
  })

  it('returns 400 when payload is missing', async () => {
    stubFetch(() => jevExtractionResponse())

    const res = await onRequest(
      makeCtx(
        new Request(`${LOCAL}/api/selemene/extract`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ engineId: 'test' }),
        }),
        makeEnv(),
      ),
    )

    expect(res.status).toBe(400)
  })

  it('returns 502 when Jev API fails', async () => {
    stubFetch(() => new Response('unauthorized', { status: 401 }))

    const res = await onRequest(
      makeCtx(
        new Request(`${LOCAL}/api/selemene/extract`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ engineId: 'test', payload: { a: 'b' } }),
        }),
        makeEnv(),
      ),
    )

    expect(res.status).toBe(502)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.error).toBe('EXTRACTION_FAILED')
  })

  it('does not interfere with the existing selemene proxy', async () => {
    const engineBody = JSON.stringify({ result: { zodiac: 'Aries' } })
    stubFetch(() => new Response(engineBody, { status: 200 }))

    const res = await onRequest(
      makeCtx(
        new Request(`${LOCAL}/api/selemene/health`, { method: 'GET' }),
        makeEnv(),
      ),
    )

    expect(res.status).toBe(200)
    expect(await res.text()).toBe(engineBody)
  })

  it('does not interfere with the validate endpoint', async () => {
    stubFetch((url) => {
      if (String(url).includes('typesafe.ai')) {
        return Response.json({
          model: 'jev-1.13.0',
          answers: {
            completeness: { type: 'noul', noul: 0.95 },
            quality: {
              type: 'score', score: 2.8,
              legend: { '0': 'E', '1': 'P', '2': 'A', '3': 'R' },
              probabilities: { '0': 0.01, '1': 0.05, '2': 0.14, '3': 0.80 },
              confidence: 0.80,
            },
            primary_kind: {
              type: 'choice', choice: 'fact-grid',
              probabilities: { 'fact-grid': 0.9 },
              confidence: 0.9,
            },
            has_vara_name: { type: 'noul', noul: 0.99 },
            has_tithi_name: { type: 'noul', noul: 0.98 },
            has_nakshatra_name: { type: 'noul', noul: 0.97 },
            has_yoga_name: { type: 'noul', noul: 0.96 },
            has_karana_name: { type: 'noul', noul: 0.95 },
          },
          usage: { input_tokens: 450, output_tokens: 18 },
        })
      }
      return new Response('not found', { status: 404 })
    })

    const res = await onRequest(
      makeCtx(
        new Request(`${LOCAL}/api/selemene/validate`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ engineId: 'panchanga', payload: { vara_name: 'Monday' } }),
        }),
        makeEnv(),
      ),
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.engineId).toBe('panchanga')
    expect(body).toHaveProperty('completeness')
  })
})
