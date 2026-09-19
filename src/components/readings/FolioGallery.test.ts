import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FolioGallery } from './FolioGallery'
import type { ReadingDTO } from '../../lib/api/contract'

const entry: ReadingDTO = {
  id: 'r-1',
  nodeId: 'birth',
  nodeLabel: 'Birth',
  mode: 'Solo',
  title: 'Test Reading',
  content: '',
  createdAt: Date.now(),
  favorite: false,
}

describe('FolioGallery', () => {
  it('renders tiles with data-folio-tile attribute', () => {
    const html = renderToStaticMarkup(
      createElement(FolioGallery, {
        entries: [entry],
        selectedId: null,
        onSelect: () => {},
      }),
    )
    expect(html).toContain('data-folio-tile="r-1"')
    expect(html).toContain('Test Reading')
    expect(html).toContain('Birth')
  })

  it('highlights the selected tile', () => {
    const html = renderToStaticMarkup(
      createElement(FolioGallery, {
        entries: [entry],
        selectedId: 'r-1',
        onSelect: () => {},
      }),
    )
    expect(html).toContain('border-gold/60')
  })

  it('uses auto-fill grid layout', () => {
    const html = renderToStaticMarkup(
      createElement(FolioGallery, {
        entries: [entry],
        selectedId: null,
        onSelect: () => {},
      }),
    )
    expect(html).toContain('auto-fill')
    expect(html).toContain('minmax(18rem')
  })

  it('returns null for empty entries', () => {
    const html = renderToStaticMarkup(
      createElement(FolioGallery, {
        entries: [],
        selectedId: null,
        onSelect: () => {},
      }),
    )
    expect(html).toBe('')
  })
})
