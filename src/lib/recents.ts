const RECENT_KEY = 'urania137.recent.v1'
const MAX_RECENTS = 8

export interface RecentEntry {
  path: string
  label: string
  ts: number
}

function readRecents(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENTS) : []
  } catch {
    return []
  }
}

function writeRecents(entries: RecentEntry[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(entries.slice(0, MAX_RECENTS)))
  } catch {
    /* storage unavailable */
  }
}

let listeners: Array<() => void> = []
let snapshot = readRecents()

function notify() {
  snapshot = readRecents()
  for (const fn of listeners) fn()
}

export function pushRecent(path: string, label: string) {
  const entries = readRecents().filter((e) => e.path !== path)
  entries.unshift({ path, label, ts: Date.now() })
  writeRecents(entries)
  notify()
}

export function getRecentsSnapshot(): RecentEntry[] {
  return snapshot
}

export function subscribeRecents(fn: () => void): () => void {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}
