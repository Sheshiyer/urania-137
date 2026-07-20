import type { Env } from '../lib/env'
import type { ApiError } from '../../src/lib/api/contract'

/**
 * Pages Functions catch-all for /api/* (T-004 skeleton). Phase 0 = contract-shaped
 * 501 stubs, one distinct per endpoint, so the surface + routing are provable before
 * any behavior lands. Phase 1 adds CF-Access verification + /api/me; Phase 2 the
 * /api/selemene proxy; Phase 3 the /api/folio CRUD.
 */
const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })

const stub = (name: string): Response =>
  json({ error: 'NOT_IMPLEMENTED', message: `${name} — Phase 0 stub` } satisfies ApiError, 501)

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { pathname } = new URL(ctx.request.url)
  const method = ctx.request.method

  if (pathname === '/api/me' && method === 'GET') return stub('GET /api/me')
  if (pathname.startsWith('/api/selemene/')) return stub('ALL /api/selemene/*')
  if (pathname === '/api/folio' && method === 'GET') return stub('GET /api/folio')
  if (pathname === '/api/folio' && method === 'POST') return stub('POST /api/folio')
  if (pathname === '/api/folio/import' && method === 'POST') return stub('POST /api/folio/import')
  if (/^\/api\/folio\/[^/]+$/.test(pathname) && (method === 'PATCH' || method === 'DELETE')) return stub(`${method} /api/folio/:id`)

  return json({ error: 'NOT_FOUND', message: `no route for ${method} ${pathname}` } satisfies ApiError, 404)
}
