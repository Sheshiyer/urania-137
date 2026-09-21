/**
 * Urania skin for the Golden Portal Motionsites ecosystem.
 * Counts and room metadata are derived from selemeneNodes.ts —
 * the code is the source of truth.
 */
import {
  ENGINE_COUNT,
  ENGINE_DETAIL,
  ROOM_COUNT,
  ROOM_DESCRIPTIONS,
  ROOMS,
  TOTAL_CAPABILITIES,
  UNIQUE_ENGINE_IDS,
  WORKFLOW_COUNT,
  WORKFLOW_DETAIL,
} from './landingData'

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
  lede: `${TOTAL_CAPABILITIES}+ capabilities across ${ROOM_COUNT} rooms. A graph-first reading field: conversation as threshold, Selemene as computation, Folio as the attributable record. Keep the authority.`,
  cta: 'Enter the field',
} as const

export const SHOWCASE = {
  id: 'instrument',
  title: 'The instrument',
  lines: [
    `One field. ${ROOM_COUNT} rooms.`,
    `${ENGINE_COUNT}+ deterministic engines.`,
    `${WORKFLOW_COUNT} orchestrated workflows.`,
    'Every reading traceable. Every source distinct.',
  ],
  cta: 'Inspect the field',
  href: '/instrument',
} as const

export const ROOMS_OVERVIEW = {
  id: 'rooms',
  title: `${ROOM_COUNT} rooms. One graph.`,
  lede: 'Each room opens a lens — a bounded surface over the Selemene engine pool. The graph is the interface at every depth.',
  rooms: ROOMS.map((room) => {
    const desc = ROOM_DESCRIPTIONS[room.id]
    return {
      id: room.id,
      label: room.label,
      epithet: room.epithet,
      color: room.color,
      tagline: desc?.tagline ?? room.description,
      childCount: room.childCount,
      engines: room.engines,
      workflows: room.workflows,
      witnesses: room.witnesses,
    }
  }),
} as const

export const ENGINE_ROSTER = {
  id: 'engines',
  title: `${ENGINE_COUNT}+ engines. Named and deterministic.`,
  lede: 'Each engine is a bounded computation — same input, same output, attributable at every layer. The substrate splits between Rust (astronomical precision, sub-millisecond) and TypeScript (interpretive, compositional).',
  engines: UNIQUE_ENGINE_IDS.map((id) => {
    const detail = ENGINE_DETAIL[id]
    return {
      id,
      name: detail?.name ?? id,
      substrate: detail?.substrate ?? 'Unknown',
      description: detail?.description ?? '',
    }
  }),
  rustCount: UNIQUE_ENGINE_IDS.filter((id) => ENGINE_DETAIL[id]?.substrate === 'Rust').length,
  tsCount: UNIQUE_ENGINE_IDS.filter((id) => ENGINE_DETAIL[id]?.substrate === 'TypeScript').length,
} as const

export const WORKFLOW_ROSTER = {
  id: 'workflows',
  title: `${WORKFLOW_COUNT} workflows. Orchestrated.`,
  lede: 'A workflow composes multiple engines into one reading. Engine selection follows the question topology — not user preference.',
  workflows: Object.entries(WORKFLOW_DETAIL).map(([id, detail]) => ({
    id,
    name: detail.name,
    description: detail.description,
  })),
} as const

export const INFRASTRUCTURE = {
  id: 'infrastructure',
  title: 'Architecture. Not abstraction.',
  sections: [
    {
      title: 'Selemene Engine',
      body: `${ENGINE_COUNT} deterministic engines split across Rust and TypeScript runtimes. Axum API on port 8080; TypeScript bridge on port 3001. Every engine call logged, every response attributable.`,
    },
    {
      title: 'Witness Pipeline',
      body: 'Multi-pass orchestrator producing narrative reports with rubric-audited sections. Source, inference, and interpretation remain separate layers — never collapsed into one claim.',
    },
    {
      title: 'Folio System',
      body: 'The attributable record. Same document reopens with system stack and evidence ledger. Trust panel shows which engine produced each section, at what confidence.',
    },
    {
      title: 'Consent Architecture',
      body: 'Threshold collects only what the capability needs — one fact at a time. Relation requires explicit participation. Revocation is always available. Owner is not subject.',
    },
    {
      title: 'Privacy Boundary',
      body: 'This is a static public site. Nothing leaves this page. The private console activates only after Cloudflare Access email OTP on the protected host.',
    },
  ],
} as const

export const QA = {
  id: 'lenses',
  title: ['Q', '&', 'A'],
  left: [
    {
      q: 'What is Urania 137?',
      a: `A private stellar console. ${ROOM_COUNT} rooms, ${ENGINE_COUNT}+ engines, ${WORKFLOW_COUNT} workflows — the graph is the interface at every depth.`,
    },
    {
      q: 'How does a reading stay honest?',
      a: 'Source, inference, and conclusion stay separate — never collapsed into one claim. The Folio trust panel names which engine produced each section.',
    },
    {
      q: 'What is the Folio?',
      a: 'The attributable record. Same document, same stack, same evidence ledger on reopen. Every reading generates one.',
    },
  ],
  right: [
    {
      q: `What are the ${ROOM_COUNT} rooms?`,
      a: ROOMS.map((r) => r.label).join(', ') + '.',
    },
    {
      q: 'What are the engines?',
      a: `${ENGINE_COUNT} deterministic compute units — ${ENGINE_ROSTER.rustCount} Rust (astronomical precision) and ${ENGINE_ROSTER.tsCount} TypeScript (interpretive composition). Same input, same output.`,
    },
    {
      q: 'How do I enter?',
      a: 'Cloudflare Access email OTP. One boundary, then the private console.',
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
  line: `${TOTAL_CAPABILITIES}+ capabilities · attributable sources · protected by design`,
  rooms: [
    { href: '/instrument', label: 'Instrument' },
    { href: '/lenses', label: 'Lenses' },
    { href: '/principles', label: 'Principles' },
  ],
  posture: 'Source before model. Consent before relation. Privacy before convenience.',
} as const

export const INSTRUMENT_PAGE = {
  badge: 'The instrument',
  title: `One field. ${ROOM_COUNT} rooms. ${ENGINE_COUNT}+ engines. Every reading traceable.`,
  next: { href: '/lenses', label: `See the ${ROOM_COUNT} rooms` },
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
      title: `${ENGINE_COUNT} engines. Named and separate.`,
      body: `Deterministic compute split across Rust and TypeScript runtimes — ${ENGINE_ROSTER.rustCount} astronomical engines, ${ENGINE_ROSTER.tsCount} interpretive. Inference does not overwrite source. The console never collapses a reading into a single claim.`,
      cta: { href: '/principles', label: 'Read the posture' },
      image: '/media/urania/instrument-selemene.jpg',
      alt: 'Witness still',
      reverse: true,
    },
    {
      title: 'Folio is the attributable record.',
      body: 'The same document reopens with system stack and evidence ledger. Trust panel names which engine produced each section, at what confidence. What you keep stays yours to recover.',
      cta: { href: '/enter', label: 'Open the field' },
      image: '/media/urania/instrument-folio.jpg',
      alt: 'Archive still',
      reverse: false,
    },
    {
      title: `${WORKFLOW_COUNT} workflows orchestrate the engines.`,
      body: 'Birth Blueprint, Daily Practice, Full Spectrum, Creative Expression, Decision Support, Self-Inquiry — each workflow composes engines by question topology. One orchestration, one Folio.',
      cta: { href: '/lenses', label: 'See the rooms' },
      image: '/media/urania/instrument-selemene.jpg',
      alt: 'Workflow orchestration',
      reverse: true,
    },
  ],
} as const

export const LENSES_PAGE = {
  badge: 'The constellation',
  title: `${ROOM_COUNT} rooms. One graph.`,
  lede: `Each parent lens opens a room — a bounded surface over ${ENGINE_COUNT}+ engines and ${WORKFLOW_COUNT} workflows. Never a menu of undifferentiated modes.`,
  next: { href: '/principles', label: 'Read the principles' },
  items: ROOMS.map((room) => {
    const desc = ROOM_DESCRIPTIONS[room.id]
    const capabilities: string[] = []
    if (room.engines.length) capabilities.push(`${room.engines.length} engine${room.engines.length > 1 ? 's' : ''}`)
    if (room.workflows.length) capabilities.push(`${room.workflows.length} workflow${room.workflows.length > 1 ? 's' : ''}`)
    if (room.witnesses.length) capabilities.push(`${room.witnesses.length} witness mode${room.witnesses.length > 1 ? 's' : ''}`)
    return {
      name: room.label,
      title: desc?.tagline ?? room.description,
      body: desc?.detail ?? room.description,
      capabilities: capabilities.join(' · '),
      children: room.children,
      image: `/media/urania/lens-${room.id === 'compat' ? 'union' : room.id}.jpg`,
    }
  }),
} as const

export const PRINCIPLES_PAGE = {
  badge: 'FAQ',
  title: 'Answers that keep authority with you.',
  lede: `How the field works, what the ${ROOM_COUNT} rooms hold, and what Access actually gates.`,
  next: { href: '/enter', label: 'Enter when the question is active' },
  categories: [
    { key: 'field', label: 'Field' },
    { key: 'engines', label: 'Engines' },
    { key: 'lenses', label: 'Rooms' },
    { key: 'access', label: 'Access' },
  ],
  faqs: {
    field: [
      {
        q: 'What is Urania 137?',
        a: `The online entry to a graph-first reading field. ${ROOM_COUNT} rooms, ${ENGINE_COUNT}+ engines, ${WORKFLOW_COUNT} workflows. Conversation is the threshold, Selemene is computation, Folio is the attributable record.`,
      },
      {
        q: 'What stays distinct?',
        a: 'Source, inference, and interpretation. A reading never collapses those layers into one claim. The trust panel names the engine, the confidence, and the input.',
      },
      {
        q: 'What is the Folio?',
        a: 'The durable archive. The same document reopens with system stack and evidence ledger. Every reading generates a Folio.',
      },
      {
        q: 'Is this a prediction engine?',
        a: 'No. The posture is witness, not seer. The system succeeds when you no longer need it. Insight without overclaim.',
      },
    ],
    engines: [
      {
        q: `What are the ${ENGINE_COUNT} engines?`,
        a: `Deterministic compute units: ${ENGINE_ROSTER.rustCount} Rust engines handle astronomical calculation with sub-millisecond precision. ${ENGINE_ROSTER.tsCount} TypeScript engines handle interpretive and compositional work. Same input, same output, every time.`,
      },
      {
        q: 'What does Rust handle?',
        a: 'Numerology, Human Design bodygraph, Gene Keys spectrum, Vimshottari dasha timeline, Panchanga limbs, Vedic Clock intervals, and Transit aspect detection.',
      },
      {
        q: 'What does TypeScript handle?',
        a: 'Biorhythm cycles, I Ching hexagrams, Tarot spreads, Enneagram typology, Sacred Geometry patterns, and Sigil Forge encoding.',
      },
      {
        q: 'What is the witness pipeline?',
        a: 'A multi-pass orchestrator that produces narrative reports with rubric-audited sections. Each section names its source engine, its confidence level, and the input data that produced it.',
      },
    ],
    lenses: [
      {
        q: `What are the ${ROOM_COUNT} rooms?`,
        a: ROOMS.map((r) => r.label).join(', ') + '. Each room opens a bounded surface over the engine pool.',
      },
      {
        q: 'Why rooms instead of a mode list?',
        a: 'The graph is the interface at every depth. Each parent lens opens a room with only the capabilities the engine actually serves. No undifferentiated menus.',
      },
      {
        q: 'What is consent for?',
        a: 'Relation. Dyads and families appear only when participation is explicit and revocable. The Union Mirror requires both subjects to consent.',
      },
      {
        q: 'Who holds authority?',
        a: 'You do. The console shows pattern. It does not take the decision. The system succeeds when you no longer need it.',
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
  asideBody: `The instrument, the rooms, and the posture are public. The console — and its ${ENGINE_COUNT}+ engines — are not.`,
} as const

export const ENTER_PAGE = {
  title: 'Enter when the question is active.',
  lede: WITNESS_PROMPT,
  primary: 'Open Urania 137',
  secondary: { href: '/instrument', label: 'Inspect the instrument first' },
  note: 'Cloudflare Access email OTP is required before the private environment opens.',
} as const
