/**
 * Canonical public-landing funnel copy.
 * Kept landing-local so the Motionskin bundle never imports app surfaces.
 */

export const WITNESS_PROMPT =
  'What pattern keeps returning, and what concrete signal would show that it no longer applies?'

export const HERO = {
  kicker: 'Tryambakam Noesis · private stellar console',
  signal: 'Witness, not seer',
  title: 'See the pattern. Keep the authority.',
  titleLeft: ['See the', 'pattern'] as const,
  titleRight: ['Keep the', 'authority'] as const,
  lede:
    'Urania is the online entry to a graph-first reading field: conversation as threshold, Selemene as computation, Folio as the attributable record.',
  headerCta: 'Enter',
  primaryCta: 'Enter the field',
} as const

export const NAV = [
  { href: '#instrument', label: 'Instrument' },
  { href: '#lenses', label: 'Lenses' },
  { href: '#principles', label: 'Principles' },
  { href: '#invitation', label: 'Invitation' },
] as const

export const STAGES = [
  { label: 'Instrument', index: '01' },
  { label: 'Lenses', index: '02' },
  { label: 'Principles', index: '03' },
  { label: 'Folio', index: '04' },
  { label: 'Access', index: '05' },
] as const

export const STATS = [
  { label: 'Parent lenses', value: '7' },
  { label: 'Runnable doorways', value: '35' },
  { label: 'Trust boundary', value: 'Access OTP' },
] as const

export const INSTRUMENT = {
  id: 'instrument',
  kicker: 'The instrument',
  title: 'One field. Many lenses. A traceable reading.',
  lede:
    'Move from pattern to witness, from daily sky to an enduring archive. Sources, inference, and conclusion remain legible — never collapsed into a single claim.',
  steps: [
    {
      index: '01',
      title: 'Threshold',
      body: 'Conversation collects only the facts the capability needs.',
    },
    {
      index: '02',
      title: 'Selemene',
      body: 'Deterministic engines and witness modes stay named and separate.',
    },
    {
      index: '03',
      title: 'Folio',
      body: 'The same document reopens with system stack and evidence ledger.',
    },
  ],
} as const

export const LENSES = {
  id: 'lenses',
  kicker: 'The constellation',
  title: 'Seven rooms. One graph.',
  lede:
    'The graph is the interface at every depth. Each parent lens opens a room — never a menu of undifferentiated modes.',
  items: [
    {
      name: 'Birth Witness',
      title: 'Identity without collapse',
      body: 'Owner is not subject. Birth facts stay attributable.',
      wide: true,
    },
    {
      name: 'Union Mirror',
      title: 'Relation with consent',
      body: 'Dyads and families only when participation is explicit.',
    },
    {
      name: 'Sky Weather',
      title: 'Today as witness',
      body: 'Daily limbs rendered as reading, not raw dump.',
    },
    {
      name: 'Noesis Reading',
      title: 'Witness depth',
      body: 'Integrated modes that the engine actually resolves.',
    },
    {
      name: 'Engine Status',
      title: 'Live telemetry',
      body: 'Nineteen engines named; capture doors stay honest.',
    },
    {
      name: 'Folio Archive',
      title: 'Durable recovery',
      body: 'Canonical readings you can reopen without losing the thread.',
    },
    {
      name: 'Bridge Query',
      title: 'Question as door',
      body: 'Decision support without prescription.',
    },
  ],
} as const

export const PRINCIPLES = {
  id: 'principles',
  kicker: 'The posture',
  title: 'Insight without overclaim.',
  items: [
    {
      title: 'Source before model',
      body: 'Each reading keeps a trail back to its inputs.',
    },
    {
      title: 'Consent before relation',
      body: 'Participation is explicit and revocable.',
    },
    {
      title: 'Privacy before convenience',
      body: 'The private console activates only after crossing the protected boundary.',
    },
  ],
} as const

export const INVITATION = {
  id: 'invitation',
  kicker: 'THRESHOLD / ACCESS OTP',
  title: 'Enter when the question is active.',
  lede: WITNESS_PROMPT,
  note: 'The next page is the protected application. Cloudflare Access email OTP is required before the private environment opens.',
  cta: 'Open Urania 137',
} as const

export const PORTAL_TITLES = {
  primary: ['ONE FIELD', 'MANY LENSES', 'TRACEABLE READING'] as const,
  secondary: ['SOURCE BEFORE MODEL', 'CONSENT BEFORE RELATION', 'PRIVACY BEFORE CONVENIENCE'] as const,
} as const

/** Floating field labels — seven lenses + principle micro-tags. */
export const SPATIAL_TEXTS = [
  { key: 'birth-witness', text: 'BIRTH WITNESS', kind: 'phrase' as const, x: '-46vw', y: '-55vh', z: '-220px', rx: '-2deg', ry: '17deg', rz: '-2deg' },
  { key: 'union-mirror', text: 'UNION MIRROR', kind: 'phrase' as const, x: '-44vw', y: '58vh', z: '-360px', rx: '3deg', ry: '12deg', rz: '-1deg' },
  { key: 'sky-weather', text: 'SKY WEATHER', kind: 'phrase' as const, x: '45vw', y: '-56vh', z: '-430px', rx: '-3deg', ry: '-14deg', rz: '2deg' },
  { key: 'noesis-reading', text: 'NOESIS READING', kind: 'phrase' as const, x: '46vw', y: '54vh', z: '-500px', rx: '-7deg', ry: '-13deg', rz: '4deg' },
  { key: 'engine-status', text: 'ENGINE STATUS', kind: 'phrase' as const, x: '55vw', y: '8vh', z: '-620px', rx: '8deg', ry: '11deg', rz: '2deg' },
  { key: 'folio-archive', text: 'FOLIO ARCHIVE', kind: 'phrase' as const, x: '-52vw', y: '-23vh', z: '-520px', rx: '-5deg', ry: '-16deg', rz: '-2deg' },
  { key: 'bridge-query', text: 'BRIDGE QUERY', kind: 'phrase' as const, x: '-56vw', y: '23vh', z: '-560px', rx: '4deg', ry: '15deg', rz: '2deg' },
  { key: 'source-before-model', text: 'SOURCE BEFORE MODEL', kind: 'phrase' as const, x: '20vw', y: '-61vh', z: '-580px', rx: '-4deg', ry: '-12deg', rz: '-2deg' },
  { key: 'consent-before-relation', text: 'CONSENT BEFORE RELATION', kind: 'phrase' as const, x: '-20vw', y: '61vh', z: '-660px', rx: '-5deg', ry: '8deg', rz: '-3deg' },
  { key: 'field-01', text: 'INSTRUMENT 01', kind: 'micro' as const, x: '-28vw', y: '-64vh', z: '-460px', rz: '-4deg' },
  { key: 'signal-02', text: 'LENSES 02', kind: 'micro' as const, x: '34vw', y: '-61vh', z: '-520px', rz: '3deg' },
  { key: 'threshold-03', text: 'PRINCIPLES 03', kind: 'micro' as const, x: '-25vw', y: '63vh', z: '-440px', rz: '-2deg' },
  { key: 'folio-04', text: 'FOLIO 04', kind: 'micro' as const, x: '10vw', y: '-67vh', z: '-560px', rz: '2deg' },
  { key: 'access-05', text: 'ACCESS 05', kind: 'micro' as const, x: '32vw', y: '64vh', z: '-500px', rz: '-3deg' },
  { key: 'vector-06', text: 'SELEMENE 06', kind: 'micro' as const, x: '-58vw', y: '4vh', z: '-520px', rz: '3deg' },
  { key: 'orbit-07', text: 'GRAPH 07', kind: 'micro' as const, x: '55vw', y: '-42vh', z: '-400px', rz: '-2deg' },
  { key: 'echo-08', text: 'LEDGER 08', kind: 'micro' as const, x: '8vw', y: '66vh', z: '-580px', rz: '4deg' },
]
