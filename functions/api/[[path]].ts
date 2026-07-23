import type { Env } from '../lib/env'
import type { ApiError, FolioListResponse, ImportResponse, MeResponse, ReadingDTO } from '../../src/lib/api/contract'
import { AccessVerifyError, extractIdentity, verifyAccessJwt, type AccessJwtClaims } from '../lib/cf-access'
import { maybeInjectDevIdentity } from '../lib/dev-identity'
import { upsertUser, listReadings, createReading, setReadingFavorite, deleteReading, bulkImportReadings } from '../lib/db'
import { forwardToEngineFromEnv } from '../lib/engine-proxy'
import { isStorySeed, initialSessionState } from '../lib/chat/stateMachine'
import { createChatSession, findLatestOpenSession, getChatSession, listChatTurnEvents, listChatTurns, saveChatSession } from '../lib/chat/store'
import { createSseStream, encodeEventFrame, numberTurnEvents } from '../lib/chat/sse'
import { orchestrateTurn } from '../lib/chat/turn'
import type { ChatEvent, ChatSessionState } from '../lib/chat/types'

/**
 * Pages Functions catch-all for /api/*.
 *
 * Phase 1 (T-019): CF-Access auth middleware on EVERY /api/* request — the
 *   sole trust boundary.
 * Phase 2 (T-031..T-033): /api/selemene/* engine proxy behind that gate.
 * Phase 3 (T-041..T-044): /api/folio/* per-user readings storage (D1).
 */
const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })

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

/** Shape guard for legacy FolioEntry objects in the import payload. */
function isReadingDTO(x: unknown): x is ReadingDTO {
  if (typeof x !== 'object' || x === null) return false
  const e = x as Record<string, unknown>
  return (
    typeof e.nodeId === 'string' &&
    typeof e.nodeLabel === 'string' &&
    typeof e.mode === 'string' &&
    typeof e.title === 'string' &&
    typeof e.content === 'string' &&
    typeof e.createdAt === 'number' &&
    typeof e.favorite === 'boolean' &&
    (e.id === undefined || typeof e.id === 'string')
  )
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
  // the pre-migration serverless proxy as the sole engine entrypoint;
  // compute passes through unchanged (the lib preserves method, path
  // suffix, query, and body).
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
  if (pathname === '/api/folio/import' && method === 'POST') {
    // T-044 — idempotent bulk import of the legacy localStorage Folio. Body is
    // the frozen ImportRequest ({ entries }); malformed entries are skipped,
    // not fatal. Server-side dedupe (per-user stable key in the DAL) makes
    // re-running the same payload a no-op. Response is the frozen
    // ImportResponse ({ imported }).
    const u = await requireUser(ctx.env, auth.claims)
    if (!u.ok) return u.response
    const body = await readJson(ctx.request)
    const entries = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).entries : undefined
    if (!Array.isArray(entries)) {
      return badRequest('POST /api/folio/import expects a JSON body { entries: [...] }')
    }
    const { imported } = await bulkImportReadings(ctx.env.DB, u.user.id, entries.filter(isReadingDTO))
    return json({ imported } satisfies ImportResponse)
  }

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

  // -----------------------------------------------------------------------
  // Chat onboarding (Phase 1, W1-A) — narrative chat session backend.
  // Ownership scoping mirrors /api/folio: every read/write binds the caller's
  // user id, and unknown vs cross-user session ids are indistinguishable 404s.
  // -----------------------------------------------------------------------

  // POST /api/chat/session — create or resume the latest open session for
  // (user, seed). Body: { seed: StorySeed }. 201 on create (resumed:false),
  // 200 on resume (resumed:true).
  if (pathname === '/api/chat/session' && method === 'POST') {
    const u = await requireUser(ctx.env, auth.claims)
    if (!u.ok) return u.response
    const body = await readJson(ctx.request)
    const seed = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).seed : undefined
    if (!isStorySeed(seed)) {
      return badRequest('POST /api/chat/session expects a JSON body { seed } with a valid ChildRun/info seed')
    }
    const existing = await findLatestOpenSession(ctx.env.DB, u.user.id, seed)
    if (existing) return json({ session: existing, resumed: true })
    const state = initialSessionState(seed, { sessionId: crypto.randomUUID(), userId: u.user.id })
    await createChatSession(ctx.env.DB, state)
    return json({ session: state, resumed: false }, 201)
  }

  // GET /api/chat/session/:id — state + full turn history, ownership-guarded.
  const chatSessionId = /^\/api\/chat\/session\/([^/]+)$/.exec(pathname)?.[1]
  if (chatSessionId && method === 'GET') {
    const u = await requireUser(ctx.env, auth.claims)
    if (!u.ok) return u.response
    let id: string
    try {
      id = decodeURIComponent(chatSessionId)
    } catch {
      return badRequest('malformed session id')
    }
    const session = await getChatSession(ctx.env.DB, u.user.id, id)
    if (!session) return notFound('chat session not found')
    const turns = await listChatTurns(ctx.env.DB, id)
    return json({ session, turns })
  }

  // GET /api/chat/session/:id/events — W2 replay endpoint. Finite SSE body of
  // the session's PERSISTED narrator event stream (the exact frames live turn
  // streams emitted, in order), each with its session-wide `id:` ordinal.
  // `?after=<n>` (or the `Last-Event-ID` header) resumes after event n; a
  // disconnected client replays from its last received id and rebuilds state
  // via the same accumulation rules as a live stream (docs/chat-protocol.md).
  // Ownership-guarded like the sibling routes (unknown ≡ cross-user ≡ 404).
  const chatEventsId = /^\/api\/chat\/session\/([^/]+)\/events$/.exec(pathname)?.[1]
  if (chatEventsId && method === 'GET') {
    const u = await requireUser(ctx.env, auth.claims)
    if (!u.ok) return u.response
    let id: string
    try {
      id = decodeURIComponent(chatEventsId)
    } catch {
      return badRequest('malformed session id')
    }
    const session = await getChatSession(ctx.env.DB, u.user.id, id)
    if (!session) return notFound('chat session not found')

    const afterRaw = new URL(ctx.request.url).searchParams.get('after') ?? ctx.request.headers.get('last-event-id')
    let after = 0
    if (afterRaw !== null && afterRaw.trim() !== '') {
      after = Number(afterRaw)
      if (!Number.isInteger(after) || after < 0) {
        return badRequest('events replay expects ?after=<non-negative integer event id> (or a Last-Event-ID header)')
      }
    }

    const slices = await listChatTurnEvents(ctx.env.DB, id)
    const body = numberTurnEvents(slices)
      .filter((n) => n.id > after)
      .map((n) => encodeEventFrame(n.event, n.id))
      .join('')
    return new Response(body, {
      status: 200,
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
      },
    })
  }

  // POST /api/chat/session/:id/complete — W4 advance-on-consume. The client
  // calls this AFTER consuming the handoff payload (docs/chat-protocol.md §
  // Handoff completion): handoff → complete, persisted. Until then the
  // session stays resumable at 'handoff' (a crash before completion can retry
  // the handoff once more); afterwards create-or-resume excludes it, so a
  // remounted client can never re-fire the handoff (duplicate engine submit +
  // duplicate Folio save). Idempotent on 'complete'; 400 on any earlier
  // chapter (no handoff was ever delivered). Ownership-guarded as above.
  const chatCompleteId = /^\/api\/chat\/session\/([^/]+)\/complete$/.exec(pathname)?.[1]
  if (chatCompleteId && method === 'POST') {
    const u = await requireUser(ctx.env, auth.claims)
    if (!u.ok) return u.response
    let id: string
    try {
      id = decodeURIComponent(chatCompleteId)
    } catch {
      return badRequest('malformed session id')
    }
    const session = await getChatSession(ctx.env.DB, u.user.id, id)
    if (!session) return notFound('chat session not found')
    if (session.chapter !== 'handoff' && session.chapter !== 'complete') {
      return badRequest(`cannot complete a session in chapter '${session.chapter}' — complete is only valid after handoff`)
    }
    if (session.chapter === 'handoff') {
      const completed: ChatSessionState = { ...session, chapter: 'complete', updatedAt: new Date().toISOString() }
      const saved = await saveChatSession(ctx.env.DB, completed)
      if (!saved) return notFound('chat session not found')
      return json({ session: completed })
    }
    return json({ session })
  }

  // POST /api/chat/turn — { sessionId, input } → one narrator reply streamed
  // as SSE (see docs/chat-protocol.md). The ownership check runs BEFORE the
  // stream starts (404, indistinguishable); the stream then carries the
  // ChatEvent sequence ending in reply_end (or error).
  //
  // W2 disconnect semantics: the generator is driven to COMPLETION before any
  // frame is written — the user msg, narrator msg, session state, and the
  // emitted event sequence are all persisted before the client sees a single
  // event, so a client disconnect can never lose or truncate a turn. The
  // narrator await dominated time-to-first-event already, so buffering
  // changes nothing perceptible; heartbeats keep the wire warm during the
  // wait (and through any 30s proxy idle timeout — the narrator seam itself
  // aborts at 25s and degrades to the deterministic fallback).
  if (pathname === '/api/chat/turn' && method === 'POST') {
    const u = await requireUser(ctx.env, auth.claims)
    if (!u.ok) return u.response
    const body = await readJson(ctx.request)
    const b = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : null
    if (!b || typeof b.sessionId !== 'string' || b.sessionId.length === 0) {
      return badRequest('POST /api/chat/turn expects a JSON body { sessionId, input }')
    }
    if (!('input' in b)) {
      return badRequest('POST /api/chat/turn expects a JSON body { sessionId, input }')
    }
    const session = await getChatSession(ctx.env.DB, u.user.id, b.sessionId)
    if (!session) return notFound('chat session not found')

    const sse = createSseStream()
    void (async () => {
      const events: ChatEvent[] = []
      try {
        for await (const event of orchestrateTurn({
          db: ctx.env.DB,
          env: ctx.env,
          state: session,
          input: b.input,
        })) {
          events.push(event)
        }
      } catch (err) {
        events.push({ type: 'error', message: String((err as Error)?.message || err) })
      }

      // Event ids are assigned only to fully-persisted replies (…reply_end),
      // in the session's persisted-stream id space (1..N, shared with the
      // replay endpoint): this turn's events are the tail of that stream, so
      // base = (total persisted events) − (this turn's events). Turns ending
      // in `error` persisted no reply and stream without ids — a reconnecting
      // client simply resumes from its last good id.
      let base = 0
      const persisted = events.at(-1)?.type === 'reply_end'
      if (persisted) {
        try {
          const slices = await listChatTurnEvents(ctx.env.DB, session.sessionId)
          const total = slices.reduce((n, s) => n + s.events.length, 0)
          base = Math.max(0, total - events.length)
        } catch {
          base = 0 // id computation is best-effort; framing continues regardless
        }
      }
      events.forEach((event, i) => sse.send(event, persisted ? base + i + 1 : undefined))
      sse.close()
    })()
    return sse.response
  }

  return json({ error: 'NOT_FOUND', message: `no route for ${method} ${pathname}` } satisfies ApiError, 404)
}
