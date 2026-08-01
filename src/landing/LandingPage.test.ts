import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LandingPage } from './LandingPage'

const origin = 'https://app.urania.tryambakam.space'

describe('public landing page', () => {
  const render = () => renderToStaticMarkup(
    createElement(LandingPage, { protectedAppOrigin: origin, development: false }),
  )

  it('renders one semantic page and one h1', () => {
    const html = render()
    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html).toContain('<header')
    expect(html).toContain('<nav')
    expect(html).toContain('<main')
    expect(html).toContain('<footer')
    expect(html).toContain('href="#main-content"')
  })

  it('uses declarative full-document links to the protected application', () => {
    const html = render()
    const matches = html.match(/href="https:\/\/app\.urania\.tryambakam\.space\/"/g)
    expect(matches?.length).toBeGreaterThanOrEqual(3)
    expect(html).not.toContain('#/console')
    expect(html).not.toContain('onClick')
  })

  it('ships a static media fallback without eager video payloads', () => {
    const html = render()
    expect(html).toContain('data-media-fallback="true"')
    expect(html).toContain('/media/field-poster.svg')
    expect(html).not.toContain('preload="auto"')
    expect(html).not.toContain('<video')
  })
})
