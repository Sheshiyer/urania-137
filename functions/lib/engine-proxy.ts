import type { Env } from './env'

/**
 * Engine proxy forwarding (T-030) — a faithful port of the pre-migration
 * (Vercel-era) serverless forwarding logic to Pages Functions.
 *
 * `forwardToEngine` reconstructs the upstream request against
 * `SELEMENE_API_URL`: it preserves the method, the `/api/selemene/*` path
 * suffix, the query string, the safe headers, and the request body
 * (streamed, not buffered), and returns the engine `Response` unbuffered so
 * chunked/SSE payloads stream straight through.
 *
 * Trust boundary (T-032/T-033 surface): no auth logic lives here. The caller
 * (the `/api/selemene/*` route) verifies CF Access and passes the server-side
 * `apiKey` in; this lib only places it on the *upstream* `X-API-Key` header.
 * Client-supplied `X-API-Key` / `Authorization` headers are ignored, and the
 * key never crosses back to the client.
 */

/** Server-side shared engine key plus engine location. */
export interface EngineProxyOptions {
  /** Injected as `X-API-Key` on the upstream call only. Empty = no key header. */
  apiKey: string
  /** Engine base URL (SELEMENE_API_URL). Trailing slashes are ignored. */
  baseUrl?: string
  /** Optional upstream timeout (ms); an upstream hang maps to a deterministic 504. */
  timeoutMs?: number
}

const DEFAULT_ENGINE_BASE = 'https://selemene.tryambakam.space'
const SELEMENE_PREFIX = '/api/selemene'

/** `/api/selemene/ephemeris/daily` → `ephemeris/daily` (mirrors `req.query.path`). */
function enginePathSuffix(pathname: string): string {
  let p = pathname
  if (p.startsWith(SELEMENE_PREFIX)) p = p.slice(SELEMENE_PREFIX.length)
  return p.replace(/^\/+/, '').replace(/\/+$/, '')
}

/**
 * Forward only safe headers (content-type / accept), injecting the server
 * key. Everything else the client sent — spoofed credentials, cookies,
 * cf-* — is dropped, exactly like the pre-migration serverless proxy did.
 */
function safeOutboundHeaders(inbound: Headers, apiKey: string): Headers {
  const headers = new Headers()
  headers.set('Content-Type', inbound.get('content-type') ?? 'application/json')
  headers.set('Accept', inbound.get('accept') ?? 'application/json')
  if (apiKey) headers.set('X-API-Key', apiKey)
  return headers
}

function jsonError(status: number, error: string, message: string): Response {
  return new Response(JSON.stringify({ error, message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Forward `req` (the inbound Pages-Functions request for `/api/selemene/*`)
 * to the engine and return the engine Response unbuffered.
 *
 * Engine 4xx/5xx statuses pass through unaltered (status + body + headers).
 * A network failure maps to a deterministic `502 proxy_failed` (the
 * pre-migration proxy's behavior); an upstream hang past `timeoutMs` maps to
 * `504 engine_timeout`.
 */
export async function forwardToEngine(
  req: Request,
  opts: EngineProxyOptions,
): Promise<Response> {
  const base = (opts.baseUrl || DEFAULT_ENGINE_BASE).replace(/\/+$/, '')
  const url = new URL(req.url)
  const suffix = enginePathSuffix(url.pathname)
  const target = suffix ? `${base}/${suffix}${url.search}` : `${base}${url.search}`

  const method = (req.method || 'GET').toUpperCase()
  const hasBody = method !== 'GET' && method !== 'HEAD'

  const controller = opts.timeoutMs ? new AbortController() : undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  if (controller && opts.timeoutMs) {
    timer = setTimeout(() => controller.abort(), opts.timeoutMs)
  }

  // `duplex` is required by undici-style runtimes for a streamed request
  // body; workers-types omits it, so it is applied via cast.
  const init = {
    method,
    headers: safeOutboundHeaders(req.headers, opts.apiKey),
    // Stream the inbound body upstream — never buffered, byte-identical.
    body: hasBody ? req.body : null,
    ...(controller ? { signal: controller.signal } : {}),
    duplex: 'half',
  } as RequestInit

  try {
    return await fetch(target, init)
  } catch (err) {
    if (controller?.signal.aborted) {
      return jsonError(504, 'engine_timeout', `upstream engine timed out after ${opts.timeoutMs}ms`)
    }
    return jsonError(502, 'proxy_failed', String((err as Error)?.message || err))
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

/** Convenience wrapper: pull the engine key/URL from the typed Pages env (T-005). */
export function forwardToEngineFromEnv(
  req: Request,
  env: Env,
  timeoutMs?: number,
): Promise<Response> {
  return forwardToEngine(req, {
    apiKey: env.SELEMENE_API_KEY,
    baseUrl: env.SELEMENE_API_URL,
    timeoutMs,
  })
}
