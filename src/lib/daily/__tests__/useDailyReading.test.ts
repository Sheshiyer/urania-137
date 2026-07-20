import { describe, it, expect, vi } from 'vitest'
import { fetchDailyReading } from '../../../hooks/useDailyReading'
import type { DailyReading, DailyReadingInput } from '../source'

const input: DailyReadingInput = {
  date: '2026-07-19',
  location: { display: 'Bengaluru', latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata' },
}

const fakeReading: DailyReading = {
  mode: 'daily-panchanga',
  passes: [{ id: 'vara', title: 'The Day-Lord', output: '…' }],
  assembled: 'the assembled reading',
  engines_used: ['panchanga'],
  meta: { date: '2026-07-19', location: 'Bengaluru', hasOverlay: false, source: 'deterministic' },
}

describe('fetchDailyReading orchestration (T-041 / T-042)', () => {
  it('archives exactly once on success, with mode daily-panchanga + assembled content', async () => {
    const archive = vi.fn()
    const r = await fetchDailyReading(input, async () => fakeReading, archive)
    expect(r).toBe(fakeReading)
    expect(archive).toHaveBeenCalledTimes(1)
    const payload = archive.mock.calls[0][0]
    expect(payload.mode).toBe('daily-panchanga')
    expect(payload.content).toBe('the assembled reading')
    expect(payload.nodeId).toBe('transit')
  })

  it('does NOT archive when the engine call fails', async () => {
    const archive = vi.fn()
    await expect(
      fetchDailyReading(input, async () => {
        throw new Error('engine 500')
      }, archive),
    ).rejects.toThrow('engine 500')
    expect(archive).not.toHaveBeenCalled()
  })
})
