import { describe, expect, it } from 'vitest'
import type { SelemeneChild } from '../types'
import { resolveNodeEntry } from './nodeEntry'

const child = (
  id: string,
  run?: SelemeneChild['run'],
  extra: Partial<SelemeneChild> = {},
): SelemeneChild => ({
  id,
  label: id,
  run,
  ...extra,
})

describe('resolveNodeEntry', () => {
  it.each([
    [
      'engine',
      child('numerology', { kind: 'engine', engineId: 'numerology' }),
      'deterministic',
    ],
    [
      'workflow',
      child('birth-blueprint', {
        kind: 'workflow',
        workflowId: 'birth-blueprint',
      }),
      'deterministic',
    ],
    [
      'daily',
      child('today', { kind: 'daily', needsLocation: true }),
      'daily',
    ],
    [
      'witness',
      child('integrated-reading', {
        kind: 'witness',
        mode: 'integrated-reading',
        minSubjects: 1,
        maxSubjects: 5,
      }),
      'chat',
    ],
  ] as const)('maps a %s run to %s entry', (_kind, candidate, expected) => {
    expect(resolveNodeEntry('birth', candidate)).toBe(expected)
  })

  it('maps an absent run to the information surface explicitly', () => {
    expect(resolveNodeEntry('bridge', child('about', undefined, { info: true }))).toBe('info')
  })

  it('maps Folio actions to canonical Folio navigation before run handling', () => {
    expect(resolveNodeEntry('folio', child('saved', undefined, { action: 'list' }))).toBe('folio')
  })
})
