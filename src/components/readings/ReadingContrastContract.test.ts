import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../../..')

function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8')
}

const DARK_INSTRUMENT_SOURCES = [
  'src/components/readings/CanonicalReadingReference.tsx',
  'src/components/readings/EvidenceLedger.tsx',
  'src/components/readings/ReadingInstrument.tsx',
  'src/components/readings/ReadingTrustPanel.tsx',
  'src/components/readings/SystemRunLedger.tsx',
  'src/components/readings/elements/ElementFrame.tsx',
  'src/components/readings/elements/ReadingCollections.tsx',
  'src/components/readings/elements/ReadingNumberCodes.tsx',
  'src/components/readings/elements/ReadingRelations.tsx',
  'src/components/readings/artifacts/ActivationCross.tsx',
  'src/components/readings/artifacts/CapturePanel.tsx',
  'src/components/readings/artifacts/ChakraSpectrum.tsx',
  'src/components/readings/artifacts/FiveLimbMandala.tsx',
  'src/components/readings/artifacts/HexagramTransition.tsx',
  'src/components/readings/artifacts/MediaArtifact.tsx',
  'src/components/readings/artifacts/MetricField.tsx',
  'src/components/readings/artifacts/NestedPeriodSpiral.tsx',
  'src/components/readings/artifacts/QualityPanel.tsx',
  'src/components/readings/artifacts/SafeGeometryPreview.tsx',
]

describe('dark reading instrument contrast contract', () => {
  it('uses full-strength gold for console eyebrows', () => {
    const css = source('src/index.css')
    const block = css.match(/\.console-eyebrow\s*\{[^}]+\}/)?.[0] ?? ''

    expect(block).toContain('text-gold')
    expect(block).not.toContain('text-gold/80')
  })

  it.each(DARK_INSTRUMENT_SOURCES)('%s uses semantic readable copy tokens', (path) => {
    const contents = source(path)

    expect(contents).not.toMatch(/text-(?:silver|gold)\/(?:45|55|60|65|70|75)\b/)
    expect(contents).not.toMatch(/text-\[(?:8|9|10)px\]/)
    expect(contents).not.toMatch(/text-reading-(?:ink|muted)\b/)
  })

  it('keeps the chat chapter label readable at rest', () => {
    expect(source('src/components/chat/ChatSheet.tsx')).not.toContain('text-gold/50')
  })

  it('gives the composing beat a valid live-region role', () => {
    expect(source('src/components/chat/ChatSheet.tsx')).toContain(
      'role="status" aria-label="The narrator is composing"',
    )
  })
})
