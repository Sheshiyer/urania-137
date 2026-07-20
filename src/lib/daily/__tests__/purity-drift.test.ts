import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { interpret } from '../deterministic'
import { lexicon } from '../lexicon'
import type { PanchangaResult } from '../engine-contract'

const validPanchanga = (over: Partial<PanchangaResult> = {}): PanchangaResult => ({
  julian_day: 0,
  solar_longitude: 0,
  lunar_longitude: 0,
  vara_index: 0,
  vara_name: 'Ravivara (Sunday)',
  tithi_index: 5,
  tithi_name: 'Shashthi (Shukla)',
  tithi_value: 5,
  nakshatra_index: 11,
  nakshatra_name: 'Uttara Phalguni',
  nakshatra_value: 11,
  yoga_index: 18,
  yoga_name: 'Parigha',
  yoga_value: 18,
  karana_index: 2,
  karana_name: 'Kaulava',
  karana_value: 11,
  ...over,
})

const ctx = { date: 'd', location: 'l', hasBirthData: false }

describe('interpreter purity (T-078)', () => {
  it('the interpreter source contains no clock/random leakage', () => {
    const src = readFileSync(new URL('../deterministic.ts', import.meta.url), 'utf8')
    expect(src).not.toMatch(/Date\.now|new Date\s*\(|Math\.random|Intl\.[A-Za-z]+\(\s*\)/)
  })

  it('interpret() is deep-equal across two calls on the same bundle', () => {
    const a = interpret({ panchanga: validPanchanga() }, ctx, lexicon)
    const b = interpret({ panchanga: validPanchanga() }, ctx, lexicon)
    expect(a).toEqual(b)
  })
})

describe('schema-drift robustness (T-079)', () => {
  it('an out-of-range limb index throws a NAMED lexicon error (not undefined output)', () => {
    expect(() => interpret({ panchanga: validPanchanga({ vara_index: 99 }) }, ctx, lexicon)).toThrow(/vara/i)
    expect(() => interpret({ panchanga: validPanchanga({ tithi_index: 77 }) }, ctx, lexicon)).toThrow(/tithi/i)
  })

  it('an unknown karana name throws rather than emitting an undefined reading', () => {
    expect(() => interpret({ panchanga: validPanchanga({ karana_name: 'NotAKarana' }) }, ctx, lexicon)).toThrow(/karana/i)
  })

  it('no `undefined` or `[object Object]` ever reaches a valid reading', () => {
    const r = interpret({ panchanga: validPanchanga() }, ctx, lexicon)
    expect(r.assembled).not.toContain('undefined')
    expect(r.assembled).not.toContain('[object Object]')
  })
})
