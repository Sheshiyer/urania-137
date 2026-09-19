import { describe, expect, it } from 'vitest'
import { EMPTY_FOLIO_QUERY, buildConversationPath, buildFolioPath, parseHash } from './useHashRoute'

describe('hash route parsing', () => {
  it('keeps the stellar map and validated node routes intact', () => {
    expect(parseHash('#/')).toEqual({ view: 'home' })
    expect(parseHash('#/node/folio')).toEqual({ view: 'node', nodeId: 'folio' })
    expect(parseHash('#/node/not-charted')).toEqual({ view: 'not-found', hash: '#/node/not-charted' })
    expect(parseHash('')).toEqual({ view: 'home' })
    expect(parseHash('#/nope')).toEqual({ view: 'not-found', hash: '#/nope' })
  })

  it('addresses the deterministic run surface only for engine, workflow and daily children', () => {
    expect(parseHash('#/node/birth/numerology/run')).toEqual({
      view: 'node',
      nodeId: 'birth',
      childId: 'numerology',
      surface: 'run',
    })
    expect(parseHash('#/node/transit/panchanga-flow/run')).toEqual({
      view: 'node',
      nodeId: 'transit',
      childId: 'panchanga-flow',
      surface: 'run',
    })
    expect(parseHash('#/node/witness/integrated-reading/run')).toEqual({
      view: 'node',
      nodeId: 'witness',
      childId: 'integrated-reading',
    })
  })

  it('validates and preserves an addressable child doorway', () => {
    expect(parseHash('#/node/witness/integrated-reading')).toEqual({
      view: 'node',
      nodeId: 'witness',
      childId: 'integrated-reading',
    })
    expect(parseHash('#/node/witness/not-charted')).toEqual({
      view: 'not-found',
      hash: '#/node/witness/not-charted',
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
    expect(parseHash('#/readings')).toEqual({ view: 'readings', readingId: null, query: EMPTY_FOLIO_QUERY })
    expect(parseHash('#/readings/reading%2Fone')).toEqual({
      view: 'readings',
      readingId: 'reading/one',
      query: EMPTY_FOLIO_QUERY,
    })
    expect(parseHash('#/settings')).toEqual({ view: 'settings', section: null })
    expect(parseHash('#/settings/session')).toEqual({ view: 'settings', section: 'session' })
    expect(parseHash('#/settings/nope')).toEqual({ view: 'not-found', hash: '#/settings/nope' })
    expect(parseHash('#/admin-data/corpus/abc')).toEqual({
      view: 'admin-data',
      section: 'corpus',
      recordId: 'abc',
    })
    expect(parseHash('#/admin-data/other')).toEqual({ view: 'not-found', hash: '#/admin-data/other' })
    expect(parseHash('#/relationships/relationship%2Fone/readings/generation%2F137')).toEqual({
      view: 'relationship-reading',
      relationshipId: 'relationship/one',
      generationId: 'generation/137',
    })
  })

  it('fails malformed encoded record ids closed to the not-found view', () => {
    expect(parseHash('#/readings/%E0%A4%A')).toEqual({ view: 'not-found', hash: '#/readings/%E0%A4%A' })
    expect(parseHash('#/relationships/rel/readings/%E0%A4%A')).toEqual({
      view: 'not-found',
      hash: '#/relationships/rel/readings/%E0%A4%A',
    })
  })

  it('keeps the Folio browse state in the hash query and round-trips it', () => {
    expect(parseHash('#/readings?q=moon&lens=birth&fav=1&view=map')).toEqual({
      view: 'readings',
      readingId: null,
      query: { q: 'moon', lens: 'birth', kind: null, favorites: true, view: 'map' },
    })
    expect(parseHash('#/readings?view=nope')).toEqual({
      view: 'readings',
      readingId: null,
      query: { ...EMPTY_FOLIO_QUERY, view: null },
    })
    const path = buildFolioPath({ q: 'moon', favorites: true, view: 'grid' })
    expect(path).toBe('/readings?q=moon&fav=1&view=grid')
    expect(parseHash(`#${buildFolioPath({ lens: 'transit' }, 'reading/one')}`)).toEqual({
      view: 'readings',
      readingId: 'reading/one',
      query: { ...EMPTY_FOLIO_QUERY, lens: 'transit' },
    })
  })
})
