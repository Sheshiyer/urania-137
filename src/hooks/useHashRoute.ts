import { useEffect, useState } from 'react'
import { getNodeById } from '../data/selemeneNodes'

export type Route =
  | { view: 'home' }
  | { view: 'node'; nodeId: string }

/** Parse `window.location.hash` into a validated route. Unknown → home. */
function parseHash(): Route {
  const hash = typeof window !== 'undefined' ? window.location.hash : ''
  const m = hash.match(/^#\/node\/([^/?#]+)/)
  if (m) {
    const id = decodeURIComponent(m[1])
    if (getNodeById(id)) return { view: 'node', nodeId: id }
  }
  return { view: 'home' }
}

/** Imperative navigation — updates the hash, which drives the router. */
export function navigate(to: '/' | `/node/${string}`) {
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
