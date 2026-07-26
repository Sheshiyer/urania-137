import { describe, expect, it } from 'vitest'
import { contrastRatio } from './contrast'
import {
  COLORS,
  EVIDENCE,
  EVIDENCE_COPY,
  INTERACTION,
  READING,
  TEXT,
  TYPE,
} from './tokens'

describe('Urania semantic visual tokens', () => {
  it('keeps information-bearing text at 4.5:1 on instrument surfaces', () => {
    for (const color of [TEXT.primary, TEXT.secondary, TEXT.metadata]) {
      expect(contrastRatio(color, COLORS.void)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(color, COLORS.surface)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('reserves evidence colors for named evidence states', () => {
    expect(EVIDENCE.computed).toBe(COLORS.emerald)
    expect(EVIDENCE.witness).toBe('#7B68EE')
    expect(EVIDENCE.unresolved).toBe(COLORS.terracotta)
    expect(INTERACTION.focus).not.toBe(EVIDENCE.computed)
    expect(INTERACTION.selected).not.toBe(EVIDENCE.witness)
  })

  it('pairs exact evidence marks with contrast-safe written copy', () => {
    for (const color of Object.values(EVIDENCE_COPY)) {
      expect(contrastRatio(color, COLORS.void)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(color, COLORS.surface)).toBeGreaterThanOrEqual(4.5)
    }
    expect(EVIDENCE_COPY.witness).not.toBe(EVIDENCE.witness)
    expect(EVIDENCE_COPY.unresolved).not.toBe(EVIDENCE.unresolved)
  })

  it('keeps ink readable on the Parchment reading material', () => {
    for (const color of [READING.ink, READING.muted]) {
      expect(contrastRatio(color, READING.surface)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('declares every typography role and safe minimums', () => {
    expect(Object.keys(TYPE.roles)).toEqual([
      'display',
      'engraving',
      'prose',
      'ui',
      'metadata',
      'data',
    ])
    expect(TYPE.roles.metadata.minPx).toBeGreaterThanOrEqual(12)
    expect(TYPE.readingMeasureCh).toBeGreaterThanOrEqual(65)
    expect(TYPE.readingMeasureCh).toBeLessThanOrEqual(75)
  })
})
