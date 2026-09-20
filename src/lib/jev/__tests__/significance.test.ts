import { describe, it, expect } from 'vitest'
import {
  scoreAspect,
  scoreRelationsElement,
  scoreReadingSignificance,
  withElementScores,
} from '../significance'
import type { EngineValidation } from '../client'
import type { QualityAssessment } from '../quality'

describe('scoreAspect', () => {
  it('scores a tight applying conjunction from a slow planet as major', () => {
    const result = scoreAspect({
      from: 'Saturn',
      to: 'Moon',
      relation: 'Conjunction',
      orb: 0.5,
      isApplying: true,
    })
    expect(result.level).toBe('major')
    expect(result.score).toBeGreaterThan(0.75)
    expect(result.factors.length).toBeGreaterThanOrEqual(4)
  })

  it('scores a wide separating sextile from a fast planet as negligible', () => {
    const result = scoreAspect({
      from: 'Mercury',
      to: 'Venus',
      relation: 'Sextile',
      orb: 7.5,
      isApplying: false,
    })
    expect(result.level).toBe('negligible')
    expect(result.score).toBeLessThan(0.25)
  })

  it('handles missing fields gracefully', () => {
    const result = scoreAspect({})
    expect(result.level).toBe('negligible')
    expect(result.score).toBe(0)
    expect(result.factors).toHaveLength(0)
  })

  it('recognizes Vedic nodes as slow planets', () => {
    const rahu = scoreAspect({ from: 'Rahu', relation: 'Conjunction', orb: 1 })
    expect(rahu.factors.some((f) => f.name === 'slow-transitor')).toBe(true)

    const ketu = scoreAspect({ from: 'Ketu', relation: 'Opposition', orb: 2 })
    expect(ketu.factors.some((f) => f.name === 'slow-transitor')).toBe(true)
  })

  it('caps score at 1.0', () => {
    const result = scoreAspect({
      from: 'Pluto',
      to: 'Saturn',
      relation: 'Conjunction',
      orb: 0.1,
      isApplying: true,
    })
    expect(result.score).toBeLessThanOrEqual(1)
  })

  it('recognizes major aspects case-insensitively', () => {
    const result = scoreAspect({ relation: 'TRINE', orb: 3 })
    expect(result.factors.some((f) => f.name === 'major-aspect')).toBe(true)
  })
})

describe('scoreRelationsElement', () => {
  it('scores each relation and returns element ids', () => {
    const scores = scoreRelationsElement([
      { id: 'aspect-0', from: 'Saturn', to: 'Moon', relation: 'Conjunction', measure: '0.5° orb', status: 'Applying' },
      { id: 'aspect-1', from: 'Mercury', to: 'Venus', relation: 'Sextile', measure: '8.0° orb', status: 'Separating' },
    ])
    expect(scores).toHaveLength(2)
    expect(scores[0].elementId).toBe('aspect-0')
    expect(scores[0].significance.level).toBe('major')
    expect(scores[1].elementId).toBe('aspect-1')
    expect(scores[1].significance.score).toBeLessThan(scores[0].significance.score)
  })

  it('parses orb from measure string', () => {
    const scores = scoreRelationsElement([
      { id: 'a-0', from: 'Mars', to: 'Sun', relation: 'Square', measure: '2.50° orb' },
    ])
    expect(scores[0].significance.factors.some((f) => f.name === 'orb-tightness')).toBe(true)
  })

  it('handles missing measure gracefully', () => {
    const scores = scoreRelationsElement([
      { id: 'a-0', from: 'Mars', to: 'Sun', relation: 'Square' },
    ])
    expect(scores[0].significance.factors.some((f) => f.name === 'orb-tightness')).toBe(false)
  })
})

describe('scoreReadingSignificance', () => {
  const validation: EngineValidation = {
    engineId: 'transits',
    completeness: 0.9,
    quality: { score: 2.8, confidence: 0.85 },
    primaryKind: { choice: 'relations', confidence: 0.9 },
    fieldFlags: { aspects: 0.95, natal_positions: 0.9, transit_positions: 0.88 },
  }

  const assessment: QualityAssessment = {
    tier: 'rich',
    completeness: 0.9,
    qualityScore: 2.8,
    qualityConfidence: 0.85,
    fieldCoverage: 1.0,
    presentFields: ['aspects', 'natal_positions', 'transit_positions'],
    missingFields: [],
  }

  it('produces an overall significance from validation and assessment', () => {
    const map = scoreReadingSignificance('transits', validation, assessment)
    expect(map.engineId).toBe('transits')
    expect(map.overall.score).toBeGreaterThan(0.5)
    expect(map.overall.factors).toHaveLength(3)
    expect(map.elements).toHaveLength(0)
    expect(map.highlightCount).toBe(0)
  })

  it('reflects low completeness in overall score', () => {
    const lowVal = { ...validation, completeness: 0.2, quality: { score: 0.5, confidence: 0.3 } }
    const lowAssessment = { ...assessment, tier: 'empty' as const, completeness: 0.2, fieldCoverage: 0.1, presentFields: [] as string[] }
    const map = scoreReadingSignificance('transits', lowVal, lowAssessment)
    expect(map.overall.score).toBeLessThan(0.3)
  })
})

describe('withElementScores', () => {
  it('counts major and moderate as highlights', () => {
    const base = {
      engineId: 'transits',
      overall: { level: 'moderate' as const, score: 0.6, factors: [] },
      elements: [],
      highlightCount: 0,
    }
    const elements = [
      { elementId: 'a-0', significance: { level: 'major' as const, score: 0.9, factors: [] } },
      { elementId: 'a-1', significance: { level: 'moderate' as const, score: 0.6, factors: [] } },
      { elementId: 'a-2', significance: { level: 'minor' as const, score: 0.3, factors: [] } },
      { elementId: 'a-3', significance: { level: 'negligible' as const, score: 0.1, factors: [] } },
    ]
    const result = withElementScores(base, elements)
    expect(result.elements).toHaveLength(4)
    expect(result.highlightCount).toBe(2)
  })

  it('returns 0 highlights when all negligible', () => {
    const base = {
      engineId: 'test',
      overall: { level: 'negligible' as const, score: 0.1, factors: [] },
      elements: [],
      highlightCount: 0,
    }
    const result = withElementScores(base, [
      { elementId: 'a-0', significance: { level: 'negligible' as const, score: 0.05, factors: [] } },
    ])
    expect(result.highlightCount).toBe(0)
  })
})
