import { createElement } from 'react'
import type { ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type {
  ReadingArtifactElement,
  ReadingCaptureElement,
  ReadingFactGridElement,
  ReadingMediaElement,
  ReadingSequenceElement,
  ReadingSpreadElement,
} from '../../../lib/readings'
import { ActivationCross } from './ActivationCross'
import { CapturePanel } from './CapturePanel'
import { DoshaClock } from './DoshaClock'
import { FiveLimbMandala } from './FiveLimbMandala'
import { HexagramTransition } from './HexagramTransition'
import { MediaArtifact } from './MediaArtifact'
import { NestedPeriodSpiral } from './NestedPeriodSpiral'
import { RaagaPlayer } from './RaagaPlayer'
import { SafeGeometryPreview } from './SafeGeometryPreview'

const base = {
  sourceSystem: 'fixture',
  sourcePath: 'fixture.result',
  evidenceKind: 'deterministic' as const,
  confidence: 'observed' as const,
}

function markup(component: ComponentType<any>, props: Record<string, unknown>) {
  return renderToStaticMarkup(createElement(component, props))
}

describe('source-shaped engine artifacts', () => {
  it('renders exactly five supplied Panchanga limbs with a table alternative', () => {
    const element: ReadingFactGridElement = {
      ...base,
      id: 'limbs',
      title: 'The five limbs',
      kind: 'fact-grid',
      layout: 'limbs',
      facts: ['Vara', 'Tithi', 'Nakshatra', 'Yoga', 'Karana'].map((label, index) => ({
        id: label.toLowerCase(),
        label,
        value: String(index + 1),
      })),
    }
    const html = markup(FiveLimbMandala, { element })
    expect(html).toContain('data-engine-artifact="five-limb-mandala"')
    expect(html.match(/data-limb=/g)).toHaveLength(5)
    expect(html).toContain('<table')
    expect(html).not.toContain('cyclic transition')
  })

  it('draws an activation cross only from four supplied Gene Keys positions', () => {
    const element: ReadingSequenceElement = {
      ...base,
      id: 'activation',
      title: 'Activation sequence',
      kind: 'sequence',
      sequenceType: 'activation',
      steps: ["Life's work", 'Evolution', 'Radiance', 'Purpose'].map((label, index) => ({
        id: `position-${index}`,
        label,
        value: `${index + 1}.${index + 2}`,
      })),
    }
    const html = markup(ActivationCross, { element })
    expect(html).toContain('data-engine-artifact="activation-cross"')
    expect(html.match(/data-activation-position=/g)).toHaveLength(4)
    expect(html).toContain('<ol')

    const incomplete = markup(ActivationCross, {
      element: { ...element, steps: element.steps.slice(0, 3) },
    })
    expect(incomplete).toContain('Four source positions are required')
    expect(incomplete).not.toContain('data-activation-geometry=')
  })

  it('prints Vimshottari nesting and the canonical timeline', () => {
    const element: ReadingSequenceElement = {
      ...base,
      id: 'periods',
      title: 'Current periods',
      kind: 'sequence',
      sequenceType: 'temporal',
      steps: [
        { id: 'maha', label: 'Mahadasha', value: 'Rahu', start: '2008-09-09', end: '2026-09-09' },
        { id: 'antar', label: 'Antardasha', value: 'Mars', start: '2025-08-22', end: '2026-09-09' },
      ],
    }
    const html = markup(NestedPeriodSpiral, { element })
    expect(html).toContain('data-engine-artifact="nested-period-spiral"')
    expect(html).toContain('data-period-depth="0"')
    expect(html).toContain('data-period-depth="1"')
    expect(html).toContain('<table')
    expect(html).toContain('Rahu')
    expect(html).toContain('Mars')
    expect(html).toContain('Planet / value')
    expect(html.indexOf('Mahadasha')).toBeLessThan(html.indexOf('Antardasha'))
  })

  it('uses only current Vedic window facts or explicit transition rows', () => {
    const element: ReadingFactGridElement = {
      ...base,
      id: 'window',
      title: 'Current Vedic clock window',
      kind: 'fact-grid',
      layout: 'profile',
      facts: [
        { id: 'dosha', label: 'Current dosha', value: 'Pitta' },
        { id: 'window', label: 'Time window', value: '11:00–13:00' },
      ],
    }
    const html = markup(DoshaClock, { element })
    expect(html).toContain('data-engine-artifact="dosha-clock"')
    expect(html).toContain('Current source window')
    expect(html).toContain('<dl')
    expect(html).not.toContain('Next transition')
  })

  it('keeps I Ching primary, relating, and changing lines source ordered', () => {
    const element: ReadingSpreadElement = {
      ...base,
      id: 'hexagrams',
      title: 'Source-supplied hexagrams',
      kind: 'spread',
      tradition: 'i-ching',
      positions: [
        { id: 'primary', label: 'Primary hexagram', value: '#1 · The Creative' },
        { id: 'line-2', label: 'Changing line 2', value: 'Old yin' },
        { id: 'line-5', label: 'Changing line 5', value: 'Old yang' },
        { id: 'relating', label: 'Relating hexagram', value: '#14 · Great Possession' },
      ],
    }
    const html = markup(HexagramTransition, { element })
    expect(html).toContain('data-engine-artifact="hexagram-transition"')
    expect(html.indexOf('Changing line 2')).toBeLessThan(html.indexOf('Changing line 5'))
    expect(html).toContain('<table')
  })

  it('requires allowlisted media and always prints metadata provenance', () => {
    const media: ReadingMediaElement = {
      ...base,
      sourceSystem: 'raaga',
      id: 'audio',
      title: 'Generated raaga audio',
      kind: 'media',
      items: [{
        id: 'clip',
        label: 'Raaga audio clip',
        mediaType: 'audio',
        status: 'available',
        url: 'https://media.example/clip.wav',
        mimeType: 'audio/wav',
        sourcePath: 'generated_audio',
        textEquivalent: 'Source supplied audio.',
      }],
    }
    const html = markup(RaagaPlayer, { element: media })
    expect(html).toContain('<audio')
    expect(html).toContain('audio/wav')
    expect(html).toContain('generated_audio')
    expect(html).toContain('<table')

    const unsafe = markup(MediaArtifact, {
      element: {
        ...media,
        sourceSystem: 'sigil-forge',
        items: [{ ...media.items[0], mediaType: 'image', url: 'data:image/svg+xml,<svg onload="x">' }],
      },
    })
    expect(unsafe).not.toContain('<img')
    expect(unsafe).not.toContain('<svg')
    expect(unsafe).toContain('Media unavailable')

    const credentialed = markup(MediaArtifact, {
      element: {
        ...media,
        items: [{ ...media.items[0], url: 'https://media.example/clip.wav?access_token=private' }],
      },
    })
    expect(credentialed).not.toContain('<audio')
    expect(credentialed).not.toContain('access_token=private')
  })

  it('renders persisted capture metrics, chakra, consent, and quality in text', () => {
    const capture: ReadingCaptureElement = {
      ...base,
      sourceSystem: 'biofield',
      id: 'capture',
      title: 'Persisted capture',
      kind: 'capture',
      captureState: 'recorded',
      body: 'Consent recorded for persisted capture.',
      observations: [
        { id: 'coherence', label: 'Coherence', value: '0.72', sourcePath: 'result.metrics.coherence', status: 'recorded' },
        { id: 'chakra-root', label: 'Root chakra balance', value: '0.64', sourcePath: 'result.chakra_readings[0].balance', status: 'recorded' },
        { id: 'quality', label: 'Sufficient quality', value: 'Yes', sourcePath: 'result.quality.sufficient_quality', status: 'recorded' },
      ],
    }
    const html = markup(CapturePanel, { element: capture })
    expect(html).toContain('data-engine-artifact="capture-panel"')
    expect(html).toContain('data-capture-treatment="verified-persisted"')
    expect(html).toContain('Metric field')
    expect(html).toContain('Chakra spectrum')
    expect(html).toContain('Consent and quality')
    expect(html).toContain('result.metrics.coherence')

    const unpersisted = markup(CapturePanel, {
      element: {
        ...capture,
        title: 'Analysis without persisted capture identity',
        captureState: 'analyzed',
      },
    })
    expect(unpersisted).toContain('data-capture-treatment="capture-gated"')
    expect(unpersisted).toContain('Capture evidence required')
    expect(unpersisted).not.toContain('data-capture-treatment="verified-persisted"')
  })

  it('never executes arbitrary SVG or HTML in geometry previews', () => {
    const element: ReadingArtifactElement = {
      ...base,
      sourceSystem: 'sigil-forge',
      id: 'sigil',
      title: 'Sigil method',
      kind: 'artifact',
      artifactType: 'sigil',
      status: 'available',
      items: [{
        id: 'method',
        label: 'Method',
        value: '<svg onload="alert(1)"></svg>',
        sourcePath: 'result.method',
        status: 'available',
      }],
      steps: [],
    }
    const html = markup(SafeGeometryPreview, { element })
    expect(html).toContain('data-engine-artifact="safe-geometry-preview"')
    expect(html).not.toContain('<svg')
    expect(html).not.toContain('onload=')
    expect(html).toContain('[Executable markup omitted]')
    expect(html).toContain('<dl')
  })
})
