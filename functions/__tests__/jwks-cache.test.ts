/**
 * T-023 — JWKS cache/rotation hardening + fail-closed tests.
 *
 * Hardening contract for functions/lib/cf-access.ts:
 *   - a cache hit within the 1h TTL performs NO refetch (fetch spy asserted);
 *   - an unknown kid triggers EXACTLY ONE refetch, then verifies (rotation);
 *   - a kid still absent after the refetch fails closed ('unknown-kid') —
 *     the verifier never serves a stale cache and never admits the token;
 *   - any JWKS fetch failure (HTTP error, network throw, malformed body)
 *     fails closed: verify throws AccessVerifyError('jwks-unavailable'),
 *     it NEVER silently resolves;
 *   - an expired cache entry triggers a refetch (TTL honored).
 *
 * Mock JWKS only, zero network (fetchImpl injected everywhere).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  AccessVerifyError,
  clearJwksCache,
  fetchJwks,
  verifyAccessJwt,
  type RsaJwk,
} from '../lib/cf-access'

const TEAM_DOMAIN = 'cache-team.cloudflareaccess.com'
const AUD = 'cache-aud-tag'
const ISS = `https://${TEAM_DOMAIN}`

const enc = new TextEncoder()

function b64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlJson(value: unknown): string {
  return b64url(enc.encode(JSON.stringify(value)))
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
  const header = b64urlJson({ alg: 'RS256', typ: 'JWT', kid: key.kid })
  const payload = b64urlJson(claims)
  const data = `${header}.${payload}`
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key.privateKey, enc.encode(data))
  return `${data}.${b64url(new Uint8Array(sig))}`
}

const claims = (expOffsetSec = 3600) => ({
  aud: [AUD],
  iss: ISS,
  exp: Math.floor(Date.now() / 1000) + expOffsetSec,
  email: 'carol@example.com',
  sub: 'cf-sub-carol-001',
})

/** Fetch spy serving a rotating sequence of JWKS key sets. */
function makeJwksFetch(keySets: RsaJwk[][]) {
  let calls = 0
  const spy = (async () => {
    const keys = keySets[Math.min(calls, keySets.length - 1)]
    calls++
    return new Response(JSON.stringify({ keys }), { status: 200 })
  }) as unknown as typeof fetch
  return { spy, calls: () => calls }
}

async function expectReason(promise: Promise<unknown>, reason: string) {
  try {
    await promise
  } catch (err) {
    expect(err).toBeInstanceOf(AccessVerifyError)
    expect((err as AccessVerifyError).reason).toBe(reason)
    return
  }
  throw new Error(`expected AccessVerifyError(${reason}) but the promise resolved`)
}

beforeEach(() => clearJwksCache())
afterEach(() => vi.useRealTimers())

const opts = (spy: typeof fetch) => ({ aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy })

describe('T-023 — TTL cache behavior', () => {
  it('second verify within TTL issues zero additional fetches', async () => {
    const key = await makeKey('k1')
    const { spy, calls } = makeJwksFetch([[key.publicJwk]])
    const token = await signJwt(key, claims())
    await verifyAccessJwt(token, opts(spy))
    await verifyAccessJwt(token, opts(spy))
    await verifyAccessJwt(token, opts(spy))
    expect(calls()).toBe(1) // exactly the initial fetch; all later verifies are cache hits
  })

  it('fetchJwks returns the identical cached key map within TTL', async () => {
    const key = await makeKey('k1')
    const { spy, calls } = makeJwksFetch([[key.publicJwk]])
    const first = await fetchJwks(TEAM_DOMAIN, spy)
    const second = await fetchJwks(TEAM_DOMAIN, spy)
    expect(second).toBe(first)
    expect(calls()).toBe(1)
  })

  it('expired cache (past the 1h TTL) triggers a refetch', async () => {
    vi.useFakeTimers()
    const keyV1 = await makeKey('k1')
    const keyV2 = await makeKey('k2')
    const { spy, calls } = makeJwksFetch([[keyV1.publicJwk], [keyV1.publicJwk, keyV2.publicJwk]])
    // Token valid for 3h so it survives the >1h clock advance.
    const token = await signJwt(keyV1, claims(3 * 3600))
    await verifyAccessJwt(token, opts(spy))
    expect(calls()).toBe(1)

    vi.setSystemTime(Date.now() + 61 * 60 * 1000) // 1h01m later → TTL expired

    const rotatedToken = await signJwt(keyV2, {
      aud: [AUD],
      iss: ISS,
      exp: Math.floor(Date.now() / 1000) + 3600,
      email: 'carol@example.com',
      sub: 'cf-sub-carol-001',
    })
    const resolved = await verifyAccessJwt(rotatedToken, opts(spy))
    expect(resolved.sub).toBe('cf-sub-carol-001')
    expect(calls()).toBe(2) // the stale cache was refetched exactly once
  })
})

describe('T-023 — key rotation (unknown kid)', () => {
  it('unknown kid → exactly one refetch, then verifies', async () => {
    const rotated = await makeKey('k-rotated')
    const { spy, calls } = makeJwksFetch([[], [rotated.publicJwk]])
    const token = await signJwt(rotated, claims())
    const resolved = await verifyAccessJwt(token, opts(spy))
    expect(resolved.sub).toBe('cf-sub-carol-001')
    expect(calls()).toBe(2) // initial fetch + exactly one refetch
  })

  it('kid gone even after refetch → fail closed (unknown-kid), no third fetch', async () => {
    const gone = await makeKey('k-gone')
    const { spy, calls } = makeJwksFetch([[]]) // JWKS never contains the kid
    const token = await signJwt(gone, claims())
    await expectReason(verifyAccessJwt(token, opts(spy)), 'unknown-kid')
    expect(calls()).toBe(2) // refetched once, then refused — never more
  })

  it('unknown kid forces a refetch even when the cache is fresh (stale cache is not trusted)', async () => {
    const oldKey = await makeKey('k-old')
    const newKey = await makeKey('k-new')
    // Cache is warm with k-old; a token for k-new must NOT fail against the
    // cached set without first asking upstream — the cache is discarded and
    // exactly one refetch happens, which serves the rotated set.
    const { spy, calls } = makeJwksFetch([[oldKey.publicJwk], [oldKey.publicJwk, newKey.publicJwk]])
    const warmToken = await signJwt(oldKey, claims())
    await verifyAccessJwt(warmToken, opts(spy)) // populate the cache
    expect(calls()).toBe(1)
    const rotatedToken = await signJwt(newKey, claims())
    const resolved = await verifyAccessJwt(rotatedToken, opts(spy))
    expect(resolved.sub).toBe('cf-sub-carol-001')
    expect(calls()).toBe(2) // forced refetch despite a fresh (but stale) cache
  })
})

describe('T-023 — JWKS fetch failure fails closed (never silently accepts)', () => {
  it('HTTP error from the certs endpoint → verify throws jwks-unavailable', async () => {
    const key = await makeKey('k1')
    const failing = (async () => new Response('gateway exploded', { status: 502 })) as unknown as typeof fetch
    const token = await signJwt(key, claims())
    await expectReason(verifyAccessJwt(token, opts(failing)), 'jwks-unavailable')
  })

  it('network throw → verify throws jwks-unavailable', async () => {
    const key = await makeKey('k1')
    const throwing = (async () => {
      throw new Error('ECONNREFUSED')
    }) as unknown as typeof fetch
    const token = await signJwt(key, claims())
    await expectReason(verifyAccessJwt(token, opts(throwing)), 'jwks-unavailable')
  })

  it('malformed JWKS body (no keys array) → verify throws jwks-unavailable', async () => {
    const key = await makeKey('k1')
    const garbage = (async () =>
      new Response(JSON.stringify({ notKeys: 'nope' }), { status: 200 })) as unknown as typeof fetch
    const token = await signJwt(key, claims())
    await expectReason(verifyAccessJwt(token, opts(garbage)), 'jwks-unavailable')
  })

  it('a failed fetch does not poison the cache — a later healthy fetch verifies', async () => {
    const key = await makeKey('k1')
    let calls = 0
    const flaky = (async () => {
      calls++
      if (calls === 1) return new Response('boom', { status: 500 })
      return new Response(JSON.stringify({ keys: [key.publicJwk] }), { status: 200 })
    }) as unknown as typeof fetch
    const token = await signJwt(key, claims())
    await expectReason(verifyAccessJwt(token, opts(flaky)), 'jwks-unavailable')
    const resolved = await verifyAccessJwt(token, opts(flaky))
    expect(resolved.sub).toBe('cf-sub-carol-001')
    expect(calls).toBe(2)
  })
})
