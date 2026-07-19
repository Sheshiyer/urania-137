import { KaranaEntry } from './schema'

/**
 * The karana lexicon (T-009, Phase 1 Wave B).
 *
 * A karana is a half-tithi — the finest lunar limb, governing the *quality of
 * action* carried by the moment. Eleven karanas fill the sixty half-tithis of a
 * lunar month: seven *movable* (chara) karanas that recur eight times each as the
 * working rhythms of the cycle, and four *fixed* (sthira) karanas that occur only
 * once, clustered at the dark of the moon and the turn of the month — rare
 * threshold energies.
 *
 * Keyed by the exact karana name in KARANA_DOMAIN. `type` matches the domain
 * (note: Vishti/Bhadra is classed movable here, per the engine's ground truth).
 * Voice is witnessing: keynote names the felt tone; invitation is an observation,
 * never an instruction.
 */
export const KARANA_LEXICON: Record<string, KaranaEntry> = {
  Balava: {
    type: 'movable',
    keynote: 'A youthful, Brahma-blessed strength moves through the hours, buoyant and devotional.',
    invitation: 'There may be an upwelling of energy that leans toward the sacred and the freshly made.',
  },
  Bava: {
    type: 'movable',
    keynote: 'The first working rhythm opens like a clear current under Vishnu, favoring what is meant to last.',
    invitation: 'You might notice a quiet readiness stirring for something that could endure.',
  },
  Chatushpada: {
    type: 'fixed',
    keynote: 'A grave, four-footed steadiness enters, the fixed tone of ancestry and offering.',
    invitation: 'You might notice a reverent weight settling, a turning toward what has been inherited.',
  },
  Gara: {
    type: 'movable',
    keynote: 'The hours turn earthward and patient under Prithvi, the mood of sowing and tending.',
    invitation: 'There may be a slow, grounded quality in the moment that seems to ask for cultivation.',
  },
  Kaulava: {
    type: 'movable',
    keynote: 'Warmth toward others colors the moment under Mitra, the tone of kinship and alliance.',
    invitation: 'You might notice how easily connection and companionship arise just now.',
  },
  Kimstughna: {
    type: 'fixed',
    keynote: 'A clean, wind-swept auspiciousness dawns, the threshold karana of fresh foundations.',
    invitation: 'You might notice a quiet clearing, as though a slate had been wiped for beginning.',
  },
  Naga: {
    type: 'fixed',
    keynote: 'A coiled, serpentine potency lingers, ancient and slow to uncoil.',
    invitation: 'There may be a sense of something primal and patient moving beneath the surface.',
  },
  Shakuni: {
    type: 'fixed',
    keynote: 'An omened, watchful stillness holds, keen to the subtle and the hidden.',
    invitation: 'There may be a heightened sensitivity to signs and the unseen currents of things.',
  },
  Taitila: {
    type: 'movable',
    keynote: 'A steady, golden competence settles in under Aryaman, favoring exchange and standing.',
    invitation: 'There may be a felt pull toward matters of prosperity, repute, and fair dealing.',
  },
  Vanija: {
    type: 'movable',
    keynote: "A merchant's alertness sharpens the air, attuned to trade and fair measure.",
    invitation: 'You might notice a keenness for weighing, bargaining, and the give-and-take of exchange.',
  },
  Vishti: {
    type: 'movable',
    keynote: 'A charged, obstructive intensity gathers under Yama, the karana of friction and hard edges.',
    invitation: 'You might notice resistance where things had moved freely, a roughness in the grain of the hour.',
  },
}
