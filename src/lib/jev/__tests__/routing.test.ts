import { describe, it, expect } from 'vitest'
import { routeInterpretation, isRouteAvailable, maxDepthForTier } from '../routing'
import type { QualityAssessment } from '../quality'

function makeAssessment(tier: QualityAssessment['tier']): QualityAssessment {
  return {
    tier,
    completeness: 0.9,
    qualityScore: 3.0,
    qualityConfidence: 0.85,
    fieldCoverage: 1.0,
    presentFields: ['a', 'b'],
    missingFields: [],
  }
}

describe('routeInterpretation', () => {
  it('returns all 4 routes for rich tier', () => {
    const decision = routeInterpretation(makeAssessment('rich'))
    expect(decision.availableRoutes).toEqual(['pattern', 'embodied', 'synthesis', 'navigate'])
    expect(decision.recommendedRoute).toBe('pattern')
    expect(decision.suggestedDepth).toBe(3)
    expect(decision.canInterpret).toBe(true)
  })

  it('returns pattern + navigate for adequate tier', () => {
    const decision = routeInterpretation(makeAssessment('adequate'))
    expect(decision.availableRoutes).toEqual(['pattern', 'navigate'])
    expect(decision.recommendedRoute).toBe('pattern')
    expect(decision.suggestedDepth).toBe(2)
    expect(decision.canInterpret).toBe(true)
  })

  it('returns navigate only for partial tier', () => {
    const decision = routeInterpretation(makeAssessment('partial'))
    expect(decision.availableRoutes).toEqual(['navigate'])
    expect(decision.recommendedRoute).toBe('navigate')
    expect(decision.suggestedDepth).toBe(1)
    expect(decision.canInterpret).toBe(true)
  })

  it('returns no routes for empty tier', () => {
    const decision = routeInterpretation(makeAssessment('empty'))
    expect(decision.availableRoutes).toEqual([])
    expect(decision.recommendedRoute).toBeNull()
    expect(decision.suggestedDepth).toBe(0)
    expect(decision.canInterpret).toBe(false)
  })

  it('includes a human-readable reason', () => {
    for (const tier of ['rich', 'adequate', 'partial', 'empty'] as const) {
      const decision = routeInterpretation(makeAssessment(tier))
      expect(decision.reason.length).toBeGreaterThan(10)
    }
  })
})

describe('isRouteAvailable', () => {
  it('returns true for routes in the tier config', () => {
    expect(isRouteAvailable('pattern', makeAssessment('rich'))).toBe(true)
    expect(isRouteAvailable('embodied', makeAssessment('rich'))).toBe(true)
    expect(isRouteAvailable('synthesis', makeAssessment('rich'))).toBe(true)
    expect(isRouteAvailable('navigate', makeAssessment('rich'))).toBe(true)
  })

  it('returns false for routes not in the tier config', () => {
    expect(isRouteAvailable('embodied', makeAssessment('adequate'))).toBe(false)
    expect(isRouteAvailable('synthesis', makeAssessment('adequate'))).toBe(false)
    expect(isRouteAvailable('pattern', makeAssessment('partial'))).toBe(false)
    expect(isRouteAvailable('navigate', makeAssessment('empty'))).toBe(false)
  })
})

describe('maxDepthForTier', () => {
  it('returns correct depth for each tier', () => {
    expect(maxDepthForTier('rich')).toBe(3)
    expect(maxDepthForTier('adequate')).toBe(2)
    expect(maxDepthForTier('partial')).toBe(1)
    expect(maxDepthForTier('empty')).toBe(0)
  })
})
