/**
 * T-021 — V8 core JWT-verification + identity unit tests (mock JWKS, zero network).
 *
 * The amended 6-case V8 matrix (docs/superpowers/plans/2026-07-20-…-plan.md §A):
 *   1. valid                    → resolves with decoded claims
 *   2. wrong aud                → throws AccessVerifyError('wrong-aud')
 *   3. expired                  → throws AccessVerifyError('expired')
 *   4. unsigned / alg=none      → throws AccessVerifyError('unsigned') — the
 *                                 signature is mandatory; alg=none can never
 *                                 bypass verification (no JWKS fetch happens)
 *   5. tampered signature       → throws AccessVerifyError('bad-signature')
 *   6. unknown kid              → exactly one JWKS refetch, then verifies
 *
 * Plus the exact iss behavior of functions/lib/cf-access.ts: iss == the team
 * domain is accepted in BOTH the bare form and the https://-prefixed form
 * (CF Access issues the latter); anything else → 'wrong-iss'.
 *
 * Plus T-018 identity derivation (docs/auth/contracts.md §b): sub when present,
 * else sha-256 hex of the lowercased/trimmed email — deterministic across
 * casing and whitespace; email returned lowercase; missing email → throw.
 *
 * Failure-injection note (T-021 acceptance): weakening any verify branch in
 * cf-access.ts turns the matching case red — confirmed by temporarily deleting
 * the aud check (case 2 stopped throwing) and reverting.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  AccessVerifyError,
  clearJwksCache,
  extractIdentity,
  sha256Hex,
  verifyAccessJwt,
  type RsaJwk,
} from '../lib/cf-access'

const TEAM_DOMAIN = 'v8-team.cloudflareaccess.com'
const AUD = 'v8-aud-tag-9f8e7d6c'
const ISS_HTTPS = `https://${TEAM_DOMAIN}`

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

const validClaims = () => ({
  aud: [AUD],
  iss: ISS_HTTPS,
  exp: futureExp(),
  email: 'alice@example.com',
  sub: 'cf-sub-alice-001',
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

describe('V8 — verifyAccessJwt 6-case matrix (T-021)', () => {
  it('case 1: valid token → resolves with decoded claims', async () => {
    const key = await makeKey('k1')
    const { spy, calls } = makeJwksFetch([[key.publicJwk]])
    const token = await signJwt(key, validClaims())
    const claims = await verifyAccessJwt(token, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy })
    expect(claims.email).toBe('alice@example.com')
    expect(claims.sub).toBe('cf-sub-alice-001')
    expect(claims.iss).toBe(ISS_HTTPS)
    expect(calls()).toBe(1)
  })

  it('case 2: wrong aud → wrong-aud', async () => {
    const key = await makeKey('k1')
    const { spy } = makeJwksFetch([[key.publicJwk]])
    const token = await signJwt(key, { ...validClaims(), aud: ['a-different-app-aud'] })
    await expectReason(verifyAccessJwt(token, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy }), 'wrong-aud')
  })

  it('case 2b: aud as string must contain the app AUD tag (membership, not equality)', async () => {
    const key = await makeKey('k1')
    const { spy } = makeJwksFetch([[key.publicJwk]])
    const okToken = await signJwt(key, { ...validClaims(), aud: AUD })
    const claims = await verifyAccessJwt(okToken, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy })
    expect(claims.sub).toBe('cf-sub-alice-001')
    const badToken = await signJwt(key, { ...validClaims(), aud: `prefix-${AUD}-suffix` })
    await expectReason(verifyAccessJwt(badToken, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy }), 'wrong-aud')
  })

  it('case 3: expired → expired', async () => {
    const key = await makeKey('k1')
    const { spy } = makeJwksFetch([[key.publicJwk]])
    const token = await signJwt(key, { ...validClaims(), exp: pastExp() })
    await expectReason(verifyAccessJwt(token, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy }), 'expired')
  })

  it('case 4: unsigned alg=none → unsigned, and never reaches JWKS/key verification', async () => {
    const key = await makeKey('k1')
    const { spy, calls } = makeJwksFetch([[key.publicJwk]])
    // Hand-crafted unsigned token — empty signature segment, alg=none.
    const token = `${b64urlJson({ alg: 'none', typ: 'JWT' })}.${b64urlJson(validClaims())}.`
    await expectReason(verifyAccessJwt(token, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy }), 'unsigned')
    // alg=none is rejected before any key lookup: zero JWKS fetches is the
    // proof it cannot bypass signature verification.
    expect(calls()).toBe(0)
  })

  it('case 4b: any non-RS256 alg (e.g. HS256) → unsigned', async () => {
    const key = await makeKey('k1')
    const { spy, calls } = makeJwksFetch([[key.publicJwk]])
    const token = `${b64urlJson({ alg: 'HS256', typ: 'JWT', kid: 'k1' })}.${b64urlJson(validClaims())}.${b64url(new Uint8Array([1, 2, 3]))}`
    await expectReason(verifyAccessJwt(token, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy }), 'unsigned')
    expect(calls()).toBe(0)
  })

  it('case 5: tampered signature → bad-signature', async () => {
    const key = await makeKey('k1')
    const { spy } = makeJwksFetch([[key.publicJwk]])
    const token = await signJwt(key, validClaims())
    // Flip bytes in the signature segment — payload untouched, signature no longer valid.
    const [h, p, s] = token.split('.')
    const tampered = `${h}.${p}.${s.slice(0, -4)}AAAA`
    await expectReason(verifyAccessJwt(tampered, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy }), 'bad-signature')
  })

  it('case 5b: signed by a different key under the same kid → bad-signature', async () => {
    const key = await makeKey('k1')
    const other = await makeKey('k1') // same kid, different key material
    const { spy } = makeJwksFetch([[key.publicJwk]])
    const token = await signJwt(other, validClaims())
    await expectReason(verifyAccessJwt(token, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy }), 'bad-signature')
  })

  it('case 6: unknown kid → exactly one JWKS refetch, then verifies', async () => {
    const rotated = await makeKey('k-rotated')
    const { spy, calls } = makeJwksFetch([[], [rotated.publicJwk]]) // key appears after rotation
    const token = await signJwt(rotated, validClaims())
    const claims = await verifyAccessJwt(token, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy })
    expect(claims.sub).toBe('cf-sub-alice-001')
    expect(calls()).toBe(2) // initial fetch + exactly one refetch
  })
})

describe('V8 — iss == team domain, exact behavior (T-021)', () => {
  it('accepts the bare team domain form', async () => {
    const key = await makeKey('k1')
    const { spy } = makeJwksFetch([[key.publicJwk]])
    const token = await signJwt(key, { ...validClaims(), iss: TEAM_DOMAIN })
    const claims = await verifyAccessJwt(token, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy })
    expect(claims.iss).toBe(TEAM_DOMAIN)
  })

  it('accepts the https://-prefixed team domain form (what CF Access issues)', async () => {
    const key = await makeKey('k1')
    const { spy } = makeJwksFetch([[key.publicJwk]])
    const token = await signJwt(key, { ...validClaims(), iss: ISS_HTTPS })
    const claims = await verifyAccessJwt(token, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy })
    expect(claims.iss).toBe(ISS_HTTPS)
  })

  it('rejects any other issuer → wrong-iss', async () => {
    const key = await makeKey('k1')
    const { spy } = makeJwksFetch([[key.publicJwk]])
    for (const iss of [
      'https://evil.cloudflareaccess.com',
      `http://${TEAM_DOMAIN}`, // wrong scheme is NOT accepted
      `${TEAM_DOMAIN}/`, // trailing slash is NOT accepted
      'https://cloudflareaccess.com',
    ]) {
      const token = await signJwt(key, { ...validClaims(), iss })
      await expectReason(verifyAccessJwt(token, { aud: AUD, teamDomain: TEAM_DOMAIN, fetchImpl: spy }), 'wrong-iss')
    }
  })
})

describe('V8 — extractIdentity derivation (T-021 / contracts §b)', () => {
  it('sub present → id === sub, email lowercased', async () => {
    const id = await extractIdentity({ sub: 'cf-sub-123', email: '  Alice@Example.COM ' })
    expect(id).toEqual({ id: 'cf-sub-123', email: 'alice@example.com' })
  })

  it('sub absent → id = sha-256 hex of lowercased, trimmed email', async () => {
    const id = await extractIdentity({ email: 'Alice@Example.com ' })
    expect(id.id).toBe(await sha256Hex('alice@example.com'))
    expect(id.id).toMatch(/^[0-9a-f]{64}$/)
    expect(id.email).toBe('alice@example.com')
  })

  it('deterministic across casing and surrounding whitespace', async () => {
    const a = await extractIdentity({ email: 'Alice@Example.com' })
    const b = await extractIdentity({ email: '  alice@example.com  ' })
    const c = await extractIdentity({ email: 'ALICE@EXAMPLE.COM' })
    expect(a.id).toBe(b.id)
    expect(b.id).toBe(c.id)
    expect(a.email).toBe(b.email)
  })

  it('blank/whitespace sub falls back to the email hash', async () => {
    const id = await extractIdentity({ sub: '   ', email: 'bob@example.com' })
    expect(id.id).toBe(await sha256Hex('bob@example.com'))
  })

  it('missing email → missing-claims (email is mandatory)', async () => {
    await expectReason(extractIdentity({ sub: 'cf-sub-123' }), 'missing-claims')
    await expectReason(extractIdentity({ email: '   ' }), 'missing-claims')
  })
})
