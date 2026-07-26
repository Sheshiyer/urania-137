import { describe, expect, it } from 'vitest'
import type { ReadingDTO } from '../api/contract'
import { deriveFolioLayout } from './folioLayout'

function reading(
  id: string,
  nodeId: string,
  createdAt: number,
): ReadingDTO {
  return {
    id,
    nodeId,
    nodeLabel: nodeId,
    mode: 'fixture',
    title: `Reading ${id}`,
    content: `Body ${id}`,
    createdAt,
    favorite: false,
  }
}

describe('deriveFolioLayout', () => {
  it('derives angular sectors from each canonical nodeId', () => {
    const layout = deriveFolioLayout([
      reading('same-birth', 'birth', 1_000),
      reading('same-witness', 'witness', 1_000),
    ])

    expect(layout.points.map((point) => point.sectorId)).toEqual([
      'birth',
      'witness',
    ])
    expect(layout.points[0].angleDegrees).not.toBe(
      layout.points[1].angleDegrees,
    )
  })

  it('derives radial distance from canonical creation time', () => {
    const layout = deriveFolioLayout([
      reading('older', 'birth', 1_000),
      reading('newer', 'birth', 9_000),
    ])
    const byId = new Map(layout.points.map((point) => [point.reading.id, point]))

    expect(byId.get('older')!.radius).toBeLessThan(byId.get('newer')!.radius)
  })

  it('is deterministic for identical canonical data', () => {
    const entries = [
      reading('alpha', 'transit', 1_000),
      reading('beta', 'compat', 9_000),
    ]

    expect(deriveFolioLayout(entries)).toEqual(deriveFolioLayout(entries))
  })

  it('places unknown node families in the labelled unmapped sector', () => {
    const [point] = deriveFolioLayout([
      reading('unknown', 'future-node', 1_000),
    ]).points

    expect(point.sectorId).toBe('unmapped')
    expect(point.sectorLabel).toBe('Unmapped')
  })

  it('keeps every plotted reading in the complete adjacent list lens', () => {
    const entries = Array.from({ length: 28 }, (_, index) =>
      reading(`reading-${index}`, index % 2 ? 'birth' : 'witness', index),
    )
    const layout = deriveFolioLayout(entries)
    const listIds = new Set(layout.list.map((entry) => entry.id))

    expect(layout.list).toHaveLength(entries.length)
    expect(layout.points.every((point) => listIds.has(point.reading.id))).toBe(
      true,
    )
  })
})
