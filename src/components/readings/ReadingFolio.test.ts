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
  it('renders one typed element without duplicating technical source in the thread preview', () => {
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
    expect(html).toContain('Open reading')
    expect(html).not.toContain('Technical source')
    expect(html).not.toContain('&quot;life_path&quot;')
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

  it('renders a Parchment folio with distinct Reading, Evidence, and collapsed Source layers', () => {
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
          codes: [{ id: 'life-path', label: 'Life Path', value: '7', reduction: [] }],
        },
        {
          id: 'numerology:raw',
          title: 'Raw source',
          kind: 'raw',
          sourceSystem: 'numerology',
          sourcePath: 'result',
          evidenceKind: 'deterministic',
          confidence: 'derived',
          value: { private_key: 'must-not-leak' },
        },
      ],
      sourcePayload: {
        engine_id: 'numerology',
        result: { life_path: 7 },
        access_token: 'must-not-leak',
      },
    }

    const html = renderToStaticMarkup(createElement(ReadingFolio, { document }))

    expect(html).toContain('class="reading-canvas')
    expect(html).toContain('data-reading-density="folio"')
    expect(html).toContain('data-reading-layer="reading"')
    expect(html).toContain('data-reading-layer="evidence"')
    expect(html).toContain('data-reading-layer="source"')
    expect(html).toContain('<details')
    expect(html.match(/<details/g)).toHaveLength(1)
    expect(html).not.toContain('<details open')
    expect(html).not.toContain('data-reading-element="raw"')
    expect(html).toContain('[REDACTED]')
    expect(html).not.toContain('must-not-leak')
  })

  it('preserves distinct Markdown heading levels beneath the document title', () => {
    const document: ReadingDocument = {
      ...base,
      body: '## Source orientation\n\nParagraph.\n\n### Supporting detail\n\nMore detail.',
    }

    const html = renderToStaticMarkup(createElement(ReadingFolio, { document }))

    expect(html).toMatch(/<h2[^>]*data-reading-heading-level="2"[^>]*>Source orientation<\/h2>/)
    expect(html).toMatch(/<h3[^>]*data-reading-heading-level="3"[^>]*>Supporting detail<\/h3>/)
    expect(html).not.toMatch(/<h3[^>]*>Source orientation<\/h3>/)
  })

  it('keeps a raw-only fenced document exclusively in collapsed privacy-filtered Source', () => {
    const secret = 'raw-only-secret-must-not-render'
    const rawPayload = {
      engine_id: 'biofield-capture',
      result: {
        analysis: { summary: 'Safe source-only analysis' },
        private_key: secret,
      },
    }
    const document: ReadingDocument = {
      ...base,
      body: `\`\`\`json\n${JSON.stringify(rawPayload)}\n\`\`\``,
      elements: [{
        id: 'biofield:raw',
        title: 'Raw capture source',
        kind: 'raw',
        sourceSystem: 'biofield-capture',
        sourcePath: 'result',
        evidenceKind: 'system',
        confidence: 'unverified',
        value: rawPayload,
      }],
    }

    const html = renderToStaticMarkup(createElement(ReadingFolio, { document }))
    const readingLayer = html.slice(
      html.indexOf('data-reading-layer="reading"'),
      html.indexOf('data-reading-layer="evidence"'),
    )
    const sourceLayer = html.slice(html.indexOf('data-reading-layer="source"'))

    expect(readingLayer).not.toContain('Safe source-only analysis')
    expect(readingLayer).not.toContain('data-language="json"')
    expect(readingLayer).not.toContain(secret)
    expect(sourceLayer).toContain('<details')
    expect(sourceLayer).not.toContain('<details open')
    expect(sourceLayer).toContain('data-reading-source="privacy-filtered"')
    expect(sourceLayer).toContain('Safe source-only analysis')
    expect(sourceLayer).toContain('[REDACTED]')
    expect(sourceLayer).not.toContain(secret)
  })

  it('offsets native section Markdown headings below the section title', () => {
    const document: ReadingDocument = {
      ...base,
      structureSource: 'native',
      body: null,
      sections: [{
        id: 'native-hierarchy',
        title: 'Native section',
        body: '## Contextual heading\n\nText.\n\n### Contextual detail\n\nDetail.',
        evidenceKind: 'witness',
      }],
    }

    const html = renderToStaticMarkup(createElement(ReadingFolio, { document }))

    expect(html).toMatch(/<h2[^>]*>Native section<\/h2>/)
    expect(html).toMatch(/<h3[^>]*data-reading-heading-level="3"[^>]*>Contextual heading<\/h3>/)
    expect(html).toMatch(/<h4[^>]*data-reading-heading-level="4"[^>]*>Contextual detail<\/h4>/)
    expect(html).not.toMatch(/<h2[^>]*>Contextual heading<\/h2>/)
  })

  it('renders explicit Evidence access reason and checksum without inventing unavailable values', () => {
    const document: ReadingDocument = {
      ...base,
      archive: { entryId: 'folio-137', favorite: false },
    }
    const html = renderToStaticMarkup(createElement(ReadingFolio, {
      document,
      evidenceContext: {
        accessReason: 'Authenticated owner opened this Folio entry',
        checksum: 'sha256:verified-checksum',
      },
    }))
    const unavailableHtml = renderToStaticMarkup(createElement(ReadingFolio, { document: base }))

    expect(html).toContain('Access reason')
    expect(html).toContain('Authenticated owner opened this Folio entry')
    expect(html).toContain('Checksum')
    expect(html).toContain('sha256:verified-checksum')
    expect(unavailableHtml).toContain('Access reason unavailable')
    expect(unavailableHtml).toContain('Checksum unavailable')
    expect(unavailableHtml).not.toContain('checksum in Folio reference')
  })

  it('keeps the selected canonical Reading, Evidence, and Source layers singular', () => {
    const document: ReadingDocument = {
      ...base,
      id: 'selected-canonical',
      archive: { entryId: 'folio-selected', favorite: true },
      sourcePayload: { engine_id: 'numerology', result: { life_path: 7 } },
    }
    const html = renderToStaticMarkup(createElement(ReadingFolio, {
      document,
      evidenceContext: {
        accessReason: 'Owner-scoped authenticated Folio access',
        checksum: 'sha256:canonical',
      },
    }))

    expect(html.match(/data-reading-layer="reading"/g)).toHaveLength(1)
    expect(html.match(/data-reading-layer="evidence"/g)).toHaveLength(1)
    expect(html.match(/data-reading-layer="source"/g)).toHaveLength(1)
    expect(html).toContain('Owner-scoped authenticated Folio access')
    expect(html).toContain('sha256:canonical')
    expect(html).not.toContain('<details open')
  })
})
