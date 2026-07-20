/**
 * T-015 — Port of Selemene `crates/noesis-api/src/cf_access.rs` to TypeScript.
 *
 * Frozen contract (docs/auth/contracts.md §a):
 *   - JWKS from `https://{CF_ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`,
 *     cached by `kid`, refetched on cache miss.
 *   - Validate: RS256 signature, `aud` contains CF_ACCESS_AUD, `exp` not past,
 *     `iss` == the team domain. Reject `alg: none` and any unsigned token —
 *     the signature is mandatory.
 *
 * Parity notes vs cf_access.rs:
 *   - The Rust verifier uses the `jsonwebtoken` crate; here WebCrypto
 *     (`crypto.subtle.importKey/verify` with RSASSA-PKCS1-v1_5 + SHA-256) —
 *     same algorithm family, zero npm deps, native to the workers runtime.
 *   - `iss` is accepted as either the bare team domain or
 *     `https://{teamDomain}` (CF Access issues the latter; the frozen contract
 *     says "iss == the team domain" — both exact forms are allowed, nothing
 *     else).
 *   - `aud` may be a string or string[] in the JWT; membership (`contains`)
 *     is checked per the frozen contract.
 *   - Fail-closed: any JWKS fetch failure, unknown kid (after one refetch),
 *     or malformed token throws AccessVerifyError — verification never
 *     silently succeeds.
 *
 * No network in tests: callers may inject `fetchImpl` and use
 * `clearJwksCache()` between cases.
 */

export type AccessVerifyErrorReason =
  | 'malformed'
  | 'unsigned'
  | 'unknown-kid'
  | 'bad-signature'
  | 'wrong-aud'
  | 'expired'
  | 'wrong-iss'
  | 'jwks-unavailable'

export class AccessVerifyError extends Error {
  readonly reason: AccessVerifyErrorReason
  constructor(reason: AccessVerifyErrorReason, message: string) {
    super(message)
    this.name = 'AccessVerifyError'
    this.reason = reason
  }
}

export interface VerifyOptions {
  /** The Access app AUD tag (env CF_ACCESS_AUD). */
  aud: string
  /** `{team}.cloudflareaccess.com` (env CF_ACCESS_TEAM_DOMAIN). */
  teamDomain: string
  /** Test hook — defaults to the global fetch. Production never sets this. */
  fetchImpl?: typeof fetch
}

/** RSA JWK as served by the Access certs endpoint (workers-types' JsonWebKey omits kid). */
export interface RsaJwk extends JsonWebKey {
  kid: string
  kty: 'RSA'
}

interface Jwks {
  keys: RsaJwk[]
}

interface JwksCacheEntry {
  keys: Map<string, RsaJwk>
  fetchedAt: number
}

/** In-memory JWKS cache keyed by team domain (module scope = isolate lifetime). */
const JWKS_TTL_MS = 60 * 60 * 1000 // 1h — matches common Access cert-cache guidance
const jwksCache = new Map<string, JwksCacheEntry>()

/** Test aid: drop all cached JWKS state. */
export function clearJwksCache(): void {
  jwksCache.clear()
}

export function jwksUrl(teamDomain: string): string {
  return `https://${teamDomain}/cdn-cgi/access/certs`
}

/**
 * Fetch the Access JWKS for a team domain. Returns the cached key map when it
 * is fresh; refetches on TTL expiry. Throws AccessVerifyError('jwks-unavailable')
 * on any fetch/parse failure (fail-closed).
 */
export async function fetchJwks(
  teamDomain: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Map<string, RsaJwk>> {
  const now = Date.now()
  const cached = jwksCache.get(teamDomain)
  if (cached && now - cached.fetchedAt < JWKS_TTL_MS) return cached.keys

  let body: Jwks
  try {
    const res = await fetchImpl(jwksUrl(teamDomain))
    if (!res.ok) throw new Error(`JWKS HTTP ${res.status}`)
    body = (await res.json()) as Jwks
  } catch (err) {
    throw new AccessVerifyError(
      'jwks-unavailable',
      `failed to fetch JWKS for ${teamDomain}: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
  if (!body || !Array.isArray(body.keys)) {
    throw new AccessVerifyError('jwks-unavailable', `malformed JWKS for ${teamDomain}`)
  }

  const keys = new Map<string, RsaJwk>()
  for (const key of body.keys) {
    if (key && typeof key.kid === 'string' && key.kty === 'RSA') keys.set(key.kid, key)
  }
  jwksCache.set(teamDomain, { keys, fetchedAt: now })
  return keys
}

// ---------- base64url / JSON helpers ----------

function b64urlDecode(input: string): Uint8Array {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const bin = atob(padded)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function b64urlDecodeJson(input: string): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(b64urlDecode(input)))
  } catch {
    throw new AccessVerifyError('malformed', 'JWT segment is not valid base64url JSON')
  }
}

// ---------- JWT claims shape ----------

export interface AccessJwtClaims {
  aud?: string | string[]
  iss?: string
  exp?: number
  email?: string
  sub?: string
  [key: string]: unknown
}

/**
 * Verify a CF Access JWT (from `Cf-Access-Jwt-Assertion` / `CF_Authorization`).
 * Resolves with the decoded claims; throws AccessVerifyError with a
 * discriminant `reason` on ANY failure.
 */
export async function verifyAccessJwt(
  token: string,
  opts: VerifyOptions,
): Promise<AccessJwtClaims> {
  const { aud, teamDomain, fetchImpl } = opts

  const parts = token.split('.')
  if (parts.length !== 3 || parts[0].length === 0 || parts[1].length === 0) {
    throw new AccessVerifyError('malformed', 'JWT must have header.payload.signature segments')
  }
  const [headerB64, payloadB64, signatureB64] = parts

  const header = b64urlDecodeJson(headerB64) as { alg?: unknown; kid?: unknown }
  // Signature is mandatory: alg=none and every non-RS256 alg is rejected here,
  // before any key lookup — an unsigned token can never reach verification.
  if (header.alg !== 'RS256') {
    throw new AccessVerifyError('unsigned', `unsupported alg: ${String(header.alg)}`)
  }
  if (typeof header.kid !== 'string' || header.kid.length === 0) {
    throw new AccessVerifyError('malformed', 'JWT header has no kid')
  }
  const kid = header.kid

  // Cache hit by kid; on miss refetch the JWKS exactly once, then fail closed.
  let keys = await fetchJwks(teamDomain, fetchImpl)
  let jwk = keys.get(kid)
  if (!jwk) {
    jwksCache.delete(teamDomain) // force refetch, do not serve stale cache
    keys = await fetchJwks(teamDomain, fetchImpl)
    jwk = keys.get(kid)
    if (!jwk) {
      throw new AccessVerifyError('unknown-kid', `kid ${kid} not in JWKS after refetch`)
    }
  }

  let cryptoKey: CryptoKey
  try {
    cryptoKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    )
  } catch (err) {
    throw new AccessVerifyError(
      'bad-signature',
      `JWK import failed for kid ${kid}: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  const signed = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  let ok = false
  try {
    ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, b64urlDecode(signatureB64), signed)
  } catch {
    ok = false
  }
  if (!ok) {
    throw new AccessVerifyError('bad-signature', 'RS256 signature verification failed')
  }

  const claims = b64urlDecodeJson(payloadB64) as AccessJwtClaims

  // aud contains CF_ACCESS_AUD (string or array form).
  const auds = Array.isArray(claims.aud) ? claims.aud : typeof claims.aud === 'string' ? [claims.aud] : []
  if (!auds.includes(aud)) {
    throw new AccessVerifyError('wrong-aud', `aud ${JSON.stringify(claims.aud)} does not contain the app AUD tag`)
  }

  // exp not past (JWT exp is seconds since epoch).
  if (typeof claims.exp !== 'number' || Date.now() >= claims.exp * 1000) {
    throw new AccessVerifyError('expired', 'token is expired or has no exp')
  }

  // iss == the team domain (bare or https-prefixed — CF Access issues the latter).
  if (claims.iss !== teamDomain && claims.iss !== `https://${teamDomain}`) {
    throw new AccessVerifyError('wrong-iss', `iss ${String(claims.iss)} != team domain`)
  }

  return claims
}
