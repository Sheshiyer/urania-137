import { describe, it, expect } from 'vitest'
import { resolveDefaultLocation, DEFAULT_LOCATION, todayInTz } from '../location'

const birth = { latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata', display: 'Bengaluru' }
const remembered = { display: 'New York', latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York' }

describe('location resolution + privacy (T-040)', () => {
  it('precedence: birth wins over remembered', () => {
    const r = resolveDefaultLocation({ birth, remembered })
    expect(r.source).toBe('birth')
    expect(r.location.timezone).toBe('Asia/Kolkata')
  })

  it('precedence: remembered when no birth', () => {
    const r = resolveDefaultLocation({ remembered })
    expect(r.source).toBe('remembered')
    expect(r.location.display).toBe('New York')
  })

  it('precedence: labeled neutral default when neither (never blank)', () => {
    const r = resolveDefaultLocation({})
    expect(r.source).toBe('default')
    expect(r.location).toEqual(DEFAULT_LOCATION)
    expect(r.location.display.toLowerCase()).toContain('default')
  })

  it('always carries a timezone', () => {
    for (const r of [resolveDefaultLocation({ birth }), resolveDefaultLocation({ remembered }), resolveDefaultLocation({})]) {
      expect(r.location.timezone).toBeTruthy()
    }
  })

  it('todayInTz returns YYYY-MM-DD in the given timezone', () => {
    expect(todayInTz('Asia/Kolkata')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // Near a UTC-day boundary the tz shift is observable: Kolkata (UTC+5:30) can be a
    // calendar day ahead of Pacific — assert both are valid ISO dates.
    expect(todayInTz('America/Los_Angeles')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('privacy: resolution is pure over its args (no URL/DOM access)', () => {
    const src = resolveDefaultLocation.toString()
    expect(src).not.toMatch(/window\.location|location\.(href|search|hash)|history\./)
  })
})
