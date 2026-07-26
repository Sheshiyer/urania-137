import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EngineReading } from '../../components/readings/EngineReading'
import { EvidenceBoundary } from '../../components/readings/EvidenceBoundary'
import { RunStateBadge } from '../../components/readings/RunStateBadge'
import { WorkflowReading } from '../../components/readings/WorkflowReading'
import {
  ENGINE_VISUAL_REGISTRY,
  WORKFLOW_VISUAL_REGISTRY,
} from './engineVisualRegistry'

type Atlas = {
  engines: Array<{
    id: string
    status: string
    provenance: string
    presentation: {
      primaryComponent: string
      secondaryComponent: string
      fallbackComponent: string
      nonVisualEquivalent: string
    }
  }>
  workflows: Array<{
    id: string
    name: string
    engineIds: string[]
    presentation: {
      status: string
      runtimeComponent: string
      primaryComponent: string
      secondaryComponent: string
      fallbackComponent: string
      nonVisualEquivalent: string
    }
  }>
}

const atlas = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../../docs/engine-output-atlas.json', import.meta.url)),
    'utf8',
  ),
) as Atlas

describe('engine visual registry', () => {
  it('registers exactly the executable eighteen engines and six workflows', () => {
    expect(Object.keys(ENGINE_VISUAL_REGISTRY)).toHaveLength(18)
    expect(Object.keys(WORKFLOW_VISUAL_REGISTRY)).toHaveLength(6)
    expect(Object.keys(ENGINE_VISUAL_REGISTRY).sort()).toEqual(
      atlas.engines.map(({ id }) => id).sort(),
    )
    expect(Object.keys(WORKFLOW_VISUAL_REGISTRY).sort()).toEqual(
      atlas.workflows.map(({ id }) => id).sort(),
    )
  })

  it('preserves status, provenance, component assignments, and alternatives', () => {
    for (const engine of atlas.engines) {
      const runtime = ENGINE_VISUAL_REGISTRY[engine.id]
      expect(runtime).toBeDefined()
      expect(runtime).toMatchObject({
        status: engine.status,
        provenance: engine.provenance,
        atlasComponents: {
          primary: engine.presentation.primaryComponent,
          secondary: engine.presentation.secondaryComponent,
          fallback: engine.presentation.fallbackComponent,
        },
      })
      expect(runtime.nonVisual.label).toBe(engine.presentation.nonVisualEquivalent)
      expect(runtime.nonVisual.preservesOrder).toBeTypeOf('boolean')
    }

    for (const workflow of atlas.workflows) {
      const runtime = WORKFLOW_VISUAL_REGISTRY[workflow.id]
      expect(runtime).toMatchObject({
        name: workflow.name,
        status: 'proposed',
        engineIds: workflow.engineIds,
        atlasComponents: {
          runtime: workflow.presentation.runtimeComponent,
          primary: workflow.presentation.primaryComponent,
          secondary: workflow.presentation.secondaryComponent,
          fallback: workflow.presentation.fallbackComponent,
        },
      })
      expect(runtime.nonVisual.label).toBe(workflow.presentation.nonVisualEquivalent)
    }
  })

  it('keeps promised visual orientations explicit', () => {
    expect(ENGINE_VISUAL_REGISTRY.biofield.status).toBe('capture-gated')
    expect(ENGINE_VISUAL_REGISTRY.numerology.primary).toBe('number-codes')
    expect(WORKFLOW_VISUAL_REGISTRY['full-spectrum'].surface).toBe('System Atlas')
    expect(Object.values(WORKFLOW_VISUAL_REGISTRY).every(({ status }) => status === 'proposed')).toBe(true)
  })

  it('keeps partial and unpersisted capture states out of complete treatment', () => {
    const partial = renderToStaticMarkup(createElement(RunStateBadge, { state: 'partial' }))
    const gated = renderToStaticMarkup(createElement(EvidenceBoundary, {
      status: 'capture-gated',
      persisted: false,
      children: createElement('p', null, 'must stay gated'),
    }))

    expect(partial).toContain('data-run-state="partial"')
    expect(partial).not.toContain('emerald')
    expect(gated).toContain('Capture evidence required')
    expect(gated).not.toContain('must stay gated')
    expect(gated).not.toContain('data-evidence-treatment="computed"')
  })

  it('keeps unknown source collapsed, filtered, and non-default', () => {
    const html = renderToStaticMarkup(createElement(EngineReading, {
      envelope: {
        engine_id: 'numerology',
        result: {
          life_path: { value: 7 },
          future_unreviewed_field: 'future-source-value',
        },
        credentials: { api_key: 'must-not-leak' },
      },
    }))

    expect(html).toContain('data-engine-reading="numerology"')
    expect(html).toContain('Technical source')
    expect(html).toContain('<details')
    expect(html).not.toContain('<details open')
    expect(html).toContain('future-source-value')
    expect(html).not.toContain('must-not-leak')
  })

  it('lists workflow run states before rendering only returned engine data', () => {
    const html = renderToStaticMarkup(createElement(WorkflowReading, {
      envelope: {
        workflow_id: 'birth-blueprint',
        engine_outputs: {
          numerology: { engine_id: 'numerology', result: { life_path: { value: 7 } } },
          'human-design': { engine_id: 'human-design', result: null, error: 'Failed safely.' },
        },
      },
    }))

    expect(html).toContain('Declared systems')
    expect(html).toContain('Returned systems')
    expect(html).toContain('Failed systems')
    expect(html).toContain('Capture-gated systems')
    expect(html).toContain('Missing systems')
    expect(html).toContain('data-engine-reading="numerology"')
    expect(html).not.toContain('data-engine-reading="human-design"')
  })

  it('does not expand all seventeen full-spectrum engines into simultaneous cards', () => {
    const outputs = Object.fromEntries(
      WORKFLOW_VISUAL_REGISTRY['full-spectrum'].engineIds.map((id) => [
        id,
        { engine_id: id, result: {} },
      ]),
    )
    const html = renderToStaticMarkup(createElement(WorkflowReading, {
      envelope: { workflow_id: 'full-spectrum', engine_outputs: outputs },
    }))

    expect(html.match(/data-engine-reading=/g)?.length).toBeLessThan(17)
    expect(html).toContain('Additional returned systems')
  })
})
