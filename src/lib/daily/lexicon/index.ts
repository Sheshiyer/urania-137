import { DailyLexicon, KaranaEntry, NakshatraEntry, TithiEntry, TransitEntry, VaraEntry, YogaEntry } from './schema'
import { VARA_LEXICON } from './vara'
import { TITHI_LEXICON } from './tithi'
import { NAKSHATRA_LEXICON } from './nakshatra'
import { YOGA_LEXICON } from './yoga'
import { KARANA_LEXICON } from './karana'
import { TRANSIT_LEXICON } from './transit'

/**
 * The lexicon barrel (T-036) — the ONLY way pass-builders reach the tables.
 * Base lookups are exhaustive: a missing key throws (a loud failure), never a
 * silent `undefined` reaching the reading. `transit` may return undefined when
 * no keynote is authored for a transiting planet (the pass-builder handles it).
 */
function must<T>(v: T | undefined, what: string): T {
  if (v === undefined) throw new Error(`daily lexicon: no entry for ${what}`)
  return v
}

export const lexicon: DailyLexicon = {
  vara: (i) => must<VaraEntry>(VARA_LEXICON[i], `vara index ${i}`),
  tithi: (i) => must<TithiEntry>(TITHI_LEXICON[i], `tithi index ${i}`),
  nakshatra: (i) => must<NakshatraEntry>(NAKSHATRA_LEXICON[i], `nakshatra index ${i}`),
  yoga: (i) => must<YogaEntry>(YOGA_LEXICON[i], `yoga index ${i}`),
  karana: (n) => must<KaranaEntry>(KARANA_LEXICON[n], `karana ${n}`),
  transit: (p): TransitEntry | undefined => TRANSIT_LEXICON[p],
}

export { VARA_LEXICON, TITHI_LEXICON, NAKSHATRA_LEXICON, YOGA_LEXICON, KARANA_LEXICON, TRANSIT_LEXICON }
