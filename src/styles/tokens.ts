/**
 * Design tokens — the single source of truth for color and typography.
 *
 * ANTI-DRIFT CONTRACT (Urania 137 multi-page integration plan, §3):
 * No hard-coded hex values or ad-hoc Tailwind color classes are allowed
 * outside this file and the SVG primitives that consume it. Every graph
 * primitive, page layout, and node page imports COLORS / TYPOGRAPHY / SPACING
 * from here so that all seven parent pages read as one system.
 *
 * COLORS mirror `tailwind.config.js` exactly. Tailwind owns the utility
 * classes (text-gold, bg-void, …); this module owns the raw values that SVG
 * fills/strokes need, where Tailwind classes cannot reach.
 */

export const COLORS = {
  void: '#070B1D',
  surface: '#0E1428',
  parchment: '#F0EDE3',
  silver: '#8A9BA8',
  violet: '#2D0050',
  indigo: '#0B50FB',
  gold: '#C5A017',
  emerald: '#10B5A7',
  terracotta: '#C65D3B',
} as const

export type ColorToken = keyof typeof COLORS

/** Neutral copy hierarchy on the Void instrument field. */
export const TEXT = {
  primary: COLORS.parchment,
  secondary: '#C2CBD1',
  metadata: '#AEBBC4',
  disabled: '#75838E',
} as const

/** Evidence is returned, witnessed, or unresolved—not hovered or selected. */
export const EVIDENCE = {
  computed: COLORS.emerald,
  witness: '#7B68EE',
  unresolved: COLORS.terracotta,
} as const

/** Contrast-safe evidence copy; exact evidence hues remain marks and rules. */
export const EVIDENCE_COPY = {
  computed: '#67D4C7',
  witness: '#AFA6FF',
  unresolved: '#EE977C',
} as const

/** Interaction accents describe navigation and focus, never analytical truth. */
export const INTERACTION = {
  active: COLORS.gold,
  selected: '#89A5FF',
  flow: COLORS.indigo,
  focus: '#A9B9FF',
} as const

/** Sustained-reading material uses dark ink on Parchment. */
export const READING = {
  surface: COLORS.parchment,
  ink: '#171B24',
  muted: '#4C5661',
  rule: '#76652A',
} as const

export const TYPE = {
  readingMeasureCh: 70,
  roles: {
    display: { family: 'Panchang', minPx: 18, lineHeight: 1.2, weight: 500 },
    engraving: { family: 'Cinzel', minPx: 16, lineHeight: 1.3, weight: 500 },
    prose: { family: 'Satoshi', minPx: 16, lineHeight: 1.7, weight: 400 },
    ui: { family: 'Satoshi', minPx: 14, lineHeight: 1.45, weight: 500 },
    metadata: { family: 'Satoshi', minPx: 12, lineHeight: 1.5, weight: 500 },
    data: { family: 'SF Mono', minPx: 12, lineHeight: 1.5, weight: 400 },
  },
} as const

/**
 * State accents (moodboard §04 node/connection states + the brand kit's
 * accent2) — tints from the reference palette at higher lightness so they
 * read over the void. Raw values live here only; components import, never
 * inline.
 */
export const STATE = {
  /** Warmer, brighter gold for glows/blooms than the flat token gold. */
  goldWarm: '#E6B84D',
  /** @deprecated Migrate graph consumers to INTERACTION.active. */
  active: INTERACTION.active,
  /** @deprecated Migrate graph consumers to INTERACTION.selected. */
  selected: INTERACTION.selected,
  /** @deprecated Migrate graph consumers to INTERACTION.focus. */
  focus: INTERACTION.focus,
} as const

/** Brand motion spec (Tryambakam Noesis brand kit): out-expo, 1000ms reveal. */
export const MOTION = {
  easing: 'cubic-bezier(0.19, 1, 0.22, 1)',
  revealMs: 1000,
  snapMs: 300,
} as const

/**
 * Maps a StellarNode `color` field to its resolved hex accent.
 * Node data uses semantic names (gold/cyan/violet/amber); the graph
 * resolves them here so no component hard-codes a hex for a node accent.
 */
export const NODE_ACCENTS: Record<string, string> = {
  gold: COLORS.gold,
  cyan: COLORS.emerald,
  violet: COLORS.violet,
  amber: COLORS.gold,
}

export const TYPOGRAPHY = {
  display: 'font-display',
  serif: 'font-serif',
  body: 'font-body',
  /** Node label treatment used on the graph and satellite labels. */
  nodeLabel: 'uppercase tracking-[0.14em] font-display',
  /** Full-page parent title treatment — engraved Roman caps (Cinzel). */
  pageTitle: 'text-4xl font-serif tracking-[0.28em] text-parchment uppercase',
  /** The URANIA 137 / NOESIS wordmark — engraved serif. */
  wordmark: 'font-serif uppercase tracking-[0.24em] text-parchment',
  /** Small overline / eyebrow used above titles and in the corner brand mark. */
  eyebrow: 'text-[10px] uppercase tracking-[0.2em] font-display text-silver',
  /** The gold epithet under a page title / planet label ("THE RADIANCE"). */
  epithet: 'uppercase font-display tracking-[0.34em] text-gold/80',
  /** Breadcrumb overline above a node-page title ("HOME · LUMINARA"). */
  breadcrumb: 'text-[10px] uppercase tracking-[0.26em] font-display text-silver/70',
} as const

export const SPACING = {
  /** Fraction of min(viewport) used for the orbit radius of children. */
  orbitRatio: 0.32,
  /** Central hub visual radius (px) at 1x. */
  coreRadius: 80,
  /** Default satellite branch spread (radians) per sub-node. */
  subNodeSpread: 0.32,
} as const
