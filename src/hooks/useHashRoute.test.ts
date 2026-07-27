import { describe, expect, it } from 'vitest'
import { parseHash } from './useHashRoute'

describe('hash route parsing', () => {
  it('keeps the stellar map and validated node routes intact', () => {
    expect(parseHash('#/')).toEqual({ view: 'home' })
    expect(parseHash('#/node/folio')).toEqual({ view: 'node', nodeId: 'folio' })
    expect(parseHash('#/node/not-charted')).toEqual({ view: 'home' })
  })

  it('validates and preserves an addressable child doorway', () => {
    expect(parseHash('#/node/witness/integrated-reading')).toEqual({
      view: 'node',
      nodeId: 'witness',
      childId: 'integrated-reading',
    })
    expect(parseHash('#/node/witness/not-charted')).toEqual({
      view: 'node',
      nodeId: 'witness',
    })
  })

  it('addresses the library, one canonical record, and settings', () => {
    expect(parseHash('#/readings')).toEqual({ view: 'readings', readingId: null })
    expect(parseHash('#/readings/reading%2Fone')).toEqual({
      view: 'readings',
      readingId: 'reading/one',
    })
    expect(parseHash('#/settings')).toEqual({ view: 'settings' })
    expect(parseHash('#/relationships/relationship%2Fone/readings/generation%2F137')).toEqual({
      view: 'relationship-reading',
      relationshipId: 'relationship/one',
      generationId: 'generation/137',
    })
  })

  it('fails malformed encoded record ids closed to home', () => {
    expect(parseHash('#/readings/%E0%A4%A')).toEqual({ view: 'home' })
    expect(parseHash('#/relationships/rel/readings/%E0%A4%A')).toEqual({ view: 'home' })
  })
})
