import { useEffect, useState } from 'react'
import { getNodeById } from '../data/selemeneNodes'
import { withViewTransition } from '../lib/viewTransition'

export type SettingsSection = 'pattern' | 'circle' | 'consent' | 'session'
export type AdminSection = 'corpus' | 'patterns'
export type FolioLensView = 'grid' | 'map' | 'list'

/** The Folio's browse state lives in the hash query, never in component state alone. */
export interface FolioQuery {
  q: string
  lens: string | null
  kind: string | null
  favorites: boolean
  view: FolioLensView | null
}

export const EMPTY_FOLIO_QUERY: FolioQuery = {
  q: '',
  lens: null,
  kind: null,
  favorites: false,
  view: null,
}

export type Route =
  | { view: 'home' }
  | {
      view: 'node'
      nodeId: string
      childId?: string
      /** `run` addresses the deterministic/daily instrument for that child. */
      surface?: 'run'
    }
  | {
      view: 'chat'
      nodeId: string | null
      childId: string | null
      readingId: string | null
      returnTo: ConversationReturnPath
    }
  | { view: 'threshold' }
  | { view: 'readings'; readingId: string | null; query: FolioQuery }
  | { view: 'relationship-reading'; relationshipId: string; generationId: string }
  | { view: 'settings'; section: SettingsSection | null }
  | { view: 'admin-data'; section: AdminSection | null; recordId: string | null }
  | { view: 'not-found'; hash: string }

export type ConversationReturnPath =
  | '/'
  | '/readings'
  | `/readings/${string}`

function conversationReturnPath(value: string | null): ConversationReturnPath {
  if (value === '/' || value === '/readings') return value
  if (value && /^\/readings\/[^?#]+$/.test(value)) {
    return value as `/readings/${string}`
  }
  return '/'
}

function conversationContext(query: string | undefined) {
  const params = new URLSearchParams(query ?? '')
  const reading = params.get('reading')
  return {
    readingId: reading?.trim() ? reading : null,
    returnTo: conversationReturnPath(params.get('return')),
  }
}

const FOLIO_VIEWS: readonly FolioLensView[] = ['grid', 'map', 'list']

export function parseFolioQuery(query: string | undefined): FolioQuery {
  const params = new URLSearchParams(query ?? '')
  const view = params.get('view')
  return {
    q: params.get('q')?.trim() ?? '',
    lens: params.get('lens')?.trim() || null,
    kind: params.get('kind')?.trim() || null,
    favorites: params.get('fav') === '1',
    view: view && (FOLIO_VIEWS as readonly string[]).includes(view) ? (view as FolioLensView) : null,
  }
}

export function buildFolioPath(query: Partial<FolioQuery>, readingId?: string | null): AppPath {
  const params = new URLSearchParams()
  if (query.q?.trim()) params.set('q', query.q.trim())
  if (query.lens) params.set('lens', query.lens)
  if (query.kind) params.set('kind', query.kind)
  if (query.favorites) params.set('fav', '1')
  if (query.view) params.set('view', query.view)
  const search = params.toString()
  const base = readingId ? `/readings/${encodeURIComponent(readingId)}` : '/readings'
  return `${base}${search ? `?${search}` : ''}` as AppPath
}

const SETTINGS_SECTIONS: readonly SettingsSection[] = ['pattern', 'circle', 'consent', 'session']

function notFound(hash: string): Route {
  return { view: 'not-found', hash }
}

/** Parse `window.location.hash` into a validated route. Unknown → not-found; empty → home. */
export function parseHash(hash = typeof window !== 'undefined' ? window.location.hash : ''): Route {
  if (hash === '' || hash === '#' || hash === '#/' || hash === '#/?') return { view: 'home' }

  // The Threshold (W2-A): pre-graph onboarding scene — a third top-level view.
  if (hash === '#/threshold' || hash === '#/threshold/') return { view: 'threshold' }

  if (hash === '#/settings' || hash === '#/settings/') return { view: 'settings', section: null }
  const settings = hash.match(/^#\/settings\/([^/?#]+)\/?$/)
  if (settings) {
    const section = settings[1]
    if ((SETTINGS_SECTIONS as readonly string[]).includes(section)) {
      return { view: 'settings', section: section as SettingsSection }
    }
    return notFound(hash)
  }

  // Admin Data Browser (T-079 fast-follow): #/admin-data, #/admin-data/corpus,
  // #/admin-data/patterns, #/admin-data/corpus/<record>. All gated by CF Access
  // (T-008); the SPA never renders this view without an authenticated identity.
  if (hash === '#/admin-data' || hash === '#/admin-data/') {
    return { view: 'admin-data', section: null, recordId: null }
  }
  const adminData = hash.match(/^#\/admin-data\/([^/?#]+)(?:\/([^/?#]+))?\/?$/)
  if (adminData) {
    const section = adminData[1]
    if (section !== 'corpus' && section !== 'patterns') return notFound(hash)
    try {
      return {
        view: 'admin-data',
        section,
        recordId: adminData[2] ? decodeURIComponent(adminData[2]) : null,
      }
    } catch {
      return notFound(hash)
    }
  }

  const chat = hash.match(
    /^#\/chat(?:\/([^/?#]+)\/([^/?#]+))?(?:\?([^#]*))?\/?$/,
  )
  if (chat) {
    const context = conversationContext(chat[3])
    if (!chat[1] || !chat[2]) {
      return { view: 'chat', nodeId: null, childId: null, ...context }
    }
    try {
      const nodeId = decodeURIComponent(chat[1])
      const childId = decodeURIComponent(chat[2])
      const node = getNodeById(nodeId)
      const child = node?.children?.find((candidate) => candidate.id === childId)
      // ChatSheet is currently the narrative witness surface. Deterministic,
      // daily, reference-only, and unknown children return to the real chooser.
      if (child?.run?.kind === 'witness') {
        return { view: 'chat', nodeId, childId, ...context }
      }
      return { view: 'chat', nodeId: null, childId: null, ...context }
    } catch {
      return { view: 'chat', nodeId: null, childId: null, ...context }
    }
  }

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
      return notFound(hash)
    }
  }

  const readings = hash.match(/^#\/readings(?:\/([^/?#]+))?\/?(?:\?([^#]*))?$/)
  if (readings) {
    const query = parseFolioQuery(readings[2])
    if (!readings[1]) return { view: 'readings', readingId: null, query }
    try {
      return { view: 'readings', readingId: decodeURIComponent(readings[1]), query }
    } catch {
      return notFound(hash)
    }
  }

  const m = hash.match(/^#\/node\/([^/?#]+)(?:\/([^/?#]+))?(?:\/(run))?\/?$/)
  if (m) {
    try {
      const id = decodeURIComponent(m[1])
      const node = getNodeById(id)
      if (!node) return notFound(hash)
      if (!m[2]) return { view: 'node', nodeId: id }
      const childId = decodeURIComponent(m[2])
      const child = node.children?.find((candidate) => candidate.id === childId)
      if (!child) return notFound(hash)
      if (m[3] === 'run') {
        const kind = child.run?.kind
        // Only deterministic and daily instruments have a run surface.
        if (kind === 'engine' || kind === 'workflow' || kind === 'daily') {
          return { view: 'node', nodeId: id, childId, surface: 'run' }
        }
        return { view: 'node', nodeId: id, childId }
      }
      return { view: 'node', nodeId: id, childId }
    } catch {
      return notFound(hash)
    }
  }

  return notFound(hash)
}

/** Imperative navigation — updates the hash, which drives the router. */
export type AppPath =
  | '/'
  | '/chat'
  | `/chat?${string}`
  | `/chat/${string}/${string}`
  | `/chat/${string}/${string}?${string}`
  | '/threshold'
  | '/settings'
  | `/settings/${SettingsSection}`
  | '/readings'
  | `/readings?${string}`
  | `/readings/${string}`
  | `/relationships/${string}/readings/${string}`
  | '/admin-data'
  | '/admin-data/corpus'
  | '/admin-data/patterns'
  | `/admin-data/${AdminSection}/${string}`
  | `/node/${string}`
  | `/node/${string}/${string}`
  | `/node/${string}/${string}/run`

export function buildConversationPath({
  nodeId,
  childId,
  readingId,
  returnTo = '/',
}: {
  nodeId?: string
  childId?: string
  readingId?: string | null
  returnTo?: ConversationReturnPath
} = {}): AppPath {
  const doorway =
    nodeId && childId
      ? `/${encodeURIComponent(nodeId)}/${encodeURIComponent(childId)}`
      : ''
  const params = new URLSearchParams()
  if (readingId) params.set('reading', readingId)
  if (returnTo !== '/') params.set('return', returnTo)
  const query = params.toString()
  return `/chat${doorway}${query ? `?${query}` : ''}` as AppPath
}

export function navigate(to: AppPath, options: { replace?: boolean } = {}) {
  const next = `#${to}`
  withViewTransition(() => {
    if (window.location.hash === next) {
      window.dispatchEvent(new HashChangeEvent('hashchange'))
      return
    }
    if (options.replace) {
      history.replaceState(null, '', next)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
      return
    }
    window.location.hash = next
  })
}

/**
 * Hash-based router state. No router dependency — the graph is the interface,
 * and each parent node is addressable at `#/node/:id` (ISA "one node, one URL").
 * An unknown address resolves to the not-found view instead of being rewritten.
 */
export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash)

  useEffect(() => {
    const onChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onChange)
    onChange()
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}
