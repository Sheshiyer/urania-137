/**
 * Jev-assisted extraction for unknown engines (Phase C).
 *
 * When an engine ID is not in the knownExtractor registry, this module
 * uses Jev's System One to classify the payload's element kind and score
 * field relevance, then applies generic structural builders to produce
 * ReadingElement-shaped JSON the client can render natively.
 */

import { choice, noul } from './jev-client'
import type { JevResult, Question } from './jev-client'
import type { JevClient } from './jev-validate'

// ── Serialized element shapes (match src/lib/readings/types.ts) ─────

interface ElementBase {
  id: string
  title: string
  sourceSystem: string
  sourcePath: string
  evidenceKind: 'deterministic'
  confidence: 'observed'
}

interface Fact {
  id: string
  label: string
  value: string
  detail?: string
}

interface CollectionGroup {
  id: string
  label: string
  items: string[]
}

interface SequenceStep {
  id: string
  label: string
  value?: string
  detail?: string
}

type ExtractedElement = ElementBase & (
  | { kind: 'fact-grid'; layout: 'grid'; facts: Fact[] }
  | { kind: 'collections'; groups: CollectionGroup[] }
  | { kind: 'sequence'; sequenceType: 'ordered'; steps: SequenceStep[] }
  | { kind: 'notice'; tone: 'source'; body: string }
  | { kind: 'raw'; value: unknown }
)

export interface JevExtraction {
  engineId: string
  classifiedKind: string
  kindConfidence: number
  elements: ExtractedElement[]
  fieldCount: number
  extractedCount: number
}

// ── Shared helpers ──────────────────────────────────────────────────

const KIND_CRITERIA: Record<string, string> = {
  'fact-grid': 'Tabular key-value pairs (named measurements, indices, labels)',
  'number-codes': 'Numeric codes with meanings (life path, expression, soul urge)',
  positions: 'Spatial/chart positions with degrees, houses, or coordinates',
  relations: 'Paired connections between entities (aspects, relationships)',
  sequence: 'Ordered steps, periods, or phases with duration',
  cycles: 'Recurring temporal patterns with wavelength and amplitude',
  spread: 'Card or symbol positions with assigned interpretations',
  collections: 'Groups of related items (keys, gates, channels)',
  artifact: 'Constructed visual or symbolic output (sigils, geometry)',
  capture: 'Observation records from input analysis (facial, biofield)',
}

const MAX_FIELD_QUESTIONS = 15

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return null
}

function makeBase(
  engineId: string,
  id: string,
  title: string,
  sourcePath: string,
): ElementBase {
  return {
    id: `${engineId}:${id}`,
    title,
    sourceSystem: engineId,
    sourcePath,
    evidenceKind: 'deterministic',
    confidence: 'observed',
  }
}

function compactPayload(payload: unknown): unknown {
  if (!isRecord(payload)) return payload
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (Array.isArray(value)) {
      result[key] = value.length > 3
        ? [...value.slice(0, 2), `... (${value.length} items)`]
        : value
    } else if (isRecord(value)) {
      const innerKeys = Object.keys(value)
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

// ── Jev question construction ───────────────────────────────────────

function buildQuestions(
  engineId: string,
  payload: Record<string, unknown>,
): Record<string, Question> {
  const keys = Object.keys(payload)
  const keySummary = keys.length > 20
    ? `${keys.slice(0, 20).join(', ')} ... (${keys.length} total)`
    : keys.join(', ')

  const questions: Record<string, Question> = {
    primary_kind: choice(
      `What kind of structured output does this '${engineId}' engine response primarily contain? Top-level keys: ${keySummary}`,
      KIND_CRITERIA,
    ),
  }

  const fieldKeys = keys.slice(0, MAX_FIELD_QUESTIONS)
  for (const key of fieldKeys) {
    const value = payload[key]
    const valueDesc = Array.isArray(value)
      ? `array (${value.length} items)`
      : isRecord(value)
        ? `object (${Object.keys(value).length} keys)`
        : `${typeof value}: ${String(value).slice(0, 60)}`

    questions[`field_${key}`] = noul(
      `Is '${key}' (${valueDesc}) a meaningful structured data field in this engine response, as opposed to metadata, debug info, or noise?`,
    )
  }

  return questions
}

// ── Generic structural builders ─────────────────────────────────────

export function buildFactGrid(
  engineId: string,
  payload: Record<string, unknown>,
  sourcePath: string,
  fieldScores: Record<string, number>,
): ExtractedElement | null {
  const facts: Fact[] = []

  for (const [key, value] of Object.entries(payload)) {
    if (fieldScores[key] !== undefined && fieldScores[key] < 0.3) continue

    const text = asString(value)
    if (text !== null) {
      facts.push({ id: key, label: titleCase(key), value: text })
      continue
    }

    if (isRecord(value)) {
      const entries = Object.entries(value)
      if (entries.length <= 8) {
        for (const [nk, nv] of entries) {
          const nText = asString(nv)
          if (nText !== null) {
            facts.push({
              id: `${key}.${nk}`,
              label: `${titleCase(key)} — ${titleCase(nk)}`,
              value: nText,
            })
          }
        }
      }
    }
  }

  if (facts.length === 0) return null

  return {
    ...makeBase(engineId, 'auto-facts', `${titleCase(engineId)} analysis`, sourcePath),
    kind: 'fact-grid',
    layout: 'grid',
    facts,
  }
}

export function buildCollections(
  engineId: string,
  payload: Record<string, unknown>,
  sourcePath: string,
  fieldScores: Record<string, number>,
): ExtractedElement | null {
  const groups: CollectionGroup[] = []

  for (const [key, value] of Object.entries(payload)) {
    if (fieldScores[key] !== undefined && fieldScores[key] < 0.3) continue
    if (!Array.isArray(value) || value.length === 0) continue

    const items = value
      .map((item) => {
        if (typeof item === 'string') return item
        if (typeof item === 'number') return String(item)
        if (isRecord(item)) {
          const label =
            asString(item.name) ?? asString(item.label) ??
            asString(item.title) ?? asString(item.id)
          const val =
            asString(item.value) ?? asString(item.description)
          if (label && val) return `${label}: ${val}`
          if (label) return label
          if (val) return val
        }
        return null
      })
      .filter((item): item is string => item !== null)

    if (items.length > 0) {
      groups.push({ id: key, label: titleCase(key), items })
    }
  }

  if (groups.length === 0) return null

  return {
    ...makeBase(engineId, 'auto-collections', `${titleCase(engineId)} collections`, sourcePath),
    kind: 'collections',
    groups,
  }
}

export function buildSequence(
  engineId: string,
  payload: Record<string, unknown>,
  sourcePath: string,
  fieldScores: Record<string, number>,
): ExtractedElement | null {
  for (const [key, value] of Object.entries(payload)) {
    if (fieldScores[key] !== undefined && fieldScores[key] < 0.3) continue
    if (!Array.isArray(value) || value.length === 0) continue

    const steps: SequenceStep[] = value
      .map((item, i): SequenceStep | null => {
        if (!isRecord(item)) return null
        const label =
          asString(item.name) ?? asString(item.label) ??
          asString(item.title) ?? `Step ${i + 1}`
        const val =
          asString(item.value) ?? asString(item.description) ??
          asString(item.status)
        const detail =
          asString(item.detail) ?? asString(item.note)
        return {
          id: `step-${i}`,
          label,
          ...(val ? { value: val } : {}),
          ...(detail ? { detail } : {}),
        }
      })
      .filter((step): step is SequenceStep => step !== null)

    if (steps.length >= 2) {
      return {
        ...makeBase(
          engineId,
          'auto-sequence',
          `${titleCase(engineId)} sequence`,
          `${sourcePath}.${key}`,
        ),
        kind: 'sequence',
        sequenceType: 'ordered',
        steps,
      }
    }
  }

  return null
}

// ── Jev response → extraction ───────────────────────────────────────

export function parseExtraction(
  engineId: string,
  payload: Record<string, unknown>,
  sourcePath: string,
  jevResult: JevResult,
): JevExtraction {
  const answers = jevResult.answers

  const kindAnswer = answers.primary_kind
  const classifiedKind = kindAnswer?.type === 'choice'
    ? kindAnswer.choice
    : 'fact-grid'
  const kindConfidence = kindAnswer?.type === 'choice'
    ? kindAnswer.confidence
    : 0

  const fieldScores: Record<string, number> = {}
  for (const key of Object.keys(payload)) {
    const answer = answers[`field_${key}`]
    fieldScores[key] = answer?.type === 'noul' ? answer.noul : 0.5
  }

  const elements: ExtractedElement[] = []
  let primary: ExtractedElement | null = null

  switch (classifiedKind) {
    case 'collections':
      primary =
        buildCollections(engineId, payload, sourcePath, fieldScores) ??
        buildFactGrid(engineId, payload, sourcePath, fieldScores)
      break
    case 'sequence':
      primary =
        buildSequence(engineId, payload, sourcePath, fieldScores) ??
        buildFactGrid(engineId, payload, sourcePath, fieldScores)
      break
    default:
      primary = buildFactGrid(engineId, payload, sourcePath, fieldScores)
      break
  }

  if (primary) elements.push(primary)

  if (primary?.kind === 'fact-grid') {
    const collections = buildCollections(engineId, payload, sourcePath, fieldScores)
    if (collections) elements.push(collections)
  }

  if (primary?.kind === 'fact-grid') {
    const sequence = buildSequence(engineId, payload, sourcePath, fieldScores)
    if (sequence) elements.push(sequence)
  }

  if (elements.length === 0) {
    elements.push({
      ...makeBase(engineId, 'auto-notice', `${titleCase(engineId)} output`, sourcePath),
      kind: 'notice',
      tone: 'source',
      body: `The ${engineId} engine returned data that could not be automatically structured. The raw source is preserved below.`,
    })
  }

  elements.push({
    ...makeBase(engineId, 'auto-raw', `${titleCase(engineId)} source`, sourcePath),
    kind: 'raw',
    value: payload,
  })

  const extractedCount = elements.reduce((sum, el) => {
    if (el.kind === 'fact-grid') return sum + el.facts.length
    if (el.kind === 'collections') return sum + el.groups.reduce((s, g) => s + g.items.length, 0)
    if (el.kind === 'sequence') return sum + el.steps.length
    return sum
  }, 0)

  return {
    engineId,
    classifiedKind,
    kindConfidence,
    elements,
    fieldCount: Object.keys(payload).length,
    extractedCount,
  }
}

// ── Public API ──────────────────────────────────────────────────────

export async function extractUnknownEngine(
  jev: JevClient,
  engineId: string,
  payload: unknown,
): Promise<JevExtraction> {
  const sourcePath = `${engineId}.result`

  if (!isRecord(payload)) {
    return {
      engineId,
      classifiedKind: 'raw',
      kindConfidence: 0,
      elements: [
        {
          ...makeBase(engineId, 'auto-raw', `${titleCase(engineId)} source`, sourcePath),
          kind: 'raw',
          value: payload,
        },
      ],
      fieldCount: 0,
      extractedCount: 0,
    }
  }

  const state = {
    engineId,
    description: `Unknown engine '${engineId}' output for structural classification`,
    payload: compactPayload(payload),
  }
  const questions = buildQuestions(engineId, payload)
  const result = await jev({ state, questions })
  return parseExtraction(engineId, payload, sourcePath, result)
}
