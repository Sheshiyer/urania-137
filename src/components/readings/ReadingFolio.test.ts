import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ReadingDocument } from '../../lib/readings'
import { ReadingFolio } from './ReadingFolio'

const base: ReadingDocument = {
  id: 'fixture',
  title: 'Fixture reading',
  origin: 'live-chat',
  createdAt: null,
  mode: 'engine:numerology',
  nodeId: 'birth',
  nodeLabel: 'Birth Witness',
  owner: { id: 'owner', email: 'owner@example.test', label: 'Owner' },
  subject: { id: 'subject', kind: 'person', label: 'Subject' },
  structureSource: 'flat',
  sections: [],
  body: 'Stored source body.',
  systems: ['numerology'],
  evidence: [],
  patterns: [],
  moments: [],
  elements: [],
  sourcePayload: null,
  bridgeQuestion: null,
  archive: { entryId: null, favorite: false },
}

describe('ReadingFolio element integration', () => {
  it('renders typed elements and progressively disclosed source in the thread view', () => {
    const document: ReadingDocument = {
      ...base,
      elements: [
        {
          id: 'numerology:codes',
          title: 'Number codes',
          kind: 'number-codes',
          sourceSystem: 'numerology',
          sourcePath: 'result',
          evidenceKind: 'deterministic',
          confidence: 'derived',
          codes: [{ id: 'life-path', label: 'Life Path', value: '7', reduction: ['34', '7'] }],
        },
      ],
      sourcePayload: { engine_id: 'numerology', result: { life_path: { value: 7 } } },
    }
    const html = renderToStaticMarkup(createElement(ReadingFolio, { document, variant: 'thread' }))
    expect(html).toContain('Source-shaped elements')
    expect(html).toContain('Number codes')
    expect(html).toContain('Technical source')
    expect(html).toContain('<details')
    expect(html).not.toContain('Stored reading')
  })

  it('retains the honest flat-body fallback when no elements exist', () => {
    const html = renderToStaticMarkup(createElement(ReadingFolio, { document: base }))
    expect(html).toContain('Unstructured source')
    expect(html).toContain('Stored reading')
    expect(html).toContain('Stored source body.')
    expect(html).toContain('zero inferred sections')
  })

  it('renders daily source elements beside native narrative sections', () => {
    const document: ReadingDocument = {
      ...base,
      mode: 'daily-panchanga',
      structureSource: 'native',
      body: null,
      sections: [{ id: 'vara', title: 'The Day-Lord', body: 'Source-authored narrative.', evidenceKind: 'deterministic' }],
      elements: [
        {
          id: 'panchanga:five-limbs',
          title: 'The five limbs',
          kind: 'fact-grid',
          layout: 'limbs',
          sourceSystem: 'panchanga',
          sourcePath: '[0].result',
          evidenceKind: 'deterministic',
          confidence: 'derived',
          facts: [{ id: 'vara', label: 'Vara', value: 'Somavara' }],
        },
      ],
      sourcePayload: [{ engine_id: 'panchanga', result: { vara_name: 'Somavara' } }],
    }
    const html = renderToStaticMarkup(createElement(ReadingFolio, { document, variant: 'thread' }))
    expect(html).toContain('The five limbs')
    expect(html).toContain('The Day-Lord')
    expect(html).toContain('Source-authored narrative.')
  })
})
