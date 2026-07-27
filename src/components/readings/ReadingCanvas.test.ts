import { createElement } from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ReadingDocument } from '../../lib/readings'
import { ReadingCanvas } from './ReadingCanvas'
import { ReadingLayerNav } from './ReadingLayerNav'
import { ReadingPreview } from './ReadingPreview'

const document: ReadingDocument = {
  id: 'preview-fixture',
  title: 'A concise reading',
  origin: 'live-chat',
  createdAt: null,
  mode: 'engine:numerology',
  nodeId: 'birth',
  nodeLabel: 'Birth Witness',
  owner: { id: 'owner', email: 'owner@example.test', label: 'Owner' },
  subject: { id: 'subject', kind: 'person', label: 'Subject' },
  structureSource: 'native',
  sections: [
    {
      id: 'orientation',
      title: 'Orientation',
      body: 'The first meaningful paragraph gives this reading its narrative orientation.',
      evidenceKind: 'witness',
    },
    {
      id: 'deeper-layer',
      title: 'Deeper layer',
      body: 'This second section belongs only in the full reading.',
      evidenceKind: 'system',
    },
  ],
  body: null,
  systems: ['numerology'],
  evidence: [],
  patterns: [],
  moments: [],
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
    {
      id: 'numerology:secondary',
      title: 'Secondary codes',
      kind: 'number-codes',
      sourceSystem: 'numerology',
      sourcePath: 'result.secondary',
      evidenceKind: 'deterministic',
      confidence: 'derived',
      codes: [{ id: 'expression', label: 'Expression', value: '5', reduction: [] }],
    },
  ],
  sourcePayload: { engine_id: 'numerology', result: { life_path: 7 } },
  bridgeQuestion: 'What becomes possible when you trust this pattern?',
  archive: { entryId: 'canonical-reading', favorite: false },
}

describe('ReadingCanvas', () => {
  it.each(['thread', 'reading', 'folio', 'compare', 'operator'] as const)(
    'exposes the %s density and a 70ch reading measure',
    (density) => {
      const html = renderToStaticMarkup(
        createElement(ReadingCanvas, { density }, createElement('p', null, 'Reading')),
      )

      expect(html).toContain('class="reading-canvas')
      expect(html).toContain(`data-reading-density="${density}"`)
      expect(html).toContain('--reading-measure:70ch')
    },
  )

  it('keeps structured composition fluid while prose owns the 70ch measure', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../../index.css'), 'utf8')
    const block = css.match(/\.reading-canvas\s*\{[^}]+\}/)?.[0] ?? ''

    expect(block).toContain('container-type: inline-size')
    expect(block).toContain('container-name: reading')
    expect(block).not.toContain('max-width: 70ch')
  })

  it('names all three document layers without relying on color', () => {
    const html = renderToStaticMarkup(
      createElement(ReadingLayerNav, { readingId: document.id }),
    )

    expect(html).toContain('Reading')
    expect(html).toContain('Evidence')
    expect(html).toContain('Source')
    expect(html).toContain(`#reading-${document.id}-reading`)
    expect(html).toContain(`#reading-${document.id}-evidence`)
    expect(html).toContain(`#reading-${document.id}-source`)
  })
})

describe('ReadingPreview', () => {
  it('shows one primary element and a concise path to the canonical reading', () => {
    const html = renderToStaticMarkup(createElement(ReadingPreview, { document }))

    expect(html).toContain('data-reading-density="thread"')
    expect(html).toContain('Number codes')
    expect(html).not.toContain('Secondary codes')
    expect(html).toContain('The first meaningful paragraph')
    expect(html).not.toContain('This second section belongs only in the full reading.')
    expect(html).toContain('Open reading')
    expect(html).toContain('#/readings/canonical-reading')
  })

  it('shows an explicit source-only orientation when no narrative or typed element is available', () => {
    const sourceOnly = {
      ...document,
      structureSource: 'flat' as const,
      sections: [],
      body: null,
      elements: [{
        id: 'future:raw',
        title: 'Future source',
        kind: 'raw' as const,
        sourceSystem: 'future',
        sourcePath: 'source',
        evidenceKind: 'deterministic' as const,
        confidence: 'observed' as const,
        value: { engine_id: 'future', private_value: 'technical-only' },
      }],
      sourcePayload: { engine_id: 'future', private_value: 'technical-only' },
      bridgeQuestion: null,
    }

    const html = renderToStaticMarkup(createElement(ReadingPreview, { document: sourceOnly }))

    expect(html).toContain('Source record received')
    expect(html).toContain('reader-ready narrative')
    expect(html).not.toContain('technical-only')
    expect(html).not.toContain('&quot;engine_id&quot;')
  })
})
