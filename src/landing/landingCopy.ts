/** Urania skin for the Golden Portal Motionsites ecosystem. */

export const WITNESS_PROMPT =
  'What pattern keeps returning, and what concrete signal would show that it no longer applies?'

export const NAV = [
  { href: '/instrument', label: 'Instrument' },
  { href: '/lenses', label: 'Lenses' },
  { href: '/principles', label: 'Principles' },
  { href: '/enter', label: 'Invitation' },
] as const

export const HERO = {
  kicker: 'Tryambakam Noesis',
  subkicker: 'Witness',
  title: 'See the pattern. Keep the authority.',
  titleSerif: 'SEE THE',
  titleSans: 'PATTERN',
  lede: 'A graph-first reading field: conversation as threshold, Selemene as computation, Folio as the attributable record. Keep the authority.',
  cta: 'Enter the field',
} as const

export const SHOWCASE = {
  id: 'instrument',
  title: 'The instrument',
  lines: ['One field. Seven rooms.', 'Every reading traceable.', 'Every source distinct.'],
  cta: 'Inspect the field',
  href: '/instrument',
} as const

export const QA = {
  id: 'lenses',
  title: ['Q', '&', 'A'],
  left: [
    {
      q: 'What is Urania 137?',
      a: 'A private stellar console. The graph is the interface at every depth.',
    },
    {
      q: 'How does a reading stay honest?',
      a: 'Source, inference, and conclusion stay separate — never collapsed into one claim.',
    },
    {
      q: 'What is the Folio?',
      a: 'The attributable record. Same document, same stack, same evidence ledger on reopen.',
    },
  ],
  right: [
    {
      q: 'What are the seven rooms?',
      a: 'Birth Witness, Union Mirror, Sky Weather, Noesis Reading, Engine Status, Folio Archive, Bridge Query.',
    },
    {
      q: 'How do I enter?',
      a: 'Cloudflare Access email OTP. One boundary, then the private console.',
    },
    {
      q: 'What leaves this page?',
      a: 'Nothing. This is a static public site. The console activates only after the boundary.',
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
  rooms: [
    { href: '/instrument', label: 'Instrument' },
    { href: '/lenses', label: 'Lenses' },
    { href: '/principles', label: 'Principles' },
  ],
  posture: 'Source before model. Consent before relation. Privacy before convenience.',
} as const

export const INSTRUMENT_PAGE = {
  badge: 'The instrument',
  title: 'One field. Seven rooms. Every reading traceable.',
  next: { href: '/lenses', label: 'See the seven rooms' },
  rows: [
    {
      title: 'Threshold collects only what the capability needs.',
      body: 'Conversation is the intake. One fact at a time. Owner is not subject. Nothing extra is stored on this public site.',
      cta: { href: '/enter', label: 'Cross the threshold' },
      image: '/media/urania/instrument-threshold.jpg',
      alt: 'Reading field still',
      reverse: false,
    },
    {
      title: 'Selemene stays named and separate.',
      body: 'Deterministic engines and witness modes remain distinct. Inference does not overwrite source. The console never collapses a reading into a single claim.',
      cta: { href: '/principles', label: 'Read the posture' },
      image: '/media/urania/instrument-selemene.jpg',
      alt: 'Witness still',
      reverse: true,
    },
    {
      title: 'Folio is the attributable record.',
      body: 'The same document reopens with system stack and evidence ledger. What you keep stays yours to recover.',
      cta: { href: '/enter', label: 'Open the field' },
      image: '/media/urania/instrument-folio.jpg',
      alt: 'Archive still',
      reverse: false,
    },
  ],
} as const

export const LENSES_PAGE = {
  badge: 'The constellation',
  title: 'Seven rooms. One graph.',
  lede: 'Each parent lens opens a room — never a menu of undifferentiated modes.',
  next: { href: '/principles', label: 'Read the principles' },
  items: [
    {
      name: 'Birth Witness',
      title: 'Identity without collapse',
      body: 'Owner is not subject. Birth facts stay attributable.',
      image: '/media/urania/lens-birth.jpg',
    },
    {
      name: 'Union Mirror',
      title: 'Relation with consent',
      body: 'Dyads and families only when participation is explicit.',
      image: '/media/urania/lens-union.jpg',
    },
    {
      name: 'Sky Weather',
      title: 'Today as witness',
      body: 'Daily limbs rendered as reading, not raw dump.',
      image: '/media/urania/lens-sky.jpg',
    },
    {
      name: 'Noesis Reading',
      title: 'Witness depth',
      body: 'Integrated modes that the engine actually resolves.',
      image: '/media/urania/lens-noesis.jpg',
    },
    {
      name: 'Engine Status',
      title: 'Live telemetry',
      body: 'Nineteen engines named; capture doors stay honest.',
      image: '/media/urania/lens-engine.jpg',
    },
    {
      name: 'Folio Archive',
      title: 'Durable recovery',
      body: 'Canonical readings you can reopen without losing the thread.',
      image: '/media/urania/lens-folio.jpg',
    },
    {
      name: 'Bridge Query',
      title: 'Question as door',
      body: 'Decision support without prescription.',
      image: '/media/urania/lens-bridge.jpg',
    },
  ],
} as const

export const PRINCIPLES_PAGE = {
  badge: 'FAQ',
  title: 'Answers that keep authority with you.',
  lede: 'How the field works, what the rooms hold, and what Access actually gates.',
  next: { href: '/enter', label: 'Enter when the question is active' },
  categories: [
    { key: 'field', label: 'Field' },
    { key: 'lenses', label: 'Lenses' },
    { key: 'access', label: 'Access' },
  ],
  faqs: {
    field: [
      {
        q: 'What is Urania 137?',
        a: 'The online entry to a graph-first reading field. Conversation is the threshold, Selemene is computation, Folio is the attributable record.',
      },
      {
        q: 'What stays distinct?',
        a: 'Source, inference, and interpretation. A reading never collapses those layers into one claim.',
      },
      {
        q: 'What is the Folio?',
        a: 'The durable archive. The same document reopens with system stack and evidence ledger.',
      },
      {
        q: 'Is this a prediction engine?',
        a: 'No. The posture is witness, not seer. Insight without overclaim.',
      },
    ],
    lenses: [
      {
        q: 'What are the seven rooms?',
        a: 'Birth Witness, Union Mirror, Sky Weather, Noesis Reading, Engine Status, Folio Archive, and Bridge Query.',
      },
      {
        q: 'Why rooms instead of a mode list?',
        a: 'The graph is the interface at every depth. Each parent lens opens a room with only the capabilities the engine actually serves.',
      },
      {
        q: 'What is consent for?',
        a: 'Relation. Dyads and families appear only when participation is explicit and revocable.',
      },
      {
        q: 'Who holds authority?',
        a: 'You do. The console shows pattern. It does not take the decision.',
      },
    ],
    access: [
      {
        q: 'How do I enter?',
        a: 'The next page is the protected application. Cloudflare Access email OTP is required.',
      },
      {
        q: 'What leaves this public site?',
        a: 'Nothing. Optional context on the home page is not sent. The private console activates only after the boundary.',
      },
      {
        q: 'Is there a signup form here?',
        a: 'No. Access is email OTP on the protected host. This site has one allowlisted exit.',
      },
      {
        q: 'When should I cross?',
        a: 'When the question is active. Bring a pattern that keeps returning, and a concrete signal that would show it no longer applies.',
      },
    ],
  },
  asideTitle: 'Still deciding?',
  asideBody: 'The instrument, the rooms, and the posture are public. The console is not.',
} as const

export const ENTER_PAGE = {
  title: 'Enter when the question is active.',
  lede: WITNESS_PROMPT,
  primary: 'Open Urania 137',
  secondary: { href: '/instrument', label: 'Inspect the instrument first' },
  note: 'Cloudflare Access email OTP is required before the private environment opens.',
} as const
