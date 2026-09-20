/**
 * Interpretation routing based on quality assessment (Phase D).
 *
 * Maps quality tiers to available interpretation routes and recommended
 * depth. The routing decision is advisory — the caller (component or
 * hook) can override any recommendation.
 */

import type { QualityAssessment, QualityTier } from './quality'

export type InterpretationRoute = 'pattern' | 'embodied' | 'synthesis' | 'navigate'

export type InterpretationDepth = 0 | 1 | 2 | 3 | 4 | 5

export interface RoutingDecision {
  availableRoutes: InterpretationRoute[]
  recommendedRoute: InterpretationRoute | null
  suggestedDepth: InterpretationDepth
  canInterpret: boolean
  reason: string
}

const ALL_ROUTES: InterpretationRoute[] = ['pattern', 'embodied', 'synthesis', 'navigate']

const TIER_ROUTING: Record<QualityTier, {
  routes: InterpretationRoute[]
  recommended: InterpretationRoute | null
  depth: InterpretationDepth
  reason: string
}> = {
  rich: {
    routes: ALL_ROUTES,
    recommended: 'pattern',
    depth: 3,
    reason: 'All expected fields present with detail — full interpretation available.',
  },
  adequate: {
    routes: ['pattern', 'navigate'],
    recommended: 'pattern',
    depth: 2,
    reason: 'Core fields present — pattern reflection and navigation available.',
  },
  partial: {
    routes: ['navigate'],
    recommended: 'navigate',
    depth: 1,
    reason: 'Some fields present but major gaps — navigation only.',
  },
  empty: {
    routes: [],
    recommended: null,
    depth: 0,
    reason: 'No usable structured data — interpretation not available.',
  },
}

export function routeInterpretation(assessment: QualityAssessment): RoutingDecision {
  const config = TIER_ROUTING[assessment.tier]
  return {
    availableRoutes: config.routes,
    recommendedRoute: config.recommended,
    suggestedDepth: config.depth,
    canInterpret: config.routes.length > 0,
    reason: config.reason,
  }
}

export function isRouteAvailable(
  route: InterpretationRoute,
  assessment: QualityAssessment,
): boolean {
  return TIER_ROUTING[assessment.tier].routes.includes(route)
}

export function maxDepthForTier(tier: QualityTier): InterpretationDepth {
  return TIER_ROUTING[tier].depth
}
