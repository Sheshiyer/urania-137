/** Urania skin for the Golden Portal Motionsites template. */

export const WITNESS_PROMPT =
  'What pattern keeps returning, and what concrete signal would show that it no longer applies?'

export const NAV = [
  { href: '#instrument', label: 'Instrument' },
  { href: '#lenses', label: 'Lenses' },
  { href: '#principles', label: 'Principles' },
  { href: '#invitation', label: 'Invitation' },
] as const

export const HERO = {
  kicker: 'Tryambakam Noesis',
  subkicker: 'Witness',
  titleSerif: 'SEE THE',
  titleSans: 'PATTERN',
  lede: 'A graph-first reading field: conversation as threshold, Selemene as computation, Folio as the attributable record. Keep the authority.',
  cta: 'Enter the field',
} as const

export const SHOWCASE = {
  id: 'instrument',
  title: 'The instrument',
  lines: ['One field. Many lenses.', 'A traceable reading.', 'Sources stay distinct.'],
  cta: 'Inspect the field',
} as const

export const QA = {
  id: 'lenses',
  title: ['Q', '&', 'A'],
  left: [
    {
      q: 'What is Urania 137?',
      a: 'The online entry to a private stellar console. The graph is the interface at every depth.',
    },
    {
      q: 'How does a reading stay honest?',
      a: 'Sources, inference, and conclusion remain legible — never collapsed into a single claim.',
    },
    {
      q: 'What is the Folio?',
      a: 'The attributable record. The same document reopens with system stack and evidence ledger.',
    },
  ],
  right: [
    {
      q: 'What are the seven rooms?',
      a: 'Birth Witness, Union Mirror, Sky Weather, Noesis Reading, Engine Status, Folio Archive, Bridge Query.',
    },
    {
      q: 'How do I enter?',
      a: 'The next page is the protected application. Cloudflare Access email OTP is required.',
    },
    {
      q: 'What leaves this page?',
      a: 'Nothing is sent from this public site. The private console activates only after the boundary.',
    },
  ],
} as const

export const QUOTE = {
  id: 'principles',
  text: 'Source before model. Consent before relation. Privacy before convenience.',
  emphasis: 'Insight without overclaim.',
} as const

export const INVITATION = {
  id: 'invitation',
  kicker: 'The threshold',
  title: 'Enter when the question is active.',
  lede: WITNESS_PROMPT,
  note: 'Cloudflare Access email OTP is required before the private environment opens.',
  cta: 'Open Urania 137',
} as const

export const FOOTER = {
  mark: 'Urania 137',
  line: 'Living readings · attributable sources · protected by design',
} as const
