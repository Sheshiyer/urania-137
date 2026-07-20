/**
 * P1_AuthBackend focused tests for T-017 (dev-identity guard, fail-closed).
 * T-022 (Gemini) owns the middleware-level no-bypass suite; these cover the
 * module contract directly.
 */
import { describe, it, expect } from 'vitest'
import { isLocalDevRuntime, maybeInjectDevIdentity } from '../lib/dev-identity'

const LOCAL_URL = 'http://localhost:8788/api/me'
const localReq = () => new Request(LOCAL_URL)

describe('maybeInjectDevIdentity (T-017)', () => {
  it('dev flag set + local runtime → returns the configured identity', () => {
    const id = maybeInjectDevIdentity({ DEV_IDENTITY_EMAIL: 'Alice@Example.com ' }, localReq())
    expect(id).toEqual({ sub: 'dev:alice@example.com', email: 'alice@example.com' })
  })

  it('flag unset → null (falls through to JWT verification)', () => {
    expect(maybeInjectDevIdentity({}, localReq())).toBeNull()
  })

  it('flag blank/whitespace → null', () => {
    expect(maybeInjectDevIdentity({ DEV_IDENTITY_EMAIL: '   ' }, localReq())).toBeNull()
  })

  it('flag set + CF_PAGES production marker → null', () => {
    expect(
      maybeInjectDevIdentity({ DEV_IDENTITY_EMAIL: 'a@b.c', CF_PAGES: '1' }, localReq()),
    ).toBeNull()
  })

  it('flag set + ENVIRONMENT=production → null', () => {
    expect(
      maybeInjectDevIdentity({ DEV_IDENTITY_EMAIL: 'a@b.c', ENVIRONMENT: 'production' }, localReq()),
    ).toBeNull()
  })

  it('flag set + every production marker → null (no configuration yields identity in prod)', () => {
    expect(
      maybeInjectDevIdentity(
        { DEV_IDENTITY_EMAIL: 'a@b.c', CF_PAGES: '1', ENVIRONMENT: 'production' },
        localReq(),
      ),
    ).toBeNull()
  })

  it('client-sent dev-shaped header is ignored — only the binding var is read', () => {
    const req = new Request(LOCAL_URL, { headers: { 'x-dev-identity-email': 'mallory@evil.example' } })
    expect(maybeInjectDevIdentity({}, req)).toBeNull()
  })

  it('non-loopback hostname → null even with the flag set', () => {
    const req = new Request('https://urania-137.pages.dev/api/me')
    expect(maybeInjectDevIdentity({ DEV_IDENTITY_EMAIL: 'a@b.c' }, req)).toBeNull()
  })
})

describe('isLocalDevRuntime', () => {
  it('accepts loopback hostnames with no prod markers', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]', '::1']) {
      expect(isLocalDevRuntime({}, host)).toBe(true)
    }
  })
  it('rejects on any production marker or non-local host', () => {
    expect(isLocalDevRuntime({ CF_PAGES: '1' }, 'localhost')).toBe(false)
    expect(isLocalDevRuntime({ ENVIRONMENT: 'production' }, 'localhost')).toBe(false)
    expect(isLocalDevRuntime({}, 'example.com')).toBe(false)
  })
})
