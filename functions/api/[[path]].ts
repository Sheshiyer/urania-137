import type { Env } from '../lib/env'
import type { ApiError, FolioListResponse, MeResponse } from '../../src/lib/api/contract'
import { AccessVerifyError, extractIdentity, verifyAccessJwt, type AccessJwtClaims } from '../lib/cf-access'
import { maybeInjectDevIdentity } from '../lib/dev-identity'
import { upsertUser, listReadings, createReading, setReadingFavorite, deleteReading } from '../lib/db'
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

const badRequest = (message: string): Response =>
  json({ error: 'BAD_REQUEST', message } satisfies ApiError, 400)

const notFound = (message: string): Response =>
  json({ error: 'NOT_FOUND', message } satisfies ApiError, 404)

/** Parse a JSON request body; null on any parse failure (caller → 400). */
async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

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

/**
 * T-033 — upstream timeout for the selemene proxy. Default 30s; overridable
 * via the optional SELEMENE_TIMEOUT_MS binding (not part of the frozen Env
 * interface — read defensively so local/tests can shorten it without touching
 * the shared env.ts). An upstream hang past this maps to a deterministic 504
 * (engine-proxy lib), never a hung client request.
 */
const SELEMENE_TIMEOUT_DEFAULT_MS = 30_000
function selemeneTimeoutMs(env: Env): number {
  const raw = (env as unknown as Record<string, unknown>).SELEMENE_TIMEOUT_MS
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN
  return Number.isFinite(n) && n > 0 ? n : SELEMENE_TIMEOUT_DEFAULT_MS
}

/**
 * Phase 3 — derive the stable per-user identity from verified claims and
 * upsert the users row (readings.user_id has a FK to users, and last_seen_at
 * advances on any authenticated folio call, not just /api/me).
 */
async function requireUser(
  env: Env,
  claims: AccessJwtClaims,
): Promise<{ ok: true; user: MeResponse } | { ok: false; response: Response }> {
  try {
    const user = await extractIdentity(claims)
    await upsertUser(env.DB, user)
    return { ok: true, user }
  } catch (err) {
    const reason = err instanceof AccessVerifyError ? err.reason : 'identity-failed'
    return { ok: false, response: unauthorized(`cannot derive identity (${reason})`) }
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
    return forwardToEngineFromEnv(ctx.request, ctx.env, selemeneTimeoutMs(ctx.env))
  }
  if (pathname === '/api/folio' && method === 'GET') {
    // T-041 — list the caller's readings with server-side ?search=/?favorites=
    // filters; response is the frozen FolioListResponse.
    const u = await requireUser(ctx.env, auth.claims)
    if (!u.ok) return u.response
    const query = new URL(ctx.request.url).searchParams
    const readings = await listReadings(ctx.env.DB, u.user.id, {
      search: query.get('search') ?? undefined,
      favoritesOnly: query.get('favorites') === 'true',
    })
    return json({ readings } satisfies FolioListResponse)
  }
  if (pathname === '/api/folio' && method === 'POST') {
    // T-042 — save a reading. Validates the frozen SaveReadingRequest; the
    // server assigns id/created_at/favorite=false. Returns 201 + stored DTO.
    const u = await requireUser(ctx.env, auth.claims)
    if (!u.ok) return u.response
    const body = await readJson(ctx.request)
    if (typeof body !== 'object' || body === null) {
      return badRequest('POST /api/folio expects a JSON object body')
    }
    const b = body as Record<string, unknown>
    for (const field of ['nodeId', 'nodeLabel', 'mode', 'title', 'content'] as const) {
      if (typeof b[field] !== 'string') {
        return badRequest(`missing or non-string required field: ${field}`)
      }
    }
    if (b.raw !== undefined && b.raw !== null && typeof b.raw !== 'string') {
      return badRequest('optional field raw must be a string when present')
    }
    const created = await createReading(ctx.env.DB, u.user.id, {
      nodeId: b.nodeId as string,
      nodeLabel: b.nodeLabel as string,
      mode: b.mode as string,
      title: b.title as string,
      content: b.content as string,
      raw: (b.raw as string | null | undefined) ?? null,
    })
    return json(created, 201)
  }
  if (pathname === '/api/folio/import' && method === 'POST') return stub('POST /api/folio/import')

  // T-043 — PATCH /api/folio/:id (explicit { favorite: boolean } set — the
  // client sends this shape) and DELETE /api/folio/:id, both ownership-guarded.
  // An unknown id and a cross-user id are INDISTINGUISHABLE (404 either way):
  // existence of another user's reading is never leaked.
  const folioId = /^\/api\/folio\/([^/]+)$/.exec(pathname)?.[1]
  if (folioId && (method === 'PATCH' || method === 'DELETE')) {
    const u = await requireUser(ctx.env, auth.claims)
    if (!u.ok) return u.response
    let id: string
    try {
      id = decodeURIComponent(folioId)
    } catch {
      return badRequest('malformed reading id')
    }
    if (method === 'PATCH') {
      const body = await readJson(ctx.request)
      const favorite = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).favorite : undefined
      if (typeof favorite !== 'boolean') {
        return badRequest('PATCH /api/folio/:id expects a JSON body { favorite: boolean }')
      }
      const updated = await setReadingFavorite(ctx.env.DB, u.user.id, id, favorite)
      if (!updated) return notFound('reading not found')
      return json(updated)
    }
    const deleted = await deleteReading(ctx.env.DB, u.user.id, id)
    if (!deleted) return notFound('reading not found')
    return json({})
  }

  return json({ error: 'NOT_FOUND', message: `no route for ${method} ${pathname}` } satisfies ApiError, 404)
}
