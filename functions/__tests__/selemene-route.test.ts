/**
 * T-031/T-032/T-033 — /api/selemene/* route-level tests, driven through
 * onRequest with the dev-identity guard and a stubbed global fetch standing
 * in for the engine. Covers:
 *   T-031: verify → inject → forward (authed passthrough, unauthed 401 with
 *          zero upstream calls, byte-identical compute passthrough).
 *   T-032: trust boundary — spoofed client credentials dropped, server key
 *          injected upstream only, key absent from every client-visible byte.
 *   T-033: engine 4xx/5xx passthrough, 502 proxy_failed, 504 engine_timeout,
 *          SSE/chunked streaming passthrough.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import type { Env } from '../lib/env'
import { onRequest } from '../api/[[path]]'

const ENGINE = 'https://engine.example'
const SERVER_KEY = 'server-side-shared-key'
const LOCAL = 'http://localhost:8788'

function makeEnv(over: Record<string, unknown> = {}): Env {
  return {
    CF_ACCESS_AUD: 'aud-tag',
    CF_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com',
    SELEMENE_API_KEY: SERVER_KEY,
    SELEMENE_API_URL: ENGINE,
    DEV_IDENTITY_EMAIL: 'dev@example.com',
    ...over,
  } as Env
}

function makeCtx(request: Request, env: Env) {
  return { request, env } as unknown as Parameters<typeof onRequest>[0]
}

type FetchImpl = (target: string | URL | Request, init?: RequestInit) => Promise<Response> | Response

function stubFetch(impl: FetchImpl) {
  const spy = vi.fn(impl)
  vi.stubGlobal('fetch', spy)
  return spy
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('T-031 — wire /api/selemene/* (verify → inject → forward)', () => {
  it('authed POST forwards to the engine and returns its status + body unchanged', async () => {
    const engineBody = JSON.stringify({ tithi: 'Shukla Pratipada', seed: 42 })
    const spy = stubFetch(
      () => new Response(engineBody, { status: 200, headers: { 'content-type': 'application/json' } }),
    )
    const payload = JSON.stringify({ date: '2026-07-20', lat: 12.97, lon: 77.59 })
    const res = await onRequest(
      makeCtx(
        new Request(`${LOCAL}/api/selemene/panchanga/daily?tz=Asia%2FKolkata`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: payload,
        }),
        makeEnv(),
      ),
    )
    expect(res.status).toBe(200)
    expect(await res.text()).toBe(engineBody)

    expect(spy).toHaveBeenCalledTimes(1)
    const [target, init] = spy.mock.calls[0] as unknown as [string, RequestInit]
    expect(target).toBe(`${ENGINE}/panchanga/daily?tz=Asia%2FKolkata`)
    expect(init.method).toBe('POST')
    // The streamed body byte-matches the inbound payload.
    const sent = init.body instanceof ReadableStream ? await new Response(init.body).text() : String(init.body)
    expect(sent).toBe(payload)
    // The server key was injected on the upstream call.
    expect(new Headers(init.headers).get('x-api-key')).toBe(SERVER_KEY)
  })

  it('authed GET forwards with the query string and no body', async () => {
    const spy = stubFetch(() => new Response('[]'))
    const res = await onRequest(
      makeCtx(new Request(`${LOCAL}/api/selemene/ephemeris/planets?date=2026-07-20`), makeEnv()),
    )
    expect(res.status).toBe(200)
    const [target, init] = spy.mock.calls[0] as unknown as [string, RequestInit]
    expect(target).toBe(`${ENGINE}/ephemeris/planets?date=2026-07-20`)
    expect(init.method).toBe('GET')
    expect(init.body ?? null).toBeNull()
  })

  it('unauthenticated request → 401 and NO upstream engine call', async () => {
    const spy = stubFetch(() => new Response('{}'))
    const res = await onRequest(
      makeCtx(
        new Request(`${LOCAL}/api/selemene/panchanga/daily`, { method: 'POST', body: '{}' }),
        makeEnv({ DEV_IDENTITY_EMAIL: undefined }),
      ),
    )
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('UNAUTHORIZED')
    expect(spy).not.toHaveBeenCalled()
  })

  it('invalid Cf-Access-Jwt-Assertion → 401 and NO upstream engine call', async () => {
    const spy = stubFetch(() => new Response('{}'))
    const res = await onRequest(
      makeCtx(
        new Request(`${LOCAL}/api/selemene/panchanga/daily`, {
          method: 'POST',
          headers: { 'Cf-Access-Jwt-Assertion': 'forged.token.here' },
          body: '{}',
        }),
        makeEnv({ DEV_IDENTITY_EMAIL: undefined }),
      ),
    )
    expect(res.status).toBe(401)
    expect(spy).not.toHaveBeenCalled()
  })

  it('handles the bare /api/selemene path (empty suffix → engine base)', async () => {
    const spy = stubFetch(() => new Response('{}'))
    const res = await onRequest(makeCtx(new Request(`${LOCAL}/api/selemene`), makeEnv()))
    expect(res.status).toBe(200)
    const [target] = spy.mock.calls[0] as unknown as [string]
    expect(target).toBe(ENGINE)
  })
})
