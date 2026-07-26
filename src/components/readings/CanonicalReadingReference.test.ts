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
    const openReading = html.match(
      /<a[^>]*href="#\/readings\/reading%2Fone"[^>]*>/,
    )?.[0]

    expect(openReading).toBeTruthy()
    expect(openReading).toContain('min-h-11')
    expect(openReading).toContain('min-w-11')
    expect(html).toContain('Open reading')
  })
})
