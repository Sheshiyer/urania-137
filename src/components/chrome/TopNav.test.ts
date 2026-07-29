import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TopNav } from './TopNav'

const targetClasses = ['min-h-11', 'min-w-11']

function expectMinimumTarget(tag: string | undefined) {
  expect(tag).toBeTruthy()
  for (const className of targetClasses) expect(tag).toContain(className)
}

describe('TopNav target geometry', () => {
  it('keeps the wordmark, desktop routes, and one mobile disclosure at least 44px square', () => {
    const html = renderToStaticMarkup(
      createElement(TopNav, {
        route: { view: 'home' },
        me: null,
        operator: false,
      }),
    )

    const wordmark = html.match(/<button[^>]*aria-label="Urania 137 — home"[^>]*>/)?.[0]
    expectMinimumTarget(wordmark)

    for (const label of ['Map', 'Folio', 'Begin', 'Settings']) {
      const controls = Array.from(
        html.matchAll(new RegExp(`<button([^>]*)>${label}(?:<|</button>)`, 'g')),
      )
      expect(controls).toHaveLength(1)
      for (const control of controls) expectMinimumTarget(control[1])
    }

    const menu = html.match(/<button[^>]*aria-label="Open navigation menu"[^>]*>/)?.[0]
    expectMinimumTarget(menu)
    expect(html).not.toContain('fixed inset-x-0 top-0')
  })

  it('keeps the desktop node search input at least 44px square', () => {
    const html = renderToStaticMarkup(
      createElement(TopNav, {
        route: { view: 'home' },
        me: null,
        operator: false,
      }),
    )
    const search = html.match(/<input[^>]*aria-label="Search stellar nodes"[^>]*>/)?.[0]

    expectMinimumTarget(search)
  })

  it('renders operator instrumentation only from the explicit capability prop', () => {
    const reader = renderToStaticMarkup(
      createElement(TopNav, {
        route: { view: 'home' },
        me: { id: 'reader', email: 'sheshnarayan.iyer@gmail.com' },
        operator: false,
      }),
    )
    const operator = renderToStaticMarkup(
      createElement(TopNav, {
        route: { view: 'home' },
        me: { id: 'operator', email: 'reader@example.com' },
        operator: true,
      }),
    )

    expect(reader).not.toContain('Operator')
    expect(operator).toContain('Operator')
  })

  it('marks Begin as the active product route for conversation', () => {
    const html = renderToStaticMarkup(
      createElement(TopNav, {
        route: {
          view: 'chat',
          nodeId: null,
          childId: null,
          readingId: null,
          returnTo: '/',
        },
        me: null,
        operator: false,
      }),
    )

    expect(html).toMatch(/<button[^>]*aria-current="page"[^>]*>Begin/)
  })
})

describe('shared action target geometry', () => {
  it.each(['primary', 'secondary', 'ghost'])(
    'keeps btn-%s at least 44px square',
    (variant) => {
      const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8')
      const rule = css.match(
        new RegExp(`\\.btn-${variant}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`),
      )?.[1]

      expectMinimumTarget(rule)
    },
  )
})
