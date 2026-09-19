import { afterEach, describe, expect, it, vi } from 'vitest'
import { canViewTransition, withViewTransition } from './viewTransition'

describe('withViewTransition', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('runs the update synchronously when no document exists', () => {
    const update = vi.fn()
    withViewTransition(update)
    expect(update).toHaveBeenCalledTimes(1)
    expect(canViewTransition()).toBe(false)
  })

  it('routes through startViewTransition when supported and motion is allowed', () => {
    const start = vi.fn((fn: () => void) => {
      fn()
      return { finished: Promise.resolve() }
    })
    vi.stubGlobal('document', { startViewTransition: start })
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) })
    const update = vi.fn()
    withViewTransition(update)
    expect(start).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('skips the transition under prefers-reduced-motion', () => {
    const start = vi.fn()
    vi.stubGlobal('document', { startViewTransition: start })
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) })
    const update = vi.fn()
    withViewTransition(update)
    expect(start).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledTimes(1)
  })
})
