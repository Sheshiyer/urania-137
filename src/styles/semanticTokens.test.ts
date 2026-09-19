import { describe, expect, it } from 'vitest'
import { contrastRatio } from './contrast'
import {
  COLORS,
  EVIDENCE,
  EVIDENCE_COPY,
  INTERACTION,
  MOTION,
  RADIUS,
  READING,
  SHADOW,
  TEXT,
  TYPE,
  TYPE_SCALE,
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

  it('declares exactly three radius stops and a seven-step type scale', () => {
    expect(Object.keys(RADIUS)).toEqual(['tile', 'card', 'pill'])
    expect(RADIUS.pill).toBe('9999px')
    expect(Object.keys(TYPE_SCALE)).toEqual(['meta', 'small', 'body', 'sub', 'h2', 'h1', 'hero'])
    const steps = Object.values(TYPE_SCALE)
    for (let i = 1; i < steps.length; i += 1) expect(steps[i]).toBeGreaterThan(steps[i - 1])
    expect(TYPE_SCALE.meta * 16).toBeGreaterThanOrEqual(TYPE.roles.metadata.minPx)
  })

  it('keeps shadows tinted from the void and one brand easing', () => {
    for (const shadow of Object.values(SHADOW)) expect(shadow).toMatch(/rgb\(7 11 29/)
    expect(MOTION.easing).toBe('cubic-bezier(0.19, 1, 0.22, 1)')
    expect(MOTION.mastheadShrinkPx).toBeGreaterThan(0)
  })
})
