import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { GraphOrbital } from '../../types'
import { CoreGlow } from '../primitives/CoreGlow'
import { RelationList } from './RelationList'
import { buildGraphEntries } from './graphEntries'

describe('buildGraphEntries', () => {
  it('forwards each home node description as its orbital purpose', () => {
    const homeSource = readFileSync(
      fileURLToPath(new URL('../../pages/HomePage.tsx', import.meta.url)),
      'utf8',
    )

    expect(homeSource).toContain('description: node.description')
  })

  it('keeps CoreGlow decoration inert while its center remains a keyboard action', () => {
    const glowSource = readFileSync(
      fileURLToPath(new URL('../primitives/CoreGlow.tsx', import.meta.url)),
      'utf8',
    )
    const html = renderToStaticMarkup(
      createElement(
        'svg',
        null,
        createElement(CoreGlow, {
          centerX: 100,
          centerY: 100,
          label: 'NOESIS',
          ornate: true,
          onActivate: () => undefined,
        }),
      ),
    )

    expect(glowSource).toContain('onClick={onActivate}')
    expect(html).toContain('<button type="button"')
    expect(html).toContain('aria-label="Return to home from NOESIS"')
    expect(html).toContain('focus-visible:outline')
    expect(html).toContain('min-h-11')
    expect(html).toContain('min-w-11')
    expect(html).toContain('data-hit-target="44"')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('pointer-events="none"')
    expect(html).toContain('pointer-events-none')
  })

  it('preserves source order while naming each orbital relationship', () => {
    const orbitals: GraphOrbital[] = [
      {
        id: 'birth',
        label: 'Birth Witness',
        epithet: 'The Arrival',
        angle: 0,
        subCount: 4,
      },
    ]

    expect(buildGraphEntries(orbitals)).toEqual([
      {
        id: 'birth',
        label: 'Birth Witness',
        description: 'The Arrival',
        relation: 'lens of NOESIS',
      },
    ])
  })

  it('keeps decorative graph geometry outside pointer interaction', () => {
    const graphSource = readFileSync(
      fileURLToPath(new URL('../ConstellationGraph.tsx', import.meta.url)),
      'utf8',
    )
    const nodeSource = readFileSync(
      fileURLToPath(new URL('../primitives/StellarNode.tsx', import.meta.url)),
      'utf8',
    )
    const lensSource = readFileSync(
      fileURLToPath(new URL('./GraphLens.tsx', import.meta.url)),
      'utf8',
    )

    expect(graphSource).not.toContain('role="img"')
    expect(graphSource).toContain('pointerEvents="none"')
    expect(graphSource).toContain('className="pointer-events-none"')
    expect(nodeSource).toContain('pointerEvents="none"')
    expect(nodeSource).toContain('data-hit-target={INTERACTION_TARGET.minimumPx}')
    expect(nodeSource).toContain('group-focus-visible:opacity-100')
    expect(graphSource).not.toContain('STATE.active')
    expect(nodeSource).not.toContain('STATE.selected')
    expect(lensSource).toContain('(max-width: 48rem)')
    expect(lensSource).toContain('(prefers-reduced-motion: reduce)')
    expect(lensSource).toContain('(prefers-reduced-transparency: reduce)')
  })

  it('does not filter or reorder the seven parent destinations', () => {
    const ids = ['birth', 'compat', 'transit', 'witness', 'engine', 'folio', 'bridge']
    const orbitals: GraphOrbital[] = ids.map((id, index) => ({
      id,
      label: `Parent ${index + 1}`,
      angle: index * 51.4,
      subCount: index,
    }))

    expect(buildGraphEntries(orbitals).map((entry) => entry.id)).toEqual(ids)
  })

  it('renders the same order as semantic, 44-pixel list actions', () => {
    const entries = buildGraphEntries([
      { id: 'birth', label: 'Birth Witness', epithet: 'The Arrival', angle: 0, subCount: 4 },
      { id: 'compat', label: 'Union Mirror', epithet: 'The Union', angle: 51.4, subCount: 3 },
    ])
    const html = renderToStaticMarkup(
      createElement(RelationList, {
        entries,
        selectedId: 'compat',
        onSelect: () => undefined,
      }),
    )

    expect(html).toContain('<ol')
    expect(html.indexOf('Birth Witness')).toBeLessThan(html.indexOf('Union Mirror'))
    expect(html).toContain('min-h-11')
    expect(html).toContain('aria-pressed="true"')
  })
})
