import { describe, expect, it } from 'vitest'
import { buildConversationPath, parseHash } from './useHashRoute'

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

  it('addresses conversation independently from graph-first node routes', () => {
    expect(parseHash('#/chat')).toEqual({
      view: 'chat',
      nodeId: null,
      childId: null,
      readingId: null,
      returnTo: '/',
    })
    expect(parseHash('#/chat/witness/integrated-reading')).toEqual({
      view: 'chat',
      nodeId: 'witness',
      childId: 'integrated-reading',
      readingId: null,
      returnTo: '/',
    })
    expect(parseHash('#/node/witness/integrated-reading')).toEqual({
      view: 'node',
      nodeId: 'witness',
      childId: 'integrated-reading',
    })
  })

  it('keeps canonical reading identity and a bounded Folio return path in the URL', () => {
    const path = buildConversationPath({
      nodeId: 'witness',
      childId: 'integrated-reading',
      readingId: 'reading/one',
      returnTo: '/readings/reading%2Fone',
    })

    expect(parseHash(`#${path}`)).toEqual({
      view: 'chat',
      nodeId: 'witness',
      childId: 'integrated-reading',
      readingId: 'reading/one',
      returnTo: '/readings/reading%2Fone',
    })
  })

  it('normalizes non-narrative, unknown, and malformed chat doorways to the chooser', () => {
    const chooser = {
      view: 'chat',
      nodeId: null,
      childId: null,
      readingId: null,
      returnTo: '/',
    }
    expect(parseHash('#/chat/synthesis/birth-blueprint')).toEqual(chooser)
    expect(parseHash('#/chat/witness/not-charted')).toEqual(chooser)
    expect(parseHash('#/chat/%E0%A4%A/integrated-reading')).toEqual(chooser)
    expect(parseHash('#/chat?return=https%3A%2F%2Fexample.com')).toEqual(chooser)
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
