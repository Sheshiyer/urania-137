import { describe, it, expect } from 'vitest'
import {
  lexicon,
  VARA_LEXICON,
  TITHI_LEXICON,
  NAKSHATRA_LEXICON,
  YOGA_LEXICON,
  KARANA_LEXICON,
  TRANSIT_LEXICON,
} from '../lexicon'
import {
  VARA_DOMAIN,
  TITHI_DOMAIN,
  NAKSHATRA_DOMAIN,
  YOGA_DOMAIN,
  KARANA_DOMAIN,
  DOMAIN_COUNTS,
} from '../lexicon/domains'

const stringsOf = (entry: object): string[] => Object.values(entry).filter((v): v is string => typeof v === 'string')
const allTables = () => [VARA_LEXICON, TITHI_LEXICON, NAKSHATRA_LEXICON, YOGA_LEXICON, KARANA_LEXICON, TRANSIT_LEXICON]

// Predictive futures + prescriptions + imperatives — the selemene-core banned set.
const BANNED = /\byou\s+(will|shall|must|should|need to|have to|ought)\b|\b(make sure|be sure to)\b/i

describe('lexicon completeness (T-037 / G3)', () => {
  it('entry counts match the ground-truth domain', () => {
    expect(Object.keys(VARA_LEXICON).length).toBe(DOMAIN_COUNTS.vara)
    expect(Object.keys(TITHI_LEXICON).length).toBe(DOMAIN_COUNTS.tithi)
    expect(Object.keys(NAKSHATRA_LEXICON).length).toBe(DOMAIN_COUNTS.nakshatra)
    expect(Object.keys(YOGA_LEXICON).length).toBe(DOMAIN_COUNTS.yoga)
    expect(Object.keys(KARANA_LEXICON).length).toBe(DOMAIN_COUNTS.karana)
  })

  it('every base domain key resolves through the barrel (no gaps)', () => {
    for (const v of VARA_DOMAIN) expect(lexicon.vara(v.index)).toBeTruthy()
    for (const t of TITHI_DOMAIN) expect(lexicon.tithi(t.index)).toBeTruthy()
    for (const n of NAKSHATRA_DOMAIN) expect(lexicon.nakshatra(n.index)).toBeTruthy()
    for (const y of YOGA_DOMAIN) expect(lexicon.yoga(y.index)).toBeTruthy()
    for (const k of KARANA_DOMAIN) expect(lexicon.karana(k.name)).toBeTruthy()
  })

  it('tithi paksha/category mirror the engine domain exactly', () => {
    for (const t of TITHI_DOMAIN) {
      const e = lexicon.tithi(t.index)
      expect(e.paksha).toBe(t.paksha)
      expect(e.category).toBe(t.category)
    }
  })

  it('no entry has an empty keynote or invitation', () => {
    for (const table of allTables()) {
      for (const entry of Object.values(table)) {
        expect(entry.keynote.trim().length).toBeGreaterThan(0)
        expect(entry.invitation.trim().length).toBeGreaterThan(0)
      }
    }
  })
})

describe('lexicon voice / rubric (T-037 / G5)', () => {
  it('no imperative or predictive constructs in any authored string', () => {
    const offenders: string[] = []
    for (const table of allTables()) {
      for (const entry of Object.values(table)) {
        for (const s of stringsOf(entry)) if (BANNED.test(s)) offenders.push(s)
      }
    }
    expect(offenders).toEqual([])
  })

  it('every invitation is phrased as an observation', () => {
    const bad: string[] = []
    for (const table of allTables()) {
      for (const entry of Object.values(table)) {
        // an invitation should read as noticing, not instructing
        if (!/\b(notice|might|may|perhaps|there is|there may|something|feel|sense)\b/i.test(entry.invitation)) {
          bad.push(entry.invitation)
        }
      }
    }
    expect(bad).toEqual([])
  })
})
