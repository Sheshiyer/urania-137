import { describe, expect, it } from 'vitest'
import { parseHash } from './useHashRoute'

describe('hash route parsing', () => {
  it('keeps the stellar map and validated node routes intact', () => {
    expect(parseHash('#/')).toEqual({ view: 'home' })
    expect(parseHash('#/node/folio')).toEqual({ view: 'node', nodeId: 'folio' })
    expect(parseHash('#/node/not-charted')).toEqual({ view: 'home' })
  })

  it('addresses the library, one canonical record, and settings', () => {
    expect(parseHash('#/readings')).toEqual({ view: 'readings', readingId: null })
    expect(parseHash('#/readings/reading%2Fone')).toEqual({
      view: 'readings',
      readingId: 'reading/one',
    })
    expect(parseHash('#/settings')).toEqual({ view: 'settings' })
  })

  it('fails malformed encoded record ids closed to home', () => {
    expect(parseHash('#/readings/%E0%A4%A')).toEqual({ view: 'home' })
  })
})
