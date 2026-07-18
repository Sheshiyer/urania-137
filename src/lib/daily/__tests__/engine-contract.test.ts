import { describe, it, expect } from 'vitest'
import panchanga from '../__fixtures__/panchanga.2026-07-19.blr.json'
import transits from '../__fixtures__/transits.natal-19900515.blr.json'
import type { PanchangaResponse, TransitsResponse } from '../engine-contract'
import { buildPanchangaRequest, buildTransitsRequest } from '../engine-contract'

// T-008: the live-captured fixtures must satisfy the frozen contract types.
// These assignments are the compile-time check — if the engine renames a key,
// the fixture stops matching and `tsc` (and this test's import) fails.
const P: PanchangaResponse = panchanga
const T: TransitsResponse = transits

const BLR = { display: 'Bengaluru', latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata' }

describe('engine-contract vs live fixtures (T-008)', () => {
  it('panchanga fixture carries every limb the interpreter reads', () => {
    expect(typeof P.result.tithi_name).toBe('string')
    expect(typeof P.result.tithi_index).toBe('number')
    expect(typeof P.result.nakshatra_name).toBe('string')
    expect(typeof P.result.yoga_name).toBe('string')
    expect(typeof P.result.karana_name).toBe('string')
    expect(typeof P.result.vara_name).toBe('string')
  })

  it('transits fixture carries the aspect shape the overlay reads', () => {
    expect(Array.isArray(T.result.aspects)).toBe(true)
    const a = T.result.aspects[0]
    expect(a).toHaveProperty('aspect_type')
    expect(a).toHaveProperty('nature')
    expect(a).toHaveProperty('natal_planet')
    expect(a).toHaveProperty('transiting_planet')
  })

  it('buildPanchangaRequest carries date + location, no birth identity', () => {
    const req = buildPanchangaRequest({ date: '2026-07-19', location: BLR })
    expect(req.birth_data.date).toBe('2026-07-19')
    expect(req.birth_data.timezone).toBe('Asia/Kolkata')
    expect(req.birth_data.time).toBe('12:00')
  })

  it('buildTransitsRequest is null without birth, natal with birth', () => {
    const base = { date: '2026-07-19', location: BLR }
    expect(buildTransitsRequest(base)).toBeNull()
    const withBirth = buildTransitsRequest({
      ...base,
      birth: { name: 'Test', date: '1990-05-15', time: '08:30', latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata' },
    })
    expect(withBirth?.birth_data.date).toBe('1990-05-15')
  })
})
