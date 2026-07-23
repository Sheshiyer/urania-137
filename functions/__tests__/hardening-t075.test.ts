/**
 * T-075 — Backend hardening negative tests.
 *
 * Three targeted proofs, per the T-075 acceptance criteria:
 *
 *  (A) /api/* error bodies leak NOTHING: across the 401/400/404/502/504
 *      surface every error body is the frozen {error, message} envelope and
 *      contains no SELEMENE key material, no stack-trace frames, and no other
 *      user's data (email, reading id/title/content). Cross-user access is an
 *      indistinguishable 404 whose body carries none of the owner's bytes.
 *
 *  (B) The JWKS cache refreshes on a kid-miss and CANNOT grow unboundedly:
 *      it is keyed by team domain (a config value, never request-derived), so
 *      a rotation storm leaves exactly ONE entry whose key map is REPLACED
 *      wholesale on every refetch — never accumulated. jwksCacheSize() (the
 *      T-075 test aid in functions/lib/cf-access.ts) proves this directly.
 *      This test fails before the aid existed and passes after — the cache
 *      behavior itself needed no fix; the test documents its correctness.
 *
 *  (C) Dev-identity guard: already locked by T-022 (auth-negative.test.ts);
 *      not duplicated here.
 *
 * Zero network: JWKS/engine fetches are injected or stubbed; D1 is the shared
 * in-memory fake.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Env } from '../lib/env'
import { onRequest } from '../api/[[path]]'
import {
  AccessVerifyError,
  clearJwksCache,
  fetchJwks,
  jwksCacheSize,
  verifyAccessJwt,
  type RsaJwk,
} from '../lib/cf-access'
import { makeFakeD1 } from './fake-d1'

const LOCAL = 'http://localhost:8788'
const SERVER_KEY = 'T075-SELEMENE-SECRET-KEY-do-not-leak'
const ENGINE = 'https://engine.example'

// Foreign (other-user) markers that must never appear in a caller's error body.
const FOREIGN_EMAIL = 'alice-secret@example.com'
const FOREIGN_TITLE = 'A-SECRET-TITLE-9f3c'
const FOREIGN_CONTENT = 'A-SECRET-CONTENT-7b21'
const FOREIGN_ID = 'a-secret-reading-id-0000'

function makeEnv(db: unknown, over: Record<string, unknown> = {}): Env {
  return {
    DB: db,
    CF_ACCESS_AUD: 'aud-tag',
    CF_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com',
    SELEMENE_API_KEY: SERVER_KEY,
    SELEMENE_API_URL: ENGINE,
    DEV_IDENTITY_EMAIL: 'bob@example.com',
    ...over,
  } as Env
}

function makeCtx(request: Request, env: Env) {
  return { request, env } as unknown as Parameters<typeof onRequest>[0]
}

/** A stack-frame pattern (file:line:col) must never reach a client body. */
const STACK_FRAME = /at\s+[\w$.<>]+\s+\([^()\n]*:\d+:\d+\)/

/**
 * Assert an error Response is the frozen envelope and carries no secret, no
 * stack, and no foreign-user bytes.
 */
async function expectCleanErrorBody(res: Response, status: number, errorCode: string) {
  expect(res.status).toBe(status)
  expect(res.headers.get('content-type')).toContain('application/json')
  const raw = await res.text()
  const body = JSON.parse(raw) as Record<string, unknown>
  // Frozen envelope: exactly {error, message}.
  expect(Object.keys(body).sort()).toEqual(['error', 'message'])
  expect(body.error).toBe(errorCode)
  expect(typeof body.message).toBe('string')
  // No SELEMENE key material.
  expect(raw).not.toContain(SERVER_KEY)
  // No stack-trace frames.
  expect(raw).not.toContain('\n    at ')
  expect(raw).not.toMatch(STACK_FRAME)
  // No other user's data.
  for (const marker of [FOREIGN_EMAIL, FOREIGN_TITLE, FOREIGN_CONTENT, FOREIGN_ID]) {
    expect(raw).not.toContain(marker)
  }
  return body
}

// ---------------------------------------------------------------------------
// (A) Error-body hygiene sweep across the /api/* error surface
// ---------------------------------------------------------------------------

describe('T-075 (A) — error bodies leak no key, no stack, no other-user data', () => {
  let fake: ReturnType<typeof makeFakeD1>

  beforeEach(async () => {
    fake = makeFakeD1()
    // Seed a reading owned by a DIFFERENT user (dev:alice-secret@example.com).
    fake.users.set('dev:' + FOREIGN_EMAIL, {
      id: 'dev:' + FOREIGN_EMAIL,
      email: FOREIGN_EMAIL,
      created_at: 1,
      last_seen_at: 1,
    })
    fake.readings.set(FOREIGN_ID, {
      id: FOREIGN_ID,
      user_id: 'dev:' + FOREIGN_EMAIL,
      node_id: 'moon',
      node_label: 'Moon',
      mode: 'daily',
      title: FOREIGN_TITLE,
      content: FOREIGN_CONTENT,
      raw: null,
      favorite: 0,
      created_at: 1,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const asBob = (req: Request, over: Record<string, unknown> = {}) =>
    makeCtx(req, makeEnv(fake.db, over))

  it('401 missing token (me / folio / selemene) — clean envelope, no upstream call', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const noDev = { DEV_IDENTITY_EMAIL: undefined }
    await expectCleanErrorBody(
      await onRequest(makeCtx(new Request(`${LOCAL}/api/me`), makeEnv(fake.db, noDev))),
      401,
      'UNAUTHORIZED',
    )
    await expectCleanErrorBody(
      await onRequest(makeCtx(new Request(`${LOCAL}/api/folio`), makeEnv(fake.db, noDev))),
      401,
      'UNAUTHORIZED',
    )
    await expectCleanErrorBody(
      await onRequest(
        makeCtx(new Request(`${LOCAL}/api/selemene/panchanga/daily`, { method: 'POST', body: '{}' }), makeEnv(fake.db, noDev)),
      ),
      401,
      'UNAUTHORIZED',
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('401 forged alg=none token — clean envelope (rejection reason is a fixed discriminant)', async () => {
    const b64 = (v: unknown) =>
      btoa(JSON.stringify(v)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const forged = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ aud: 'aud-tag', iss: 'team.cloudflareaccess.com', exp: 9999999999, email: FOREIGN_EMAIL })}.`
    const req = new Request(`${LOCAL}/api/me`, { headers: { 'Cf-Access-Jwt-Assertion': forged } })
    // Even though the forged token CARRIES the foreign email, the 401 must not echo it.
    await expectCleanErrorBody(
      await onRequest(makeCtx(req, makeEnv(fake.db, { DEV_IDENTITY_EMAIL: undefined }))),
      401,
      'UNAUTHORIZED',
    )
  })

  it('400 malformed JSON + missing fields on POST /api/folio — clean envelope', async () => {
    await expectCleanErrorBody(
      await onRequest(asBob(new Request(`${LOCAL}/api/folio`, { method: 'POST', body: '{not json' }))),
      400,
      'BAD_REQUEST',
    )
    await expectCleanErrorBody(
      await onRequest(
        asBob(
          new Request(`${LOCAL}/api/folio`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ nodeId: 'moon' }),
          }),
        ),
      ),
      400,
      'BAD_REQUEST',
    )
  })

  it('400 bad import shape on POST /api/folio/import — clean envelope', async () => {
    await expectCleanErrorBody(
      await onRequest(
        asBob(
          new Request(`${LOCAL}/api/folio/import`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ entries: 'not-an-array' }),
          }),
        ),
      ),
      400,
      'BAD_REQUEST',
    )
  })

  it('404 cross-user PATCH/DELETE of the foreign reading — indistinguishable, zero foreign bytes', async () => {
    // Bob (dev:bob@example.com) attacks Alice's reading id directly.
    await expectCleanErrorBody(
      await onRequest(
        asBob(
          new Request(`${LOCAL}/api/folio/${FOREIGN_ID}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ favorite: true }),
          }),
        ),
      ),
      404,
      'NOT_FOUND',
    )
    await expectCleanErrorBody(
      await onRequest(asBob(new Request(`${LOCAL}/api/folio/${FOREIGN_ID}`, { method: 'DELETE' }))),
      404,
      'NOT_FOUND',
    )
    // And the foreign row survived both attacks untouched.
    const row = fake.readings.get(FOREIGN_ID)
    expect(row?.favorite).toBe(0)
    expect(row?.content).toBe(FOREIGN_CONTENT)
  })

  it('404 unknown route — envelope reflects only what the client itself sent', async () => {
    const body = await expectCleanErrorBody(
      await onRequest(asBob(new Request(`${LOCAL}/api/definitely-not-a-route`))),
      404,
      'NOT_FOUND',
    )
    expect(body.message).toBe('no route for GET /api/definitely-not-a-route')
  })

  it('502 proxy_failed — fetch error message is reflected but can carry neither the key nor a stack', async () => {
    // Worst-case runtime error: a message AND a populated .stack. The proxy
    // reflects err.message only — never err.stack, and the key (an upstream
    // header) can never appear in a fetch rejection.
    vi.stubGlobal('fetch', () => {
      const err = new Error('connect ECONNREFUSED 10.0.0.9:443')
      err.stack = `Error: connect ECONNREFUSED 10.0.0.9:443\n    at fetch (internal/fetch.ts:123:45)\n    at forwardToEngine (functions/lib/engine-proxy.ts:99:12)`
      throw err
    })
    await expectCleanErrorBody(
      await onRequest(asBob(new Request(`${LOCAL}/api/selemene/down`))),
      502,
      'proxy_failed',
    )
  })

  it('504 engine_timeout — deterministic body, no key, no stack', async () => {
    vi.stubGlobal(
      'fetch',
      (_t: unknown, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('The operation was aborted.', 'AbortError')),
          )
        }),
    )
    await expectCleanErrorBody(
      await onRequest(asBob(new Request(`${LOCAL}/api/selemene/hang`), { SELEMENE_TIMEOUT_MS: '10' })),
      504,
      'engine_timeout',
    )
  })

  it('engine 5xx passthrough body is the engine\'s own — still no key added on the way back', async () => {
    vi.stubGlobal(
      'fetch',
      () => new Response('{"error":"engine_broke","detail":"internal engine state"}', { status: 500 }),
    )
    const res = await onRequest(asBob(new Request(`${LOCAL}/api/selemene/boom`, { method: 'POST', body: '{}' })))
    expect(res.status).toBe(500)
    const raw = await res.text()
    expect(raw).not.toContain(SERVER_KEY)
    expect(raw).not.toMatch(STACK_FRAME)
  })
})

// ---------------------------------------------------------------------------
// (B) JWKS cache: kid-miss refresh + bounded growth
// ---------------------------------------------------------------------------

const TEAM_DOMAIN = 't075-team.cloudflareaccess.com'
const AUD = 't075-aud'
const ISS = `https://${TEAM_DOMAIN}`
const enc = new TextEncoder()

function b64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

interface TestKey {
  kid: string
  privateKey: CryptoKey
  publicJwk: RsaJwk
}

async function makeKey(kid: string): Promise<TestKey> {
  const pair = (await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair
  const jwk = (await crypto.subtle.exportKey('jwk', pair.publicKey)) as RsaJwk
  jwk.kid = kid
  jwk.kty = 'RSA'
  jwk.alg = 'RS256'
  jwk.use = 'sig'
  return { kid, privateKey: pair.privateKey, publicJwk: jwk }
}

async function signJwt(key: TestKey, claims: Record<string, unknown>): Promise<string> {
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: key.kid })))
  const payload = b64url(new TextEncoder().encode(JSON.stringify(claims)))
  const data = `${header}.${payload}`
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key.privateKey, enc.encode(data))
  return `${data}.${b64url(new Uint8Array(sig))}`
}

const validClaims = () => ({
  aud: [AUD],
  iss: ISS,
  exp: Math.floor(Date.now() / 1000) + 3600,
  email: 'dave@example.com',
  sub: 'cf-sub-dave-001',
})

describe('T-075 (B) — JWKS cache refreshes on kid-miss and cannot grow unboundedly', () => {
  beforeEach(() => clearJwksCache())

  it('rotation storm: 12 sequential key rotations leave exactly ONE cache entry, keys replaced not accumulated', async () => {
    const keys: TestKey[] = []
    for (let i = 0; i < 12; i++) keys.push(await makeKey(`k-rot-${i}`))

    // The JWKS endpoint always serves ONLY the latest key (aggressive rotation).
    let calls = 0
    const spy = (async () => {
      const latest = keys[Math.min(calls, keys.length - 1)]
      calls++
      return new Response(JSON.stringify({ keys: [latest.publicJwk] }), { status: 200 })
    }) as unknown as typeof fetch

    // Verify a token for each successive kid. Every new kid is a cache miss →
    // exactly one forced refetch each (the T-023 behavior), then it verifies.
    for (const key of keys) {
      const token = await signJwt(key, validClaims())
      const resolved = await verifyAccessJwt(token, {
        aud: AUD,
        teamDomain: TEAM_DOMAIN,
        fetchImpl: spy,
      })
      expect(resolved.sub).toBe('cf-sub-dave-001')
    }

    // Bounded: one entry per team domain, no matter how many rotations.
    expect(jwksCacheSize()).toBe(1)
    // And the entry holds ONLY the latest served key set — replaced wholesale,
    // never unioned with older rotations.
    const cached = await fetchJwks(TEAM_DOMAIN, spy)
    expect(cached.size).toBe(1)
    expect([...cached.keys()]).toEqual([keys[keys.length - 1].kid])
    // Sanity: 1 initial fetch + 11 kid-miss refetches; the last verify was a
    // cache hit for the just-fetched latest key... every verify after the
    // first missed (each kid is new) — calls = 1 + 11 = 12.
    expect(calls).toBe(12)
  })

  it('repeated unknown-kid rejections never grow the cache and never wedge it', async () => {
    const good = await makeKey('k-good')
    const ghost = await makeKey('k-ghost')
    const spy = (async () =>
      new Response(JSON.stringify({ keys: [good.publicJwk] }), { status: 200 })) as unknown as typeof fetch

    // Ten attacks with a kid that never exists upstream — every one fails
    // closed, and the cache is rebuilt (not grown) on each attempt.
    for (let i = 0; i < 10; i++) {
      const token = await signJwt(ghost, validClaims())
      try {
        await verifyAccessJwt(token, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy })
        throw new Error('expected unknown-kid rejection')
      } catch (err) {
        expect(err).toBeInstanceOf(AccessVerifyError)
        expect((err as AccessVerifyError).reason).toBe('unknown-kid')
      }
      expect(jwksCacheSize()).toBe(1)
    }
    // The cache still works for the legitimate key afterwards (not wedged).
    const token = await signJwt(good, validClaims())
    const resolved = await verifyAccessJwt(token, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy })
    expect(resolved.sub).toBe('cf-sub-dave-001')
    expect(jwksCacheSize()).toBe(1)
  })

  it('cache size is bounded by the number of distinct CONFIGURED team domains (never request-derived)', async () => {
    // teamDomain comes from the CF_ACCESS_TEAM_DOMAIN binding only; even so,
    // N distinct domains produce exactly N entries — additive, never more.
    const domains = ['d1.example', 'd2.example', 'd3.example']
    const key = await makeKey('k-shared')
    const spy = (async () =>
      new Response(JSON.stringify({ keys: [key.publicJwk] }), { status: 200 })) as unknown as typeof fetch
    for (const domain of domains) {
      const token = await signJwt(key, { ...validClaims(), iss: `https://${domain}` })
      await verifyAccessJwt(token, { aud: AUD, teamDomain: domain, fetchImpl: spy })
    }
    expect(jwksCacheSize()).toBe(domains.length)
    // Re-verifying within the same domains adds nothing.
    for (const domain of domains) {
      const token = await signJwt(key, { ...validClaims(), iss: `https://${domain}` })
      await verifyAccessJwt(token, { aud: AUD, teamDomain: domain, fetchImpl: spy })
    }
    expect(jwksCacheSize()).toBe(domains.length)
  })
})
