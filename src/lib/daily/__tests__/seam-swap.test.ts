import { describe, it, expect } from 'vitest'
import { interpret } from '../deterministic'
import { lexicon } from '../lexicon'
import { PASS_MODEL } from '../passModel'
import type { DailyReading, DailyReadingInput, DailyReadingSource } from '../source'
import type { PanchangaResult } from '../engine-contract'
import panchanga19 from '../__fixtures__/panchanga.2026-07-19.blr.json'

const P19 = panchanga19.result as unknown as PanchangaResult
const input: DailyReadingInput = {
  date: '2026-07-19',
  location: { display: 'Bengaluru', latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata' },
}

/**
 * A fixture-backed fake ③. Phase 4's real WitnessModeSource must produce the SAME
 * DailyReading shape (same key set, same pass id/title set), differing only in
 * meta.source — so the ①→③ flip is proven shape-safe BEFORE the engine route exists.
 */
class FakeWitnessSource implements DailyReadingSource {
  async getDailyReading(i: DailyReadingInput): Promise<DailyReading> {
    const base = interpret({ panchanga: P19 }, { date: i.date, location: i.location.display, hasBirthData: !!i.birth }, lexicon)
    return { ...base, meta: { ...base.meta, source: 'witness' } }
  }
}

describe('seam-swap conformance (G8)', () => {
  it('① and ③ return an identical DailyReading shape, differing only in meta.source', async () => {
    const det = interpret({ panchanga: P19 }, { date: input.date, location: input.location.display, hasBirthData: false }, lexicon)
    const wit = await new FakeWitnessSource().getDailyReading(input)

    expect(Object.keys(wit).sort()).toEqual(Object.keys(det).sort())
    expect(Object.keys(wit.meta).sort()).toEqual(Object.keys(det.meta).sort())
    expect(wit.passes.map((p) => p.id)).toEqual(det.passes.map((p) => p.id))
    expect(wit.passes.map((p) => p.title)).toEqual(det.passes.map((p) => p.title))
    expect(det.meta.source).toBe('deterministic')
    expect(wit.meta.source).toBe('witness')
  })

  it('every pass id belongs to the frozen PASS_MODEL', async () => {
    const wit = await new FakeWitnessSource().getDailyReading(input)
    for (const p of wit.passes) expect(PASS_MODEL.some((m) => m.id === p.id)).toBe(true)
  })

  it('a shape divergence in ③ is caught', async () => {
    const det = interpret({ panchanga: P19 }, { date: input.date, location: input.location.display, hasBirthData: false }, lexicon)
    const broken = { ...det, meta: { ...det.meta, source: 'witness' as const } } as Record<string, unknown>
    delete broken.engines_used
    expect(Object.keys(broken).sort()).not.toEqual(Object.keys(det).sort())
  })
})
