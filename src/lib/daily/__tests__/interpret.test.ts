import { describe, it, expect } from 'vitest'
import { interpret } from '../deterministic'
import type { PanchangaResult, TransitsResult } from '../engine-contract'
import type { DailyLexicon } from '../lexicon/schema'
import panchanga19 from '../__fixtures__/panchanga.2026-07-19.blr.json' // Shashthi (Shukla) — Nanda
import panchanga0802 from '../__fixtures__/panchanga.2026-08-02.blr.json' // Chaturthi (Krishna) — Rikta
import transitsFx from '../__fixtures__/transits.natal-19900515.blr.json'

const P19 = panchanga19.result as unknown as PanchangaResult
const P0802 = panchanga0802.result as unknown as PanchangaResult
const TR = transitsFx.result as unknown as TransitsResult

// Stub lexicon — distinct content per key so key-driven divergence is provable,
// and every invitation is an observation (never an imperative). Wave B authors real tables.
const stub: DailyLexicon = {
  vara: (i) => ({ ruler: `ruler-${i}`, keynote: `vara-keynote-${i}.`, field: 'a field of the day.', invitation: 'you might notice the day.' }),
  tithi: (i) => ({ name: `t-${i}`, paksha: i < 15 ? 'shukla' : 'krishna', category: i < 15 ? 'Nanda' : 'Rikta', deity: `deity-${i}`, motion: 'in motion', keynote: `tithi-keynote-${i}.`, invitation: 'you might notice the moon.' }),
  nakshatra: (i) => ({ ruler: `nr-${i}`, deity: 'a deity', symbol: 'a symbol', guna: 'sattva', keynote: `nakshatra-keynote-${i}.`, invitation: 'you might notice the field.' }),
  yoga: (i) => ({ quality: 'auspicious', keynote: `yoga-keynote-${i}.`, invitation: 'you might notice the join.' }),
  karana: (n) => ({ type: 'movable', keynote: `karana-keynote-${n}.`, invitation: 'you might notice the half.' }),
  transit: (planet) => ({ keynote: `transit-keynote-${planet}.`, invitation: 'you might notice within.' }),
}

const ctx = (hasBirthData: boolean) => ({ date: '2026-07-19', location: 'Bengaluru', hasBirthData })

describe('interpret() — Wave A spine (T-020..T-028)', () => {
  it('base-only: four base passes, no overlay, closing invitation', () => {
    const r = interpret({ panchanga: P19 }, ctx(false), stub)
    expect(r.passes.map((p) => p.id)).toEqual(['vara', 'tithi', 'nakshatra', 'conditions'])
    expect(r.meta.hasOverlay).toBe(false)
    expect(r.meta.source).toBe('deterministic')
    expect(r.mode).toBe('daily-panchanga')
    expect(r.engines_used).toEqual(['panchanga'])
    expect(r.assembled).toContain('add your birth moment')
  })

  it('every base pass names its fixture limb (key-accurate)', () => {
    const r = interpret({ panchanga: P19 }, ctx(false), stub)
    const out = (id: string) => r.passes.find((p) => p.id === id)!.output
    expect(out('vara')).toContain(P19.vara_name)
    expect(out('tithi')).toContain(P19.tithi_name)
    expect(out('nakshatra')).toContain(P19.nakshatra_name)
    expect(out('conditions')).toContain(P19.yoga_name)
    expect(out('conditions')).toContain(P19.karana_name)
  })

  it('is key-driven: a different tithi yields materially different output', () => {
    const a = interpret({ panchanga: P19 }, ctx(false), stub).passes.find((p) => p.id === 'tithi')!.output
    const b = interpret({ panchanga: P0802 }, ctx(false), stub).passes.find((p) => p.id === 'tithi')!.output
    expect(a).toContain('Shashthi (Shukla)')
    expect(b).toContain('Chaturthi (Krishna)')
    expect(a).not.toBe(b)
  })

  it('overlay: birth + transits appends nativePass, drops the closing invitation', () => {
    const r = interpret({ panchanga: P19, transits: TR }, ctx(true), stub)
    expect(r.passes.map((p) => p.id)).toContain('native')
    expect(r.meta.hasOverlay).toBe(true)
    expect(r.engines_used).toContain('transits')
    expect(r.assembled).not.toContain('add your birth moment')
    const native = r.passes.find((p) => p.id === 'native')!.output
    expect(native).toContain(TR.aspects[0].transiting_planet)
  })

  it('purity: same bundle → byte-identical output', () => {
    const a = interpret({ panchanga: P19 }, ctx(false), stub)
    const b = interpret({ panchanga: P19 }, ctx(false), stub)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('rubric pre-check: no imperative/predictive constructs in assembled', () => {
    const r = interpret({ panchanga: P19, transits: TR }, ctx(true), stub)
    expect(r.assembled).not.toMatch(/\byou (will|must|should|need to)\b/i)
  })
})
