import { describe, expect, it } from 'vitest'
import {
  KARANA_LEXICON,
  NAKSHATRA_LEXICON,
  TITHI_LEXICON,
  TRANSIT_LEXICON,
  VARA_LEXICON,
  YOGA_LEXICON,
} from '../daily/lexicon'
import { UI_COPY } from '../../content/uiCopy'

const PROHIBITED = [
  'journey',
  'path',
  'paths',
  'ascend',
  'frequency',
  'resonance',
  'healing',
  'abundance',
  'vibration',
  'energy',
  'manifesting',
  'authentic self',
  'higher self',
  'optimization',
  'hacks',
  'productivity',
  'tribe',
  'community',
] as const

const FOLIO_SYNONYMS = ['archive', 'library'] as const

describe('reader-facing vocabulary', () => {
  it('keeps the authored daily lexicon outside the prohibited register', () => {
    const copy = JSON.stringify({
      vara: VARA_LEXICON,
      tithi: TITHI_LEXICON,
      nakshatra: NAKSHATRA_LEXICON,
      yoga: YOGA_LEXICON,
      karana: KARANA_LEXICON,
      transit: TRANSIT_LEXICON,
    }).toLowerCase()
    const hits = PROHIBITED.filter((word) => new RegExp(`\\b${word.replace(' ', '\\s+')}\\b`, 'i').test(copy))
    expect(hits).toEqual([])
  })

  it('keeps centralized interface copy in the grounded instrument register', () => {
    const copy = JSON.stringify(UI_COPY).toLowerCase()
    const hits = PROHIBITED.filter((word) =>
      new RegExp(`\\b${word.replace(' ', '\\s+')}\\b`, 'i').test(copy),
    )
    expect(hits).toEqual([])
    expect(
      FOLIO_SYNONYMS.filter((word) => new RegExp(`\\b${word}\\b`, 'i').test(copy)),
    ).toEqual([])
  })
})
