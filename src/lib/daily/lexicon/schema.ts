import { Paksha, TithiCategory, KaranaType } from './domains'

/**
 * The six lexicon entry schemas (T-009). Every limb carries a `keynote` and an
 * `invitation` — the invitation is phrased as an observation ("you might notice…"),
 * never an imperative, so the non-prescriptive voice cannot drift (it lives in the
 * data, not in free-form generation). Authoring lands in Phase 1 Wave B.
 *
 * Enum key-domains + counts live in ./domains (ground-truth from the live engine).
 */
export interface LexiconVoice {
  keynote: string
  invitation: string
}

export interface VaraEntry extends LexiconVoice {
  ruler: string
  field: string
}

export interface TithiEntry extends LexiconVoice {
  name: string
  paksha: Paksha
  category: TithiCategory
  deity: string
  motion: string
}

export interface NakshatraEntry extends LexiconVoice {
  ruler: string
  deity: string
  symbol: string
  guna: string
}

export interface YogaEntry extends LexiconVoice {
  quality: string
}

export interface KaranaEntry extends LexiconVoice {
  type: KaranaType
}

export type TransitEntry = LexiconVoice

/**
 * The lexicon barrel contract — consumed by the interpreter's pass-builders.
 * Wave B authors the six tables and the barrel that implements this; Wave A
 * tests inject a stub. Base lookups are exhaustive (an unknown key throws, never
 * silently returns undefined — G3 guarantees coverage). `transit` may legitimately
 * return undefined when no keynote is authored for a transiting planet.
 */
export interface DailyLexicon {
  vara(index: number): VaraEntry
  tithi(index: number): TithiEntry
  nakshatra(index: number): NakshatraEntry
  yoga(index: number): YogaEntry
  karana(name: string): KaranaEntry
  transit(transitingPlanet: string): TransitEntry | undefined
}

export * from './domains'
