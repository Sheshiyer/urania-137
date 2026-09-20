/**
 * Reading quality assessment from Jev validation results (Phase D).
 *
 * Takes an EngineValidation and produces a structured tier + coverage
 * assessment that downstream routing consumes.
 */

import type { EngineValidation } from './client'

export type QualityTier = 'rich' | 'adequate' | 'partial' | 'empty'

export interface QualityAssessment {
  tier: QualityTier
  completeness: number
  qualityScore: number
  qualityConfidence: number
  fieldCoverage: number
  presentFields: string[]
  missingFields: string[]
}

const TIER_THRESHOLDS = {
  rich: { completeness: 0.85, quality: 2.5 },
  adequate: { completeness: 0.6, quality: 1.5 },
  partial: { completeness: 0.3, quality: 0.5 },
} as const

function classifyTier(completeness: number, qualityScore: number): QualityTier {
  if (completeness >= TIER_THRESHOLDS.rich.completeness && qualityScore >= TIER_THRESHOLDS.rich.quality) {
    return 'rich'
  }
  if (completeness >= TIER_THRESHOLDS.adequate.completeness && qualityScore >= TIER_THRESHOLDS.adequate.quality) {
    return 'adequate'
  }
  if (completeness >= TIER_THRESHOLDS.partial.completeness && qualityScore >= TIER_THRESHOLDS.partial.quality) {
    return 'partial'
  }
  return 'empty'
}

const FIELD_PRESENT_THRESHOLD = 0.5

export function assessReadingQuality(validation: EngineValidation): QualityAssessment {
  const presentFields: string[] = []
  const missingFields: string[] = []

  for (const [field, score] of Object.entries(validation.fieldFlags)) {
    if (score >= FIELD_PRESENT_THRESHOLD) {
      presentFields.push(field)
    } else if (score >= 0) {
      missingFields.push(field)
    }
  }

  const totalFields = presentFields.length + missingFields.length
  const fieldCoverage = totalFields > 0 ? presentFields.length / totalFields : 0

  return {
    tier: classifyTier(validation.completeness, validation.quality.score),
    completeness: validation.completeness,
    qualityScore: validation.quality.score,
    qualityConfidence: validation.quality.confidence,
    fieldCoverage,
    presentFields,
    missingFields,
  }
}
