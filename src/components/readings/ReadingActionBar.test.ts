import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ReadingActionBar } from './ReadingActionBar'

describe('ReadingActionBar', () => {
  it('renders continue-in-conversation with the correct data attribute', () => {
    const html = renderToStaticMarkup(
      createElement(ReadingActionBar, { readingId: 'abc', checksum: 'deadbeef' }),
    )
    expect(html).toContain('data-reading-relation="continue-in-conversation"')
    expect(html).toContain('Continue in conversation')
    expect(html).toContain('Browse Folio')
  })

  it('renders copy checksum when checksum is provided', () => {
    const html = renderToStaticMarkup(
      createElement(ReadingActionBar, { readingId: 'abc', checksum: 'deadbeef' }),
    )
    expect(html).toContain('Copy checksum')
  })

  it('omits copy button when no checksum', () => {
    const html = renderToStaticMarkup(
      createElement(ReadingActionBar, { readingId: 'abc', checksum: null }),
    )
    expect(html).not.toContain('Copy checksum')
  })

  it('uses capsule styling for the action bar', () => {
    const html = renderToStaticMarkup(
      createElement(ReadingActionBar, { readingId: 'abc', checksum: null }),
    )
    expect(html).toContain('rounded-pill')
    expect(html).toContain('shadow-capsule')
    expect(html).toContain('pointer-events-none')
  })
})
