import type { Env } from '../lib/env'
import type { ApiError, MeResponse } from '../../src/lib/api/contract'
import { AccessVerifyError, extractIdentity, verifyAccessJwt, type AccessJwtClaims } from '../lib/cf-access'
import { maybeInjectDevIdentity } from '../lib/dev-identity'
import { upsertUser } from '../lib/db'
import { forwardToEngineFromEnv } from '../lib/engine-proxy'

/**
 * Pages Functions catch-all for /api/*.
 *
 * Phase 0 (T-004): contract-shaped 501 stubs — surface + routing provable.
 * Phase 1 (T-019): CF-Access auth middleware on EVERY /api/* request — the
 *   sole trust boundary. Phase 2 (/api/selemene/*) and Phase 3 (/api/folio/*)
 *   are added behind this same gate.
 */
const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })

const stub = (name: string): Response =>
  json({ error: 'NOT_IMPLEMENTED', message: `${name} — Phase 0 stub` } satisfies ApiError, 501)

const unauthorized = (message: string): Response =>
  json({ error: 'UNAUTHORIZED', message } satisfies ApiError, 401)

export type AuthResult =
  | { ok: true; claims: AccessJwtClaims }
  | { ok: false; response: Response }

/** The CF Access token: Cf-Access-Jwt-Assertion header, else CF_Authorization cookie. */
export function readAccessToken(request: Request): string | null {
  const header = request.headers.get('Cf-Access-Jwt-Assertion')
  if (header && header.trim().length > 0) return header.trim()
  const cookie = request.headers.get('cookie')
  if (!cookie) return null
  for (const part of cookie.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === 'CF_Authorization') {
      const value = part.slice(eq + 1).trim()
      return value.length > 0 ? value : null
    }
  }
  return null
}

/**
 * T-019 — Auth middleware. Dev-injection (T-017) is honored ONLY outside
 * production and is fail-closed; otherwise the Access JWT is verified against
 * the Access JWKS (T-015). Missing/unsigned/invalid → 401 JSON (never a
 * redirect). Exported so the T-022 negative-path suite can drive it directly.
 */
export async function authenticate(request: Request, env: Env): Promise<AuthResult> {
  const dev = maybeInjectDevIdentity(env, request)
  if (dev) return { ok: true, claims: { email: dev.email, sub: dev.sub } }

  const token = readAccessToken(request)
  if (!token) {
    return { ok: false, response: unauthorized('missing Cf-Access-Jwt-Assertion header or CF_Authorization cookie') }
  }
  try {
    const claims = await verifyAccessJwt(token, {
      aud: env.CF_ACCESS_AUD,
      teamDomain: env.CF_ACCESS_TEAM_DOMAIN,
    })
    return { ok: true, claims }
  } catch (err) {
    const reason = err instanceof AccessVerifyError ? err.reason : 'verify-failed'
    return { ok: false, response: unauthorized(`access token rejected (${reason})`) }
  }
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { pathname } = new URL(ctx.request.url)
  const method = ctx.request.method

  // Sole trust boundary — every /api/* request authenticates before routing.
  const auth = await authenticate(ctx.request, ctx.env)
  if (!auth.ok) return auth.response

  // T-020 — GET /api/me: verified claims → stable identity → user upsert →
  // {id, email} (MeResponse). No token is written to or returned in the
  // browser response; CF Access owns the session cookie.
  if (pathname === '/api/me' && method === 'GET') {
    let me: MeResponse
    try {
      me = await extractIdentity(auth.claims)
    } catch (err) {
      const reason = err instanceof AccessVerifyError ? err.reason : 'identity-failed'
      return unauthorized(`cannot derive identity (${reason})`)
    }
    await upsertUser(ctx.env.DB, me)
    return json(me)
  }

  // T-020 — logout: hand the session teardown to CF Access.
  if (pathname === '/api/logout' && (method === 'GET' || method === 'POST')) {
    return new Response(null, {
      status: 302,
      headers: { location: '/cdn-cgi/access/logout' },
    })
  }

  // T-031 — ALL /api/selemene/*: CF Access verify (the middleware above) →
  // inject the server-side key → forward unbuffered. This route supersedes
  // api/proxy.ts as the sole engine entrypoint; compute passes through
  // unchanged (the lib preserves method, path suffix, query, and body).
  if (pathname === '/api/selemene' || pathname.startsWith('/api/selemene/')) {
    return forwardToEngineFromEnv(ctx.request, ctx.env)
  }
  if (pathname === '/api/folio' && method === 'GET') return stub('GET /api/folio')
  if (pathname === '/api/folio' && method === 'POST') return stub('POST /api/folio')
  if (pathname === '/api/folio/import' && method === 'POST') return stub('POST /api/folio/import')
  if (/^\/api\/folio\/[^/]+$/.test(pathname) && (method === 'PATCH' || method === 'DELETE')) return stub(`${method} /api/folio/:id`)

  return json({ error: 'NOT_FOUND', message: `no route for ${method} ${pathname}` } satisfies ApiError, 404)
}
