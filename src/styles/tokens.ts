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
} as const

export const SPACING = {
  /** Fraction of min(viewport) used for the orbit radius of children. */
  orbitRatio: 0.32,
  /** Central hub visual radius (px) at 1x. */
  coreRadius: 80,
  /** Default satellite branch spread (radians) per sub-node. */
  subNodeSpread: 0.32,
} as const
