import type { ChildRun, SelemeneChild } from '../types'

export type NodeEntry = 'chat' | 'deterministic' | 'daily' | 'info' | 'folio'

function entryForRun(run: ChildRun): Exclude<NodeEntry, 'info' | 'folio'> {
  switch (run.kind) {
    case 'witness':
      return 'chat'
    case 'engine':
    case 'workflow':
      return 'deterministic'
    case 'daily':
      return 'daily'
    default: {
      const unreachable: never = run
      return unreachable
    }
  }
}

/**
 * Resolve the first interface for one declared node capability.
 *
 * The `ChildRun` discriminant is the authority: witness modes use narration,
 * deterministic runs use the instrument, and daily runs use their place/time
 * surface. An absent run is an explicit information branch rather than a
 * fallback for an unknown future capability.
 */
export function resolveNodeEntry(nodeId: string, child: SelemeneChild): NodeEntry {
  if (nodeId === 'folio' && child.action) return 'folio'
  if (!child.run) return 'info'
  return entryForRun(child.run)
}
