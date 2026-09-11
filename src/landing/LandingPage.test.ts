import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LandingPage } from './LandingPage'

const origin = 'https://app.urania.tryambakam.space'

describe('public landing page (Golden Portal Motionskin)', () => {
  const render = () =>
    renderToStaticMarkup(
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

  it('uses declarative landing-to-protected-app links only', () => {
    const html = render()

    const ctas = [...html.matchAll(/href="(https:\/\/app\.urania\.tryambakam\.space\/[^\"]*)"/g)].map(
      (match) => match[1],
    )
    expect(ctas.length).toBeGreaterThanOrEqual(3)
    expect(ctas.every((href) => href === `${origin}/`)).toBe(true)
    expect(html).not.toContain('#/console')
    expect(html).not.toContain('javascript:')
  })

  it('ships Golden Portal media with metadata preload (not auto)', () => {
    const html = render()

    expect(html).toContain('<video')
    expect(html).toContain('/media/gp-hero.mp4')
    expect(html).toContain('preload="metadata"')
    expect(html).not.toContain('preload="auto"')
    expect(html).toContain('/media/gp-showcase.webp')
  })

  it('preserves Urania funnel copy, section map, and Access threshold CTA', () => {
    const html = render()

    expect(html).toContain('SEE THE')
    expect(html).toContain('PATTERN')
    expect(html).toContain('Keep the authority')
    expect(html).toContain('The instrument')
    expect(html).toContain('Birth Witness')
    expect(html).toContain('Source before model')
    expect(html).toContain('Enter when the question is active.')
    expect(html).toContain('Open Urania 137')
    expect(html).toContain('Cloudflare Access email OTP')
    expect(html).toContain('id="instrument"')
    expect(html).toContain('id="lenses"')
    expect(html).toContain('id="principles"')
    expect(html).toContain('id="invitation"')
    expect(html).toContain('data-protected-app-cta')
    expect(html).toContain('data-urania-threshold')
  })

  it('rejects forbidden vocabulary and preserves no AI-as-feature framing', () => {
    const text = render().replace(/<[^>]*>/g, ' ').toLowerCase()

    expect(text).not.toMatch(/\bmanifesting\b/)
    expect(text).not.toMatch(/\bhealing\b/)
    expect(text).not.toMatch(/\bjourney\b/)
    expect(text).not.toMatch(/\bpath\b/)
    expect(text).not.toMatch(/ai as a feature/)
    expect(text).not.toMatch(/artificial intelligence/)
  })

  it('keeps protected app navigation strictly allowlisted', () => {
    const html = render()

    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1])
    const absoluteHrefs = hrefs.filter((href) => /^https?:\/\//i.test(href))
    const unexpected = absoluteHrefs.find(
      (href) => !href.startsWith('https://app.urania.tryambakam.space/'),
    )

    expect(unexpected).toBeUndefined()
    expect(html).not.toContain('prompt=')
  })
})
