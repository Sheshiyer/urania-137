/**
 * Jev engine output validation (Phase B).
 *
 * Takes a raw engine payload and runs batched Jev questions to assess
 * completeness, quality, and primary element kind. Gracefully degrades
 * (returns null) when the Jev client is unavailable.
 */

import { choice, noul, score } from './jev-client'
import type { JevResult, Question } from './jev-client'

export interface EngineValidation {
  engineId: string
  completeness: number
  quality: { score: number; confidence: number }
  primaryKind: { choice: string; confidence: number }
  fieldFlags: Record<string, number>
}

type ElementKind =
  | 'fact-grid'
  | 'number-codes'
  | 'positions'
  | 'relations'
  | 'sequence'
  | 'cycles'
  | 'spread'
  | 'collections'
  | 'media'
  | 'artifact'
  | 'capture'

interface EngineSpec {
  label: string
  primaryKind: ElementKind
  expectedFields: string[]
}

const ENGINE_SPECS: Record<string, EngineSpec> = {
  panchanga: {
    label: 'Vedic calendar limbs',
    primaryKind: 'fact-grid',
    expectedFields: ['vara_name', 'tithi_name', 'nakshatra_name', 'yoga_name', 'karana_name'],
  },
  numerology: {
    label: 'Numerological codes',
    primaryKind: 'number-codes',
    expectedFields: ['life_path', 'expression', 'soul_urge'],
  },
  transits: {
    label: 'Planetary transit aspects',
    primaryKind: 'relations',
    expectedFields: ['aspects', 'natal_positions', 'transit_positions'],
  },
  vimshottari: {
    label: 'Dasha period sequence',
    primaryKind: 'sequence',
    expectedFields: ['periods', 'current_period'],
  },
  'human-design': {
    label: 'Human Design chart positions and channels',
    primaryKind: 'positions',
    expectedFields: ['type', 'strategy', 'authority', 'gates', 'channels', 'centers'],
  },
  'gene-keys': {
    label: 'Gene Keys activation sequence',
    primaryKind: 'collections',
    expectedFields: ['keys', 'sequence', 'profile'],
  },
  biorhythm: {
    label: 'Biorhythm cycles',
    primaryKind: 'cycles',
    expectedFields: ['physical', 'emotional', 'intellectual'],
  },
  'vedic-clock': {
    label: 'Vedic time divisions',
    primaryKind: 'fact-grid',
    expectedFields: ['muhurta', 'hora', 'kaala'],
  },
  tarot: {
    label: 'Tarot card spread',
    primaryKind: 'spread',
    expectedFields: ['cards', 'positions', 'spread_type'],
  },
  'i-ching': {
    label: 'I Ching hexagram reading',
    primaryKind: 'spread',
    expectedFields: ['hexagram', 'lines', 'changing_lines'],
  },
  enneagram: {
    label: 'Enneagram type and wings',
    primaryKind: 'fact-grid',
    expectedFields: ['type', 'wing', 'instinct'],
  },
  nadabrahman: {
    label: 'Sound frequency and tonal composition',
    primaryKind: 'fact-grid',
    expectedFields: ['frequency', 'note', 'scale'],
  },
  raaga: {
    label: 'Raaga musical composition',
    primaryKind: 'fact-grid',
    expectedFields: ['raaga_name', 'thaat', 'mood'],
  },
  'sigil-forge': {
    label: 'Sigil artifact with visual output',
    primaryKind: 'artifact',
    expectedFields: ['sigil', 'intent', 'components'],
  },
  'sacred-geometry': {
    label: 'Sacred geometry pattern',
    primaryKind: 'artifact',
    expectedFields: ['pattern', 'geometry_type', 'elements'],
  },
  biofield: {
    label: 'Biofield capture observations',
    primaryKind: 'capture',
    expectedFields: ['observations', 'readings'],
  },
  'biofield-capture': {
    label: 'Biofield capture observations',
    primaryKind: 'capture',
    expectedFields: ['observations', 'readings'],
  },
  'face-reading': {
    label: 'Face reading capture observations',
    primaryKind: 'capture',
    expectedFields: ['observations', 'features'],
  },
}

const QUALITY_LEVELS = [
  'Empty or error — no usable structured data',
  'Partial — some expected fields present but major gaps',
  'Adequate — core fields present with minor gaps',
  'Rich — all expected fields present with detail',
]

const KIND_CRITERIA: Record<string, string> = {
  'fact-grid': 'Tabular key-value pairs (named measurements, indices, labels)',
  'number-codes': 'Numeric codes with meanings (life path, expression, soul urge)',
  positions: 'Spatial/chart positions with degrees, houses, or coordinates',
  relations: 'Paired connections between entities (aspects, relationships)',
  sequence: 'Ordered steps, periods, or phases with duration',
  cycles: 'Recurring temporal patterns with wavelength and amplitude',
  spread: 'Card or symbol positions with assigned interpretations',
  collections: 'Groups of related items (keys, gates, channels)',
  media: 'Generated audio or image content with URLs',
  artifact: 'Constructed visual or symbolic output (sigils, geometry)',
  capture: 'Observation records from input analysis (facial, biofield)',
}

function buildQuestions(
  engineId: string,
  payload: unknown,
): Record<string, Question> {
  const spec = ENGINE_SPECS[engineId]
  const payloadSummary = summarizePayload(payload)

  const questions: Record<string, Question> = {
    completeness: noul(
      spec
        ? `Does this ${spec.label} engine response contain all expected structured fields? Expected fields: ${spec.expectedFields.join(', ')}. Top-level keys present: ${payloadSummary}`
        : `Does this engine response contain structured data fields suitable for a reading? Top-level keys present: ${payloadSummary}`,
      {
        true: 'All major expected sections are present and populated with meaningful values',
        false: 'Missing key fields, empty sections, or error indicators',
      },
    ),
    quality: score(
      spec
        ? `Rate the structured data quality of this ${spec.label} response. Expected fields: ${spec.expectedFields.join(', ')}`
        : 'Rate the structured data quality of this engine response',
      QUALITY_LEVELS,
    ),
    primary_kind: choice(
      'What kind of structured output does this engine response primarily contain?',
      KIND_CRITERIA,
    ),
  }

  if (spec) {
    for (const field of spec.expectedFields) {
      questions[`has_${field}`] = noul(
        `Is the field '${field}' present and populated with meaningful data in this response?`,
      )
    }
  }

  return questions
}

function summarizePayload(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null) return '(non-object)'
  const keys = Object.keys(payload as Record<string, unknown>)
  if (keys.length === 0) return '(empty object)'
  if (keys.length > 20) return `${keys.slice(0, 20).join(', ')} ... (${keys.length} total)`
  return keys.join(', ')
}

function compactPayload(payload: unknown): unknown {
  if (typeof payload !== 'object' || payload === null) return payload
  const record = payload as Record<string, unknown>
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value)) {
      result[key] = value.length > 3
        ? [...value.slice(0, 2), `... (${value.length} items)`]
        : value
    } else if (typeof value === 'object' && value !== null) {
      const inner = value as Record<string, unknown>
      const innerKeys = Object.keys(inner)
      if (innerKeys.length > 10) {
        result[key] = `{${innerKeys.slice(0, 5).join(', ')} ... (${innerKeys.length} keys)}`
      } else {
        result[key] = value
      }
    } else {
      result[key] = value
    }
  }
  return result
}

export function parseValidation(engineId: string, jevResult: JevResult): EngineValidation {
  const answers = jevResult.answers

  const completeness = answers.completeness?.type === 'noul'
    ? answers.completeness.noul
    : 0

  const qualityAnswer = answers.quality
  const qualityScore = qualityAnswer?.type === 'score'
    ? { score: qualityAnswer.score, confidence: qualityAnswer.confidence }
    : { score: 0, confidence: 0 }

  const kindAnswer = answers.primary_kind
  const primaryKind = kindAnswer?.type === 'choice'
    ? { choice: kindAnswer.choice, confidence: kindAnswer.confidence }
    : { choice: 'unknown', confidence: 0 }

  const fieldFlags: Record<string, number> = {}
  const spec = ENGINE_SPECS[engineId]
  if (spec) {
    for (const field of spec.expectedFields) {
      const key = `has_${field}`
      const answer = answers[key]
      fieldFlags[field] = answer?.type === 'noul' ? answer.noul : -1
    }
  }

  return { engineId, completeness, quality: qualityScore, primaryKind, fieldFlags }
}

export type JevClient = (request: {
  state: unknown
  questions: Record<string, Question>
}) => Promise<JevResult>

export async function validateEngineOutput(
  jev: JevClient,
  engineId: string,
  payload: unknown,
): Promise<EngineValidation> {
  const state = {
    engineId,
    expectedKind: ENGINE_SPECS[engineId]?.primaryKind ?? 'unknown',
    payload: compactPayload(payload),
  }
  const questions = buildQuestions(engineId, payload)
  const result = await jev({ state, questions })
  return parseValidation(engineId, result)
}

export function isKnownEngine(engineId: string): boolean {
  return engineId in ENGINE_SPECS
}

export function expectedKind(engineId: string): ElementKind | null {
  return ENGINE_SPECS[engineId]?.primaryKind ?? null
}
