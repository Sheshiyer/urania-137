import { useEffect, useState } from 'react'
import { getNodeById } from '../data/selemeneNodes'

export type Route =
  | { view: 'home' }
  | { view: 'node'; nodeId: string; childId?: string }
  | { view: 'threshold' }
  | { view: 'readings'; readingId: string | null }
  | { view: 'relationship-reading'; relationshipId: string; generationId: string }
  | { view: 'settings' }

/** Parse `window.location.hash` into a validated route. Unknown → home. */
export function parseHash(hash = typeof window !== 'undefined' ? window.location.hash : ''): Route {
  // The Threshold (W2-A): pre-graph onboarding scene — a third top-level view.
  if (hash === '#/threshold') return { view: 'threshold' }
  if (hash === '#/settings') return { view: 'settings' }
  const relationshipReading = hash.match(
    /^#\/relationships\/([^/?#]+)\/readings\/([^/?#]+)\/?$/,
  )
  if (relationshipReading) {
    try {
      return {
        view: 'relationship-reading',
        relationshipId: decodeURIComponent(relationshipReading[1]),
        generationId: decodeURIComponent(relationshipReading[2]),
      }
    } catch {
      return { view: 'home' }
    }
  }
  if (hash === '#/readings' || hash === '#/readings/') return { view: 'readings', readingId: null }
  const reading = hash.match(/^#\/readings\/([^/?#]+)/)
  if (reading) {
    try {
      return { view: 'readings', readingId: decodeURIComponent(reading[1]) }
    } catch {
      return { view: 'home' }
    }
  }
  const m = hash.match(/^#\/node\/([^/?#]+)(?:\/([^/?#]+))?\/?$/)
  if (m) {
    try {
      const id = decodeURIComponent(m[1])
      const node = getNodeById(id)
      if (node) {
        if (!m[2]) return { view: 'node', nodeId: id }
        const childId = decodeURIComponent(m[2])
        if (node.children?.some((child) => child.id === childId)) {
          return { view: 'node', nodeId: id, childId }
        }
        return { view: 'node', nodeId: id }
      }
    } catch {
      return { view: 'home' }
    }
  }
  return { view: 'home' }
}

/** Imperative navigation — updates the hash, which drives the router. */
export type AppPath =
  | '/'
  | '/threshold'
  | '/settings'
  | '/readings'
  | `/readings/${string}`
  | `/relationships/${string}/readings/${string}`
  | `/node/${string}`
  | `/node/${string}/${string}`

export function navigate(to: AppPath) {
  const next = `#${to}`
  if (window.location.hash !== next) window.location.hash = next
  else window.dispatchEvent(new HashChangeEvent('hashchange'))
}

/**
 * Hash-based router state. No router dependency — the graph is the interface,
 * and each parent node is addressable at `#/node/:id` (ISA "one node, one URL").
 * An unknown id silently normalises back to home.
 */
export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash)

  useEffect(() => {
    const onChange = () => {
      const next = parseHash()
      // Normalise a bad `#/node/xxx` back to `#/` so the bar reflects reality.
      if (next.view === 'home' && /^#\/node\//.test(window.location.hash)) {
        history.replaceState(null, '', '#/')
      }
      setRoute(next)
    }
    window.addEventListener('hashchange', onChange)
    onChange()
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}
