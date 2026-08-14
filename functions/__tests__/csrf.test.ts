/**
 * T-088 — CSRF protection unit tests (double-submit cookie, fail-closed).
 *
 * Locks the frozen CSRF contract:
 *   - csrfToken() issues an unpredictable base64url token (128-bit).
 *   - csrfCookieHeader() emits HttpOnly + SameSite=Strict cookie directives.
 *   - readCsrfCookie() parses only the `urania_csrf` cookie.
 *   - validateCsrf() requires BOTH header and cookie, equal, non-empty.
 *   - constantTimeEqual() returns false on length mismatch and is order-stable.
 *   - any missing/mismatched token → 403 JSON (never a redirect).
 */
import { describe, it, expect } from 'vitest'
import {
  constantTimeEqual,
  csrfCookieHeader,
  csrfToken,
  readCsrfCookie,
  validateCsrf,
} from '../lib/csrf'

const TOKEN_RE = /^[A-Za-z0-9_-]{22}$/ // 16 bytes → 22 base64url chars

function request(headers: Record<string, string>): Request {
  return new Request('http://localhost:8788/api/folio', { method: 'POST', headers })
}

describe('csrfToken', () => {
  it('emits an unpredictable base64url token of the right shape', async () => {
    const a = await csrfToken()
    const b = await csrfToken()
    expect(a).toMatch(TOKEN_RE)
    expect(b).toMatch(TOKEN_RE)
    expect(a).not.toBe(b)
  })
})

describe('csrfCookieHeader', () => {
  it('sets HttpOnly + SameSite=Strict + Path=/', () => {
    const header = csrfCookieHeader('abc123')
    expect(header).toContain('urania_csrf=abc123')
    expect(header).toContain('HttpOnly')
    expect(header).toContain('SameSite=Strict')
    expect(header).toContain('Path=/')
  })
  it('sets Secure by default and omits it when secure=false', () => {
    expect(csrfCookieHeader('abc123')).toContain('Secure')
    expect(csrfCookieHeader('abc123', false)).not.toContain('Secure')
  })
})

describe('readCsrfCookie', () => {
  it('reads only the urania_csrf cookie among others', () => {
    const req = request({ cookie: 'a=1; urania_csrf=tok123; CF_Authorization=x.y.z' })
    expect(readCsrfCookie(req)).toBe('tok123')
  })
  it('returns null when absent or empty', () => {
    expect(readCsrfCookie(request({}))).toBeNull()
    expect(readCsrfCookie(request({ cookie: 'urania_csrf=' }))).toBeNull()
  })
})

describe('constantTimeEqual', () => {
  it('true for equal, false for mismatched equal-length strings', () => {
    expect(constantTimeEqual('abcdef', 'abcdef')).toBe(true)
    expect(constantTimeEqual('abcdef', 'abcdeX')).toBe(false)
  })
  it('false for differing lengths', () => {
    expect(constantTimeEqual('abc', 'abcdef')).toBe(false)
  })
})

describe('validateCsrf', () => {
  it('accepts a matching header+cookie pair', () => {
    const token = 'a-b_c123'
    const req = request({ 'x-urania-csrf': token, cookie: `urania_csrf=${token}` })
    expect(validateCsrf(req).ok).toBe(true)
  })
  it('rejects when header is missing', () => {
    const res = validateCsrf(request({ cookie: 'urania_csrf=tok' }))
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.response!.status).toBe(403)
  })
  it('rejects when cookie is missing', () => {
    const res = validateCsrf(request({ 'x-urania-csrf': 'tok' }))
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.response!.status).toBe(403)
  })
  it('rejects a mismatched pair', async () => {
    const res = validateCsrf(
      request({ 'x-urania-csrf': 'aaaa', cookie: 'urania_csrf=bbbb' }),
    )
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.response!.status).toBe(403)
      const body = (await res.response!.json()) as { error: string }
      expect(body.error).toBe('CSRF_FAILED')
    }
  })
  it('never redirects (403 JSON only)', () => {
    const res = validateCsrf(request({}))
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.response!.headers.get('location')).toBeNull()
  })
})
