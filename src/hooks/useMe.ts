import { useEffect, useState } from 'react'
import type { MeResponse } from '../lib/api/contract'
import { loadMe, redirectToAccessLogin } from '../lib/me'

/**
 * Signed-in identity for the SPA (T-024), hardened for live CF Access (T-076).
 *
 * CF Access owns the session cookie, so no token is stored client-side — the
 * hook GETs /api/me on mount (same-origin, cookie sent by default). The
 * classification lives in src/lib/me.ts: a real identity renders; a
 * server-side failure surfaces an error string; and every unauthenticated
 * manifestation — Worker 401, edge 302 followed/opaque, HTML login page, or
 * the TypeError a CORS-blocked redirect raises — drives a full navigation to
 * the origin so the Access edge re-challenges with the OTP login. There is no
 * infinite spinner and no stale identity: on reauth the browser leaves the SPA
 * before any signed-out state can paint.
 */
export interface UseMe {
  me: MeResponse | null
  loading: boolean
  error: string | null
}

export function useMe(): UseMe {
  const [state, setState] = useState<UseMe>({ me: null, loading: true, error: null })

  useEffect(() => {
    let live = true
    loadMe()
      .then((outcome) => {
        if (!live) return
        if (outcome.kind === 'reauth') {
          // Navigate away immediately; do not settle into a signed-out state.
          redirectToAccessLogin()
          return
        }
        if (outcome.kind === 'error') {
          setState({ me: null, loading: false, error: outcome.message })
          return
        }
        setState({ me: outcome.me, loading: false, error: null })
      })
      .catch(() => {
        // loadMe never throws by contract; belt-and-braces — treat the unknown
        // as unauthenticated rather than spinning forever.
        if (live) redirectToAccessLogin()
      })
    return () => {
      live = false
    }
  }, [])

  return state
}
