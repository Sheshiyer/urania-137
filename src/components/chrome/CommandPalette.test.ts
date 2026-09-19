import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CommandPalette } from './CommandPalette'

describe('CommandPalette', () => {
  it('renders the search input with the correct aria-label when open', () => {
    const html = renderToStaticMarkup(
      createElement(CommandPalette, { open: true, onClose: () => {} }),
    )
    expect(html).toContain('aria-label="Search stellar nodes"')
    expect(html).toContain('aria-label="Command palette"')
    expect(html).toContain('aria-modal="true"')
  })

  it('renders grouped results: actions, stellar nodes, doorways', () => {
    const html = renderToStaticMarkup(
      createElement(CommandPalette, { open: true, onClose: () => {} }),
    )
    expect(html).toContain('Actions')
    expect(html).toContain('Stellar nodes')
    expect(html).toContain('Doorways')
  })

  it('renders nothing when closed', () => {
    const html = renderToStaticMarkup(
      createElement(CommandPalette, { open: false, onClose: () => {} }),
    )
    expect(html).toBe('')
  })
})
