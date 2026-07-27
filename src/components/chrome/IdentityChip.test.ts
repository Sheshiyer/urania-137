import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { IdentityChip } from './IdentityChip'

describe('IdentityChip target geometry', () => {
  it('keeps identity chrome desktop-only and logout at least 44px square', () => {
    const html = renderToStaticMarkup(
      createElement(IdentityChip, {
        me: { id: 'owner', email: 'owner@example.com' },
      }),
    )
    const wrapper = html.match(/<div[^>]*>/)?.[0]
    const logout = html.match(/<a[^>]*href="\/api\/logout"[^>]*>/)?.[0]

    expect(wrapper).toContain('hidden')
    expect(wrapper).toContain('md:flex')
    expect(logout).toContain('min-h-11')
    expect(logout).toContain('min-w-11')
  })
})
