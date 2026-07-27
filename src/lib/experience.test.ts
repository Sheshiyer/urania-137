import { describe, expect, it } from 'vitest'
import { deriveExperience } from './experience'

const viewer = (operator = false) =>
  ({
    status: 'ready',
    context: { capabilities: { operator } },
    error: null,
  }) as const

describe('deriveExperience', () => {
  it('derives new and returning lifecycle only from the stored self subject', () => {
    expect(deriveExperience(viewer(), { status: 'ready', subjects: [], error: null })).toMatchObject({
      status: 'ready',
      lifecycle: 'new',
      operator: false,
    })
    expect(
      deriveExperience(viewer(), {
        status: 'ready',
        subjects: [{ id: 'circle-1', role: 'partner' }],
        error: null,
      }),
    ).toMatchObject({ lifecycle: 'new' })
    expect(
      deriveExperience(viewer(), {
        status: 'ready',
        subjects: [{ id: 'self-1', role: 'self' }],
        error: null,
      }),
    ).toMatchObject({ lifecycle: 'returning' })
  })

  it('keeps operator capability orthogonal to lifecycle', () => {
    expect(
      deriveExperience(viewer(true), {
        status: 'ready',
        subjects: [{ id: 'self-1', role: 'self' }],
        error: null,
      }),
    ).toEqual({
      status: 'ready',
      lifecycle: 'returning',
      operator: true,
      notice: null,
    })
  })

  it('surfaces an explicit degraded state without inventing lifecycle or capability', () => {
    expect(
      deriveExperience(
        { status: 'degraded', context: null, error: 'context unavailable' },
        { status: 'ready', subjects: [], error: null },
      ),
    ).toEqual({
      status: 'degraded',
      lifecycle: 'new',
      operator: false,
      notice: 'context unavailable',
    })
    expect(
      deriveExperience(viewer(true), {
        status: 'degraded',
        subjects: null,
        error: 'profiles unavailable',
      }),
    ).toEqual({
      status: 'degraded',
      lifecycle: 'unknown',
      operator: true,
      notice: 'profiles unavailable',
    })
  })
})
