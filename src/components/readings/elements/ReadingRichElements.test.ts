import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { extractReadingElements } from '../../../lib/readings'
import { ReadingElementField } from './ReadingElementField'

describe('media, artifact, and capture reading elements', () => {
  it('renders playable raaga audio with a written equivalent and provenance', () => {
    const elements = extractReadingElements({
      engine_id: 'raaga',
      result: { melakarta: { num: 15, name: 'Mayamalavagaula' } },
      generated_audio: { clip_url: 'https://media.example/raaga.wav' },
    })
    const html = renderToStaticMarkup(createElement(ReadingElementField, { elements }))

    expect(html).toContain('data-reading-element="media"')
    expect(html).toContain('<audio')
    expect(html).toContain('Raaga audio clip supplied by the generated_audio source field.')
    expect(html).toContain('generated_audio')
  })

  it('renders sigil method text while refusing executable SVG media', () => {
    const elements = extractReadingElements({
      engine_id: 'sigil-forge',
      result: {
        intention: 'clarity',
        method: { name: 'Word Elimination', steps: ['Remove vowels'] },
      },
      generated_image: { url: 'data:image/svg+xml,<svg onload="alert(1)"></svg>' },
    })
    const html = renderToStaticMarkup(createElement(ReadingElementField, { elements }))

    expect(html).toContain('data-reading-element="artifact"')
    expect(html).toContain('Word Elimination')
    expect(html).toContain('data-media-status="failed"')
    expect(html).not.toContain('<svg')
    expect(html).not.toContain('onload=')
  })

  it('renders capture state and each observed value with a text status', () => {
    const elements = extractReadingElements({
      engine_id: 'biofield-capture',
      result: {
        reading_id: 'reading-7',
        metrics: { body_symmetry: 0.81 },
        quality_assessment: { sufficient_quality: false },
      },
    })
    const html = renderToStaticMarkup(createElement(ReadingElementField, { elements }))

    expect(html).toContain('data-reading-element="capture"')
    expect(html).toContain('Capture recorded')
    expect(html).toContain('Body symmetry')
    expect(html).toContain('result.metrics.body_symmetry')
    expect(html).toContain('recorded')
    expect(html).toContain('No')
  })
})
