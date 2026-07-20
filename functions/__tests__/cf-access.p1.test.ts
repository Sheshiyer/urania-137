/**
 * P1_AuthBackend focused tests for T-015 (cf-access.ts verify) — mock JWKS only,
 * zero network. RSA keys are generated locally with WebCrypto.
 *
 * NOTE: functions/__tests__/cf-access.test.ts is owned by the T-021/T-022/T-023
 * swarm; this file is deliberately separate to avoid same-file contention.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  AccessVerifyError,
  clearJwksCache,
  fetchJwks,
  verifyAccessJwt,
  type RsaJwk,
} from '../lib/cf-access'

const TEAM_DOMAIN = 'test-team.cloudflareaccess.com'
const AUD = 'test-aud-tag-1234'
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

async function signJwt(
  key: TestKey,
  claims: Record<string, unknown>,
  headerExtra: Record<string, unknown> = {},
): Promise<string> {
  const header = b64urlJson({ alg: 'RS256', typ: 'JWT', kid: key.kid, ...headerExtra })
  const payload = b64urlJson(claims)
  const data = `${header}.${payload}`
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key.privateKey, enc.encode(data))
  return `${data}.${b64url(new Uint8Array(sig))}`
}

const futureExp = () => Math.floor(Date.now() / 1000) + 3600
const pastExp = () => Math.floor(Date.now() / 1000) - 60

const validClaims = () => ({ aud: [AUD], iss: ISS, exp: futureExp(), email: 'alice@example.com', sub: 'sub-1' })

/** A fetch spy serving a JWKS whose key set can change between calls. */
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

describe('verifyAccessJwt (T-015)', () => {
  it('valid token → resolves with decoded claims', async () => {
    const key = await makeKey('k1')
    const { spy, calls } = makeJwksFetch([[key.publicJwk]])
    const token = await signJwt(key, validClaims())
    const claims = await verifyAccessJwt(token, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy })
    expect(claims.email).toBe('alice@example.com')
    expect(claims.sub).toBe('sub-1')
    expect(calls()).toBe(1)
  })

  it('cache hit within TTL performs no refetch', async () => {
    const key = await makeKey('k1')
    const { spy, calls } = makeJwksFetch([[key.publicJwk]])
    const token = await signJwt(key, validClaims())
    await verifyAccessJwt(token, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy })
    await verifyAccessJwt(token, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy })
    expect(calls()).toBe(1)
  })

  it('unknown kid → exactly one JWKS refetch, then verifies', async () => {
    const key = await makeKey('k-rotated')
    const { spy, calls } = makeJwksFetch([[], [key.publicJwk]]) // key appears after rotation
    const token = await signJwt(key, validClaims())
    const claims = await verifyAccessJwt(token, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy })
    expect(claims.sub).toBe('sub-1')
    expect(calls()).toBe(2) // initial fetch + exactly one refetch
  })

  it('kid absent even after refetch → unknown-kid', async () => {
    const key = await makeKey('k-gone')
    const { spy, calls } = makeJwksFetch([[]])
    const token = await signJwt(key, validClaims())
    await expectReason(verifyAccessJwt(token, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy }), 'unknown-kid')
    expect(calls()).toBe(2)
  })

  it('wrong aud → wrong-aud', async () => {
    const key = await makeKey('k1')
    const { spy } = makeJwksFetch([[key.publicJwk]])
    const token = await signJwt(key, { ...validClaims(), aud: ['someone-else'] })
    await expectReason(verifyAccessJwt(token, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy }), 'wrong-aud')
  })

  it('expired → expired', async () => {
    const key = await makeKey('k1')
    const { spy } = makeJwksFetch([[key.publicJwk]])
    const token = await signJwt(key, { ...validClaims(), exp: pastExp() })
    await expectReason(verifyAccessJwt(token, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy }), 'expired')
  })

  it('tampered signature → bad-signature', async () => {
    const key = await makeKey('k1')
    const other = await makeKey('k1') // same kid, different key material
    const { spy } = makeJwksFetch([[key.publicJwk]])
    const token = await signJwt(other, validClaims()) // signed by the wrong key
    await expectReason(verifyAccessJwt(token, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy }), 'bad-signature')
  })

  it('alg=none → unsigned (never reaches verification)', async () => {
    const key = await makeKey('k1')
    const { spy, calls } = makeJwksFetch([[key.publicJwk]])
    const token = `${b64urlJson({ alg: 'none', typ: 'JWT' })}.${b64urlJson(validClaims())}.`
    await expectReason(verifyAccessJwt(token, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy }), 'unsigned')
    expect(calls()).toBe(0)
  })

  it('wrong iss → wrong-iss', async () => {
    const key = await makeKey('k1')
    const { spy } = makeJwksFetch([[key.publicJwk]])
    const token = await signJwt(key, { ...validClaims(), iss: 'https://evil.cloudflareaccess.com' })
    await expectReason(verifyAccessJwt(token, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy }), 'wrong-iss')
  })

  it('JWKS fetch failure → fails closed (jwks-unavailable)', async () => {
    const key = await makeKey('k1')
    const failing = (async () => new Response('boom', { status: 500 })) as unknown as typeof fetch
    const token = await signJwt(key, validClaims())
    await expectReason(
      verifyAccessJwt(token, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: failing }),
      'jwks-unavailable',
    )
  })

  it('fetchJwks caches by TTL and serves the same key map', async () => {
    const key = await makeKey('k1')
    const { spy, calls } = makeJwksFetch([[key.publicJwk]])
    const a = await fetchJwks(TEAM_DOMAIN, spy)
    const b = await fetchJwks(TEAM_DOMAIN, spy)
    expect(a.get('k1')).toBeDefined()
    expect(b).toBe(a)
    expect(calls()).toBe(1)
  })
})
