import { describe, expect, it } from 'vitest'
import { buildPaletteIndex, filterPaletteItems } from './paletteIndex'

describe('paletteIndex', () => {
  it('indexes all seven parent nodes in the navigate group', () => {
    const items = buildPaletteIndex()
    const navItems = items.filter((i) => i.group === 'navigate')
    expect(navItems.length).toBe(7)
    expect(navItems.map((i) => i.label)).toContain('Birth Witness')
    expect(navItems.map((i) => i.label)).toContain('Noesis Reading')
  })

  it('indexes runnable doorways with parent labels', () => {
    const items = buildPaletteIndex()
    const doorways = items.filter((i) => i.group === 'doorways')
    expect(doorways.length).toBeGreaterThan(20)
    const numerology = doorways.find((d) => d.label === 'Numerology')
    expect(numerology).toBeTruthy()
    expect(numerology!.parentLabel).toBe('Birth Witness')
    expect(numerology!.onSelect()).toBe('/node/birth/numerology/run')
  })

  it('indexes the four core actions', () => {
    const items = buildPaletteIndex()
    const actions = items.filter((i) => i.group === 'actions')
    expect(actions.map((i) => i.label)).toEqual([
      'Begin a reading',
      'Browse Folio',
      'Open Settings',
      'Return to map',
    ])
  })

  it('filters items by query against label and parent', () => {
    const items = buildPaletteIndex()
    const result = filterPaletteItems(items, 'tarot')
    expect(result.length).toBeGreaterThanOrEqual(1)
    expect(result.every((r) => r.label.toLowerCase().includes('tarot') || r.parentLabel?.toLowerCase().includes('tarot'))).toBe(true)
  })

  it('returns all items when query is empty', () => {
    const items = buildPaletteIndex()
    expect(filterPaletteItems(items, '')).toEqual(items)
    expect(filterPaletteItems(items, '  ')).toEqual(items)
  })
})
