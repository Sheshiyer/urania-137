/**
 * T-022 — No-dev-bypass-in-prod + auth-required negative-path tests.
 *
 * Locks frozen decision §c (docs/auth/contracts.md) at the unit level:
 *   - dev-injection is honored ONLY when DEV_IDENTITY_EMAIL is set AND the
 *     runtime is local dev (no production markers, loopback hostname);
 *   - CF_PAGES=1 or ENVIRONMENT=production → no synthetic identity, ever;
 *   - client-supplied headers play no part in the dev-identity decision;
 *   - every unauthenticated / forged path through the middleware is a 401
 *     JSON (never a redirect, never a synthetic identity).
 *
 * Drives maybeInjectDevIdentity/isLocalDevRuntime (functions/lib/dev-identity.ts)
 * and authenticate/readAccessToken (functions/api/[[path]].ts) directly.
 */
import { describe, it, expect } from 'vitest'
import type { Env } from '../lib/env'
import { authenticate, readAccessToken } from '../api/[[path]]'
import { isLocalDevRuntime, maybeInjectDevIdentity } from '../lib/dev-identity'

const env = (over: Partial<Env> = {}): Env =>
  ({
    CF_ACCESS_AUD: 'aud-tag',
    CF_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com',
    SELEMENE_API_KEY: 'k',
    SELEMENE_API_URL: 'https://engine.example',
    ...over,
  }) as Env

const LOCAL = 'http://localhost:8788/api/me'
const DEV_FLAG = { DEV_IDENTITY_EMAIL: 'dev@example.com' } as Partial<Env>

async function expect401(res: Awaited<ReturnType<typeof authenticate>>) {
  expect(res.ok).toBe(false)
  if (res.ok) throw new Error('expected a 401 AuthResult, got ok')
  expect(res.response.status).toBe(401)
  expect(res.response.headers.get('content-type')).toContain('application/json')
  // Never a redirect to a login page — JSON API surface only.
  expect(res.response.headers.get('location')).toBeNull()
  const body = (await res.response.json()) as { error: string }
  expect(body.error).toBe('UNAUTHORIZED')
}

describe('T-022 (a) — production markers fail closed (no dev-bypass reaches prod)', () => {
  it('CF_PAGES=1 → maybeInjectDevIdentity returns null even with the dev flag set', () => {
    const prodEnv = env({ ...DEV_FLAG, CF_PAGES: '1' } as Partial<Env>)
    expect(maybeInjectDevIdentity(prodEnv, new Request(LOCAL))).toBeNull()
  })

  it('CF_PAGES=1 + dev flag + no token → middleware 401 (no synthetic identity)', async () => {
    const prodEnv = env({ ...DEV_FLAG, CF_PAGES: '1' } as Partial<Env>)
    await expect401(await authenticate(new Request(LOCAL), prodEnv))
  })

  it('ENVIRONMENT=production → null and 401, even with the dev flag set', async () => {
    const prodEnv = { ...env(DEV_FLAG), ENVIRONMENT: 'production' } as Env
    expect(maybeInjectDevIdentity(prodEnv, new Request(LOCAL))).toBeNull()
    await expect401(await authenticate(new Request(LOCAL), prodEnv))
  })

  it('non-loopback host → null even with the dev flag and no prod markers', () => {
    const publicReq = new Request('https://urania-137.pages.dev/api/me')
    expect(maybeInjectDevIdentity(env(DEV_FLAG), publicReq)).toBeNull()
    expect(isLocalDevRuntime(env(DEV_FLAG), 'urania-137.pages.dev')).toBe(false)
  })

  it('dev flag unset or blank → null (fail closed on ambiguity)', () => {
    expect(maybeInjectDevIdentity(env(), new Request(LOCAL))).toBeNull()
    expect(maybeInjectDevIdentity(env({ DEV_IDENTITY_EMAIL: '' }), new Request(LOCAL))).toBeNull()
    expect(maybeInjectDevIdentity(env({ DEV_IDENTITY_EMAIL: '   ' }), new Request(LOCAL))).toBeNull()
  })

  it('client header injection is ignored — only the binding var is read', async () => {
    // A client sends a DEV_IDENTITY_EMAIL-shaped header; env has no dev flag.
    const spoofed = new Request(LOCAL, {
      headers: { 'DEV_IDENTITY_EMAIL': 'attacker@example.com', 'x-dev-identity-email': 'attacker@example.com' },
    })
    expect(maybeInjectDevIdentity(env(), spoofed)).toBeNull()
    await expect401(await authenticate(spoofed, env()))
    // Even in local dev WITH the flag, the identity comes from the binding,
    // never from the header.
    const res = await authenticate(spoofed, env(DEV_FLAG))
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.claims.email).toBe('dev@example.com')
      expect(res.claims.sub).toBe('dev:dev@example.com')
    }
  })
})

describe('T-022 (b) — dev flag honored in local dev (env-flip pair proves the guard is real)', () => {
  it('same request, dev env → 200-equivalent (ok with identity); prod-flipped env → 401', async () => {
    const req = () => new Request(LOCAL)
    const dev = await authenticate(req(), env(DEV_FLAG))
    expect(dev.ok).toBe(true)
    if (dev.ok) {
      expect(dev.claims).toEqual({ email: 'dev@example.com', sub: 'dev:dev@example.com' })
    }
    const prod = await authenticate(req(), env({ ...DEV_FLAG, CF_PAGES: '1' } as Partial<Env>))
    await expect401(prod)
  })

  it('loopback variants (127.0.0.1, [::1]) count as local dev', () => {
    expect(isLocalDevRuntime(env(DEV_FLAG), '127.0.0.1')).toBe(true)
    expect(isLocalDevRuntime(env(DEV_FLAG), '[::1]')).toBe(true)
    expect(maybeInjectDevIdentity(env(DEV_FLAG), new Request('http://127.0.0.1:8788/api/me'))).not.toBeNull()
  })
})

describe('T-022 (c) — missing header AND missing cookie → 401', () => {
  it('no assertion at all → 401', async () => {
    await expect401(await authenticate(new Request(LOCAL), env()))
  })

  it('blank header and unrelated cookies → 401 (readAccessToken finds nothing)', async () => {
    const req = new Request(LOCAL, {
      headers: { 'Cf-Access-Jwt-Assertion': '   ', cookie: 'session=abc; other=1' },
    })
    expect(readAccessToken(req)).toBeNull()
    await expect401(await authenticate(req, env()))
  })

  it('empty CF_Authorization cookie value → 401', async () => {
    const req = new Request(LOCAL, { headers: { cookie: 'CF_Authorization=; other=1' } })
    expect(readAccessToken(req)).toBeNull()
    await expect401(await authenticate(req, env()))
  })
})

describe('T-022 (d) — forged / unsigned / malformed tokens → 401', () => {
  const b64 = (v: unknown) =>
    btoa(JSON.stringify(v)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  it('unsigned alg=none token → 401', async () => {
    const token = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ aud: 'aud-tag', iss: 'team.cloudflareaccess.com', exp: 9999999999, email: 'x@y.z' })}.`
    const req = new Request(LOCAL, { headers: { 'Cf-Access-Jwt-Assertion': token } })
    await expect401(await authenticate(req, env()))
  })

  it('malformed token (not three segments) → 401', async () => {
    const req = new Request(LOCAL, { headers: { 'Cf-Access-Jwt-Assertion': 'not-a-jwt' } })
    await expect401(await authenticate(req, env()))
  })

  it('non-base64url garbage segments → 401', async () => {
    const req = new Request(LOCAL, { headers: { 'Cf-Access-Jwt-Assertion': '%%%.&&&.***' } })
    await expect401(await authenticate(req, env()))
  })

  it('forged token in the CF_Authorization cookie → 401 (cookie path is equally guarded)', async () => {
    const token = `${b64({ alg: 'none' })}.${b64({ aud: 'aud-tag', exp: 9999999999, email: 'x@y.z' })}.`
    const req = new Request(LOCAL, { headers: { cookie: `CF_Authorization=${token}` } })
    await expect401(await authenticate(req, env()))
  })

  it('well-formed RS256 token but unreachable/invalid JWKS → 401 (verify failure never admits)', async () => {
    // Valid shape; the global fetch cannot reach the fake team domain, so the
    // verifier fails closed — the middleware maps it to 401, never 200.
    const token = `${b64({ alg: 'RS256', kid: 'k1' })}.${b64({ aud: 'aud-tag', iss: 'team.cloudflareaccess.com', exp: 9999999999, email: 'x@y.z' })}.${b64({ sig: 'forged' })}`
    const req = new Request(LOCAL, { headers: { 'Cf-Access-Jwt-Assertion': token } })
    await expect401(await authenticate(req, env({ CF_ACCESS_TEAM_DOMAIN: 'nonexistent.invalid' })))
  })
})
