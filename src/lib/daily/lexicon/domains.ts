/**
 * Frozen enum key-domains for the daily panchanga reading (T-009).
 *
 * GROUND TRUTH: every value here was captured live from the Selemene panchanga
 * engine (via the prod proxy) on 2026-07-19 — a 32-day noon sweep + a finer
 * new-moon-window sweep. NOT inferred. See docs/daily/engine-schema-notes.md.
 *
 * Keying: vara/tithi/nakshatra/yoga are keyed by the engine's stable *_index;
 * karana has no stable identity index in the response, so it is keyed by name.
 * The lexicon (Phase 1 Wave B) must cover every entry here — asserted by G3.
 */

export type Paksha = 'shukla' | 'krishna'
export type TithiCategory = 'Nanda' | 'Bhadra' | 'Jaya' | 'Rikta' | 'Purna'
export type KaranaType = 'movable' | 'fixed'

export interface VaraKey { index: number; name: string }
export interface TithiKey { index: number; name: string; paksha: Paksha; category: TithiCategory }
export interface NakshatraKey { index: number; name: string }
export interface YogaKey { index: number; name: string }
export interface KaranaKey { name: string; type: KaranaType }

export const VARA_DOMAIN: readonly VaraKey[] = [
  { index: 0, name: 'Ravivara (Sunday)' },
  { index: 1, name: 'Somavara (Monday)' },
  { index: 2, name: 'Mangalavara (Tuesday)' },
  { index: 3, name: 'Budhavara (Wednesday)' },
  { index: 4, name: 'Guruvara (Thursday)' },
  { index: 5, name: 'Shukravara (Friday)' },
  { index: 6, name: 'Shanivara (Saturday)' },
]

export const TITHI_DOMAIN: readonly TithiKey[] = [
  { index: 0, name: 'Pratipada (Shukla)', paksha: 'shukla', category: 'Nanda' },
  { index: 1, name: 'Dwitiya (Shukla)', paksha: 'shukla', category: 'Bhadra' },
  { index: 2, name: 'Tritiya (Shukla)', paksha: 'shukla', category: 'Jaya' },
  { index: 3, name: 'Chaturthi (Shukla)', paksha: 'shukla', category: 'Rikta' },
  { index: 4, name: 'Panchami (Shukla)', paksha: 'shukla', category: 'Purna' },
  { index: 5, name: 'Shashthi (Shukla)', paksha: 'shukla', category: 'Nanda' },
  { index: 6, name: 'Saptami (Shukla)', paksha: 'shukla', category: 'Bhadra' },
  { index: 7, name: 'Ashtami (Shukla)', paksha: 'shukla', category: 'Jaya' },
  { index: 8, name: 'Navami (Shukla)', paksha: 'shukla', category: 'Rikta' },
  { index: 9, name: 'Dashami (Shukla)', paksha: 'shukla', category: 'Purna' },
  { index: 10, name: 'Ekadashi (Shukla)', paksha: 'shukla', category: 'Nanda' },
  { index: 11, name: 'Dwadashi (Shukla)', paksha: 'shukla', category: 'Bhadra' },
  { index: 12, name: 'Trayodashi (Shukla)', paksha: 'shukla', category: 'Jaya' },
  { index: 13, name: 'Chaturdashi (Shukla)', paksha: 'shukla', category: 'Rikta' },
  { index: 14, name: 'Purnima', paksha: 'shukla', category: 'Purna' },
  { index: 15, name: 'Pratipada (Krishna)', paksha: 'krishna', category: 'Nanda' },
  { index: 16, name: 'Dwitiya (Krishna)', paksha: 'krishna', category: 'Bhadra' },
  { index: 17, name: 'Tritiya (Krishna)', paksha: 'krishna', category: 'Jaya' },
  { index: 18, name: 'Chaturthi (Krishna)', paksha: 'krishna', category: 'Rikta' },
  { index: 19, name: 'Panchami (Krishna)', paksha: 'krishna', category: 'Purna' },
  { index: 20, name: 'Shashthi (Krishna)', paksha: 'krishna', category: 'Nanda' },
  { index: 21, name: 'Saptami (Krishna)', paksha: 'krishna', category: 'Bhadra' },
  { index: 22, name: 'Ashtami (Krishna)', paksha: 'krishna', category: 'Jaya' },
  { index: 23, name: 'Navami (Krishna)', paksha: 'krishna', category: 'Rikta' },
  { index: 24, name: 'Dashami (Krishna)', paksha: 'krishna', category: 'Purna' },
  { index: 25, name: 'Ekadashi (Krishna)', paksha: 'krishna', category: 'Nanda' },
  { index: 26, name: 'Dwadashi (Krishna)', paksha: 'krishna', category: 'Bhadra' },
  { index: 27, name: 'Trayodashi (Krishna)', paksha: 'krishna', category: 'Jaya' },
  { index: 28, name: 'Chaturdashi (Krishna)', paksha: 'krishna', category: 'Rikta' },
  { index: 29, name: 'Amavasya', paksha: 'krishna', category: 'Purna' },
]

export const NAKSHATRA_DOMAIN: readonly NakshatraKey[] = [
  { index: 0, name: 'Ashwini' },
  { index: 1, name: 'Bharani' },
  { index: 2, name: 'Krittika' },
  { index: 3, name: 'Rohini' },
  { index: 4, name: 'Mrigashira' },
  { index: 5, name: 'Ardra' },
  { index: 6, name: 'Punarvasu' },
  { index: 7, name: 'Pushya' },
  { index: 8, name: 'Ashlesha' },
  { index: 9, name: 'Magha' },
  { index: 10, name: 'Purva Phalguni' },
  { index: 11, name: 'Uttara Phalguni' },
  { index: 12, name: 'Hasta' },
  { index: 13, name: 'Chitra' },
  { index: 14, name: 'Swati' },
  { index: 15, name: 'Vishakha' },
  { index: 16, name: 'Anuradha' },
  { index: 17, name: 'Jyeshtha' },
  { index: 18, name: 'Mula' },
  { index: 19, name: 'Purva Ashadha' },
  { index: 20, name: 'Uttara Ashadha' },
  { index: 21, name: 'Shravana' },
  { index: 22, name: 'Dhanishta' },
  { index: 23, name: 'Shatabhisha' },
  { index: 24, name: 'Purva Bhadrapada' },
  { index: 25, name: 'Uttara Bhadrapada' },
  { index: 26, name: 'Revati' },
]

export const YOGA_DOMAIN: readonly YogaKey[] = [
  { index: 0, name: 'Vishkambha' },
  { index: 1, name: 'Priti' },
  { index: 2, name: 'Ayushman' },
  { index: 3, name: 'Saubhagya' },
  { index: 4, name: 'Shobhana' },
  { index: 5, name: 'Atiganda' },
  { index: 6, name: 'Sukarma' },
  { index: 7, name: 'Dhriti' },
  { index: 8, name: 'Shula' },
  { index: 9, name: 'Ganda' },
  { index: 10, name: 'Vriddhi' },
  { index: 11, name: 'Dhruva' },
  { index: 12, name: 'Vyaghata' },
  { index: 13, name: 'Harshana' },
  { index: 14, name: 'Vajra' },
  { index: 15, name: 'Siddhi' },
  { index: 16, name: 'Vyatipata' },
  { index: 17, name: 'Variyan' },
  { index: 18, name: 'Parigha' },
  { index: 19, name: 'Shiva' },
  { index: 20, name: 'Siddha' },
  { index: 21, name: 'Sadhya' },
  { index: 22, name: 'Shubha' },
  { index: 23, name: 'Shukla' },
  { index: 24, name: 'Brahma' },
  { index: 25, name: 'Indra' },
  { index: 26, name: 'Vaidhriti' },
]

export const KARANA_DOMAIN: readonly KaranaKey[] = [
  { name: 'Balava', type: 'movable' },
  { name: 'Bava', type: 'movable' },
  { name: 'Chatushpada', type: 'fixed' },
  { name: 'Gara', type: 'movable' },
  { name: 'Kaulava', type: 'movable' },
  { name: 'Kimstughna', type: 'fixed' },
  { name: 'Naga', type: 'fixed' },
  { name: 'Shakuni', type: 'fixed' },
  { name: 'Taitila', type: 'movable' },
  { name: 'Vanija', type: 'movable' },
  { name: 'Vishti', type: 'movable' },
]

/** Exact counts the lexicon-completeness gate (G3) asserts. */
export const DOMAIN_COUNTS = { vara: 7, tithi: 30, nakshatra: 27, yoga: 27, karana: 11 } as const

/** All key-domain values flattened, for exhaustive coverage checks. */
export function expectedKeys() {
  return {
    vara: VARA_DOMAIN.map((v) => v.index),
    tithi: TITHI_DOMAIN.map((t) => t.index),
    nakshatra: NAKSHATRA_DOMAIN.map((n) => n.index),
    yoga: YOGA_DOMAIN.map((y) => y.index),
    karana: KARANA_DOMAIN.map((k) => k.name),
  }
}
