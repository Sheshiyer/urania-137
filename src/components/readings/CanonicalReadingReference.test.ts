import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CanonicalReadingReference } from './CanonicalReadingReference'

describe('CanonicalReadingReference', () => {
  const entry = {
    id: 'reading/one',
    nodeId: 'witness',
    nodeLabel: 'Noesis Reading',
    mode: 'integrated-reading',
    title: 'Integrated reading',
    content: 'A canonical body',
    createdAt: 1_775_000_000_000,
    favorite: false,
  }

  it('keeps the canonical record actionable in compact chat form', () => {
    const html = renderToStaticMarkup(
      createElement(CanonicalReadingReference, { entry, compact: true }),
    )

    expect(html).toContain('Canonical Folio record')
    expect(html).toContain('reading/one')
    expect(html).toContain('href="#/readings/reading%2Fone"')
    expect(html).toContain('Open record')
  })
})
