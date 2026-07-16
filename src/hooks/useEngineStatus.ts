import { useEffect, useState } from 'react'
import { EngineStatus } from '../types'
import { fetchHealth, fetchReady, fetchEngines } from '../lib/selemeneApi'

/**
 * Live Selemene engine/system status for the Engine Status surface. Pulls the
 * real `/health`, `/health/ready`, and `/api/v1/engines` — no mock data. If a
 * call fails, the surface shows the error rather than fabricating telemetry.
 */
export function useEngineStatus(enabled: boolean): EngineStatus {
  const [state, setState] = useState<EngineStatus>({ health: null, ready: null, engines: [], loading: enabled, error: null })

  useEffect(() => {
    if (!enabled) return
    let live = true
    setState((s) => ({ ...s, loading: true, error: null }))
    Promise.allSettled([fetchHealth(), fetchReady(), fetchEngines()]).then(([h, r, e]) => {
      if (!live) return
      const error =
        h.status === 'rejected' && r.status === 'rejected'
          ? 'Selemene engines unreachable.'
          : null
      setState({
        health: h.status === 'fulfilled' ? h.value : null,
        ready: r.status === 'fulfilled' ? r.value : null,
        engines: e.status === 'fulfilled' ? e.value : [],
        loading: false,
        error,
      })
    })
    return () => {
      live = false
    }
  }, [enabled])

  return state
}
