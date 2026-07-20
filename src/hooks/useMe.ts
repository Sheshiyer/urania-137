import { useEffect, useState } from 'react'
import type { ApiError, MeResponse } from '../lib/api/contract'

/**
 * Signed-in identity for the SPA (T-024).
 *
 * CF Access owns the session cookie, so no token is stored client-side — the
 * hook simply GETs /api/me on mount (same-origin, cookie sent by default) and
 * exposes { me, loading, error }, typed against the frozen Phase-0 shared API
 * contract. A 401 surfaces an unauthenticated state (me: null, error set)
 * rather than throwing; any other failure surfaces an error string.
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
    fetch('/api/me', { headers: { accept: 'application/json' } })
      .then(async (res) => {
        if (!live) return
        if (res.status === 401) {
          // Unauthenticated — a state, not an exception.
          setState({ me: null, loading: false, error: 'unauthenticated' })
          return
        }
        if (!res.ok) {
          let message = `GET /api/me failed (${res.status})`
          try {
            const body = (await res.json()) as ApiError
            if (body.message) message = body.message
          } catch {
            /* non-JSON error body */
          }
          setState({ me: null, loading: false, error: message })
          return
        }
        const me = (await res.json()) as MeResponse
        setState({ me, loading: false, error: null })
      })
      .catch(() => {
        if (!live) return
        setState({ me: null, loading: false, error: 'network error reaching /api/me' })
      })
    return () => {
      live = false
    }
  }, [])

  return state
}
