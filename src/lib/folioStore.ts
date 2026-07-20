/**
 * Folio Archive persistence — D1-backed via the frozen /api/folio contract
 * (src/lib/api/contract.ts). Public signatures are unchanged from the
 * localStorage era EXCEPT saveReport, which is now async (returns a Promise).
 *
 * Sync-snapshot / async-fetch contract (T-045): React keeps a SYNCHRONOUS
 * snapshot via useSyncExternalStore — getFolioSnapshot never does I/O. An async
 * refresh (refreshFolio) fills the cache from GET /api/folio and notifies
 * subscribers when it lands. Search and favorites are server-side
 * (?search=/?favorites= query params).
 *
 * The legacy localStorage key 'urania137.folio.v1' is NOT read or written
 * anywhere in this module — its only remaining reader is the one-time import
 * trigger (src/lib/folioImport.ts, T-048).
 */

import type { ApiError, FolioListResponse, ReadingDTO, SaveReadingRequest } from './api/contract'

/**
 * 1:1 with the frozen contract's ReadingDTO — a compile-time binding so any
 * contract drift fails tsc on both sides of the trust boundary (T-053).
 */
export type FolioEntry = ReadingDTO

export type FolioStatus = 'idle' | 'loading' | 'ready' | 'error'

/** The notified snapshot shape (filter inputs are module-level, not notified). */
export interface FolioState {
  entries: FolioEntry[]
  status: FolioStatus
  error: string | null
}

let state: FolioState = { entries: [], status: 'idle', error: null }
const listeners = new Set<() => void>()

// Server-side filter inputs — changing them triggers a refetch; they are not
// part of the notified snapshot (the panel owns the raw search text locally).
let query = ''
let favoritesOnly = false
let refreshSeq = 0
let searchTimer: ReturnType<typeof setTimeout> | null = null

function setState(next: FolioState) {
  state = next
  listeners.forEach((l) => l())
}

/** Minimal typed fetch against the frozen /api/folio contract + ApiError envelope. */
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = (await res.json()) as ApiError
      message = body.message || body.error || message
    } catch {
      /* non-JSON error body — keep the status message */
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}

export function subscribeFolio(l: () => void): () => void {
  listeners.add(l)
  // First subscriber kicks off the initial async fill of the sync snapshot.
  if (state.status === 'idle') void refreshFolio()
  return () => listeners.delete(l)
}

/** Snapshot getter for useSyncExternalStore (stable reference between notifies). */
export function getFolioSnapshot(): FolioEntry[] {
  return state.entries
}

/** Full snapshot (entries + status + error) for panels that render async states. */
export function getFolioStateSnapshot(): FolioState {
  return state
}

/**
 * The load/refresh entry point: fills the synchronous snapshot cache from
 * GET /api/folio (with the active server-side search/favorites filters) and
 * notifies subscribers. A stale response (a newer refresh started) is dropped.
 */
export async function refreshFolio(): Promise<void> {
  const seq = ++refreshSeq
  const params = new URLSearchParams()
  if (query.trim()) params.set('search', query.trim())
  if (favoritesOnly) params.set('favorites', 'true')
  const qs = params.toString()
  setState({ ...state, status: 'loading', error: null })
  try {
    const data = await api<FolioListResponse>(`/api/folio${qs ? `?${qs}` : ''}`)
    if (seq !== refreshSeq) return
    setState({ ...state, entries: data.readings, status: 'ready', error: null })
  } catch (e) {
    if (seq !== refreshSeq) return
    setState({ ...state, status: 'error', error: e instanceof Error ? e.message : 'Could not load the Folio.' })
  }
}

/** Server-side search (debounced) — the store refetches with ?search=. */
export function setFolioSearch(q: string): void {
  query = q
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => void refreshFolio(), 250)
}

/** Server-side favorites filter — refetches with ?favorites=true. */
export function setFolioFavoritesOnly(on: boolean): void {
  if (favoritesOnly === on) return
  favoritesOnly = on
  void refreshFolio()
}

/**
 * Save a generated report — POST /api/folio (async; the D1 row is the
 * persistence). The created reading is prepended to the snapshot so the Folio
 * reflects it immediately; with an active search/favorites filter the list is
 * refetched instead so the filter stays truthful.
 */
export async function saveReport(e: SaveReadingRequest): Promise<FolioEntry> {
  const saved = await api<FolioEntry>('/api/folio', { method: 'POST', body: JSON.stringify(e) })
  if (!favoritesOnly && !query.trim()) {
    setState({ ...state, entries: [saved, ...state.entries] })
  } else {
    void refreshFolio()
  }
  return saved
}

/** Favorite toggle — optimistic snapshot update + PATCH; failure refetches the truth. */
export function toggleFavorite(id: string): void {
  const current = state.entries.find((x) => x.id === id)
  if (!current) return
  const next = !current.favorite
  setState({
    ...state,
    entries:
      favoritesOnly && !next
        ? state.entries.filter((x) => x.id !== id)
        : state.entries.map((x) => (x.id === id ? { ...x, favorite: next } : x)),
  })
  api<FolioEntry>(`/api/folio/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ favorite: next }) }).catch(
    (e: unknown) => {
      setState({ ...state, error: e instanceof Error ? e.message : 'Could not update the favorite.' })
      void refreshFolio()
    },
  )
}

/** Delete — optimistic snapshot update + DELETE; failure refetches the truth. */
export function removeEntry(id: string): void {
  setState({ ...state, entries: state.entries.filter((x) => x.id !== id) })
  api<Record<string, never>>(`/api/folio/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch((e: unknown) => {
    setState({ ...state, error: e instanceof Error ? e.message : 'Could not delete the reading.' })
    void refreshFolio()
  })
}

/**
 * Clears the local snapshot view only. The frozen contract has no bulk-delete
 * endpoint, so D1 rows persist; a refetch repopulates the list.
 */
export function clearFolio(): void {
  setState({ ...state, entries: [] })
}

/** Download an entry in the requested format (client-side, from stored markdown). */
export function exportEntry(entry: FolioEntry, format: 'markdown' | 'docx' | 'pdf') {
  const ext = format === 'markdown' ? 'md' : format
  const mime = format === 'markdown' ? 'text/markdown' : format === 'pdf' ? 'application/pdf' : 'text/plain'
  // Markdown is stored verbatim; docx/pdf export the same text wrapped so the
  // download is real content (a full renderer is out of scope for this pass).
  const blob = new Blob([entry.content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${entry.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.${ext}`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
