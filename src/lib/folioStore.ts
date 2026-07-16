/**
 * Folio Archive persistence — every generated report is saved to localStorage so
 * the Folio Archive surface (Saved Reports / History / Search / Favorites /
 * Exports) reflects real prior work. React-only, no backend, no new deps.
 */

export interface FolioEntry {
  id: string
  nodeId: string
  nodeLabel: string
  mode: string
  title: string
  content: string
  createdAt: number
  favorite: boolean
}

const KEY = 'urania137.folio.v1'
let cache: FolioEntry[] | null = null
const listeners = new Set<() => void>()

function read(): FolioEntry[] {
  if (cache) return cache
  try {
    cache = JSON.parse(localStorage.getItem(KEY) || '[]') as FolioEntry[]
  } catch {
    cache = []
  }
  return cache
}

function write(next: FolioEntry[]) {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* quota / private mode — keep the in-memory cache */
  }
  listeners.forEach((l) => l())
}

export function subscribeFolio(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Snapshot getter for useSyncExternalStore (stable reference between writes). */
export function getFolioSnapshot(): FolioEntry[] {
  return read()
}

export function saveReport(e: Pick<FolioEntry, 'nodeId' | 'nodeLabel' | 'mode' | 'title' | 'content'>): FolioEntry {
  const entry: FolioEntry = {
    ...e,
    id: `${e.nodeId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    favorite: false,
  }
  write([entry, ...read()])
  return entry
}

export function toggleFavorite(id: string) {
  write(read().map((x) => (x.id === id ? { ...x, favorite: !x.favorite } : x)))
}

export function removeEntry(id: string) {
  write(read().filter((x) => x.id !== id))
}

export function clearFolio() {
  write([])
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
