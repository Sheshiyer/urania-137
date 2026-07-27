import type { GraphEntry, GraphOrbital } from '../../types'

/**
 * Build the single ordered relationship model consumed by both visual lenses.
 * No sorting or filtering happens here: DOM and SVG order remain source order.
 */
export function buildGraphEntries(
  orbitals: readonly GraphOrbital[],
  centerLabel = 'NOESIS',
): GraphEntry[] {
  return orbitals.map((orbital) => ({
    id: orbital.id,
    label: orbital.label,
    description: orbital.epithet ?? orbital.description ?? 'Available path',
    ...(orbital.description && orbital.description !== orbital.epithet
      ? { purpose: orbital.description }
      : {}),
    relation: orbital.relation ?? `lens of ${centerLabel}`,
  }))
}
