import { describe, expect, it, beforeEach, vi } from 'vitest'

// Mock localStorage for Node test environment
const store = new Map<string, string>()
const mockStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
  get length() { return store.size },
  key: (_i: number) => null as string | null,
}

vi.stubGlobal('localStorage', mockStorage)

// Import AFTER mocking
const { pushRecent, getRecentsSnapshot, subscribeRecents } = await import('./recents')

describe('recents', () => {
  beforeEach(() => {
    store.clear()
  })

  it('pushes and retrieves recent entries', () => {
    pushRecent('/node/birth', 'Birth Witness')
    pushRecent('/node/transit', 'Sky Weather')
    const snap = getRecentsSnapshot()
    expect(snap.length).toBe(2)
    expect(snap[0].label).toBe('Sky Weather')
    expect(snap[1].label).toBe('Birth Witness')
  })

  it('deduplicates entries by path', () => {
    pushRecent('/node/birth', 'Birth Witness')
    pushRecent('/node/transit', 'Sky Weather')
    pushRecent('/node/birth', 'Birth Witness')
    const snap = getRecentsSnapshot()
    expect(snap.length).toBe(2)
    expect(snap[0].label).toBe('Birth Witness')
  })

  it('notifies subscribers on push', () => {
    const fn = vi.fn()
    const unsub = subscribeRecents(fn)
    pushRecent('/node/birth', 'Birth Witness')
    expect(fn).toHaveBeenCalledOnce()
    unsub()
    pushRecent('/node/transit', 'Sky Weather')
    expect(fn).toHaveBeenCalledOnce()
  })
})
