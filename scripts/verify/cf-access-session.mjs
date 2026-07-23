/**
 * CF Access session plumbing for the prod-hitting verify scripts (T-074).
 *
 * Production sits behind Cloudflare Access (email OTP, team red-queen-4dfa) on
 * BOTH hostnames (urania.tryambakam.space + urania-137.pages.dev), so any
 * script that hits the Pages app base must carry a session or it gets a
 * 302 → OTP login instead of JSON.
 *
 * Usage: set CF_ACCESS_SESSION in the env. Token forms (mirrors
 * scripts/verify/auth-gates.mjs, with the T-074 amendment):
 *   cookie:<value>        → Cookie: CF_Authorization=<value>
 *   <bare JWT> / jwt:<t>  → ALSO mapped to the Cookie: CF_Authorization form —
 *                           the production edge does NOT accept an inbound
 *                           Cf-Access-Jwt-Assertion header (verified live).
 *   service:<id>:<secret> → CF-Access-Client-Id / CF-Access-Client-Secret
 *
 * The session header is attached ONLY to requests aimed at the Pages app base
 * — never to requests that go directly to the engine
 * (selemene.tryambakam.space, which authenticates via x-api-key).
 */

export const SESSION_SPEC = process.env.CF_ACCESS_SESSION || ''

/** A session spec → request headers (see the forms above). */
export function cfSessionHeaders(spec = SESSION_SPEC) {
  if (!spec) return {}
  if (spec.startsWith('cookie:')) return { cookie: `CF_Authorization=${spec.slice('cookie:'.length)}` }
  if (spec.startsWith('service:')) {
    const [, id, secret] = spec.split(':')
    return { 'CF-Access-Client-Id': id, 'CF-Access-Client-Secret': secret }
  }
  // bare JWT or jwt:<jwt> → cookie form (the edge rejects inbound
  // Cf-Access-Jwt-Assertion — verified live, T-074).
  return { cookie: `CF_Authorization=${spec.startsWith('jwt:') ? spec.slice(4) : spec}` }
}

/** True when `base` addresses the engine directly (x-api-key path, no Access). */
export const isEngineDirect = (base) => {
  try { return /(^|\.)selemene\.tryambakam\.space$/i.test(new URL(base).hostname) } catch { return false }
}

/** Session headers for requests to `base`; empty for the direct engine. */
export const sessionHeadersFor = (base) => (isEngineDirect(base) ? {} : cfSessionHeaders())

/** True when a response is the CF Access edge OTP challenge. */
export const isAccessChallenge = (status, location) =>
  [301, 302, 303, 307, 308].includes(status) && /cloudflareaccess|cdn-cgi\/access/i.test(location || '')

/** Loud, unambiguous detail string when the Access edge intercepts a run. */
export const accessBlockedDetail = (hadSession) =>
  hadSession
    ? 'session rejected at CF Access edge (expired/invalid CF_ACCESS_SESSION?)'
    : 'blocked at CF Access edge — set CF_ACCESS_SESSION'
