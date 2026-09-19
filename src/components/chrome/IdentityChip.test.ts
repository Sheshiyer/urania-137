import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { IdentityChip } from './IdentityChip'

describe('IdentityChip target geometry', () => {
  it('is visible on all viewports and logout is at least 44px square', () => {
    const html = renderToStaticMarkup(
      createElement(IdentityChip, {
        me: { id: 'owner', email: 'owner@example.com' },
      }),
    )
    const wrapper = html.match(/<div[^>]*>/)?.[0]
    const logout = html.match(/<a[^>]*href="\/api\/logout"[^>]*>/)?.[0]

    expect(wrapper).toBeTruthy()
    // The wrapper is now visible on all viewports — no md:flex gating
    expect(wrapper).toContain('flex')
    expect(wrapper).not.toMatch(/\bhidden\b/)
    expect(logout).toContain('min-h-11')
    expect(logout).toContain('min-w-11')
  })

  it('uses "Leave the field" as the logout label', () => {
    const html = renderToStaticMarkup(
      createElement(IdentityChip, {
        me: { id: 'owner', email: 'owner@example.com' },
      }),
    )
    expect(html).toContain('Leave the field')
    expect(html).toContain('aria-label="Leave the field')
  })

  it('returns null when no user is signed in', () => {
    const html = renderToStaticMarkup(
      createElement(IdentityChip, { me: null }),
    )
    expect(html).toBe('')
  })
})
