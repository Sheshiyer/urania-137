import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HomePage } from './HomePage'
import type { ExperienceState } from '../lib/experience'

const returning: ExperienceState = {
  status: 'ready',
  lifecycle: 'returning',
  operator: false,
  notice: null,
}

describe('HomePage journey rail', () => {
  it('foregrounds continuation, Folio, and a new reading for returning readers', () => {
    const html = renderToStaticMarkup(createElement(HomePage, { experience: returning }))

    expect(html).toContain('Returning reader')
    expect(html).toContain('Open Folio')
    expect(html).toContain('Begin reading')
    expect(html).not.toContain('Evidence')
  })

  it('adds an operator evidence doorway without removing personal reading actions', () => {
    const html = renderToStaticMarkup(createElement(HomePage, {
      experience: { ...returning, operator: true },
    }))

    expect(html).toContain('Operator lens')
    expect(html).toContain('Evidence')
    expect(html).toContain('Open Folio')
    expect(html).toContain('Begin reading')
  })

  it('keeps the map usable when experience resolution is degraded', () => {
    const html = renderToStaticMarkup(createElement(HomePage, {
      experience: {
        status: 'degraded',
        lifecycle: 'unknown',
        operator: false,
        notice: 'offline',
      },
    }))

    expect(html).toContain('Field available')
    expect(html).toContain('The map remains available')
  })
})
