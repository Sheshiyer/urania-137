import { VaraEntry } from './schema'

/**
 * The Vara (weekday) lexicon — one entry per vara index 0..6 (see VARA_DOMAIN).
 *
 * Each weekday carries its traditional Vedic planetary lord (the graha whose hora
 * opens the day): Ravivara→Sun, Somavara→Moon, Mangalavara→Mars, Budhavara→Mercury,
 * Guruvara→Jupiter, Shukravara→Venus, Shanivara→Saturn. The `field` names the day's
 * classical domain of life; `keynote` names its felt tone; `invitation` witnesses
 * (never instructs) what a person might notice under that ruler.
 */
export const VARA_LEXICON: Record<number, VaraEntry> = {
  0: {
    ruler: 'the Sun',
    field: 'selfhood, vitality, and the radiant center',
    keynote: 'The day burns with the steady radiance of the self, and the soul warms toward its own centre.',
    invitation: 'You might notice a quiet pull toward whatever feels most essential and true in you.',
  },
  1: {
    ruler: 'the Moon',
    field: 'feeling, memory, and inner care',
    keynote: 'A soft lunar tide moves through the feelings, and the mind reflects like still water.',
    invitation: 'There may be a tenderness in you that asks only to be felt rather than fixed.',
  },
  2: {
    ruler: 'Mars',
    field: 'drive, courage, and decisive effort',
    keynote: 'An edge of heat sharpens the will, and energy gathers toward action.',
    invitation: 'You might notice where courage rises in you, and where friction rises to meet it.',
  },
  3: {
    ruler: 'Mercury',
    field: 'mind, communication, and exchange',
    keynote: 'Quick mercurial currents run through thought, speech, and the crossing of ideas.',
    invitation: 'Something in you may delight in the play of words and the exchange of small connections.',
  },
  4: {
    ruler: 'Jupiter',
    field: 'wisdom, meaning, and expansion',
    keynote: 'A wide, benevolent spaciousness opens, inclining the day toward meaning and growth.',
    invitation: 'There may be a sense of the day widening toward what teaches and nourishes you.',
  },
  5: {
    ruler: 'Venus',
    field: 'beauty, love, and shared delight',
    keynote: 'A gentle sweetness settles over beauty, affection, and the pleasures that are shared.',
    invitation: 'You might notice how the heart leans toward harmony and the company of what it loves.',
  },
  6: {
    ruler: 'Saturn',
    field: 'discipline, endurance, and structure',
    keynote: 'A slow, weighted gravity settles in, asking for patience, endurance, and honest labour.',
    invitation: 'There may be a steadiness in you that meets its limits without hurry.',
  },
}
