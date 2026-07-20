import { describe, it, expect, vi, afterEach } from 'vitest'
import { forwardToEngine, forwardToEngineFromEnv } from './engine-proxy'
import type { Env } from './env'

const BASE = 'https://selemene.test'
const KEY = 'server-side-shared-key'

type FetchImpl = (target: string, init: RequestInit) => Promise<Response> | Response

function stubFetch(impl: FetchImpl) {
  const spy = vi.fn(impl)
  vi.stubGlobal('fetch', spy)
  return spy
}

function inbound(pathWithQuery: string, init: RequestInit = {}): Request {
  return new Request(`https://urania.pages.dev/api/selemene${pathWithQuery}`, init)
}

async function bodyText(body: BodyInit | null | undefined): Promise<string | null> {
  if (body == null) return null
  if (typeof body === 'string') return body
  if (body instanceof ReadableStream) return await new Response(body).text()
  return String(body)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('forwardToEngine (T-030)', () => {
  it('issues exactly one upstream call with method, resolved path suffix, query, and byte-identical body', async () => {
    const spy = stubFetch(() => new Response('{"ok":true}', { status: 200 }))
    const payload = JSON.stringify({ date: '2026-07-20', lat: 12.97 })
    const res = await forwardToEngine(
      inbound('/ephemeris/daily?q=1', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: payload,
      }),
      { apiKey: KEY, baseUrl: BASE },
    )
    expect(res.status).toBe(200)
    expect(spy).toHaveBeenCalledTimes(1)
    const [target, init] = spy.mock.calls[0] as unknown as [string, RequestInit]
    expect(target).toBe(`${BASE}/ephemeris/daily?q=1`)
    expect(init.method).toBe('POST')
    expect(await bodyText(init.body)).toBe(payload)
  })

  it('injects the server API key upstream and ignores spoofed client credentials', async () => {
    const spy = stubFetch(() => new Response('{}'))
    await forwardToEngine(
      inbound('/x', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': 'spoofed-key',
          authorization: 'Bearer spoofed',
          cookie: 'CF_Authorization=should-not-leak',
        },
        body: '{}',
      }),
      { apiKey: KEY, baseUrl: BASE },
    )
    const [, init] = spy.mock.calls[0] as unknown as [string, RequestInit]
    const headers = new Headers(init.headers)
    expect(headers.get('x-api-key')).toBe(KEY)
    expect(headers.get('authorization')).toBeNull()
    expect(headers.get('cookie')).toBeNull()
    expect(headers.get('content-type')).toBe('application/json')
    expect(headers.get('accept')).toBe('application/json')
  })

  it('omits the key header when no key is configured (proxy.ts parity)', async () => {
    const spy = stubFetch(() => new Response('{}'))
    await forwardToEngine(inbound('/ping'), { apiKey: '', baseUrl: BASE })
    const [, init] = spy.mock.calls[0] as unknown as [string, RequestInit]
    expect(new Headers(init.headers).get('x-api-key')).toBeNull()
  })

  it('forwards GET with query string and no body; strips trailing slashes on the base', async () => {
    const spy = stubFetch(() => new Response('[]'))
    await forwardToEngine(inbound('/planets?date=2026-07-20'), {
      apiKey: KEY,
      baseUrl: `${BASE}///`,
    })
    const [target, init] = spy.mock.calls[0] as unknown as [string, RequestInit]
    expect(target).toBe(`${BASE}/planets?date=2026-07-20`)
    expect(init.method).toBe('GET')
    expect(init.body ?? null).toBeNull()
  })

  it('handles the empty path suffix (/api/selemene with no sub-path)', async () => {
    const spy = stubFetch(() => new Response('{}'))
    await forwardToEngine(inbound(''), { apiKey: KEY, baseUrl: BASE })
    const [target] = spy.mock.calls[0] as unknown as [string, RequestInit]
    expect(target).toBe(BASE)
  })

  it('returns the engine Response object unbuffered (identity / streaming passthrough)', async () => {
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode('chunk-1'))
      },
    })
    const engineResponse = new Response(stream, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    })
    stubFetch(() => engineResponse)
    const res = await forwardToEngine(inbound('/stream'), { apiKey: KEY, baseUrl: BASE })
    // Same object, body never read by the proxy.
    expect(res).toBe(engineResponse)
    expect(res.body).toBe(stream)
  })

  it('passes engine error statuses through unaltered (status + body)', async () => {
    stubFetch(() => new Response('{"error":"engine_broke"}', { status: 500 }))
    const res = await forwardToEngine(inbound('/boom'), { apiKey: KEY, baseUrl: BASE })
    expect(res.status).toBe(500)
    expect(await res.text()).toBe('{"error":"engine_broke"}')

    stubFetch(() => new Response('not found', { status: 404 }))
    const res404 = await forwardToEngine(inbound('/nope'), { apiKey: KEY, baseUrl: BASE })
    expect(res404.status).toBe(404)
    expect(await res404.text()).toBe('not found')
  })

  it('maps a network failure to a deterministic 502 proxy_failed (proxy.ts parity)', async () => {
    stubFetch(() => {
      throw new Error('connect ECONNREFUSED')
    })
    const res = await forwardToEngine(inbound('/down'), { apiKey: KEY, baseUrl: BASE })
    expect(res.status).toBe(502)
    expect(res.headers.get('content-type')).toBe('application/json')
    const body = (await res.json()) as { error: string; message: string }
    expect(body.error).toBe('proxy_failed')
    expect(body.message).toContain('ECONNREFUSED')
  })

  it('maps an upstream hang to a deterministic 504 engine_timeout', async () => {
    stubFetch(
      (_target, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('The operation was aborted.', 'AbortError')),
          )
        }),
    )
    const res = await forwardToEngine(inbound('/hang'), {
      apiKey: KEY,
      baseUrl: BASE,
      timeoutMs: 10,
    })
    expect(res.status).toBe(504)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('engine_timeout')
  })

  it('defaults the base URL to the selemene origin when baseUrl is unset', async () => {
    const spy = stubFetch(() => new Response('{}'))
    await forwardToEngine(inbound('/x'), { apiKey: KEY })
    const [target] = spy.mock.calls[0] as unknown as [string, RequestInit]
    expect(target).toBe('https://selemene.tryambakam.space/x')
  })
})

describe('forwardToEngineFromEnv', () => {
  it('reads SELEMENE_API_URL / SELEMENE_API_KEY from the typed Env', async () => {
    const spy = stubFetch(() => new Response('{}'))
    const env = {
      SELEMENE_API_KEY: KEY,
      SELEMENE_API_URL: `${BASE}/`,
    } as unknown as Env
    await forwardToEngineFromEnv(inbound('/from-env'), env)
    const [target, init] = spy.mock.calls[0] as unknown as [string, RequestInit]
    expect(target).toBe(`${BASE}/from-env`)
    expect(new Headers(init.headers).get('x-api-key')).toBe(KEY)
  })
})
