import { describe, expect, it } from 'vitest'
import { SELEMENE_NODES } from '../data/selemeneNodes'
import type { SelemeneChild } from '../types'
import {
  presentChild,
  presentNode,
  type ChildPresentationState,
} from './nodePresentation'

function expectedState(child: SelemeneChild): ChildPresentationState {
  if (child.action) return 'folio-doorway'
  if (child.run) return 'runnable'
  return 'information'
}

describe('node presentation', () => {
  it('derives real counts and one complete relation entry per child', () => {
    for (const node of SELEMENE_NODES) {
      const presentation = presentNode(node)
      const children = node.children ?? []

      expect(presentation.childCount).toBe(children.length)
      expect(presentation.entries).toHaveLength(children.length)
      expect(presentation.entries.map((entry) => entry.id)).toEqual(
        children.map((child) => child.id),
      )

      for (const entry of presentation.entries) {
        expect(entry.description.trim().length).toBeGreaterThan(0)
        expect(entry.purpose?.trim().length).toBeGreaterThan(0)
        expect(entry.relation.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('derives child state from capability, info, or action rather than label shape', () => {
    for (const node of SELEMENE_NODES) {
      for (const child of node.children ?? []) {
        expect(presentChild(child, node.label).state).toBe(expectedState(child))
      }
    }

    const short: SelemeneChild = {
      id: 'same-capability',
      label: 'A',
      run: { kind: 'engine', engineId: 'tarot' },
    }
    const long: SelemeneChild = {
      ...short,
      label: 'A deliberately much longer display label',
    }
    expect(presentChild(short, 'Bridge Query').state).toBe(
      presentChild(long, 'Bridge Query').state,
    )
  })

  it('uses grounded node vocabulary and exposes no reference-only states', () => {
    const copy = JSON.stringify(SELEMENE_NODES).toLowerCase()
    expect(copy).not.toMatch(/\bresonance\b|\blive paths\b|\bfrequency\b/)

    for (const node of SELEMENE_NODES) {
      const presentation = presentNode(node)
      expect(
        presentation.entries.every((entry) => String(entry.state) !== 'disabled'),
      ).toBe(true)
    }
  })

  it('keeps Engine Status operator-dense and non-interpretive', () => {
    const engine = SELEMENE_NODES.find((node) => node.id === 'engine')
    expect(engine).toBeDefined()

    const presentation = presentNode(engine!)
    expect(presentation.density).toBe('operator')
    expect(presentation.interpretive).toBe(false)
  })

  it('keeps only supported Folio doorways and the Mirror instrument', () => {
    const folio = SELEMENE_NODES.find((node) => node.id === 'folio')
    expect(folio?.children?.map((child) => child.id)).toEqual([
      'saved-reports',
      'noesis-mirror',
      'search',
      'favorites',
    ])
    expect(
      folio?.children
        ?.filter((child) => child.id !== 'noesis-mirror')
        .every((child) => child.action === 'list' || child.action === 'search' || child.action === 'favorites'),
    ).toBe(true)
  })
})
