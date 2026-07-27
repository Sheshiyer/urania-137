import { describe, expect, it } from 'vitest'
import type { ReadingDTO } from '../api/contract'
import { deriveFolioView, folioAccessFromStatus } from './folioView'

const entry: ReadingDTO = {
  id: 'known',
  nodeId: 'birth',
  nodeLabel: 'Birth Witness',
  mode: 'fixture',
  title: 'Known reading',
  content: 'Body',
  createdAt: 137,
  favorite: false,
}

describe('deriveFolioView', () => {
  it.each([
    [401, 'denied'],
    [403, 'denied'],
    [404, undefined],
    [500, undefined],
    [null, undefined],
  ] as const)('maps HTTP status %s to the honest Folio access state', (status, expected) => {
    expect(folioAccessFromStatus(status)).toBe(expected)
  })

  it.each([
    [
      'loading',
      {
        status: 'loading',
        entries: [],
        error: null,
        readingId: null,
        filtered: false,
      },
    ],
    [
      'empty',
      {
        status: 'ready',
        entries: [],
        error: null,
        readingId: null,
        filtered: false,
      },
    ],
    [
      'error',
      {
        status: 'error',
        entries: [],
        error: 'Network unavailable',
        readingId: null,
        filtered: false,
      },
    ],
    [
      'denied',
      {
        status: 'error',
        entries: [],
        error: 'Access denied',
        readingId: 'secret',
        filtered: false,
        access: 'denied',
      },
    ],
    [
      'unavailable-record',
      {
        status: 'ready',
        entries: [entry],
        error: null,
        readingId: 'missing',
        filtered: false,
      },
    ],
    [
      'ready',
      {
        status: 'ready',
        entries: [entry],
        error: null,
        readingId: 'known',
        filtered: false,
      },
    ],
  ] as const)('derives exactly one exclusive %s state', (expected, input) => {
    const view = deriveFolioView(input)

    expect(view.status).toBe(expected)
    expect(
      [
        'loading',
        'empty',
        'error',
        'denied',
        'unavailable-record',
        'ready',
      ].filter((status) => status === view.status),
    ).toHaveLength(1)
  })

  it('names a filtered empty lens without competing with an error', () => {
    const view = deriveFolioView({
      status: 'ready',
      entries: [],
      error: null,
      readingId: null,
      filtered: true,
    })

    expect(view).toMatchObject({
      status: 'empty',
      filtered: true,
    })
  })
})
