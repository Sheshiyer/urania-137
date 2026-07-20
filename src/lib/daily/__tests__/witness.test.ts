import { describe, it, expect, vi, beforeEach } from 'vitest'
import panchanga19 from '../__fixtures__/panchanga.2026-07-19.blr.json'

// Mock the network layer both source impls reach through.
vi.mock('../../selemeneApi', () => ({
  generateAsset: vi.fn(),
  calculateEngineRaw: vi.fn(),
}))
import { generateAsset, calculateEngineRaw } from '../../selemeneApi'
import { WitnessModeSource, buildWitnessRequest } from '../witness'
import { getDailyReading } from '../registry'
import type { DailyReadingInput } from '../source'

const input: DailyReadingInput = {
  date: '2026-07-19',
  location: { display: 'Bengaluru', latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata' },
}
const birth = { name: 'T', date: '1990-05-15', time: '08:30', latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata' }

beforeEach(() => {
  vi.mocked(generateAsset).mockReset()
  vi.mocked(calculateEngineRaw).mockReset()
})

describe('WitnessModeSource ③ adapter (T-090)', () => {
  it('maps AssetGenerateResponse → DailyReading (same shape, meta.source=witness)', async () => {
    vi.mocked(generateAsset).mockResolvedValue({
      mode: 'daily-panchanga',
      register: 'l1_l3',
      passes: [{ id: 'vara', title: 'The Day-Lord', output: 'x' }],
      assembled: 'A',
      engines_used: ['panchanga', 'transits'],
    })
    const r = await new WitnessModeSource().getDailyReading({ ...input, birth })
    expect(r.mode).toBe('daily-panchanga')
    expect(r.meta.source).toBe('witness')
    expect(r.meta.hasOverlay).toBe(true)
    expect(r.passes[0].id).toBe('vara')
    expect(r.assembled).toBe('A')
  })

  it('buildWitnessRequest carries the date (narrates today) + subject only with birth (T-092)', () => {
    const base = buildWitnessRequest(input)
    expect(base.mode).toBe('daily-panchanga')
    expect((base.options as Record<string, unknown>).date).toBe('2026-07-19')
    expect(base.subjects?.length).toBe(0)
    expect(buildWitnessRequest({ ...input, birth }).subjects?.length).toBe(1)
  })
})

describe('③ dormancy under the default flag (T-097)', () => {
  it('default DAILY_SOURCE takes the ① path — zero /assets/generate calls', async () => {
    vi.mocked(calculateEngineRaw).mockResolvedValue({ engine_id: 'panchanga', result: panchanga19.result as Record<string, unknown> })
    const r = await getDailyReading(input)
    expect(r.meta.source).toBe('deterministic')
    expect(calculateEngineRaw).toHaveBeenCalled()
    expect(generateAsset).not.toHaveBeenCalled()
  })
})
