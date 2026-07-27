import { useEffect, useState } from 'react'
import {
  loadViewerContext,
  type ViewerContext,
} from '../lib/viewerContext'

export type ViewerContextState =
  | { status: 'loading'; context: null; error: null }
  | { status: 'ready'; context: ViewerContext; error: null }
  | { status: 'degraded'; context: null; error: string }

const LOADING: ViewerContextState = {
  status: 'loading',
  context: null,
  error: null,
}

/** Load presentation capability only after the verified identity is present. */
export function useViewerContext(enabled: boolean): ViewerContextState {
  const [state, setState] = useState<ViewerContextState>(LOADING)

  useEffect(() => {
    let live = true
    if (!enabled) {
      setState(LOADING)
      return () => {
        live = false
      }
    }

    void loadViewerContext()
      .then((context) => {
        if (live) setState({ status: 'ready', context, error: null })
      })
      .catch((error) => {
        if (!live) return
        setState({
          status: 'degraded',
          context: null,
          error:
            error instanceof Error
              ? error.message
              : 'Viewer context is temporarily unavailable.',
        })
      })

    return () => {
      live = false
    }
  }, [enabled])

  return state
}
