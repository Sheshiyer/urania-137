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
 * Witness/daily render ONE chapter per `{id,title,output}` pass; deterministic
 * renders a single chapter carrying the same fenced-json markdown the Folio
 * archive stores; failures map to a retryable error state, never silently.
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
    expect(r).toMatchObject({ kind: 'witness', status: 'error', error: 'engine unreachable', chapters: [] })
  })

  it('complete with passes → ONE chapter per pass (title heading, output body) + engines footer', () => {
    const r = witnessThreadResult(witnessReport({ status: 'complete', raw: rawWithPasses }), null)
    expect(r?.status).toBe('complete')
    expect(r?.chapters).toEqual([
      { id: 'opening', title: 'Opening', body: 'The pattern begins here.' },
      { id: 'part-i', title: 'Part I — Structural Field', body: 'A structured witness.' },
    ])
    expect(r?.footer).toBe('Engines: jyotish, numerology · register l0')
    expect(r?.saveError).toBeNull()
  })

  it('complete without a pass list → single assembled chapter (the modal-era fallback)', () => {
    const r = witnessThreadResult(witnessReport({ status: 'complete', content: '## Reading\n\nWhole cloth.' }), null)
    expect(r?.chapters).toEqual([{ id: 'assembled', title: 'Noesis Reading — integrated-kundali-l0', body: '## Reading\n\nWhole cloth.' }])
    expect(r?.footer).toBeUndefined()
  })

  it('Folio save failure after a complete reading → saveError rides the complete result (reading stays whole)', () => {
    const r = witnessThreadResult(witnessReport({ status: 'complete', raw: rawWithPasses }), 'D1 unavailable')
    expect(r?.status).toBe('complete')
    expect(r?.chapters).toHaveLength(2)
    expect(r?.saveError).toBe('D1 unavailable')
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

  it('engine result → single chapter with the byte-identical Folio markdown body', () => {
    const engine = { engine_id: 'numerology', result: { life_path: 7 } }
    const r = deterministicThreadResult({ ...detBase, engine }, 'Birth Blueprint')
    expect(r?.status).toBe('complete')
    expect(r?.chapters).toHaveLength(1)
    expect(r?.chapters[0].id).toBe('numerology')
    expect(r?.chapters[0].title).toBe('Birth Blueprint')
    expect(r?.chapters[0].body).toBe('```json\n' + JSON.stringify(engine, null, 2) + '\n```')
    expect(r?.warning).toBeUndefined()
  })

  it('workflow result → single chapter + dropped-engine honesty warning', () => {
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
    expect(r?.chapters).toHaveLength(1)
    expect(r?.chapters[0].id).toBe('birth-blueprint')
    expect(r?.warning).toContain('numerology')
    expect(r?.warning).toContain('drops it silently')
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
