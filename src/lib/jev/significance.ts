import type { EngineValidation } from './client'
import type { QualityAssessment } from './quality'

export type SignificanceLevel = 'major' | 'moderate' | 'minor' | 'negligible'

export interface TransitSignificance {
  level: SignificanceLevel
  score: number
  factors: SignificanceFactor[]
}

export interface SignificanceFactor {
  name: string
  weight: number
  detail: string
}

export interface ElementSignificance {
  elementId: string
  significance: TransitSignificance
}

export interface ReadingSignificanceMap {
  engineId: string
  overall: TransitSignificance
  elements: ElementSignificance[]
  highlightCount: number
}

const LEVEL_THRESHOLDS = {
  major: 0.75,
  moderate: 0.5,
  minor: 0.25,
} as const

function classifyLevel(score: number): SignificanceLevel {
  if (score >= LEVEL_THRESHOLDS.major) return 'major'
  if (score >= LEVEL_THRESHOLDS.moderate) return 'moderate'
  if (score >= LEVEL_THRESHOLDS.minor) return 'minor'
  return 'negligible'
}

const SLOW_PLANETS = new Set([
  'saturn', 'jupiter', 'pluto', 'neptune', 'uranus',
  'rahu', 'ketu', 'north node', 'south node',
])

const MAJOR_ASPECTS = new Set(['conjunction', 'opposition', 'square', 'trine', 'sextile'])

function normalizeLabel(s: string): string {
  return s.toLowerCase().replace(/[_\s-]+/g, ' ').trim()
}

export function scoreAspect(aspect: {
  from?: string
  to?: string
  relation?: string
  orb?: number
  isApplying?: boolean
}): TransitSignificance {
  const factors: SignificanceFactor[] = []
  let raw = 0

  if (aspect.orb != null) {
    const orbScore = Math.max(0, 1 - aspect.orb / 10)
    factors.push({ name: 'orb-tightness', weight: orbScore, detail: `${aspect.orb.toFixed(2)}° orb` })
    raw += orbScore * 0.35
  }

  if (aspect.from && SLOW_PLANETS.has(normalizeLabel(aspect.from))) {
    factors.push({ name: 'slow-transitor', weight: 0.8, detail: aspect.from })
    raw += 0.8 * 0.3
  }

  if (aspect.to && SLOW_PLANETS.has(normalizeLabel(aspect.to))) {
    factors.push({ name: 'slow-natal', weight: 0.5, detail: aspect.to })
    raw += 0.5 * 0.1
  }

  if (aspect.relation && MAJOR_ASPECTS.has(normalizeLabel(aspect.relation))) {
    factors.push({ name: 'major-aspect', weight: 0.7, detail: aspect.relation })
    raw += 0.7 * 0.2
  }

  if (aspect.isApplying) {
    factors.push({ name: 'applying', weight: 0.6, detail: 'Applying aspect' })
    raw += 0.6 * 0.1
  }

  const score = Math.min(1, raw)
  return { level: classifyLevel(score), score, factors }
}

export function scoreRelationsElement(relations: Array<{
  id: string
  from: string
  to: string
  relation: string
  measure?: string
  status?: string
}>): ElementSignificance[] {
  return relations.map((rel) => {
    const orb = rel.measure ? parseFloat(rel.measure) : undefined
    const isApplying = rel.status?.toLowerCase() === 'applying'
    return {
      elementId: rel.id,
      significance: scoreAspect({
        from: rel.from,
        to: rel.to,
        relation: rel.relation,
        orb: Number.isFinite(orb) ? orb : undefined,
        isApplying,
      }),
    }
  })
}

export function scoreReadingSignificance(
  engineId: string,
  validation: EngineValidation,
  assessment: QualityAssessment,
): ReadingSignificanceMap {
  const factors: SignificanceFactor[] = []

  factors.push({
    name: 'completeness',
    weight: validation.completeness,
    detail: `${(validation.completeness * 100).toFixed(0)}% complete`,
  })

  factors.push({
    name: 'quality',
    weight: Math.min(1, validation.quality.score / 3),
    detail: `Quality ${validation.quality.score.toFixed(1)}/3`,
  })

  factors.push({
    name: 'field-coverage',
    weight: assessment.fieldCoverage,
    detail: `${assessment.presentFields.length}/${assessment.presentFields.length + assessment.missingFields.length} fields`,
  })

  const raw = factors.reduce((sum, f) => sum + f.weight, 0) / factors.length
  const score = Math.min(1, raw)

  return {
    engineId,
    overall: { level: classifyLevel(score), score, factors },
    elements: [],
    highlightCount: 0,
  }
}

export function withElementScores(
  map: ReadingSignificanceMap,
  elements: ElementSignificance[],
): ReadingSignificanceMap {
  const highlights = elements.filter((e) => e.significance.level === 'major' || e.significance.level === 'moderate')
  return {
    ...map,
    elements,
    highlightCount: highlights.length,
  }
}
