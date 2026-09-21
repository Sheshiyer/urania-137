import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LandingPage } from './LandingPage'

const origin = 'https://app.urania.tryambakam.space'

function render(path = '/') {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: [path] },
      createElement(LandingPage, { protectedAppOrigin: origin, development: false }),
    ),
  )
}

describe('public landing ecosystem (Golden Portal shell)', () => {
  it('renders home as one semantic page and one h1', () => {
    const html = render('/')

    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html).toContain('<header')
    expect(html).toContain('<nav')
    expect(html).toContain('<main')
    expect(html).toContain('<footer')
    expect(html).toContain('href="#main-content"')
  })

  it('uses declarative landing-to-protected-app links only', () => {
    const html = render('/')

    const ctas = [...html.matchAll(/href="(https:\/\/app\.urania\.tryambakam\.space\/[^\"]*)"/g)].map(
      (match) => match[1],
    )
    expect(ctas.length).toBeGreaterThanOrEqual(2)
    expect(ctas.every((href) => href === `${origin}/`)).toBe(true)
    expect(html).not.toContain('#/console')
    expect(html).not.toContain('javascript:')
  })

  it('ships Golden Portal media with metadata preload (not auto)', () => {
    const html = render('/')

    expect(html).toContain('<video')
    expect(html).toContain('/media/gp-hero.mp4')
    expect(html).toContain('preload="metadata"')
    expect(html).not.toContain('preload="auto"')
    expect(html).toContain('/media/urania/hero-2k.png')
  })

  it('exposes first-time-user rooms as real routes in the shared nav', () => {
    const html = render('/')

    expect(html).toContain('href="/instrument"')
    expect(html).toContain('href="/lenses"')
    expect(html).toContain('href="/principles"')
    expect(html).toContain('href="/enter"')
    expect(html).toContain('See the pattern. Keep the authority.')
    expect(html).toContain('Keep the authority')
    expect(html).toContain('data-protected-app-cta')
    expect(html).toContain('data-urania-threshold')
  })

  it('renders instrument, lenses, principles, and enter rooms', () => {
    const instrument = render('/instrument')
    expect(instrument).toContain('One field. Seven rooms. Every reading traceable.')
    expect(instrument).toContain('Threshold collects only what the capability needs.')
    expect(instrument).toContain('Selemene stays named and separate.')
    expect(instrument).toContain('href="/lenses"')

    const lenses = render('/lenses')
    expect(lenses).toContain('Seven rooms. One graph.')
    expect(lenses).toContain('Birth Witness')
    expect(lenses).toContain('Bridge Query')
    expect(lenses).toContain('href="/principles"')

    const principles = render('/principles')
    expect(principles).toContain('Answers that keep authority with you.')
    expect(principles).toContain('What is Urania 137?')
    expect(principles).toContain('Access')

    const enter = render('/enter')
    expect(enter).toContain('Enter when the question is active.')
    expect(enter).toContain('data-urania-threshold')
    expect(enter).toContain('Open Urania 137')
    expect(enter).toContain('Cloudflare Access email OTP')
    expect(enter).toContain('preload="metadata"')
  })

  it('rejects forbidden vocabulary and preserves no AI-as-feature framing', () => {
    for (const path of ['/', '/instrument', '/lenses', '/principles', '/enter']) {
      const text = render(path).replace(/<[^>]*>/g, ' ').toLowerCase()
      expect(text).not.toMatch(/\bmanifesting\b/)
      expect(text).not.toMatch(/\bhealing\b/)
      expect(text).not.toMatch(/\bjourney\b/)
      expect(text).not.toMatch(/\bpath\b/)
      expect(text).not.toMatch(/ai as a feature/)
      expect(text).not.toMatch(/artificial intelligence/)
    }
  })

  it('keeps protected app navigation strictly allowlisted', () => {
    for (const path of ['/', '/instrument', '/lenses', '/principles', '/enter']) {
      const html = render(path)
      const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1])
      const absoluteHrefs = hrefs.filter((href) => /^https?:\/\//i.test(href))
      const unexpected = absoluteHrefs.find(
        (href) => !href.startsWith('https://app.urania.tryambakam.space/'),
      )
      expect(unexpected).toBeUndefined()
      expect(html).not.toContain('prompt=')
    }
  })
})
