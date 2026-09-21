/**
 * Data layer for the public landing.
 * Derives every count and room summary from `selemeneNodes.ts` so copy
 * stays current when engines are added or removed. Nothing here is
 * hardcoded — the code is the source of truth.
 */
import { SELEMENE_NODES } from '../data/selemeneNodes'
import type { StellarNode } from '../types'

type ChildKind = 'engine' | 'workflow' | 'witness' | 'daily' | 'info'

function childKind(child: NonNullable<StellarNode['children']>[number]): ChildKind {
  if (!('run' in child) || !child.run) return 'info'
  const { kind } = child.run as { kind: string }
  if (kind === 'engine') return 'engine'
  if (kind === 'workflow') return 'workflow'
  if (kind === 'witness') return 'witness'
  if (kind === 'daily') return 'daily'
  return 'info'
}

function uniqueIdsByKind(kind: ChildKind, idKey: string): string[] {
  const seen = new Set<string>()
  for (const node of SELEMENE_NODES) {
    for (const child of node.children ?? []) {
      if (childKind(child) !== kind) continue
      const run = child.run as Record<string, unknown> | undefined
      const id = run?.[idKey] as string | undefined
      if (id) seen.add(id)
    }
  }
  return [...seen]
}

export const ROOMS = SELEMENE_NODES.map((node) => {
  const children = node.children ?? []
  const engines = children.filter((c) => childKind(c) === 'engine')
  const workflows = children.filter((c) => childKind(c) === 'workflow')
  const witnesses = children.filter((c) => childKind(c) === 'witness')
  return {
    id: node.id,
    label: node.label,
    epithet: node.epithet,
    description: node.description,
    color: node.color,
    childCount: children.length,
    engines: engines.map((c) => c.label),
    workflows: workflows.map((c) => c.label),
    witnesses: witnesses.map((c) => c.label),
    children: children.map((c) => ({ id: c.id, label: c.label, kind: childKind(c) })),
  }
})

export const UNIQUE_ENGINE_IDS = uniqueIdsByKind('engine', 'engineId')
export const UNIQUE_WORKFLOW_IDS = uniqueIdsByKind('workflow', 'workflowId')
export const UNIQUE_WITNESS_MODES = uniqueIdsByKind('witness', 'mode')

export const ENGINE_COUNT = UNIQUE_ENGINE_IDS.length
export const WORKFLOW_COUNT = UNIQUE_WORKFLOW_IDS.length
export const WITNESS_COUNT = UNIQUE_WITNESS_MODES.length
export const ROOM_COUNT = SELEMENE_NODES.length
export const TOTAL_CAPABILITIES = ENGINE_COUNT + WORKFLOW_COUNT + WITNESS_COUNT

export const ROOM_DESCRIPTIONS: Record<string, { tagline: string; detail: string }> = {
  birth: {
    tagline: 'Natal architecture. The arrival encoded.',
    detail:
      `${ROOMS.find((r) => r.id === 'birth')!.engines.length} engines decode the moment of arrival — numerological signature, Human Design bodygraph, Gene Keys spectrum, Vimshottari dasha timeline, Panchanga limbs, and Vedic Clock. The Birth Blueprint workflow orchestrates all six into one attributable document.`,
  },
  compat: {
    tagline: 'Relational field. Consent-gated.',
    detail:
      'Dyads and families only when participation is explicit. The Composite Dyad produces a merged witness for two subjects; the Relationship Reading extends the integrated pipeline to up to five, preserving each source distinctly.',
  },
  transit: {
    tagline: 'Current celestial weather. The day as witness.',
    detail:
      `Today's Panchanga rendered as a reading — not a raw data dump. The Daily Practice workflow layers personal transits over the base sky, while standalone engines (Transits, Biorhythm, Panchanga, Vedic Clock) serve individual lenses.`,
  },
  witness: {
    tagline: 'The multi-pass reading. Narrative depth.',
    detail:
      'The Integrated Kundali pipes every engine through a rubric-audited witness pipeline at Level 0. The Integrated Reading broadens coverage. Full Spectrum and Creative Expression are intention-bearing workflows that compose the reading with a sigil.',
  },
  engine: {
    tagline: 'Diagnostic view. The machine named.',
    detail:
      `Live telemetry over ${ROOMS.find((r) => r.id === 'engine')!.engines.length} named engines. Each capture door stays honest — the status panel shows what the system actually computes, not a capability promise.`,
  },
  folio: {
    tagline: 'The attributable record. Durable recovery.',
    detail:
      'Every reading generates a Folio — the same document reopens with system stack, evidence ledger, and trust panel. Saved Reports, Noesis Mirror, Search, and Favorites provide four lenses over the canonical archive.',
  },
  bridge: {
    tagline: 'Direct inquiry. Question as protocol.',
    detail:
      'Decision Support and Self-Inquiry are structured workflows; Tarot, I Ching, Sigil Forge, and Enneagram serve as standalone divination and typology engines. The bridge is where a question becomes a computational protocol.',
  },
}

export const ENGINE_DETAIL: Record<string, { name: string; substrate: string; description: string }> = {
  numerology: {
    name: 'Numerology',
    substrate: 'Rust',
    description: 'Pythagorean and Chaldean reduction, lifepath number derivation, name-number analysis.',
  },
  'human-design': {
    name: 'Human Design',
    substrate: 'Rust',
    description: 'Bodygraph computation from planetary gate positions: type, strategy, authority, profile, channels.',
  },
  'gene-keys': {
    name: 'Gene Keys',
    substrate: 'Rust',
    description: 'Shadow-Gift-Siddhi spectrum for each gate; contemplation pathways and prime gift sequence.',
  },
  vimshottari: {
    name: 'Vimshottari Dasha',
    substrate: 'Rust',
    description: 'Full 120-year dasha timeline with maha, antar, and pratyantar periods from lunar nakshatra.',
  },
  panchanga: {
    name: 'Panchanga',
    substrate: 'Rust',
    description: 'Five limbs of the Vedic day: Tithi, Vara, Nakshatra, Yoga, and Karana, with quality assessment.',
  },
  'vedic-clock': {
    name: 'Vedic Clock',
    substrate: 'Rust',
    description: 'Hora, Ghati, and Muhurta resolution — the day divided into consciousness-relevant intervals.',
  },
  transits: {
    name: 'Transits',
    substrate: 'Rust',
    description: 'Current planetary positions against natal placements, with orb-based aspect detection.',
  },
  biorhythm: {
    name: 'Biorhythm',
    substrate: 'TypeScript',
    description: 'Physical, emotional, and intellectual cycles from birth date with composite overlays.',
  },
  'i-ching': {
    name: 'I Ching',
    substrate: 'TypeScript',
    description: 'Hexagram generation, changing lines, nuclear hexagram, and interpretive text selection.',
  },
  tarot: {
    name: 'Tarot',
    substrate: 'TypeScript',
    description: 'Spread-based draw with positional meaning, elemental dignity, and reversals.',
  },
  enneagram: {
    name: 'Enneagram',
    substrate: 'TypeScript',
    description: 'Type determination, wing balance, instinctual variant, and growth/stress arrows.',
  },
  'sacred-geometry': {
    name: 'Sacred Geometry',
    substrate: 'TypeScript',
    description: 'Geometric pattern generation from natal coordinates — seed of life, metatron, sri yantra.',
  },
  'sigil-forge': {
    name: 'Sigil Forge',
    substrate: 'TypeScript',
    description: 'Intention-bearing sigil generation from semantic encoding. Requires an explicit intention statement.',
  },
}

export const WORKFLOW_DETAIL: Record<string, { name: string; description: string }> = {
  'birth-blueprint': {
    name: 'Birth Blueprint',
    description: 'Orchestrates all natal engines into one attributable document — Numerology, Human Design, Gene Keys, Vimshottari, Panchanga, Vedic Clock.',
  },
  'daily-practice': {
    name: 'Daily Practice',
    description: 'Personal transit overlay on the daily Panchanga — the day witnessed through your natal architecture.',
  },
  'full-spectrum': {
    name: 'Full Spectrum',
    description: 'Multi-engine integrated reading with intention-bearing sigil. Composes the witness pipeline with the broadest compute surface.',
  },
  'creative-expression': {
    name: 'Creative Expression',
    description: 'Intention-to-reading workflow. The creative act encoded as computational protocol — sigil forge meets witness pipeline.',
  },
  'decision-support': {
    name: 'Decision Support',
    description: 'Structured inquiry workflow for active decisions. Engines selected by question topology, not user preference.',
  },
  'self-inquiry': {
    name: 'Self-Inquiry',
    description: 'Open-ended reflective protocol. The question shapes the engine selection — Tarot, I Ching, Enneagram, or the full pool.',
  },
}
