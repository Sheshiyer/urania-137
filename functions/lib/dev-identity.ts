/**
 * T-017 — Prod-safe dev-identity injection (fail-closed).
 *
 * Frozen contract (docs/auth/contracts.md §c, locked decision #6):
 *   Local `wrangler pages dev` may inject a synthetic identity via the
 *   DEV_IDENTITY_EMAIL binding var so the flow is testable without CF Access.
 *   The guard is a SINGLE fail-closed conditional: the injection is honored
 *   ONLY when the dev var is set AND the runtime is local dev. In Pages
 *   production DEV_IDENTITY_EMAIL is never set, so the branch cannot fire —
 *   and even if a client sends a DEV_IDENTITY_EMAIL-shaped header it is
 *   ignored (only binding vars are read, never request headers).
 *   No dev-bypass path yields identity in production.
 *
 * "Local dev" is established by the ABSENCE of every production marker:
 *   - CF_PAGES (set to "1" by the Pages platform in production), and
 *   - ENVIRONMENT === "production" (conventional marker if ever configured),
 * and by the request arriving on a loopback hostname (wrangler pages dev).
 * Any ambiguity → null, and the request falls through to real JWT
 * verification, where a token-less request becomes 401.
 */

export interface DevIdentityEnv {
  /** Set only in local dev (e.g. .dev.vars); NEVER in Pages production. */
  DEV_IDENTITY_EMAIL?: string
  /** "1" in Pages production (platform-set). */
  CF_PAGES?: string
  /** Conventional environment marker; "production" is treated as prod. */
  ENVIRONMENT?: string
}

export interface DevIdentity {
  sub: string
  email: string
}

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

/** True only when every signal agrees the runtime is local dev. */
export function isLocalDevRuntime(env: DevIdentityEnv, hostname: string): boolean {
  if (env.CF_PAGES) return false // Pages production marker
  if (env.ENVIRONMENT === 'production') return false
  return LOOPBACK_HOSTNAMES.has(hostname)
}

/**
 * Returns the synthetic identity {sub, email} when — and only when —
 * DEV_IDENTITY_EMAIL is configured AND the runtime is local dev. Otherwise
 * null. The request is used solely for its (platform-set) URL hostname;
 * client-supplied headers play no part in this decision.
 */
export function maybeInjectDevIdentity(env: DevIdentityEnv, request: Request): DevIdentity | null {
  const email = env.DEV_IDENTITY_EMAIL?.trim().toLowerCase()
  if (!email) return null
  let hostname: string
  try {
    hostname = new URL(request.url).hostname
  } catch {
    return null // ambiguity → fail closed
  }
  if (!isLocalDevRuntime(env, hostname)) return null
  // Deterministic, clearly-synthetic sub; distinct from any real CF Access sub.
  return { sub: `dev:${email}`, email }
}
