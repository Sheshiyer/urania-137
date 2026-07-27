import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ReadingElement } from '../../../lib/readings'
import { ReadingElementField } from './ReadingElementField'
import { ReadingSourcePayload } from './ReadingSourcePayload'

const shared = {
  sourceSystem: 'fixture',
  sourcePath: 'result',
  evidenceKind: 'deterministic' as const,
  confidence: 'derived' as const,
}

const elements: ReadingElement[] = [
  { ...shared, id: 'fact', title: 'Facts', kind: 'fact-grid', layout: 'grid', facts: [{ id: 'a', label: 'Alpha', value: 'One' }] },
  { ...shared, id: 'numbers', title: 'Numbers', kind: 'number-codes', codes: [{ id: 'n', label: 'Code', value: '7', reduction: ['34', '7'] }] },
  { ...shared, id: 'positions', title: 'Positions', kind: 'positions', frame: 'natal', positions: [{ id: 'p', label: 'Moon', sign: 'Virgo', degree: 1.38, isRetrograde: false }] },
  { ...shared, id: 'relations', title: 'Relations', kind: 'relations', relations: [{ id: 'r', from: 'Mercury', to: 'Moon', relation: 'Square', measure: '1.25° orb', status: 'Applying' }] },
  { ...shared, id: 'sequence', title: 'Sequence', kind: 'sequence', sequenceType: 'temporal', steps: [{ id: 's', label: 'Mahadasha', value: 'Rahu', start: '2008', end: '2026' }] },
  { ...shared, id: 'cycles', title: 'Cycles', kind: 'cycles', cycles: [{ id: 'c', label: 'Physical', value: 52, unit: '%', min: 0, max: 100, status: 'Rising' }] },
  { ...shared, id: 'spread', title: 'Spread', kind: 'spread', tradition: 'tarot', positions: [{ id: 'x', label: 'Center', value: 'The Star' }] },
  { ...shared, id: 'collections', title: 'Collections', kind: 'collections', groups: [{ id: 'g', label: 'Centers', items: ['Root'] }] },
  { ...shared, id: 'questions', title: 'Questions', kind: 'questions', questions: ['What do you notice?'] },
  { ...shared, id: 'notice', title: 'Notice', kind: 'notice', tone: 'unresolved', body: 'Source context is missing.' },
  { ...shared, id: 'raw', title: 'Raw source', kind: 'raw', value: { future: true } },
]

describe('ReadingElementField', () => {
  it('exhaustively renders every semantic element kind', () => {
    const html = renderToStaticMarkup(createElement(ReadingElementField, { elements }))
    for (const element of elements) {
      expect(html).toContain(`data-reading-element="${element.kind}"`)
    }
    expect(html).toContain('Applying')
    expect(html).toContain('Each line connects the two named endpoints')
    expect(html).toContain('Bar length uses the source scale')
  })

  it('writes numeric and status encodings as text rather than color alone', () => {
    const html = renderToStaticMarkup(createElement(ReadingElementField, { elements: elements.filter((element) => element.kind === 'cycles') }))
    expect(html).toContain('52.00%')
    expect(html).toContain('Rising')
  })

  it('escapes source payload markup and keeps it progressively disclosed', () => {
    const html = renderToStaticMarkup(createElement(ReadingSourcePayload, { payload: { text: '<script>alert(1)</script>' } }))
    expect(html).toContain('<details')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>')
  })

  it('privacy-filters generic raw fallbacks as well as technical source disclosures', () => {
    const html = renderToStaticMarkup(createElement(ReadingElementField, {
      elements: [{
        ...shared,
        id: 'private-raw',
        title: 'Private raw source',
        kind: 'raw',
        value: { input: { image_data: 'must-not-leak' }, result: { available: false } },
      }],
    }))
    expect(html).toContain('[REDACTED]')
    expect(html).toContain('&quot;available&quot;: false')
    expect(html).not.toContain('must-not-leak')
  })
})
