import { describe, expect, it } from 'vitest'
import { UI_COPY } from './uiCopy'

describe('grounded UI vocabulary', () => {
  it('states the product promise and Threshold compact exactly', () => {
    expect(UI_COPY.promise).toBe(
      'See what is active. Choose a lens; the narrator assembles the reading with you.',
    )
    expect(UI_COPY.thresholdGrounding).toBe(
      'A private instrument for examining what is active while keeping authorship with you.',
    )
    expect(UI_COPY.beginReading).toBe('Begin a reading')
  })

  it('uses Folio as the sole saved-reading noun', () => {
    const copy = Object.values(UI_COPY).join(' ')
    expect(copy).toMatch(/\bFolio\b/)
    expect(copy).not.toMatch(/\b(?:Archive|Library)\b/i)
  })
})
