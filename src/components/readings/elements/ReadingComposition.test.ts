import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  extractReadingElements,
  type ReadingElement,
} from '../../../lib/readings'
import {
  ENGINE_VISUAL_REGISTRY,
  WORKFLOW_VISUAL_REGISTRY,
} from '../../../lib/readings/engineVisualRegistry'
import { ReadingElementField } from './ReadingElementField'

const base = (engineId: string) => ({
  id: `${engineId}:primary`,
  title: `${engineId} primary`,
  sourceSystem: engineId,
  sourcePath: `${engineId}.result`,
  evidenceKind: 'deterministic' as const,
  confidence: 'derived' as const,
})

function primaryElement(
  engineId: string,
  kind: ReadingElement['kind'],
): ReadingElement {
  const shared = base(engineId)
  switch (kind) {
    case 'fact-grid':
      return {
        ...shared,
        kind,
        layout: 'grid',
        facts: [{ id: 'fact', label: 'Fact', value: 'Value' }],
      }
    case 'number-codes':
      return {
        ...shared,
        kind,
        codes: [{ id: 'code', label: 'Code', value: '7', reduction: ['34', '7'] }],
      }
    case 'positions':
      return {
        ...shared,
        kind,
        frame: 'generic',
        positions: [{ id: 'point', label: 'Point', sign: 'Aries', degree: 1 }],
      }
    case 'relations':
      return {
        ...shared,
        kind,
        relations: [{ id: 'relation', from: 'A', to: 'B', relation: 'Named relation' }],
      }
    case 'sequence':
      return {
        ...shared,
        kind,
        sequenceType: 'ordered',
        steps: [{ id: 'step', label: 'Step', value: 'One' }],
      }
    case 'cycles':
      return {
        ...shared,
        kind,
        cycles: [{ id: 'cycle', label: 'Cycle', value: 50, unit: '%', min: 0, max: 100 }],
      }
    case 'spread':
      return {
        ...shared,
        kind,
        tradition: 'generic',
        positions: [{ id: 'position', label: 'Position', value: 'Value' }],
      }
    case 'collections':
      return {
        ...shared,
        kind,
        groups: [{ id: 'group', label: 'Group', items: ['Item'] }],
      }
    case 'questions':
      return {
        ...shared,
        kind,
        questions: ['What is present?'],
      }
    case 'notice':
      return {
        ...shared,
        kind,
        tone: 'unresolved',
        body: 'Source remains unresolved.',
      }
    case 'media':
      return {
        ...shared,
        kind,
        items: [{
          id: 'media',
          label: 'Audio',
          mediaType: 'audio',
          sourcePath: `${engineId}.result.audio`,
          status: 'missing',
          textEquivalent: 'Audio unavailable.',
        }],
      }
    case 'artifact':
      return {
        ...shared,
        kind,
        artifactType: 'sigil',
        status: 'missing',
        items: [],
        steps: [],
      }
    case 'capture':
      return {
        ...shared,
        kind,
        captureState: 'capture-required',
        body: 'Capture required.',
        observations: [],
      }
    case 'raw':
      return {
        ...shared,
        kind,
        value: { source: true, credentials: { api_key: 'must-not-leak' } },
      }
  }
}

function notice(engineId: string, index: number): ReadingElement {
  return {
    ...base(engineId),
    id: `${engineId}:notice:${index}`,
    title: `${engineId} returned`,
    kind: 'notice',
    tone: 'source',
    body: 'Returned source group.',
  }
}

describe('Reading composition', () => {
  it('maps all eighteen Engine contracts into labelled live composition regions', () => {
    const elements = Object.entries(ENGINE_VISUAL_REGISTRY).map(([engineId, contract]) =>
      primaryElement(engineId, contract.primary),
    )
    const html = renderToStaticMarkup(createElement(ReadingElementField, { elements }))

    expect(html.match(/data-engine-composition=/g)).toHaveLength(18)
    for (const [engineId, contract] of Object.entries(ENGINE_VISUAL_REGISTRY)) {
      expect(html).toContain(`data-engine-composition="${engineId}"`)
      expect(html).toContain(`data-engine-family="${contract.family}"`)
      expect(html).toContain(`data-engine-status="${contract.status}"`)
      expect(html).toContain(`data-engine-provenance="${contract.provenance}"`)
      expect(html).toContain(`data-atlas-primary="${contract.atlasComponents.primary}"`)
      expect(html).toContain(`aria-label="${engineId.replace(/-/g, ' ')} engine composition"`)
    }
    expect(html.match(/data-composition-slot="primary"/g)).toHaveLength(18)
    expect(html.match(/data-reading-element=/g)).toHaveLength(elements.length)
  })

  it('keeps every registered Engine reachable when a specialized source layer is absent', () => {
    for (const engineId of Object.keys(ENGINE_VISUAL_REGISTRY)) {
      const elements = extractReadingElements({ engine_id: engineId, result: null })
      const html = renderToStaticMarkup(createElement(ReadingElementField, { elements }))

      expect(html).toContain(`data-engine-composition="${engineId}"`)
      expect(html).toContain('data-reading-element="notice"')
      expect(html).toContain('data-reading-composition="technical-source"')
    }
  })

  it('stable-partitions primary and supporting elements without duplicating either', () => {
    const supporting = notice('numerology', 1)
    const primary = primaryElement('numerology', 'number-codes')
    const trailing = notice('numerology', 2)
    const html = renderToStaticMarkup(createElement(ReadingElementField, {
      elements: [supporting, primary, trailing],
    }))

    expect(html.match(/data-reading-element=/g)).toHaveLength(3)
    expect(html.indexOf('numerology primary')).toBeLessThan(html.indexOf('numerology returned'))
    expect(html.indexOf('reading-element-numerology-notice-1')).toBeLessThan(
      html.indexOf('reading-element-numerology-notice-2'),
    )
    expect(html).toContain('data-composition-slot="primary"')
    expect(html).toContain('data-composition-slot="supporting"')
    const supportingGrids = [...html.matchAll(
      /<div class="([^"]+)" data-composition-slot="supporting">/g,
    )]
    expect(supportingGrids.length).toBeGreaterThan(0)
    expect(supportingGrids.every(([, classes]) => classes.includes('grid-cols-1'))).toBe(true)
    expect(supportingGrids.every(([, classes]) => !classes.includes('sm:grid-cols-2'))).toBe(true)
  })

  it('renders all six named workflow compositions in declared Engine order', () => {
    for (const [workflowId, contract] of Object.entries(WORKFLOW_VISUAL_REGISTRY)) {
      const ledger: ReadingElement = {
        ...base(workflowId),
        id: `${workflowId}:system-run-ledger`,
        title: 'Workflow system run ledger',
        kind: 'collections',
        groups: [{ id: 'returned', label: 'Returned systems', items: [...contract.engineIds] }],
      }
      const returned = [...contract.engineIds]
        .reverse()
        .map((engineId, index) => notice(engineId, index))
      const html = renderToStaticMarkup(createElement(ReadingElementField, {
        elements: [ledger, ...returned],
      }))

      expect(html).toContain(`data-workflow-composition="${workflowId}"`)
      expect(html).toContain('reading-composition-grid')
      expect(html).toContain(`data-atlas-primary="${contract.atlasComponents.primary}"`)
      expect(html).toContain(`aria-label="${contract.name} workflow composition"`)
      expect(html.match(/data-reading-element=/g)).toHaveLength(1 + returned.length)

      const positions = contract.engineIds.map((engineId) =>
        html.indexOf(`data-engine-composition="${engineId}"`),
      )
      expect(positions.every((position) => position >= 0)).toBe(true)
      expect(positions).toEqual([...positions].sort((left, right) => left - right))
      expect(html).not.toContain('xl:grid-cols-3')
    }
  })

  it('keeps undeclared, unknown, and raw output visible exactly once', () => {
    const workflowId = 'daily-practice'
    const ledger: ReadingElement = {
      ...base(workflowId),
      id: `${workflowId}:system-run-ledger`,
      title: 'Workflow system run ledger',
      kind: 'collections',
      groups: [],
    }
    const undeclared = notice('numerology', 0)
    const unknown = notice('future-engine', 1)
    const raw = primaryElement('future-engine', 'raw')
    const html = renderToStaticMarkup(createElement(ReadingElementField, {
      elements: [ledger, undeclared, unknown, raw],
    }))

    expect(html.match(/data-reading-element=/g)).toHaveLength(4)
    expect(html).toContain('data-engine-composition="numerology"')
    expect(html).toContain('data-reading-composition="unclassified"')
    expect(html).toContain('data-reading-composition="technical-source"')
    expect(html).toContain('[REDACTED]')
  })
})
