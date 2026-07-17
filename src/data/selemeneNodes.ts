import { StellarNode } from '../types'

/**
 * The seven surfaces, mapped one-to-one onto capabilities the Selemene engine
 * actually serves. Verified against the live API and `noesis-api`'s source:
 *
 *  - `workflow` children  → POST /api/v1/workflows/{id}        — 6 real workflows
 *  - `engine` children    → POST /api/v1/engines/{id}/calculate — 18 real engines
 *  - `witness` children   → POST /api/v1/assets/generate        — ONLY the modes
 *    `load_mode_document` resolves: `integrated-reading` (+`composite-dyad`) and
 *    `integrated-kundali-l0` (+`kundali`, `kundali-l0`). Every other mode string
 *    silently returns a generic one-pass "default: Reading" — indistinguishable
 *    from a typo — so we never send one.
 *
 * The richer partner/lineage modes exist as authored docs in the engine repo
 * (`packages/witness-pipeline/modes/`) but are not yet loaded by noesis-api;
 * they'll earn a child here once the engine serves them.
 */
export const SELEMENE_NODES: StellarNode[] = [
  {
    id: 'birth',
    label: 'Birth Witness',
    description: 'Natal imprint, moment-of-arrival pattern, and incarnation signature.',
    angle: 0,
    distance: 1,
    color: 'gold',
    subNodes: ['Sun', 'Moon', 'Ascendant', 'Nodes'],
    children: [
      { id: 'birth-blueprint', label: 'Birth Blueprint', glyph: 'flower', run: { kind: 'workflow', workflowId: 'birth-blueprint' } },
      { id: 'numerology', label: 'Numerology', glyph: 'star', run: { kind: 'engine', engineId: 'numerology' } },
      { id: 'human-design', label: 'Human Design', glyph: 'bodygraph', run: { kind: 'engine', engineId: 'human-design' } },
      { id: 'gene-keys', label: 'Gene Keys', glyph: 'key', run: { kind: 'engine', engineId: 'gene-keys' } },
      { id: 'vimshottari', label: 'Vimshottari', glyph: 'spiral', run: { kind: 'engine', engineId: 'vimshottari' } },
      { id: 'panchanga', label: 'Panchanga', glyph: 'sun', run: { kind: 'engine', engineId: 'panchanga' } },
      { id: 'vedic-clock', label: 'Vedic Clock', glyph: 'astrolabe', run: { kind: 'engine', engineId: 'vedic-clock' } },
    ],
  },
  {
    id: 'compat',
    label: 'Union Mirror',
    description: 'Relational resonance field between two or more birth patterns.',
    angle: 51.4,
    distance: 1,
    color: 'violet',
    subNodes: ['Synastry', 'Composite', 'Karmic Threads'],
    children: [
      { id: 'composite-dyad', label: 'Composite Dyad', glyph: 'union', run: { kind: 'witness', mode: 'composite-dyad', minSubjects: 2, maxSubjects: 2 } },
      { id: 'relationship-reading', label: 'Relationship Reading', glyph: 'union', run: { kind: 'witness', mode: 'integrated-reading', minSubjects: 2, maxSubjects: 5 } },
    ],
  },
  {
    id: 'transit',
    label: 'Sky Weather',
    description: 'Current celestial weather and its invitation to the native pattern.',
    angle: 102.8,
    distance: 1,
    color: 'cyan',
    subNodes: ['Active Transits', 'Progressions', 'Eclipses'],
    children: [
      { id: 'daily-practice', label: 'Daily Practice', glyph: 'orbit', run: { kind: 'workflow', workflowId: 'daily-practice' } },
      { id: 'transits', label: 'Transits', glyph: 'orbit', run: { kind: 'engine', engineId: 'transits' } },
      { id: 'panchanga', label: 'Panchanga', glyph: 'sun', run: { kind: 'engine', engineId: 'panchanga' } },
      { id: 'vedic-clock', label: 'Vedic Clock', glyph: 'astrolabe', run: { kind: 'engine', engineId: 'vedic-clock' } },
      { id: 'biorhythm', label: 'Biorhythm', glyph: 'pulse', run: { kind: 'engine', engineId: 'biorhythm' } },
    ],
  },
  {
    id: 'witness',
    label: 'Noesis Reading',
    description: 'Narrative witness-pipeline reading from the Selemene engines.',
    angle: 154.2,
    distance: 1,
    color: 'amber',
    subNodes: ['Kundali', 'Structural', 'Somatic'],
    children: [
      { id: 'integrated-kundali-l0', label: 'Integrated Kundali', glyph: 'flower', run: { kind: 'witness', mode: 'integrated-kundali-l0', minSubjects: 1, maxSubjects: 5, level: 'L0' } },
      { id: 'integrated-reading', label: 'Integrated Reading', glyph: 'spiral', run: { kind: 'witness', mode: 'integrated-reading', minSubjects: 1, maxSubjects: 5 } },
      { id: 'full-spectrum', label: 'Full Spectrum', glyph: 'sun', run: { kind: 'workflow', workflowId: 'full-spectrum' } },
      { id: 'creative-expression', label: 'Creative Expression', glyph: 'lotus', run: { kind: 'workflow', workflowId: 'creative-expression' } },
    ],
  },
  {
    id: 'engine',
    label: 'Engine Status',
    description: 'Diagnostic view of the consciousness engines and workflows.',
    angle: 205.6,
    distance: 1,
    color: 'cyan',
    subNodes: ['Engines', 'Workflows', 'Pulse'],
    children: [
      { id: 'live-status', label: 'Live Status', glyph: 'flower', info: true },
      { id: 'panchanga', label: 'Panchanga', glyph: 'sun', run: { kind: 'engine', engineId: 'panchanga' } },
      { id: 'vedic-clock', label: 'Vedic Clock', glyph: 'astrolabe', run: { kind: 'engine', engineId: 'vedic-clock' } },
      { id: 'i-ching', label: 'I Ching', glyph: 'hexagram', run: { kind: 'engine', engineId: 'i-ching' } },
      { id: 'tarot', label: 'Tarot', glyph: 'star', run: { kind: 'engine', engineId: 'tarot' } },
      { id: 'transits', label: 'Transits', glyph: 'orbit', run: { kind: 'engine', engineId: 'transits' } },
      { id: 'biorhythm', label: 'Biorhythm', glyph: 'pulse', run: { kind: 'engine', engineId: 'biorhythm' } },
      { id: 'human-design', label: 'Human Design', glyph: 'bodygraph', run: { kind: 'engine', engineId: 'human-design' } },
      { id: 'enneagram', label: 'Enneagram', glyph: 'enneagram', run: { kind: 'engine', engineId: 'enneagram' } },
      { id: 'gene-keys', label: 'Gene Keys', glyph: 'key', run: { kind: 'engine', engineId: 'gene-keys' } },
      { id: 'sacred-geometry', label: 'Sacred Geometry', glyph: 'flower', run: { kind: 'engine', engineId: 'sacred-geometry' } },
    ],
  },
  {
    id: 'folio',
    label: 'Folio Archive',
    description: 'Previously generated readings, saved witnesses, and exports.',
    angle: 257,
    distance: 1,
    color: 'gold',
    subNodes: ['Recent', 'Favorites', 'Search'],
    children: [
      { id: 'saved-reports', label: 'Saved Reports', info: true, action: 'list' },
      { id: 'search', label: 'Search', info: true, action: 'search' },
      { id: 'history', label: 'History', info: true, action: 'history' },
      { id: 'favorites', label: 'Favorites', info: true, action: 'favorites' },
      { id: 'markdown', label: 'Markdown', info: true, action: 'export', format: 'markdown' },
      { id: 'docx', label: 'DOCX', info: true, action: 'export', format: 'docx' },
      { id: 'pdf', label: 'PDF', info: true, action: 'export', format: 'pdf' },
      { id: 'exports', label: 'Exports', info: true, action: 'export' },
    ],
  },
  {
    id: 'bridge',
    label: 'Bridge Query',
    description: 'Direct inquiry into the Selemene Bridge and its engines.',
    angle: 308.4,
    distance: 1,
    color: 'violet',
    subNodes: ['Question', 'Engine Pool', 'Response'],
    children: [
      { id: 'decision-support', label: 'Decision Support', glyph: 'query', run: { kind: 'workflow', workflowId: 'decision-support' } },
      { id: 'self-inquiry', label: 'Self-Inquiry', glyph: 'spiral', run: { kind: 'workflow', workflowId: 'self-inquiry' } },
      { id: 'tarot', label: 'Tarot', glyph: 'star', run: { kind: 'engine', engineId: 'tarot' } },
      { id: 'i-ching', label: 'I Ching', glyph: 'hexagram', run: { kind: 'engine', engineId: 'i-ching' } },
      { id: 'enneagram', label: 'Enneagram', glyph: 'enneagram', run: { kind: 'engine', engineId: 'enneagram' } },
    ],
  },
]

export const getNodeById = (id: string): StellarNode | undefined =>
  SELEMENE_NODES.find((node) => node.id === id)
