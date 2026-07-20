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

describe('T-032 — header & key hygiene at the route (trust boundary)', () => {
  it('spoofed client x-api-key/authorization/cookie are dropped; the server key is injected upstream', async () => {
    const spy = stubFetch(() => new Response('{"ok":true}'))
    const res = await onRequest(
      makeCtx(
        new Request(`${LOCAL}/api/selemene/panchanga/daily`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': 'spoofed-client-key',
            authorization: 'Bearer spoofed',
            cookie: 'CF_Authorization=session-material; other=1',
          },
          body: '{}',
        }),
        makeEnv(),
      ),
    )
    expect(res.status).toBe(200)
    const [, init] = spy.mock.calls[0] as unknown as [string, RequestInit]
    const upstream = new Headers(init.headers)
    expect(upstream.get('x-api-key')).toBe(SERVER_KEY)
    expect(upstream.get('authorization')).toBeNull()
    expect(upstream.get('cookie')).toBeNull()
    // Only safe headers (content-type / accept) plus the injected key go out.
    const names = [...upstream.keys()].sort()
    expect(names).toEqual(['accept', 'content-type', 'x-api-key'])
  })

  it('the SELEMENE_API_KEY string appears in NO client-visible response header or body', async () => {
    stubFetch(
      () =>
        new Response('{"reading":"engine compute"}', {
          status: 200,
          headers: { 'content-type': 'application/json', 'x-engine-trace': 'abc123' },
        }),
    )
    const res = await onRequest(
      makeCtx(new Request(`${LOCAL}/api/selemene/panchanga/daily`, { method: 'POST', body: '{}' }), makeEnv()),
    )
    expect(res.status).toBe(200)
    for (const [name, value] of res.headers.entries()) {
      expect(`${name}: ${value}`).not.toContain(SERVER_KEY)
    }
    expect(await res.text()).not.toContain(SERVER_KEY)
  })

  it('preserves the upstream status and content-type on the way back', async () => {
    stubFetch(
      () => new Response('event: daily\ndata: {"x":1}\n\n', { status: 200, headers: { 'content-type': 'text/event-stream' } }),
    )
    const res = await onRequest(makeCtx(new Request(`${LOCAL}/api/selemene/stream`), makeEnv()))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/event-stream')
    expect(await res.text()).toBe('event: daily\ndata: {"x":1}\n\n')
  })
})

describe('T-033 — error, timeout, and streaming edge mapping at the route', () => {
  it('engine 5xx/4xx pass through with status and body unaltered', async () => {
    stubFetch(() => new Response('{"error":"engine_broke"}', { status: 500 }))
    const res500 = await onRequest(
      makeCtx(new Request(`${LOCAL}/api/selemene/boom`, { method: 'POST', body: '{}' }), makeEnv()),
    )
    expect(res500.status).toBe(500)
    expect(await res500.text()).toBe('{"error":"engine_broke"}')

    stubFetch(() => new Response('not found', { status: 404 }))
    const res404 = await onRequest(makeCtx(new Request(`${LOCAL}/api/selemene/nope`), makeEnv()))
    expect(res404.status).toBe(404)
    expect(await res404.text()).toBe('not found')
  })

  it('upstream network failure → deterministic 502 proxy_failed', async () => {
    stubFetch(() => {
      throw new Error('connect ECONNREFUSED')
    })
    const res = await onRequest(makeCtx(new Request(`${LOCAL}/api/selemene/down`), makeEnv()))
    expect(res.status).toBe(502)
    const body = (await res.json()) as { error: string; message: string }
    expect(body.error).toBe('proxy_failed')
    expect(body.message).toContain('ECONNREFUSED')
    // The error envelope must not leak the server key.
    expect(JSON.stringify(body)).not.toContain(SERVER_KEY)
  })

  it('upstream hang → deterministic 504 engine_timeout (no client-side hang)', async () => {
    stubFetch(
      (_t, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('The operation was aborted.', 'AbortError')),
          )
        }),
    )
    const started = Date.now()
    const res = await onRequest(
      makeCtx(new Request(`${LOCAL}/api/selemene/hang`), makeEnv({ SELEMENE_TIMEOUT_MS: '10' })),
    )
    expect(Date.now() - started).toBeLessThan(5_000)
    expect(res.status).toBe(504)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('engine_timeout')
  })

  it('chunked/SSE engine responses stream incrementally (first bytes before stream end)', async () => {
    const encoder = new TextEncoder()
    let secondEnqueued = false
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(encoder.encode('data: chunk-1\n\n'))
        setTimeout(() => {
          secondEnqueued = true
          c.enqueue(encoder.encode('data: chunk-2\n\n'))
          c.close()
        }, 25)
      },
    })
    stubFetch(() => new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } }))
    const res = await onRequest(makeCtx(new Request(`${LOCAL}/api/selemene/stream`), makeEnv()))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/event-stream')

    const reader = res.body!.getReader()
    const first = await reader.read()
    expect(new TextDecoder().decode(first.value)).toBe('data: chunk-1\n\n')
    // The first chunk arrived before the upstream stream finished — no buffering.
    expect(secondEnqueued).toBe(false)
    const rest: string[] = []
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      rest.push(new TextDecoder().decode(value))
    }
    expect(rest.join('')).toContain('data: chunk-2\n\n')
  })
})
