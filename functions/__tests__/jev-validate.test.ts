import { describe, it, expect } from 'vitest'
import { parseValidation, validateEngineOutput, isKnownEngine, expectedKind } from '../lib/jev-validate'
import type { JevResult } from '../lib/jev-client'

function mockJevResult(overrides: Partial<JevResult['answers']> = {}): JevResult {
  return {
    model: 'jev-1.13.0',
    answers: {
      completeness: { type: 'noul', noul: 0.92 },
      quality: {
        type: 'score',
        score: 2.4,
        legend: { '0': 'Empty', '1': 'Partial', '2': 'Adequate', '3': 'Rich' },
        probabilities: { '0': 0.02, '1': 0.08, '2': 0.45, '3': 0.45 },
        confidence: 0.45,
      },
      primary_kind: {
        type: 'choice',
        choice: 'fact-grid',
        probabilities: { 'fact-grid': 0.82, positions: 0.10, relations: 0.08 },
        confidence: 0.82,
      },
      has_vara_name: { type: 'noul', noul: 0.99 },
      has_tithi_name: { type: 'noul', noul: 0.97 },
      has_nakshatra_name: { type: 'noul', noul: 0.95 },
      has_yoga_name: { type: 'noul', noul: 0.88 },
      has_karana_name: { type: 'noul', noul: 0.91 },
      ...overrides,
    },
    usage: { input_tokens: 500, output_tokens: 20 },
  }
}

describe('parseValidation', () => {
  it('extracts completeness, quality, primaryKind, and fieldFlags from a panchanga result', () => {
    const v = parseValidation('panchanga', mockJevResult())
    expect(v.engineId).toBe('panchanga')
    expect(v.completeness).toBeCloseTo(0.92)
    expect(v.quality.score).toBeCloseTo(2.4)
    expect(v.quality.confidence).toBeCloseTo(0.45)
    expect(v.primaryKind.choice).toBe('fact-grid')
    expect(v.primaryKind.confidence).toBeCloseTo(0.82)
    expect(v.fieldFlags.vara_name).toBeCloseTo(0.99)
    expect(v.fieldFlags.tithi_name).toBeCloseTo(0.97)
    expect(v.fieldFlags.nakshatra_name).toBeCloseTo(0.95)
    expect(v.fieldFlags.yoga_name).toBeCloseTo(0.88)
    expect(v.fieldFlags.karana_name).toBeCloseTo(0.91)
  })

  it('handles missing answers gracefully', () => {
    const v = parseValidation('panchanga', {
      model: 'jev-1.13.0',
      answers: {},
      usage: { input_tokens: 100, output_tokens: 5 },
    })
    expect(v.completeness).toBe(0)
    expect(v.quality.score).toBe(0)
    expect(v.primaryKind.choice).toBe('unknown')
    expect(v.fieldFlags.vara_name).toBe(-1)
  })

  it('returns empty fieldFlags for unknown engines', () => {
    const result = mockJevResult()
    const v = parseValidation('some-new-engine', result)
    expect(v.engineId).toBe('some-new-engine')
    expect(Object.keys(v.fieldFlags)).toHaveLength(0)
  })
})

describe('validateEngineOutput', () => {
  it('sends state with compacted payload and engine-specific questions', async () => {
    let capturedRequest: { state: unknown; questions: Record<string, unknown> } | null = null
    const mockJev = async (req: { state: unknown; questions: Record<string, unknown> }) => {
      capturedRequest = req
      return mockJevResult()
    }

    const payload = {
      vara_name: 'Monday',
      vara_index: 1,
      tithi_name: 'Shukla Pratipada',
      tithi_index: 1,
      nakshatra_name: 'Ashwini',
      nakshatra_index: 0,
      yoga_name: 'Vishkumbha',
      yoga_index: 0,
      karana_name: 'Kimstughna',
      karana_index: 0,
    }

    const v = await validateEngineOutput(mockJev, 'panchanga', payload)

    expect(capturedRequest).not.toBeNull()
    const state = capturedRequest!.state as Record<string, unknown>
    expect(state.engineId).toBe('panchanga')
    expect(state.expectedKind).toBe('fact-grid')

    expect(capturedRequest!.questions).toHaveProperty('completeness')
    expect(capturedRequest!.questions).toHaveProperty('quality')
    expect(capturedRequest!.questions).toHaveProperty('primary_kind')
    expect(capturedRequest!.questions).toHaveProperty('has_vara_name')
    expect(capturedRequest!.questions).toHaveProperty('has_tithi_name')

    expect(v.engineId).toBe('panchanga')
    expect(v.completeness).toBeCloseTo(0.92)
  })

  it('works for unknown engines without field-specific questions', async () => {
    const mockJev = async () => ({
      model: 'jev-1.13.0',
      answers: {
        completeness: { type: 'noul' as const, noul: 0.5 },
        quality: {
          type: 'score' as const,
          score: 1.0,
          legend: { '0': 'Empty', '1': 'Partial', '2': 'Adequate', '3': 'Rich' },
          probabilities: { '0': 0.1, '1': 0.5, '2': 0.3, '3': 0.1 },
          confidence: 0.5,
        },
        primary_kind: {
          type: 'choice' as const,
          choice: 'fact-grid',
          probabilities: { 'fact-grid': 0.6 },
          confidence: 0.6,
        },
      },
      usage: { input_tokens: 200, output_tokens: 10 },
    })

    const v = await validateEngineOutput(mockJev, 'future-engine', { data: 'some value' })
    expect(v.engineId).toBe('future-engine')
    expect(v.completeness).toBeCloseTo(0.5)
    expect(Object.keys(v.fieldFlags)).toHaveLength(0)
  })

  it('compacts large arrays in the payload state', async () => {
    let capturedState: Record<string, unknown> = {}
    const mockJev = async (req: { state: unknown }) => {
      capturedState = (req.state as Record<string, unknown>).payload as Record<string, unknown>
      return mockJevResult()
    }

    const payload = {
      aspects: Array.from({ length: 20 }, (_, i) => ({ planet: `planet-${i}` })),
      natal_positions: { sun: 45 },
    }

    await validateEngineOutput(mockJev, 'transits', payload)
    const compacted = capturedState.aspects as unknown[]
    expect(compacted).toHaveLength(3)
    expect(compacted[2]).toContain('20 items')
  })
})

describe('isKnownEngine / expectedKind', () => {
  it('recognizes all 18 engines', () => {
    const known = [
      'panchanga', 'numerology', 'transits', 'vimshottari', 'human-design',
      'gene-keys', 'biorhythm', 'vedic-clock', 'tarot', 'i-ching',
      'enneagram', 'nadabrahman', 'raaga', 'sigil-forge', 'sacred-geometry',
      'biofield', 'biofield-capture', 'face-reading',
    ]
    for (const id of known) {
      expect(isKnownEngine(id), `${id} should be known`).toBe(true)
      expect(expectedKind(id), `${id} should have a kind`).not.toBeNull()
    }
  })

  it('returns false/null for unknown engines', () => {
    expect(isKnownEngine('unknown-engine')).toBe(false)
    expect(expectedKind('unknown-engine')).toBeNull()
  })

  it('maps engine kinds correctly', () => {
    expect(expectedKind('panchanga')).toBe('fact-grid')
    expect(expectedKind('transits')).toBe('relations')
    expect(expectedKind('tarot')).toBe('spread')
    expect(expectedKind('biorhythm')).toBe('cycles')
    expect(expectedKind('human-design')).toBe('positions')
    expect(expectedKind('gene-keys')).toBe('collections')
    expect(expectedKind('sigil-forge')).toBe('artifact')
    expect(expectedKind('biofield')).toBe('capture')
    expect(expectedKind('numerology')).toBe('number-codes')
    expect(expectedKind('vimshottari')).toBe('sequence')
  })
})
