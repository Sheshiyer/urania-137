import { describe, it, expect } from 'vitest'
import { assessReadingQuality } from '../quality'
import type { EngineValidation } from '../client'

function makeValidation(overrides: Partial<EngineValidation> = {}): EngineValidation {
  return {
    engineId: 'test-engine',
    completeness: 0.9,
    quality: { score: 3.0, confidence: 0.85 },
    primaryKind: { choice: 'fact-grid', confidence: 0.9 },
    fieldFlags: {
      name: 0.95,
      element: 0.88,
      ruling_planet: 0.92,
    },
    ...overrides,
  }
}

describe('assessReadingQuality', () => {
  it('classifies rich tier when completeness and quality are high', () => {
    const result = assessReadingQuality(makeValidation())
    expect(result.tier).toBe('rich')
    expect(result.completeness).toBe(0.9)
    expect(result.qualityScore).toBe(3.0)
    expect(result.presentFields).toEqual(['name', 'element', 'ruling_planet'])
    expect(result.missingFields).toEqual([])
  })

  it('classifies adequate tier', () => {
    const result = assessReadingQuality(makeValidation({
      completeness: 0.7,
      quality: { score: 2.0, confidence: 0.7 },
    }))
    expect(result.tier).toBe('adequate')
  })

  it('classifies partial tier', () => {
    const result = assessReadingQuality(makeValidation({
      completeness: 0.4,
      quality: { score: 0.8, confidence: 0.5 },
    }))
    expect(result.tier).toBe('partial')
  })

  it('classifies empty tier when below all thresholds', () => {
    const result = assessReadingQuality(makeValidation({
      completeness: 0.1,
      quality: { score: 0.2, confidence: 0.3 },
    }))
    expect(result.tier).toBe('empty')
  })

  it('splits present vs missing fields at 0.5 threshold', () => {
    const result = assessReadingQuality(makeValidation({
      fieldFlags: {
        strong: 0.9,
        borderline_high: 0.5,
        weak: 0.3,
        absent: 0.1,
      },
    }))
    expect(result.presentFields).toEqual(['strong', 'borderline_high'])
    expect(result.missingFields).toEqual(['weak', 'absent'])
    expect(result.fieldCoverage).toBe(0.5)
  })

  it('handles empty fieldFlags', () => {
    const result = assessReadingQuality(makeValidation({ fieldFlags: {} }))
    expect(result.presentFields).toEqual([])
    expect(result.missingFields).toEqual([])
    expect(result.fieldCoverage).toBe(0)
  })

  it('requires both completeness AND quality to meet tier', () => {
    const highComplLowQual = assessReadingQuality(makeValidation({
      completeness: 0.95,
      quality: { score: 1.0, confidence: 0.8 },
    }))
    expect(highComplLowQual.tier).toBe('partial')

    const lowComplHighQual = assessReadingQuality(makeValidation({
      completeness: 0.5,
      quality: { score: 3.0, confidence: 0.9 },
    }))
    expect(lowComplHighQual.tier).toBe('partial')
  })
})
