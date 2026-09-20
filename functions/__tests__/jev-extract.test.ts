import { describe, it, expect } from 'vitest'
import {
  extractUnknownEngine,
  parseExtraction,
  buildFactGrid,
  buildCollections,
  buildSequence,
} from '../lib/jev-extract'
import type { JevResult } from '../lib/jev-client'
import type { JevExtraction } from '../lib/jev-extract'

function mockJevResult(overrides: Partial<JevResult['answers']> = {}): JevResult {
  return {
    model: 'jev-1.13.0',
    answers: {
      primary_kind: {
        type: 'choice',
        choice: 'fact-grid',
        probabilities: { 'fact-grid': 0.85, positions: 0.10, relations: 0.05 },
        confidence: 0.85,
      },
      field_name: { type: 'noul', noul: 0.95 },
      field_value: { type: 'noul', noul: 0.92 },
      field_debug: { type: 'noul', noul: 0.12 },
      ...overrides,
    },
    usage: { input_tokens: 400, output_tokens: 15 },
  }
}

const ALL_PASS: Record<string, number> = {}

describe('buildFactGrid', () => {
  it('extracts scalar fields as facts', () => {
    const el = buildFactGrid(
      'test-engine',
      { name: 'Aries', score: 42, active: true },
      'test-engine.result',
      ALL_PASS,
    )
    expect(el).not.toBeNull()
    expect(el!.kind).toBe('fact-grid')
    if (el!.kind !== 'fact-grid') return
    expect(el!.facts).toHaveLength(3)
    expect(el!.facts[0]).toEqual({ id: 'name', label: 'Name', value: 'Aries' })
    expect(el!.facts[1]).toEqual({ id: 'score', label: 'Score', value: '42' })
    expect(el!.facts[2]).toEqual({ id: 'active', label: 'Active', value: 'Yes' })
  })

  it('flattens one level of nested objects', () => {
    const el = buildFactGrid(
      'test-engine',
      { outer: { inner_key: 'deep value' } },
      'test-engine.result',
      ALL_PASS,
    )
    expect(el).not.toBeNull()
    if (el!.kind !== 'fact-grid') return
    expect(el!.facts).toHaveLength(1)
    expect(el!.facts[0].label).toBe('Outer — Inner Key')
    expect(el!.facts[0].value).toBe('deep value')
  })

  it('skips fields with low relevance scores', () => {
    const el = buildFactGrid(
      'test-engine',
      { name: 'Aries', debug_info: 'v2.3.1' },
      'test-engine.result',
      { name: 0.9, debug_info: 0.1 },
    )
    expect(el).not.toBeNull()
    if (el!.kind !== 'fact-grid') return
    expect(el!.facts).toHaveLength(1)
    expect(el!.facts[0].id).toBe('name')
  })

  it('returns null for an empty payload', () => {
    expect(buildFactGrid('test', {}, 'p', ALL_PASS)).toBeNull()
  })

  it('returns null when all fields are arrays', () => {
    expect(buildFactGrid('test', { items: [1, 2, 3] }, 'p', ALL_PASS)).toBeNull()
  })
})

describe('buildCollections', () => {
  it('groups array fields as collections', () => {
    const el = buildCollections(
      'test-engine',
      { tags: ['alpha', 'beta', 'gamma'], notes: ['first note'] },
      'test-engine.result',
      ALL_PASS,
    )
    expect(el).not.toBeNull()
    if (el!.kind !== 'collections') return
    expect(el!.groups).toHaveLength(2)
    expect(el!.groups[0].label).toBe('Tags')
    expect(el!.groups[0].items).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('extracts name+value from array of objects', () => {
    const el = buildCollections(
      'test-engine',
      { entries: [{ name: 'Sun', value: '15° Aries' }, { name: 'Moon', value: '22° Cancer' }] },
      'test-engine.result',
      ALL_PASS,
    )
    expect(el).not.toBeNull()
    if (el!.kind !== 'collections') return
    expect(el!.groups[0].items).toEqual(['Sun: 15° Aries', 'Moon: 22° Cancer'])
  })

  it('skips low-relevance array fields', () => {
    const el = buildCollections(
      'test-engine',
      { items: ['a'], noise: ['b'] },
      'test-engine.result',
      { items: 0.8, noise: 0.1 },
    )
    expect(el).not.toBeNull()
    if (el!.kind !== 'collections') return
    expect(el!.groups).toHaveLength(1)
    expect(el!.groups[0].id).toBe('items')
  })

  it('returns null when no arrays present', () => {
    expect(buildCollections('test', { a: 'b' }, 'p', ALL_PASS)).toBeNull()
  })
})

describe('buildSequence', () => {
  it('extracts ordered steps from an array of objects', () => {
    const el = buildSequence(
      'test-engine',
      {
        phases: [
          { name: 'Phase 1', description: 'Start', note: 'Initial' },
          { name: 'Phase 2', description: 'Middle' },
          { name: 'Phase 3', description: 'End' },
        ],
      },
      'test-engine.result',
      ALL_PASS,
    )
    expect(el).not.toBeNull()
    if (el!.kind !== 'sequence') return
    expect(el!.sequenceType).toBe('ordered')
    expect(el!.steps).toHaveLength(3)
    expect(el!.steps[0]).toEqual({ id: 'step-0', label: 'Phase 1', value: 'Start', detail: 'Initial' })
    expect(el!.steps[2]).toEqual({ id: 'step-2', label: 'Phase 3', value: 'End' })
  })

  it('requires at least 2 steps', () => {
    const el = buildSequence(
      'test-engine',
      { items: [{ name: 'Only one' }] },
      'test-engine.result',
      ALL_PASS,
    )
    expect(el).toBeNull()
  })

  it('uses fallback labels when objects lack name/label/title', () => {
    const el = buildSequence(
      'test-engine',
      { steps: [{ value: 'a' }, { value: 'b' }] },
      'test-engine.result',
      ALL_PASS,
    )
    expect(el).not.toBeNull()
    if (el!.kind !== 'sequence') return
    expect(el!.steps[0].label).toBe('Step 1')
    expect(el!.steps[1].label).toBe('Step 2')
  })
})

describe('parseExtraction', () => {
  it('produces fact-grid elements for a flat payload', () => {
    const payload = { element: 'Fire', quality: 'Cardinal', ruling_planet: 'Mars' }
    const result = parseExtraction('zodiac-engine', payload, 'zodiac-engine.result', mockJevResult())
    expect(result.engineId).toBe('zodiac-engine')
    expect(result.classifiedKind).toBe('fact-grid')
    expect(result.kindConfidence).toBeCloseTo(0.85)
    expect(result.fieldCount).toBe(3)

    const factGrid = result.elements.find((e) => e.kind === 'fact-grid')
    expect(factGrid).toBeDefined()

    const rawEl = result.elements.find((e) => e.kind === 'raw')
    expect(rawEl).toBeDefined()
  })

  it('filters out low-relevance fields via Jev scores', () => {
    const payload = { name: 'Aries', value: '30', debug: 'internal' }
    const result = parseExtraction('test', payload, 'test.result', mockJevResult())
    const factGrid = result.elements.find((e) => e.kind === 'fact-grid')
    if (!factGrid || factGrid.kind !== 'fact-grid') throw new Error('expected fact-grid')
    const ids = factGrid.facts.map((f) => f.id)
    expect(ids).toContain('name')
    expect(ids).toContain('value')
    expect(ids).not.toContain('debug')
  })

  it('produces collections when classified as such', () => {
    const payload = { items: ['a', 'b', 'c'] }
    const jev = mockJevResult({
      primary_kind: {
        type: 'choice',
        choice: 'collections',
        probabilities: { collections: 0.9 },
        confidence: 0.9,
      },
      field_items: { type: 'noul', noul: 0.95 },
    })
    const result = parseExtraction('list-engine', payload, 'list-engine.result', jev)
    expect(result.classifiedKind).toBe('collections')
    expect(result.elements.some((e) => e.kind === 'collections')).toBe(true)
  })

  it('produces sequence when classified and array has ordered objects', () => {
    const payload = {
      phases: [
        { name: 'Alpha', description: 'First' },
        { name: 'Beta', description: 'Second' },
      ],
    }
    const jev = mockJevResult({
      primary_kind: {
        type: 'choice',
        choice: 'sequence',
        probabilities: { sequence: 0.88 },
        confidence: 0.88,
      },
      field_phases: { type: 'noul', noul: 0.97 },
    })
    const result = parseExtraction('phase-engine', payload, 'phase-engine.result', jev)
    expect(result.classifiedKind).toBe('sequence')
    expect(result.elements.some((e) => e.kind === 'sequence')).toBe(true)
  })

  it('falls back to notice + raw when no fields are extractable', () => {
    const payload = { data: [{ complex: { nested: true } }] }
    const jev = mockJevResult({
      field_data: { type: 'noul', noul: 0.1 },
    })
    const result = parseExtraction('empty-engine', payload, 'empty-engine.result', jev)
    expect(result.elements.some((e) => e.kind === 'notice')).toBe(true)
    expect(result.elements.some((e) => e.kind === 'raw')).toBe(true)
  })

  it('always appends a raw element at the end', () => {
    const payload = { x: 1 }
    const result = parseExtraction('test', payload, 'test.result', mockJevResult({
      field_x: { type: 'noul', noul: 0.9 },
    }))
    const last = result.elements[result.elements.length - 1]
    expect(last.kind).toBe('raw')
  })

  it('defaults to fact-grid when kind answer is missing', () => {
    const result = parseExtraction('test', { a: 'b' }, 'test.result', {
      model: 'jev-1.13.0',
      answers: {},
      usage: { input_tokens: 100, output_tokens: 5 },
    })
    expect(result.classifiedKind).toBe('fact-grid')
    expect(result.kindConfidence).toBe(0)
  })
})

describe('extractUnknownEngine', () => {
  it('sends engine context and payload to Jev', async () => {
    let captured: { state: unknown; questions: Record<string, unknown> } | null = null
    const mockJev = async (req: { state: unknown; questions: Record<string, unknown> }) => {
      captured = req
      return mockJevResult()
    }

    const payload = { zodiac_sign: 'Aries', element: 'Fire', ruling_planet: 'Mars' }
    const result = await extractUnknownEngine(mockJev, 'astro-engine', payload)

    expect(captured).not.toBeNull()
    const state = captured!.state as Record<string, unknown>
    expect(state.engineId).toBe('astro-engine')
    expect(captured!.questions).toHaveProperty('primary_kind')
    expect(captured!.questions).toHaveProperty('field_zodiac_sign')
    expect(captured!.questions).toHaveProperty('field_element')
    expect(captured!.questions).toHaveProperty('field_ruling_planet')

    expect(result.engineId).toBe('astro-engine')
    expect(result.classifiedKind).toBe('fact-grid')
    expect(result.elements.length).toBeGreaterThanOrEqual(2)
  })

  it('handles non-object payloads gracefully', async () => {
    const mockJev = async () => mockJevResult()
    const result = await extractUnknownEngine(mockJev, 'broken', 'just a string')
    expect(result.classifiedKind).toBe('raw')
    expect(result.elements).toHaveLength(1)
    expect(result.elements[0].kind).toBe('raw')
    expect(result.fieldCount).toBe(0)
  })

  it('caps field questions at 15', async () => {
    let questionCount = 0
    const mockJev = async (req: { questions: Record<string, unknown> }) => {
      questionCount = Object.keys(req.questions).length
      return mockJevResult()
    }
    const payload: Record<string, string> = {}
    for (let i = 0; i < 25; i++) payload[`field_${i}`] = `value_${i}`

    await extractUnknownEngine(mockJev, 'big-engine', payload)
    expect(questionCount).toBe(16) // 1 kind + 15 field questions
  })

  it('compacts large arrays in the Jev state', async () => {
    let capturedState: Record<string, unknown> = {}
    const mockJev = async (req: { state: unknown }) => {
      capturedState = (req.state as Record<string, unknown>).payload as Record<string, unknown>
      return mockJevResult()
    }

    const payload = {
      items: Array.from({ length: 20 }, (_, i) => ({ id: `item-${i}` })),
      title: 'test',
    }
    await extractUnknownEngine(mockJev, 'array-engine', payload)
    const compacted = capturedState.items as unknown[]
    expect(compacted).toHaveLength(3)
    expect(compacted[2]).toContain('20 items')
  })
})
