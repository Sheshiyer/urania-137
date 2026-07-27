import { afterEach, describe, expect, it, vi } from 'vitest'
import { listSubjects } from './subjectsApi'

const validSubject = {
  id: 'subject-self',
  role: 'self',
  name: 'Reader',
  birth_date: '2000-01-01',
  birth_time: '12:00',
  birth_time_confidence: 'unknown',
  birth_location_query: 'Ujjain',
  normalized_location: {
    display_name: 'Ujjain, India',
    latitude: 23.1765,
    longitude: 75.7885,
    timezone: 'Asia/Kolkata',
    provider: 'fixture',
    confidence: 'fixture',
  },
  createdAt: '2026-07-27T00:00:00.000Z',
  updatedAt: '2026-07-27T00:00:00.000Z',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('listSubjects', () => {
  it('accepts the complete subject response contract', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ subjects: [validSubject] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )))

    await expect(listSubjects()).resolves.toEqual([validSubject])
  })

  it.each([
    {},
    { subjects: null },
    { subjects: [{ id: 'subject-self', role: 'self' }] },
    {
      subjects: [{
        ...validSubject,
        normalized_location: { ...validSubject.normalized_location, latitude: '23.1765' },
      }],
    },
  ])('rejects malformed successful responses without crashing experience derivation', async (body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify(body),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )))

    await expect(listSubjects()).rejects.toThrow('subjects response was invalid')
  })
})
