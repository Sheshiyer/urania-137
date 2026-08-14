/**
 * T-088 — CSRF protection for state-changing /api/* routes (fail-closed).
 *
 * CF Access verifies the caller, but it does not bind a cross-site request to
 * a same-site intent. Any state-changing route (POST/PATCH/DELETE) that is NOT
 * already protected by an unguessable bearer credential must therefore prove a
 * same-site origin. The pattern here is double-submit-cookie:
 *
 *   - `csrfToken()`    — issue a fresh 128-bit random token (WebCrypto).
 *   - `validateCsrf()` — constant-time compare of the header/cookie pair.
 *
 * Both header and cookie must be present AND equal, or the request is rejected
 * (403). The token is opaque and unpredictable; a cross-site attacker cannot
 * read the cookie (HttpOnly) nor set the header without a matching value, so a
 * forged cross-site write fails closed.
 *
 * Constant-time comparison avoids leaking byte positions through timing.
 */

const CSRF_COOKIE = 'urania_csrf'
const CSRF_HEADER = 'x-urania-csrf'

/** 128-bit random token, base64url (WebCrypto — zero deps). */
export async function csrfToken(): Promise<string> {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Cookie header value for issuing the CSRF cookie (HttpOnly + SameSite). */
export function csrfCookieHeader(token: string, secure = true): string {
  const parts = [
    `${CSRF_COOKIE}=${token}`,
    'Path=/',
    'SameSite=Strict',
    'HttpOnly',
    'Max-Age=86400',
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

/** Extract the CSRF cookie value from a request's cookie header (null if absent). */
export function readCsrfCookie(request: Request): string | null {
  const cookie = request.headers.get('cookie')
  if (!cookie) return null
  for (const part of cookie.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === CSRF_COOKIE) {
      const value = part.slice(eq + 1).trim()
      return value.length > 0 ? value : null
    }
  }
  return null
}

/** Constant-time string equality (equal-length, no early exit on mismatch). */
export function constantTimeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a)
  const bBytes = new TextEncoder().encode(b)
  if (aBytes.length !== bBytes.length) return false
  let diff = 0
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i]
  return diff === 0
}

export interface CsrfResult {
  ok: boolean
  /** Present on failure: a fail-closed 403 response. */
  response?: Response
}

/**
 * Validate the double-submit pair. Both the `x-urania-csrf` header and the
 * `urania_csrf` cookie must be present, non-empty, and equal (constant time).
 * Anything else → fail-closed 403 JSON (never a redirect).
 */
export function validateCsrf(request: Request): CsrfResult {
  const header = request.headers.get(CSRF_HEADER)
  const cookie = readCsrfCookie(request)
  if (!header || !cookie || header.length === 0 || cookie.length === 0) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: 'CSRF_FAILED', message: 'missing CSRF token' }),
        { status: 403, headers: { 'content-type': 'application/json' } },
      ),
    }
  }
  if (!constantTimeEqual(header, cookie)) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: 'CSRF_FAILED', message: 'CSRF token mismatch' }),
        { status: 403, headers: { 'content-type': 'application/json' } },
      ),
    }
  }
  return { ok: true }
}
