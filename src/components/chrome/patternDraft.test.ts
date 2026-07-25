import { describe, expect, it } from 'vitest'
import type { SubjectProfile } from '../../types/chat'
import { NOON_CONVENTION, buildPatch, draftFromProfile, normalizeDraft, validateDraft } from './patternDraft'

/**
 * Settings W4 "Your pattern" — the draft/patch helpers behind PatternSection.
 * The profile fixture mirrors a Threshold-written self row.
 */
const profile: SubjectProfile = {
  id: 'sub_self',
  role: 'self',
  name: 'Asha',
  birth_date: '1990-04-17',
  birth_time: '06:45',
  birth_time_confidence: 'exact',
  birth_location_query: 'Pune, India',
  normalized_location: {
    display_name: 'Pune, Maharashtra, India',
    latitude: 18.52,
    longitude: 73.86,
    timezone: 'Asia/Kolkata',
    provider: 'nominatim',
    confidence: 'high',
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('validateDraft', () => {
  it('accepts the untouched profile draft', () => {
    expect(validateDraft(draftFromProfile(profile))).toBeNull()
  })

  it('rejects impossible calendar dates with the machine’s own rule', () => {
    expect(validateDraft({ ...draftFromProfile(profile), birth_date: '2024-02-30' })).toMatch(/YYYY-MM-DD/)
    expect(validateDraft({ ...draftFromProfile(profile), birth_date: '17/04/1990' })).toMatch(/YYYY-MM-DD/)
  })

  it('rejects malformed times only when the time is claimed', () => {
    expect(validateDraft({ ...draftFromProfile(profile), birth_time: '25:00' })).toMatch(/HH:MM/)
    expect(
      validateDraft({ ...draftFromProfile(profile), birth_time: 'whenever', birth_time_confidence: 'unknown' }),
    ).toBeNull()
  })

  it('requires a name and a place', () => {
    expect(validateDraft({ ...draftFromProfile(profile), name: '   ' })).toMatch(/name/)
    expect(validateDraft({ ...draftFromProfile(profile), birth_location_query: '' })).toMatch(/place/)
  })
})

describe('normalizeDraft', () => {
  it('trims whitespace from the text fields', () => {
    const d = normalizeDraft({ ...draftFromProfile(profile), name: '  Asha  ', birth_date: ' 1990-04-17 ' })
    expect(d.name).toBe('Asha')
    expect(d.birth_date).toBe('1990-04-17')
  })

  it('enforces the noon convention for unknown times (gardener rule)', () => {
    const d = normalizeDraft({ ...draftFromProfile(profile), birth_time: '06:45', birth_time_confidence: 'unknown' })
    expect(d.birth_time).toBe(NOON_CONVENTION)
  })

  it('leaves claimed times untouched', () => {
    const d = normalizeDraft({ ...draftFromProfile(profile), birth_time_confidence: 'approximate' })
    expect(d.birth_time).toBe('06:45')
  })
})

describe('buildPatch', () => {
  it('emits nothing when nothing changed', () => {
    expect(buildPatch(profile, draftFromProfile(profile))).toEqual({})
  })

  it('emits only the changed fields', () => {
    expect(buildPatch(profile, { ...draftFromProfile(profile), name: 'Asha Iyer' })).toEqual({ name: 'Asha Iyer' })
  })

  it('sends the noon time alongside a newly-unknown confidence', () => {
    expect(buildPatch(profile, { ...draftFromProfile(profile), birth_time_confidence: 'unknown' })).toEqual({
      birth_time: NOON_CONVENTION,
      birth_time_confidence: 'unknown',
    })
  })

  it('never includes role, id, or timestamps', () => {
    const patch = buildPatch(profile, {
      name: 'B',
      birth_date: '1991-01-01',
      birth_time: '07:00',
      birth_time_confidence: 'approximate',
      birth_location_query: 'Goa, India',
    })
    expect(Object.keys(patch).sort()).toEqual([
      'birth_date',
      'birth_location_query',
      'birth_time',
      'birth_time_confidence',
      'name',
    ])
  })
})
