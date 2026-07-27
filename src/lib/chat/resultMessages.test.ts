import { describe, expect, it } from 'vitest'
import {
  dailyThreadResult,
  deterministicThreadResult,
  witnessThreadResult,
  type DeterministicRunState,
} from './resultMessages'
import type { GeneratedReport } from '../../types'
import type { DailyReading } from '../daily/source'

/**
 * Phase 3 result-message mapping contract: hook state → in-thread chapters.
 * Witness/daily render only reader-facing `{id,title,output}` passes;
 * deterministic source remains structured for components while its lossless
 * serialization stays archive-only. Failures remain retryable, never silent.
 */

const witnessReport = (over: Partial<GeneratedReport>): GeneratedReport => ({
  id: 'noesis-integrated-kundali-l0',
  nodeId: 'noesis',
  title: 'Noesis Reading — integrated-kundali-l0',
  status: 'complete',
  content: '',
  generatedAt: new Date('2026-07-24T00:00:00Z'),
  ...over,
})

const rawWithPasses = {
  mode: 'integrated-kundali-l0',
  register: 'l0',
  passes: [
    { id: 'opening', title: 'Opening', output: 'The pattern begins here.' },
    { id: 'part-i', title: 'Part I — Structural Field', output: 'A structured witness.' },
  ],
  assembled: 'The pattern begins here.\n\nA structured witness.',
  engines_used: ['jyotish', 'numerology'],
}

const detBase: DeterministicRunState = { busy: false, error: null, workflow: null, engine: null, declaredEngines: [] }

describe('witnessThreadResult', () => {
  it('no report → null (nothing to render)', () => {
    expect(witnessThreadResult(null, null)).toBeNull()
  })

  it('generating → composing beat', () => {
    const r = witnessThreadResult(witnessReport({ status: 'generating' }), null)
    expect(r).toMatchObject({ kind: 'witness', status: 'composing', chapters: [], error: null })
  })

  it('error → retryable error state carrying the engine message', () => {
    const r = witnessThreadResult(witnessReport({ status: 'error', content: 'engine unreachable' }), null)
    expect(r).toMatchObject({
      kind: 'witness',
      status: 'error',
      error: 'engine unreachable',
      chapters: [],
      retryScope: 'same-request',
    })
  })

  it('complete with passes → ONE chapter per pass (title heading, output body) + engines footer', () => {
    const r = witnessThreadResult(witnessReport({ status: 'complete', raw: rawWithPasses }), null)
    expect(r?.status).toBe('complete')
    expect(r?.chapters).toEqual([
      { id: 'opening', title: 'Opening', body: 'The pattern begins here.' },
      { id: 'part-i', title: 'Part I — Structural Field', body: 'A structured witness.' },
    ])
    expect(r?.footer).toBe('Engines: jyotish, numerology · register l0')
    expect(r?.structureSource).toBe('native')
    expect(r?.systems).toEqual(['jyotish', 'numerology'])
    expect(r?.saveError).toBeNull()
  })

  it('complete without a pass list → single assembled chapter (the modal-era fallback)', () => {
    const r = witnessThreadResult(witnessReport({ status: 'complete', content: '## Reading\n\nWhole cloth.' }), null)
    expect(r?.chapters).toEqual([{ id: 'assembled', title: 'Noesis Reading — integrated-kundali-l0', body: '## Reading\n\nWhole cloth.' }])
    expect(r?.structureSource).toBe('flat')
    expect(r?.footer).toBeUndefined()
  })

  it('keeps source_pack as provenance while excluding technical serialized passes from visible chapters', () => {
    const sourcePack = {
      register: 'l1_l3',
      quality: { gate_status: 'ready' },
      engines: ['panchanga', 'numerology'],
    }
    const technicalPass = [
      'Pass alpha — Structural Field',
      '- panchanga: {"vara_name":"Somavara"}',
      '- numerology: {"life_path":{"value":7}}',
    ].join('\n')
    const raw = {
      mode: 'integrated-reading',
      register: 'l1_l3',
      passes: [
        { id: 'alpha', title: 'Structural Field', output: technicalPass },
        { id: 'reading', title: 'Reading', output: 'The source-authored interpretation remains visible.' },
      ],
      assembled: `## Structural Field\n\n${technicalPass}\n\n## Reading\n\nThe source-authored interpretation remains visible.`,
      engines_used: ['panchanga', 'numerology'],
      source_pack: sourcePack,
    }

    const r = witnessThreadResult(witnessReport({ status: 'complete', raw, content: raw.assembled }), null)

    expect(r?.chapters).toEqual([
      { id: 'reading', title: 'Reading', body: 'The source-authored interpretation remains visible.' },
    ])
    expect(r?.sourcePayload).toBe(sourcePack)
    expect(r?.archiveContent).toBe(raw.assembled)
    expect(r?.chapters.some((chapter) => chapter.body.includes('{"vara_name"'))).toBe(false)
  })

  it('turns an all-technical witness response into a source-only result without losing its archive', () => {
    const sourcePack = { engines: ['panchanga'], quality: { gate_status: 'ready' } }
    const technicalPass = 'Pass alpha — Structural Field\n- panchanga: {"vara_name":"Somavara"}'
    const raw = {
      mode: 'integrated-reading',
      register: 'l1_l3',
      passes: [{ id: 'alpha', title: 'Structural Field', output: technicalPass }],
      assembled: `## Structural Field\n\n${technicalPass}`,
      engines_used: ['panchanga'],
      source_pack: sourcePack,
    }

    const r = witnessThreadResult(witnessReport({ status: 'complete', raw, content: raw.assembled }), null)

    expect(r?.structureSource).toBe('flat')
    expect(r?.chapters).toEqual([])
    expect(r?.sourcePayload).toBe(sourcePack)
    expect(r?.archiveContent).toBe(raw.assembled)
  })

  it('keeps fenced, whole-object, and multiline witness JSON out of visible chapters', () => {
    const technicalPasses = [
      {
        id: 'fenced',
        title: 'Fenced source',
        output: '```json\n{"engine_id":"panchanga","result":{"vara":"Somavara"}}\n```',
      },
      {
        id: 'whole',
        title: 'Whole source',
        output: '{"engine_id":"numerology","result":{"life_path":7}}',
      },
      {
        id: 'multiline',
        title: 'Multiline source',
        output: 'Pass beta — Somatic Field\n- human-design:\n  {"authority":"Sacral"}',
      },
    ]
    const raw = {
      mode: 'integrated-reading',
      register: 'l1_l3',
      passes: [
        ...technicalPasses,
        { id: 'reading', title: 'Reading', output: 'A reader-facing interpretation.' },
      ],
      assembled: technicalPasses.map((pass) => pass.output).join('\n\n'),
      engines_used: ['panchanga', 'numerology', 'human-design'],
    }

    const r = witnessThreadResult(
      witnessReport({ status: 'complete', raw, content: raw.assembled }),
      null,
    )

    expect(r?.chapters).toEqual([
      { id: 'reading', title: 'Reading', body: 'A reader-facing interpretation.' },
    ])
    expect(r?.sourcePayload).toEqual({ technical_passes: technicalPasses })
    expect(r?.archiveContent).toBe(raw.assembled)
  })

  it('Folio save failure after a complete reading → saveError rides the complete result (reading stays whole)', () => {
    const r = witnessThreadResult(witnessReport({ status: 'complete', raw: rawWithPasses }), 'D1 unavailable')
    expect(r?.status).toBe('complete')
    expect(r?.chapters).toHaveLength(2)
    expect(r?.saveError).toBe('D1 unavailable')
    expect(r?.retryScope).toBe('same-request')
  })
})

const dailyReading: DailyReading = {
  mode: 'daily-panchanga',
  passes: [
    { id: 'panchanga', title: 'The Five Limbs', output: 'Tithi 7, Nakshatra Rohini.' },
    { id: 'native', title: 'How Today Meets Your Pattern', output: 'The transit touches the natal Moon.' },
  ],
  assembled: 'Tithi 7…',
  engines_used: ['panchanga', 'transit-overlay'],
  meta: { date: '2026-07-24', location: 'Ujjain, India', hasOverlay: true, source: 'deterministic' },
  sourcePayloads: [
    {
      engine_id: 'panchanga',
      result: {
        vara_name: 'Somavara',
        tithi_name: 'Saptami',
        nakshatra_name: 'Hasta',
        yoga_name: 'Siddhi',
        karana_name: 'Bava',
      },
    },
  ],
}

describe('dailyThreadResult', () => {
  it('idle → null (no run fired yet)', () => {
    expect(dailyThreadResult({ status: 'idle', reading: null, error: null })).toBeNull()
  })

  it('loading → composing beat', () => {
    expect(dailyThreadResult({ status: 'loading', reading: null, error: null })).toMatchObject({ kind: 'daily', status: 'composing' })
  })

  it('error → retryable error state (failed readings never archived, error text preserved)', () => {
    const r = dailyThreadResult({ status: 'error', reading: null, error: 'Could not read the day.' })
    expect(r).toMatchObject({ kind: 'daily', status: 'error', error: 'Could not read the day.' })
  })

  it('complete → ONE chapter per pass (base limbs + native overlay) + source footer', () => {
    const r = dailyThreadResult({ status: 'complete', reading: dailyReading, error: null })
    expect(r?.status).toBe('complete')
    expect(r?.chapters).toEqual([
      { id: 'panchanga', title: 'The Five Limbs', body: 'Tithi 7, Nakshatra Rohini.' },
      { id: 'native', title: 'How Today Meets Your Pattern', body: 'The transit touches the natal Moon.' },
    ])
    expect(r?.footer).toBe('deterministic · panchanga + transit-overlay')
    expect(r?.structureSource).toBe('native')
    expect(r?.systems).toEqual(['panchanga', 'transit-overlay'])
    expect(r?.sourcePayload).toEqual(dailyReading.sourcePayloads)
  })

  it('a Folio save failure keeps the computed daily reading available as fallback', () => {
    const r = dailyThreadResult({
      status: 'complete',
      reading: dailyReading,
      error: null,
      saveError: 'D1 unavailable',
    })
    expect(r).toMatchObject({
      status: 'complete',
      saveError: 'D1 unavailable',
      retryScope: 'same-request',
    })
    expect(r?.chapters).toHaveLength(2)
  })
})

describe('deterministicThreadResult', () => {
  it('busy → composing beat', () => {
    expect(deterministicThreadResult({ ...detBase, busy: true }, 'Birth Blueprint')).toMatchObject({
      kind: 'deterministic',
      status: 'composing',
    })
  })

  it('error → retryable error state (the modal era showed the error instead of the result)', () => {
    const r = deterministicThreadResult({ ...detBase, error: 'Engine call failed' }, 'Birth Blueprint')
    expect(r).toMatchObject({ kind: 'deterministic', status: 'error', error: 'Engine call failed' })
  })

  it('empty state → null (no run fired yet)', () => {
    expect(deterministicThreadResult(detBase, 'Birth Blueprint')).toBeNull()
  })

  it('engine result → structured source for components with lossless JSON confined to the archive', () => {
    const engine = { engine_id: 'numerology', result: { life_path: { value: 7 } } }
    const r = deterministicThreadResult({ ...detBase, engine }, 'Birth Blueprint')
    expect(r?.status).toBe('complete')
    expect(r?.chapters).toEqual([])
    expect(r?.structureSource).toBe('flat')
    expect(r?.systems).toEqual(['numerology'])
    expect(r?.warning).toBeUndefined()
    expect(r?.sourcePayload).toEqual(engine)
    expect(r?.archiveContent).toBe(
      '## Birth Blueprint (numerology)\n\n```json\n' + JSON.stringify(engine, null, 2) + '\n```\n',
    )
  })

  it('workflow result → source-shaped presentation + dropped-engine honesty warning', () => {
    const workflow = {
      workflow_id: 'birth-blueprint',
      engine_outputs: { jyotish: { engine_id: 'jyotish', result: {} } },
      synthesis: null,
      total_time_ms: 12.5,
    }
    const r = deterministicThreadResult(
      { ...detBase, workflow, declaredEngines: ['jyotish', 'numerology'] },
      'Birth Blueprint',
    )
    expect(r?.chapters).toEqual([])
    expect(r?.warning).toContain('numerology')
    expect(r?.warning).toContain('drops it silently')
    expect(r?.archiveContent).toContain('```json')
    expect(r?.sourcePayload).toBe(workflow)
  })

  it('a Folio save failure keeps the computed deterministic result available as fallback', () => {
    const engine = { engine_id: 'numerology', result: { life_path: 7 } }
    const r = deterministicThreadResult(
      { ...detBase, engine, error: 'D1 unavailable' },
      'Numerology',
    )
    expect(r).toMatchObject({
      status: 'complete',
      saveError: 'D1 unavailable',
      retryScope: 'same-request',
    })
    expect(r?.chapters).toEqual([])
  })

  it('workflow with every declared engine present → no warning', () => {
    const workflow = {
      workflow_id: 'birth-blueprint',
      engine_outputs: { jyotish: { engine_id: 'jyotish', result: {} } },
      synthesis: null,
      total_time_ms: 12.5,
    }
    const r = deterministicThreadResult({ ...detBase, workflow, declaredEngines: ['jyotish'] }, 'Birth Blueprint')
    expect(r?.warning).toBeUndefined()
  })
})
