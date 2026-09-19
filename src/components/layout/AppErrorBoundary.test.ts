import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AppErrorBoundary } from './AppErrorBoundary'

describe('AppErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    const html = renderToStaticMarkup(
      createElement(AppErrorBoundary, null, createElement('p', null, 'the map')),
    )
    expect(html).toContain('the map')
    expect(html).not.toContain('data-app-error')
  })

  it('derives an alert state from a thrown error with a return-to-map action', () => {
    const state = AppErrorBoundary.getDerivedStateFromError(new Error('boom'))
    expect(state.error?.message).toBe('boom')
    const boundary = new AppErrorBoundary({ children: null })
    boundary.state = state
    boundary.setState = vi.fn() as never
    const html = renderToStaticMarkup(boundary.render() as never)
    expect(html).toContain('data-app-error')
    expect(html).toContain('role="alert"')
    expect(html).toContain('Return to map')
    expect(html).toContain('Try again')
    expect(html).toContain('boom')
  })
})
