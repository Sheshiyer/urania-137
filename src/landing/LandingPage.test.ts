import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LandingPage } from './LandingPage'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const origin = 'https://app.urania.tryambakam.space'
const landingCss = readFileSync(join(__dirname, 'landing.css'), 'utf8')

describe('public landing page', () => {
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

    const ctas = [...html.matchAll(/href="(https:\/\/app\.urania\.tryambakam\.space\/[^\"]*)"/g)]
      .map((match) => match[1])
    expect(ctas).toHaveLength(3)
    expect(ctas.every((href) => href === `${origin}/`)).toBe(true)
    expect(html).not.toContain('#/console')
    expect(html).not.toContain('onClick')
    expect(html).not.toContain('javascript:')
  })

  it('ships static media fallback with no video or eager runtime payload', () => {
    const html = render()

    expect(html).toContain('data-media-fallback="true"')
    expect(landingCss).toContain("url('/media/field-poster.svg')")
    expect(html).not.toContain('<video')
    expect(html).not.toContain('<img')
  })

  it('renders liquid-glass witness prompt and file upload affordance', () => {
    const html = render()

    expect(html).toContain('landing-witness-card')
    expect(html).toContain('landing-witness-prompt')
    expect(html).toContain('landing-file-input')
    expect(html).toContain('landing-file-trigger')
    expect(html).toContain('Choose image or PDF')
    expect(html).toContain('nothing is sent from this page')
    expect(html).toContain('accept="image/*,.pdf"')
    expect(html).toContain('id="landing-witness-input"')
    expect(html).toContain('for="landing-witness-input"')
    expect(html).toContain('aria-describedby="landing-context-note"')
    expect(html).toContain('id="landing-context-note"')
    expect(html).toContain('data-protected-app-cta')
    expect(html).not.toMatch(/upload\s*storage/i)
    expect(html).not.toContain('<form')
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

  it('adds tactile focus and hover state affordances for interactive elements', () => {
    const html = render()

    expect(html).toContain('landing-file-trigger')
    expect(html).toContain('landing-primary-cta')
    expect(html).toContain('landing-invitation-cta')
  })

  it('contains contrast veil and reduced-motion awareness in landing CSS', () => {
    expect(landingCss).toContain('landing-hero-overlay')
    expect(landingCss).toContain('min-height: 100svh')
    expect(landingCss).toContain('width: min(100%, 701px)')
    expect(landingCss).toContain('backdrop-filter: blur(20px)')
    expect(landingCss).toContain('prefers-reduced-motion: reduce')
  })

  it('keeps the prompt in normal document flow with retained evidence anchors', () => {
    const html = render()

    expect(html).toContain('href="#instrument"')
    expect(html).toContain('id="instrument"')
    expect(html).toContain('id="principles"')
    expect(html).toContain('id="invitation"')
    expect(html).not.toMatch(/modal|dialog|scrim|dismiss|scroll-lock/i)
  })

  it('keeps protected app navigation strictly allowlisted and avoids prompt leakage in URLs', () => {
    const html = render()

    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1])
    const absoluteHrefs = hrefs.filter((href) => /^https?:\/\//i.test(href))
    const unexpected =
      absoluteHrefs.find(
        (href) => !href.startsWith('https://app.urania.tryambakam.space/'),
      )

    expect(unexpected).toBeUndefined()
    expect(html).not.toContain('prompt=')
    expect(html).not.toContain(encodeURIComponent('What pattern keeps returning'))
  })
})
