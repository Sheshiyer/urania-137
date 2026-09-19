import { SELEMENE_NODES } from '../data/selemeneNodes'
import type { AppPath } from '../hooks/useHashRoute'

export interface PaletteItem {
  id: string
  label: string
  group: 'navigate' | 'actions' | 'doorways'
  parentLabel?: string
  onSelect: () => AppPath
}

export function buildPaletteIndex(): PaletteItem[] {
  const items: PaletteItem[] = []

  for (const node of SELEMENE_NODES) {
    items.push({
      id: `node:${node.id}`,
      label: node.label,
      group: 'navigate',
      onSelect: () => `/node/${node.id}`,
    })

    for (const child of node.children ?? []) {
      if (child.run) {
        const runKind = child.run.kind
        const hasRunSurface = runKind === 'engine' || runKind === 'workflow' || runKind === 'daily'
        items.push({
          id: `doorway:${node.id}/${child.id}`,
          label: child.label,
          group: 'doorways',
          parentLabel: node.label,
          onSelect: () =>
            hasRunSurface
              ? `/node/${node.id}/${child.id}/run`
              : `/node/${node.id}/${child.id}`,
        })
      }
    }
  }

  items.push(
    { id: 'action:begin', label: 'Begin a reading', group: 'actions', onSelect: () => '/chat' },
    { id: 'action:folio', label: 'Browse Folio', group: 'actions', onSelect: () => '/readings' },
    { id: 'action:settings', label: 'Open Settings', group: 'actions', onSelect: () => '/settings' },
    { id: 'action:map', label: 'Return to map', group: 'actions', onSelect: () => '/' },
  )

  return items
}

export function filterPaletteItems(items: PaletteItem[], query: string): PaletteItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      (item.parentLabel && item.parentLabel.toLowerCase().includes(q)),
  )
}
