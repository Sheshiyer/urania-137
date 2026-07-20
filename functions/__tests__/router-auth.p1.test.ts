/**
 * P1_AuthBackend focused tests for T-019 (router auth middleware) — drives
 * authenticate() and readAccessToken() directly. T-022 (Gemini) owns the full
 * no-dev-bypass negative-path suite; these cover the paths reachable without
 * a live JWKS endpoint (dev-on, missing token, unsigned/malformed forged
 * tokens — all fail before any network access).
 */
import { describe, it, expect } from 'vitest'
import type { Env } from '../lib/env'
import { authenticate, readAccessToken } from '../api/[[path]]'

const env = (over: Partial<Env> = {}): Env =>
  ({
    CF_ACCESS_AUD: 'aud-tag',
    CF_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com',
    SELEMENE_API_KEY: 'k',
    SELEMENE_API_URL: 'https://engine.example',
    ...over,
  }) as Env

const LOCAL = 'http://localhost:8788/api/me'

describe('readAccessToken', () => {
  it('reads the Cf-Access-Jwt-Assertion header', () => {
    const req = new Request(LOCAL, { headers: { 'Cf-Access-Jwt-Assertion': 'tok.here.sig' } })
    expect(readAccessToken(req)).toBe('tok.here.sig')
  })
  it('falls back to the CF_Authorization cookie', () => {
    const req = new Request(LOCAL, { headers: { cookie: 'other=1; CF_Authorization=tok.cookie.sig; x=y' } })
    expect(readAccessToken(req)).toBe('tok.cookie.sig')
  })
  it('header wins over cookie; absent both → null', () => {
    const both = new Request(LOCAL, {
      headers: { 'Cf-Access-Jwt-Assertion': 'h', cookie: 'CF_Authorization=c' },
    })
    expect(readAccessToken(both)).toBe('h')
    expect(readAccessToken(new Request(LOCAL))).toBeNull()
  })
})

describe('authenticate (T-019)', () => {
  it('dev identity honored in local dev → ok with synthetic claims', async () => {
    const res = await authenticate(new Request(LOCAL), env({ DEV_IDENTITY_EMAIL: 'dev@example.com' }))
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.claims.email).toBe('dev@example.com')
      expect(res.claims.sub).toBe('dev:dev@example.com')
    }
  })

  it('no assertion, no dev flag → 401 JSON (never a redirect)', async () => {
    const res = await authenticate(new Request(LOCAL), env())
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.response.status).toBe(401)
      expect(res.response.headers.get('content-type')).toContain('application/json')
      const body = (await res.response.json()) as { error: string }
      expect(body.error).toBe('UNAUTHORIZED')
    }
  })

  it('production marker + missing token → 401, no synthetic identity', async () => {
    const prodEnv = env({ DEV_IDENTITY_EMAIL: 'dev@example.com', CF_PAGES: '1' } as Partial<Env>)
    const res = await authenticate(new Request(LOCAL), prodEnv)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.response.status).toBe(401)
  })

  it('unsigned alg=none token → 401', async () => {
    const payload = btoa(JSON.stringify({ aud: 'aud-tag', exp: 9999999999, email: 'x@y.z' }))
    const token = `${btoa(JSON.stringify({ alg: 'none' }))}.${payload}.`
    const req = new Request(LOCAL, { headers: { 'Cf-Access-Jwt-Assertion': token } })
    const res = await authenticate(req, env())
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.response.status).toBe(401)
  })

  it('malformed token → 401', async () => {
    const req = new Request(LOCAL, { headers: { 'Cf-Access-Jwt-Assertion': 'not-a-jwt' } })
    const res = await authenticate(req, env())
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.response.status).toBe(401)
  })
})
