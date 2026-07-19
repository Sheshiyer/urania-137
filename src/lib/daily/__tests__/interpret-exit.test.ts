import { describe, it, expect } from 'vitest'
import { interpret } from '../deterministic'
import { lexicon } from '../lexicon'
import type { PanchangaResult, TransitsResult } from '../engine-contract'
import panchanga19 from '../__fixtures__/panchanga.2026-07-19.blr.json'
import panchanga0802 from '../__fixtures__/panchanga.2026-08-02.blr.json'
import transitsFx from '../__fixtures__/transits.natal-19900515.blr.json'

const P19 = panchanga19.result as unknown as PanchangaResult
const P0802 = panchanga0802.result as unknown as PanchangaResult
const TR = transitsFx.result as unknown as TransitsResult

// Phase 1 exit contract: interpret() over the REAL authored lexicon yields a
// complete, limb-accurate, byte-stable reading (T-043 + T-044).
describe('Phase 1 exit proof — real lexicon (T-043 / T-044)', () => {
  it('base-only: complete reading naming every real limb + closing invitation', () => {
    const r = interpret({ panchanga: P19 }, { date: '2026-07-19', location: 'Bengaluru', hasBirthData: false }, lexicon)
    expect(r.passes.map((p) => p.id)).toEqual(['vara', 'tithi', 'nakshatra', 'conditions'])
    expect(r.meta.hasOverlay).toBe(false)
    for (const name of [P19.vara_name, P19.tithi_name, P19.nakshatra_name, P19.yoga_name, P19.karana_name]) {
      expect(r.assembled).toContain(name)
    }
    expect(r.assembled).toContain('add your birth moment')
    expect(r.assembled.length).toBeGreaterThan(300)
  })

  it('overlay: birth appends the native pass, drops the closing invitation', () => {
    const r = interpret({ panchanga: P19, transits: TR }, { date: '2026-07-19', location: 'Bengaluru', hasBirthData: true }, lexicon)
    expect(r.passes.some((p) => p.id === 'native')).toBe(true)
    expect(r.meta.hasOverlay).toBe(true)
    expect(r.assembled).not.toContain('add your birth moment')
  })

  it('determinism: byte-identical across repeated calls', () => {
    const a = interpret({ panchanga: P0802 }, { date: 'd', location: 'l', hasBirthData: false }, lexicon)
    const b = interpret({ panchanga: P0802 }, { date: 'd', location: 'l', hasBirthData: false }, lexicon)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('snapshot: the Nanda/Shukla base reading is stable', () => {
    const r = interpret({ panchanga: P19 }, { date: '2026-07-19', location: 'Bengaluru', hasBirthData: false }, lexicon)
    expect(r.assembled).toMatchSnapshot()
  })

  it('snapshot: the Rikta/Krishna base reading is stable and distinct', () => {
    const r = interpret({ panchanga: P0802 }, { date: '2026-08-02', location: 'Bengaluru', hasBirthData: false }, lexicon)
    expect(r.assembled).toMatchSnapshot()
  })
})
