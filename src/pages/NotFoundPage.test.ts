import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { NotFoundPage } from './NotFoundPage'
import { SELEMENE_NODES } from '../data/selemeneNodes'

describe('NotFoundPage', () => {
  it('names the uncharted address and offers every parent lens as the way in', () => {
    const html = renderToStaticMarkup(createElement(NotFoundPage, { hash: '#/nope' }))
    expect(html).toContain('data-not-found')
    expect(html).toContain('Not on the map.')
    expect(html).toContain('#/nope')
    expect(html).toContain('Return to map')
    expect(html).toContain('Browse Folio')
    for (const node of SELEMENE_NODES) expect(html).toContain(node.label)
    expect(html).toMatch(/<ol[^>]*aria-label="Parent lenses"/)
  })
})
