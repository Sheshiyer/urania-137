import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ContinuationDock } from './ContinuationDock'
import type { ExperienceState } from '../../lib/experience'

const returning: ExperienceState = {
  status: 'ready',
  lifecycle: 'returning',
  operator: false,
  notice: null,
}

describe('ContinuationDock', () => {
  it('renders continuation actions for returning readers', () => {
    const html = renderToStaticMarkup(createElement(ContinuationDock, { experience: returning }))
    expect(html).toContain('Returning reader')
    expect(html).toContain('Begin reading')
    expect(html).toContain('Open Folio')
    expect(html).not.toContain('Evidence')
    expect(html).toContain('data-home-journey="returning"')
  })

  it('renders operator lens with evidence doorway', () => {
    const html = renderToStaticMarkup(createElement(ContinuationDock, {
      experience: { ...returning, operator: true },
    }))
    expect(html).toContain('Operator lens')
    expect(html).toContain('Evidence')
    expect(html).toContain('Begin reading')
    expect(html).toContain('Open Folio')
  })

  it('renders degraded state', () => {
    const html = renderToStaticMarkup(createElement(ContinuationDock, {
      experience: { status: 'degraded', lifecycle: 'unknown', operator: false, notice: 'offline' },
    }))
    expect(html).toContain('Field available')
    expect(html).toContain('The map remains available')
  })

  it('uses capsule styling at the bottom of the viewport', () => {
    const html = renderToStaticMarkup(createElement(ContinuationDock, { experience: returning }))
    expect(html).toContain('bottom-4')
    expect(html).toContain('capsule')
  })

  it('returns null for new users', () => {
    const html = renderToStaticMarkup(createElement(ContinuationDock, {
      experience: { status: 'ready', lifecycle: 'new', operator: false, notice: null },
    }))
    expect(html).toBe('')
  })
})
