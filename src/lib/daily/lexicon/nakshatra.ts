import { NakshatraEntry } from './schema'

/**
 * The nakshatra lexicon (T-009, Phase 1 Wave B). Keyed by the engine's stable
 * nakshatra_index 0..26 — every key in NAKSHATRA_DOMAIN is covered.
 *
 * `ruler` follows the Vimshottari lord cycle repeating three times across the
 * 27 asterisms: Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury.
 * `guna` carries the traditional gana (temperament) of each nakshatra.
 *
 * Voice law: `keynote` names the felt tone in one present-tense sentence;
 * `invitation` is a witnessing observation, never an instruction.
 */
export const NAKSHATRA_LEXICON: Record<number, NakshatraEntry> = {
  0: {
    ruler: 'Ketu',
    deity: 'Ashwini Kumaras',
    symbol: "A horse's head",
    guna: 'Deva (divine)',
    keynote: 'A swift, healing freshness gallops at the very start of things.',
    invitation:
      'You might notice a quickening urge to begin, and a readiness in you to mend what feels unwell.',
  },
  1: {
    ruler: 'Venus',
    deity: 'Yama',
    symbol: 'The yoni, vessel of bearing',
    guna: 'Manushya (human)',
    keynote: 'The tender labor of bearing and restraint gathers around thresholds of life and death.',
    invitation:
      'There may be a sense of holding something ripening, and of limits that ask to be honored.',
  },
  2: {
    ruler: 'Sun',
    deity: 'Agni',
    symbol: 'A razor, a blade of flame',
    guna: 'Rakshasa (fierce)',
    keynote: 'A cutting, purifying flame separates the true from the false.',
    invitation:
      'You might notice a sharpness that both burns and clarifies, and a wish in you to be refined.',
  },
  3: {
    ruler: 'Moon',
    deity: 'Brahma (Prajapati)',
    symbol: 'An ox-cart, a chariot of growth',
    guna: 'Manushya (human)',
    keynote: 'A fertile, growing sweetness invites the whole world to blossom.',
    invitation:
      'There may be an ache toward beauty and abundance, and a pull to help things flourish.',
  },
  4: {
    ruler: 'Mars',
    deity: 'Soma (Chandra)',
    symbol: "A deer's head",
    guna: 'Deva (divine)',
    keynote: 'A gentle, searching curiosity wanders in quest of something not yet found.',
    invitation:
      'You might notice a restless seeking, and a tenderness that keeps the searching soft.',
  },
  5: {
    ruler: 'Rahu',
    deity: 'Rudra',
    symbol: 'A teardrop, a gem of water',
    guna: 'Manushya (human)',
    keynote: "A storm's tearful intensity breaks things open toward renewal.",
    invitation:
      'There may be turbulence that clears the air, and grief that carries its own strange freshness.',
  },
  6: {
    ruler: 'Jupiter',
    deity: 'Aditi',
    symbol: 'A quiver of arrows',
    guna: 'Deva (divine)',
    keynote: 'A returning light restores what was scattered back to wholeness.',
    invitation:
      'You might notice a homing instinct, and a quiet trust that things can be renewed.',
  },
  7: {
    ruler: 'Saturn',
    deity: 'Brihaspati',
    symbol: "A cow's udder, a blossoming flower",
    guna: 'Deva (divine)',
    keynote: 'A nourishing, sheltering steadiness feeds and protects whatever it holds.',
    invitation:
      'There may be a settling warmth, and a sense of being cared for or of wishing to care.',
  },
  8: {
    ruler: 'Mercury',
    deity: 'The Nagas (serpents)',
    symbol: 'A coiled serpent',
    guna: 'Rakshasa (fierce)',
    keynote: 'A coiled, penetrating intelligence embraces and entwines.',
    invitation:
      'You might notice a magnetic pull inward, and undercurrents that move beneath the surface.',
  },
  9: {
    ruler: 'Ketu',
    deity: 'The Pitris (ancestors)',
    symbol: 'A royal throne',
    guna: 'Rakshasa (fierce)',
    keynote: 'An ancestral dignity seats itself upon inherited ground.',
    invitation:
      'There may be a weight of lineage, and a stirring of pride that reaches back through time.',
  },
  10: {
    ruler: 'Venus',
    deity: 'Bhaga',
    symbol: 'The front legs of a bed',
    guna: 'Manushya (human)',
    keynote: 'A relaxed, pleasure-loving warmth savors rest and delight.',
    invitation:
      'You might notice a leaning toward ease and enjoyment, and a wish for gentle company.',
  },
  11: {
    ruler: 'Sun',
    deity: 'Aryaman',
    symbol: 'The back legs of a bed',
    guna: 'Manushya (human)',
    keynote: 'A generous, faithful steadiness pledges itself to lasting bonds.',
    invitation:
      'There may be a readiness to give and to keep promises, and a warmth toward friendship.',
  },
  12: {
    ruler: 'Moon',
    deity: 'Savitar (Surya)',
    symbol: 'An open hand',
    guna: 'Deva (divine)',
    keynote: 'A skillful, dexterous handedness shapes the day with deft touch.',
    invitation:
      'You might notice a wish to work with your hands, and a delight in craft done well.',
  },
  13: {
    ruler: 'Mars',
    deity: 'Tvashtar (Vishvakarma)',
    symbol: 'A bright jewel, a shining pearl',
    guna: 'Rakshasa (fierce)',
    keynote: 'A brilliant, artful radiance fashions raw form into beauty.',
    invitation:
      'There may be an eye drawn to design and glamour, and a pull to make something dazzle.',
  },
  14: {
    ruler: 'Rahu',
    deity: 'Vayu',
    symbol: 'A young sprout swaying in the wind',
    guna: 'Deva (divine)',
    keynote: 'An independent, wind-blown flexibility bends without breaking.',
    invitation:
      'You might notice a longing for freedom, and a sway in you that seeks its own balance.',
  },
  15: {
    ruler: 'Jupiter',
    deity: 'Indra-Agni',
    symbol: 'A triumphal arch',
    guna: 'Rakshasa (fierce)',
    keynote: 'A determined, goal-fixed fire presses toward its chosen aim.',
    invitation:
      'There may be a concentrated drive, and a patience that waits for the fruit to ripen.',
  },
  16: {
    ruler: 'Saturn',
    deity: 'Mitra',
    symbol: 'A lotus in bloom',
    guna: 'Deva (divine)',
    keynote: 'A devoted, friendly steadiness draws hearts into fellowship.',
    invitation:
      'You might notice a warmth toward companionship, and a devotion that endures hardship.',
  },
  17: {
    ruler: 'Mercury',
    deity: 'Indra',
    symbol: 'A circular amulet, a protective umbrella',
    guna: 'Rakshasa (fierce)',
    keynote: "A seasoned, protective authority stands at the elder's post.",
    invitation:
      'There may be a sense of responsibility being carried, and a courage tested by its burdens.',
  },
  18: {
    ruler: 'Ketu',
    deity: 'Nirriti',
    symbol: 'A bunch of tied roots',
    guna: 'Rakshasa (fierce)',
    keynote: 'A root-seeking intensity digs down to where things begin and end.',
    invitation:
      'You might notice a pull to get to the bottom of things, and a willingness to let go.',
  },
  19: {
    ruler: 'Venus',
    deity: 'Apas (the waters)',
    symbol: "An elephant's tusk, a winnowing fan",
    guna: 'Manushya (human)',
    keynote: 'An invigorating, unsubdued momentum rises like a swelling tide.',
    invitation:
      'There may be a surge of conviction, and a buoyancy that carries you forward.',
  },
  20: {
    ruler: 'Sun',
    deity: 'The Vishvedevas',
    symbol: "An elephant's tusk, a small planked bed",
    guna: 'Manushya (human)',
    keynote: 'An enduring, principled resolve holds firm toward a lasting victory.',
    invitation:
      'You might notice a steadiness of purpose, and a wish to see things through to the end.',
  },
  21: {
    ruler: 'Moon',
    deity: 'Vishnu',
    symbol: 'An ear, three ascending footprints',
    guna: 'Deva (divine)',
    keynote: 'An attentive, listening stillness gathers wisdom through the ear.',
    invitation:
      'There may be a receptive quiet, and a sense that much is learned by listening closely.',
  },
  22: {
    ruler: 'Mars',
    deity: 'The Vasus',
    symbol: 'A drum, a flute',
    guna: 'Rakshasa (fierce)',
    keynote: 'A rhythmic, prosperous vitality beats out its own music.',
    invitation:
      'You might notice a pulse of energy and abundance, and a wish to move in rhythm.',
  },
  23: {
    ruler: 'Rahu',
    deity: 'Varuna',
    symbol: 'An empty circle, a hundred healers',
    guna: 'Rakshasa (fierce)',
    keynote: 'A veiling, healing solitude circles round a hidden mystery.',
    invitation:
      'There may be a draw toward secrecy and remedy, and a spaciousness that heals in private.',
  },
  24: {
    ruler: 'Jupiter',
    deity: 'Aja Ekapada',
    symbol: 'A sword, the front legs of a funeral cot',
    guna: 'Manushya (human)',
    keynote: 'A fervent, two-sided fire burns toward radical transformation.',
    invitation:
      'You might notice an intensity that reaches past the ordinary, and a spark of the visionary.',
  },
  25: {
    ruler: 'Saturn',
    deity: 'Ahir Budhnya',
    symbol: 'The serpent of the deep, the back legs of a cot',
    guna: 'Manushya (human)',
    keynote: 'A deep, still profundity rests in the serpent-quiet depths.',
    invitation:
      'There may be a settling into depth, and a calm that steadies whatever churns beneath.',
  },
  26: {
    ruler: 'Mercury',
    deity: 'Pushan',
    symbol: 'A fish, a drum',
    guna: 'Deva (divine)',
    keynote: 'A nourishing, guiding tenderness shepherds travelers safely across.',
    invitation:
      'You might notice a caring for what is fragile, and a wish to see others safely home.',
  },
}
