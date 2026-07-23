import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadMe, redirectToAccessLogin } from '../me'

/**
 * T-076 — useMe's classification layer against live CF Access behavior.
 *
 * The acceptance bar: every unauthenticated manifestation (Worker 401, edge
 * 302 — whether followed, opaque, HTML-served, or CORS-aborted) must classify
 * as `reauth` so the hook navigates to the OTP challenge instead of spinning
 * forever or rendering a stale identity. Real failures (5xx with the frozen
 * envelope) stay ordinary errors.
 */

const jsonResponse = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  ({
    status,
    ok: status >= 200 && status < 300,
    type: 'basic',
    redirected: false,
    url: 'https://urania.tryambakam.space/api/me',
    headers: new Headers({ 'content-type': 'application/json', ...headers }),
    json: async () => body,
  }) as unknown as Response

describe('loadMe — CF Access identity classification (T-076)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('classifies a 200 JSON identity as ok', async () => {
    const me = { id: 'sub-123', email: 'a@example.com' }
    const fetchMock = vi.fn(async () => jsonResponse(200, me))
    const outcome = await loadMe(fetchMock)
    expect(outcome).toEqual({ kind: 'ok', me })
    expect(fetchMock).toHaveBeenCalledWith('/api/me', expect.objectContaining({ redirect: 'manual' }))
  })

  it('classifies the Worker 401 envelope as reauth (expired token variant)', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(401, { error: 'unauthorized', message: 'invalid or expired token' }))
    expect(await loadMe(fetchMock)).toEqual({ kind: 'reauth' })
  })

  it('classifies an opaque edge redirect (redirect: manual surfaces the 302) as reauth', async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          status: 0,
          ok: false,
          type: 'opaqueredirect',
          redirected: false,
          url: '',
          headers: new Headers(),
          json: async () => {
            throw new Error('no body')
          },
        }) as unknown as Response,
    )
    expect(await loadMe(fetchMock)).toEqual({ kind: 'reauth' })
  })

  it('classifies a bare 3xx on /api/me as reauth (Access challenge, not data)', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(302, null, { location: '/cdn-cgi/access/login' }))
    expect(await loadMe(fetchMock)).toEqual({ kind: 'reauth' })
  })

  it('classifies a followed redirect off-origin (cloudflareaccess.com) as reauth', async () => {
    vi.stubGlobal('window', { location: { origin: 'https://urania.tryambakam.space' } })
    const res = jsonResponse(200, { id: 'x', email: 'x@example.com' }) as Response & { redirected: boolean; url: string }
    Object.assign(res, { redirected: true, url: 'https://team.cloudflareaccess.com/cdn-cgi/access/login' })
    const fetchMock = vi.fn(async () => res)
    expect(await loadMe(fetchMock)).toEqual({ kind: 'reauth' })
  })

  it('classifies a 200 HTML login page (edge-served) as reauth, not identity', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, '<html>login</html>', { 'content-type': 'text/html' }))
    expect(await loadMe(fetchMock)).toEqual({ kind: 'reauth' })
  })

  it('classifies a fetch TypeError (CORS-aborted edge redirect / network down) as reauth', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    expect(await loadMe(fetchMock)).toEqual({ kind: 'reauth' })
  })

  it('keeps a 5xx with the frozen error envelope as an ordinary error', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(500, { error: 'internal', message: 'user upsert failed' }))
    expect(await loadMe(fetchMock)).toEqual({ kind: 'error', message: 'user upsert failed' })
  })

  it('falls back to a status message for a non-JSON 5xx body', async () => {
    const res = jsonResponse(503, null, { 'content-type': 'text/html' })
    const fetchMock = vi.fn(async () => res)
    const outcome = await loadMe(fetchMock)
    expect(outcome).toEqual({ kind: 'error', message: 'GET /api/me failed (503)' })
  })
})

describe('redirectToAccessLogin (T-076)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('performs a full navigation to the origin so the edge re-challenges', () => {
    const assign = vi.fn()
    vi.stubGlobal('window', { location: { origin: 'https://urania.tryambakam.space', assign } })
    redirectToAccessLogin()
    expect(assign).toHaveBeenCalledTimes(1)
    expect(assign).toHaveBeenCalledWith('https://urania.tryambakam.space/')
  })
})
