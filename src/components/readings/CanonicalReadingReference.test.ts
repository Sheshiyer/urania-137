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

  it('stacks the full rail reference and allows long identity values to wrap', () => {
    const html = renderToStaticMarkup(
      createElement(CanonicalReadingReference, {
        entry: { ...entry, id: 'reading-with-a-very-long-canonical-identifier-that-must-wrap' },
      }),
    )

    expect(html).toContain('canonical-reading-reference')
    expect(html).toContain('[overflow-wrap:anywhere]')
    expect(html).not.toContain('sm:grid-cols-[auto_1fr_auto]')
    expect(html).not.toContain('truncate font-mono')
    expect(html).toContain('w-full')
  })
})
