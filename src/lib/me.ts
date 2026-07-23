import type { ApiError, MeResponse } from './api/contract'

/**
 * Identity loading for the SPA behind Cloudflare Access (T-076).
 *
 * CF Access owns the session cookie; the SPA only ever GETs /api/me. The hard
 * part is that an expired/absent edge session does NOT always surface as a
 * clean Worker 401 — the Access edge 302s the fetch toward the OTP login, and
 * depending on where the redirect chain goes that manifests as one of:
 *
 *   - res.status 401              — the request passed the edge but failed
 *                                   Worker verification (frozen {error,message}
 *                                   envelope). Unauthenticated, for sure.
 *   - res.redirected              — fetch followed the edge 302; the final URL
 *                                   leaves our origin (cloudflareaccess.com) or
 *                                   lands on /cdn-cgi/*. Not our API.
 *   - res.ok but non-JSON         — the edge's redirect target returned HTML
 *                                   (the login page) with a 200. Not our API.
 *   - fetch throws TypeError      — the cross-origin redirect target failed
 *                                   CORS, surfacing as "Failed to fetch".
 *
 * All four mean the same thing: the browser must re-authenticate. loadMe
 * classifies them as `reauth`; useMe then performs a full navigation to the
 * origin so the Access edge re-challenges with the OTP login (no infinite
 * spinner, no stale identity rendered). This cannot loop: the edge either
 * serves the SPA again (session valid — /api/me then succeeds) or sends the
 * browser to the Access login page (a different origin, loop broken).
 */

export type MeOutcome =
  | { kind: 'ok'; me: MeResponse }
  | { kind: 'reauth' }
  | { kind: 'error'; message: string }

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

/** True when the response is not our API at all — an Access edge artifact. */
function isAccessArtifact(res: Response): boolean {
  if (res.type === 'opaqueredirect') return true
  if (res.redirected) {
    try {
      const url = new URL(res.url)
      // A redirect chain that stayed on our origin and still reached /api/me
      // is fine; anything else (cloudflareaccess.com, /cdn-cgi/*) is the edge.
      if (url.origin !== window.location.origin) return true
      if (url.pathname.startsWith('/cdn-cgi/')) return true
    } catch {
      return true
    }
  }
  return false
}

export async function loadMe(fetchImpl: FetchLike = fetch): Promise<MeOutcome> {
  let res: Response
  try {
    // manual: never let fetch silently follow the edge into the login flow —
    // a redirect on /api/me IS the unauthenticated signal.
    res = await fetchImpl('/api/me', { headers: { accept: 'application/json' }, redirect: 'manual' })
  } catch {
    // TypeError class: network failure OR an edge redirect target that failed
    // CORS. Either way the SPA has no identity to render — re-auth is the only
    // honest recovery (the edge re-challenges on navigation).
    return { kind: 'reauth' }
  }

  if (res.status === 401 || res.type === 'opaqueredirect' || isAccessArtifact(res)) {
    return { kind: 'reauth' }
  }
  // redirect: 'manual' surfaces the edge's 3xx as an opaqueredirect/3xx
  // response; any 3xx on /api/me is the Access challenge, not data.
  if (res.status >= 300 && res.status < 400) {
    return { kind: 'reauth' }
  }
  if (!res.ok) {
    let message = `GET /api/me failed (${res.status})`
    try {
      const body = (await res.json()) as ApiError
      if (body.message) message = body.message
    } catch {
      /* non-JSON error body */
    }
    return { kind: 'error', message }
  }
  // A 200 that is not JSON is the Access login HTML, not our contract.
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return { kind: 'reauth' }
  }
  try {
    const me = (await res.json()) as MeResponse
    return { kind: 'ok', me }
  } catch {
    return { kind: 'reauth' }
  }
}

/**
 * Drive the browser to the CF Access OTP challenge. A full navigation to the
 * origin is enough: the Access edge 302s unauthenticated navigations to the
 * team-domain login. Never invoked via fetch — the browser must follow the
 * redirect chain itself.
 */
export function redirectToAccessLogin(): void {
  window.location.assign(window.location.origin + '/')
}
