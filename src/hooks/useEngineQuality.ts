import { useEffect, useRef, useState } from 'react'

import type { EngineValidation, QualityAssessment, RoutingDecision } from '../lib/jev'

export interface EngineQualityState {
  loading: boolean
  error: string | null
  assessment: QualityAssessment | null
  routing: RoutingDecision | null
}

const INITIAL: EngineQualityState = { loading: false, error: null, assessment: null, routing: null }

const cache = new Map<string, { assessment: QualityAssessment; routing: RoutingDecision }>()

function cacheKey(engineId: string, payload: unknown): string {
  return `${engineId}:${typeof payload === 'object' ? JSON.stringify(payload) : String(payload)}`
}

export function useEngineQuality(
  engineId: string | null,
  payload: unknown,
  enabled = true,
): EngineQualityState {
  const [state, setState] = useState<EngineQualityState>(INITIAL)
  const seqRef = useRef(0)

  useEffect(() => {
    if (!enabled || !engineId || payload == null) {
      setState(INITIAL)
      return
    }

    const key = cacheKey(engineId, payload)
    const hit = cache.get(key)
    if (hit) {
      setState({ loading: false, error: null, assessment: hit.assessment, routing: hit.routing })
      return
    }

    const seq = ++seqRef.current
    setState({ loading: true, error: null, assessment: null, routing: null })

    let live = true
    import('../lib/jev').then(async (jev) => {
      if (!live || seq !== seqRef.current) return
      try {
        const validation: EngineValidation = await jev.validateEngineOutput(engineId, payload)
        if (!live || seq !== seqRef.current) return
        const assessment = jev.assessReadingQuality(validation)
        const routing = jev.routeInterpretation(assessment)
        cache.set(key, { assessment, routing })
        setState({ loading: false, error: null, assessment, routing })
      } catch (err) {
        if (!live || seq !== seqRef.current) return
        setState({
          loading: false,
          error: err instanceof Error ? err.message : 'Quality assessment failed',
          assessment: null,
          routing: null,
        })
      }
    })
    return () => {
      live = false
    }
  }, [engineId, payload, enabled])

  return state
}

export function clearQualityCache(): void {
  cache.clear()
}
