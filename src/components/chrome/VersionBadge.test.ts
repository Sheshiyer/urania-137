import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { VersionBadge } from './VersionBadge'

describe('VersionBadge', () => {
  it('keeps the settings affordance at least 44 by 44 CSS pixels', () => {
    const html = renderToStaticMarkup(createElement(VersionBadge))

    expect(html).toContain('min-h-11')
    expect(html).toContain('min-w-11')
  })
})
