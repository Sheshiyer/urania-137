import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CopyButton } from './CopyButton'

describe('CopyButton', () => {
  it('renders with the idle label and 44px minimum target', () => {
    const html = renderToStaticMarkup(
      createElement(CopyButton, { value: 'test', label: 'Copy checksum' }),
    )
    expect(html).toContain('Copy checksum')
    expect(html).toContain('min-h-11')
    expect(html).toContain('min-w-11')
    expect(html).toContain('aria-live="polite"')
  })

  it('accepts a custom label', () => {
    const html = renderToStaticMarkup(
      createElement(CopyButton, { value: 'x', label: 'Copy SHA' }),
    )
    expect(html).toContain('Copy SHA')
  })
})
