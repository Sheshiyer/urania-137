import { TransitEntry } from './schema'

/**
 * The transit overlay lexicon (Phase 1 Wave B) — the lean first-cut of spec §11 Q3.
 *
 * Keyed by the TRANSITING PLANET NAME (the engine's exact spelling). Covers every
 * distinct `result.aspects[].transiting_planet` seen live in
 * __fixtures__/transits.natal-19900515.blr.json — Sun, Moon, Mercury, Venus, Mars,
 * Jupiter, Saturn, Rahu, Ketu, Neptune, Pluto — PLUS Uranus (present natally in that
 * fixture, standard in the engine's transit set), completing the classical + outer
 * dozen. The pass-builder templates the natal planet and the aspect around this
 * keynote; here we name only the felt quality of each graha's transit and offer a
 * witnessing invitation.
 *
 * Voice law (selemene-core): keynote = one evocative present-tense sentence naming the
 * tone of that transit; invitation = pure observation ("you might notice…", "there may
 * be…"), never instruction, prediction, or guarantee.
 */
export const TRANSIT_LEXICON: Record<string, TransitEntry> = {
  Sun: {
    keynote:
      'The Sun’s transit warms the day with a quiet pull toward visibility, vitality, and the felt center of who you are.',
    invitation:
      'You might notice where warmth wants to radiate outward, and where the self quietly asks to be seen.',
  },
  Moon: {
    keynote:
      'The Moon’s transit moves like weather through the inner rooms, coloring the day with shifting feeling and tender receptivity.',
    invitation:
      'There may be a tide in the mood today that rises and recedes without needing a reason.',
  },
  Mercury: {
    keynote:
      'Mercury’s transit quickens the mind, threading thought, word, and small exchanges into a lively current.',
    invitation:
      'You might notice how readily thoughts want to move into speech, and where a pause lets the meaning settle.',
  },
  Venus: {
    keynote:
      'Venus’s transit softens the day toward beauty, sweetness, and the gentle gravity of connection.',
    invitation:
      'There may be a pull toward what feels harmonious, and a quiet noticing of what you find lovely.',
  },
  Mars: {
    keynote:
      'Mars’s transit brings heat to the blood, a forward-leaning drive that wants motion and edge.',
    invitation:
      'You might notice where energy gathers into impulse, and how the body signals its readiness to act.',
  },
  Jupiter: {
    keynote:
      'Jupiter’s transit opens a spacious, generous mood, inclining the day toward faith, meaning, and expansion.',
    invitation:
      'There may be a felt sense of room to grow, and a quiet trust that something larger holds the frame.',
  },
  Saturn: {
    keynote:
      'Saturn’s transit slows and steadies the day, pressing toward structure, patience, and the weight of what is real.',
    invitation:
      'You might notice where the day asks for endurance, and how limits can carry their own strange clarity.',
  },
  Rahu: {
    keynote:
      'Rahu’s transit amplifies desire and draws the attention toward the unfamiliar and the not-yet-had.',
    invitation:
      'There may be a hunger that magnifies whatever it touches, and a pull toward edges you have not yet crossed.',
  },
  Ketu: {
    keynote:
      'Ketu’s transit thins the veil toward detachment, dissolving grip and turning the gaze inward.',
    invitation:
      'You might notice what quietly loosens its hold, and where letting go feels less like loss than release.',
  },
  Uranus: {
    keynote:
      'Uranus’s transit carries a current of awakening, restless with the electric possibility of the unexpected.',
    invitation:
      'There may be a flicker of the unforeseen, and something in you that leans toward freedom and the new.',
  },
  Neptune: {
    keynote:
      'Neptune’s transit softens the edges of the day into mist, imagination, and a longing that reaches past the visible.',
    invitation:
      'You might notice where boundaries blur, and how the imagination drifts toward what cannot quite be named.',
  },
  Pluto: {
    keynote:
      'Pluto’s transit moves in the depths, an undertow of intensity that touches what lies beneath the surface.',
    invitation:
      'There may be a pressure from below that asks to transform, and something in you that senses its own buried power.',
  },
}
