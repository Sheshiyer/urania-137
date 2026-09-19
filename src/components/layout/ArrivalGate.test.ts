import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ArrivalGate } from './ArrivalGate'

describe('ArrivalGate', () => {
  it('keeps the experience-gate contract hook and a polite status region', () => {
    const html = renderToStaticMarkup(createElement(ArrivalGate))
    expect(html).toContain('data-experience-gate')
    expect(html).toContain('role="status"')
    expect(html).toContain('Opening the field')
    expect(html).toContain('Recalling your place in the map.')
  })

  it('accepts a custom line for non-map waits', () => {
    const html = renderToStaticMarkup(createElement(ArrivalGate, { line: 'Opening the operator record.' }))
    expect(html).toContain('Opening the operator record.')
  })
})
