import { YogaEntry } from './schema'

/**
 * The Yoga lexicon (T-009, Phase 1 Wave B).
 *
 * Keyed by the engine's stable yoga_index 0..26 — the 27 nitya ("daily") yogas,
 * each formed by the combined longitudes of Sun and Moon. `quality` names the
 * traditional Vedic ascription (auspicious / inauspicious / mixed); the nine
 * classically inauspicious yogas are Vishkambha (opening portion only), Atiganda,
 * Shula, Ganda, Vyaghata, Vajra, Vyatipata, Parigha, and Vaidhriti — with
 * Vyatipata and Vaidhriti held the most severe. `keynote` and `invitation`
 * obey the selemene-core witnessing law: present-tense felt tone, and pure
 * observation — never instruction, prediction, or advice.
 *
 * Covers every key in YOGA_DOMAIN. No gaps, no placeholders.
 */
export const YOGA_LEXICON: Record<number, YogaEntry> = {
  0: {
    quality:
      'Traditionally counted among the inauspicious yogas, though its defect is held to rest only in its opening portion; the name means "support" or "prop," a beam set against the weight of the day.',
    keynote: 'A steadying prop leans in, bearing weight the day would otherwise carry alone.',
    invitation: 'You might notice where something quietly holds you up before the hours have fully begun.',
  },
  1: {
    quality:
      'An auspicious yoga; the name means "love" and "delight," traditionally ascribed a tone of affection, ease, and warmth between things.',
    keynote: 'Fondness warms the edges of the ordinary.',
    invitation: 'There may be a softening toward the people and small things around you.',
  },
  2: {
    quality:
      'An auspicious yoga; the name means "long-lived," traditionally ascribed vitality, endurance, and the slow strength of health.',
    keynote: 'A long, unhurried vitality breathes through the hours.',
    invitation: 'You might notice a steadiness in your energy that asks for nothing quick.',
  },
  3: {
    quality:
      'An auspicious yoga; the name means "good fortune" and "felicity," traditionally ascribed wellbeing, grace, and a sense of being favored.',
    keynote: 'A gentle good fortune settles over things like light.',
    invitation: 'There may be a sense of ease arriving without your having reached for it.',
  },
  4: {
    quality:
      'An auspicious yoga; the name means "splendid" and "beautiful," traditionally ascribed radiance, brightness, and outward splendor.',
    keynote: 'A quiet brilliance polishes the surface of the day.',
    invitation: 'You might notice beauty catching your eye where you did not expect it.',
  },
  5: {
    quality:
      'An inauspicious yoga; the name means "great danger" or "great knot," traditionally ascribed obstruction, friction, and hazard.',
    keynote: 'A tightened knot sits somewhere in the grain of the day.',
    invitation: "There may be a snag or two in the day's grain, meeting more resistance than usual.",
  },
  6: {
    quality:
      'An auspicious yoga; the name means "good deeds" and "meritorious action," traditionally ascribed virtue, right effort, and fruitful work.',
    keynote: 'Well-made effort finds its rhythm and holds it.',
    invitation: 'You might notice satisfaction gathering around work done with care.',
  },
  7: {
    quality:
      'An auspicious yoga; the name means "steadiness" and "contentment," traditionally ascribed constancy, patience, and inner firmness.',
    keynote: 'A patient steadiness holds without gripping.',
    invitation: 'Something in you may feel content to stay where it is.',
  },
  8: {
    quality:
      'An inauspicious yoga; the name means "spear" or "thorn," traditionally ascribed sharpness, friction, and the risk of pain.',
    keynote: 'A sharp edge runs somewhere beneath the surface.',
    invitation: 'There may be a prickliness in things, a sharper edge than the hour seems to warrant.',
  },
  9: {
    quality:
      'An inauspicious yoga; the name means "danger" or "knot," traditionally ascribed obstruction and tender, vulnerable places.',
    keynote: 'A tender knot resists being pulled loose.',
    invitation: 'You might notice where things catch and hold, slow to come loose.',
  },
  10: {
    quality:
      'An auspicious yoga; the name means "growth" and "increase," traditionally ascribed expansion, prosperity, and things ripening.',
    keynote: 'Something quietly grows toward more of itself.',
    invitation: 'There may be a sense of increase in what you have been tending.',
  },
  11: {
    quality:
      'An auspicious yoga; the name means "fixed" and "immovable," the pole star, traditionally ascribed permanence, stability, and constancy.',
    keynote: 'A fixed point holds still while everything turns around it.',
    invitation: 'You might notice one thing that stays constant amid the movement.',
  },
  12: {
    quality:
      'An inauspicious yoga; the name means "a blow" or "striking against," traditionally ascribed collision, obstruction, and crosscurrents.',
    keynote: "Cross-purposes knock against one another in the day's grain.",
    invitation: 'There may be a sense of pushing against something that pushes back.',
  },
  13: {
    quality:
      'An auspicious yoga; the name means "thrilling" and "causing joy," traditionally ascribed delight, exhilaration, and rising spirits.',
    keynote: 'A bright thrill lifts under the ordinary hours.',
    invitation: 'Something in you may quicken with an unbidden gladness.',
  },
  14: {
    quality:
      'An inauspicious yoga; the name means "thunderbolt" and "diamond," traditionally ascribed a hard, sudden, adamantine force.',
    keynote: 'A hard, bright force sits coiled beneath the surface.',
    invitation: 'There may be an abruptness in how things arrive, quicker and harder than expected.',
  },
  15: {
    quality:
      'An auspicious yoga; the name means "accomplishment" and "attainment," traditionally ascribed success, fulfillment, and things coming to completion.',
    keynote: 'A sense of arrival gathers around what has been underway.',
    invitation: 'You might notice something quietly reaching its completion.',
  },
  16: {
    quality:
      'A highly inauspicious yoga, among the most severe; the name means "great calamity" or "downfall," traditionally ascribed rupture and reversal.',
    keynote: 'An unsettled undertow runs beneath the level surface.',
    invitation: 'There may be a wobble in things that usually hold steady.',
  },
  17: {
    quality:
      'An auspicious yoga; the name means "comfort" and "the most excellent," traditionally ascribed ease, luxury, and unhurried wellbeing.',
    keynote: 'A spacious ease loosens the shoulders of the day.',
    invitation: 'You might notice a wish to move slowly and rest in what is comfortable.',
  },
  18: {
    quality:
      'An inauspicious yoga; the name means "an iron bar that bars a gate," traditionally ascribed obstruction, barriers, and blocked passage.',
    keynote: "A barred gate stands somewhere across the day's path.",
    invitation: 'There may be a threshold that does not yet open, however it is approached.',
  },
  19: {
    quality:
      'An auspicious yoga; the name means "auspicious" and "benevolent," traditionally ascribed grace, blessing, and quiet benevolence.',
    keynote: 'A benevolent stillness rests over things.',
    invitation: 'Something in you may soften toward a deeper quiet.',
  },
  20: {
    quality:
      'An auspicious yoga; the name means "accomplished" and "perfected," traditionally ascribed adeptness, readiness, and mature skill.',
    keynote: 'A practiced ease moves through what once took effort.',
    invitation: 'You might notice how readily something falls into place.',
  },
  21: {
    quality:
      'An auspicious yoga; the name means "achievable" and "that which can be accomplished," traditionally ascribed workability and things yielding to steady effort.',
    keynote: 'What is set out feels within reach of steady hands.',
    invitation: 'There may be a sense that the work in front of you is willing to be done.',
  },
  22: {
    quality:
      'An auspicious yoga; the name means "auspicious" and "blessed," traditionally ascribed goodness, beauty, and benediction.',
    keynote: 'A simple goodness lights the plainness of things.',
    invitation: 'You might notice a blessing hidden in something unremarkable.',
  },
  23: {
    quality:
      'An auspicious yoga; the name means "white," "bright," and "pure," traditionally ascribed clarity, purity, and luminous simplicity.',
    keynote: 'A clear, white light rests over the surface of the day.',
    invitation: 'There may be a clarity that asks for nothing to be added.',
  },
  24: {
    quality:
      'An auspicious yoga; the name evokes the creative and the sacred, traditionally ascribed expansiveness, blessing, and generative power.',
    keynote: 'A wide, creative openness breathes beneath the hours.',
    invitation: 'Something in you may feel room to begin.',
  },
  25: {
    quality:
      'An auspicious yoga; the name means "chief" and "king of the gods," traditionally ascribed leadership, sovereignty, and abundant power.',
    keynote: 'A confident, sovereign force stands upright in the day.',
    invitation: 'You might notice a readiness to take your place at the center.',
  },
  26: {
    quality:
      'A highly inauspicious yoga, paired with Vyatipata as among the most severe; the name means "holding apart" or "poor support," traditionally ascribed disjunction and dissolution.',
    keynote: 'A pulling-apart works quietly at the seams of things.',
    invitation: 'There may be a looseness where things usually hold together.',
  },
}
