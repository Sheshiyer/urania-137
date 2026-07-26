import { buildGraphEntries } from '../components/graph/graphEntries'
import type {
  GraphEntry,
  GraphOrbital,
  SelemeneChild,
  StellarNode,
} from '../types'

export type ChildPresentationState =
  | 'runnable'
  | 'information'
  | 'folio-doorway'

export interface ChildPresentation extends GraphEntry {
  state: ChildPresentationState
}

export interface NodePresentation {
  childCount: number
  runnableCount: number
  informationCount: number
  density: 'reading' | 'operator'
  interpretive: boolean
  entries: ChildPresentation[]
  orbitals: GraphOrbital[]
}

function runDescription(run: NonNullable<SelemeneChild['run']>): {
  description: string
  purpose: string
  relation: string
} {
  switch (run.kind) {
    case 'engine':
      return {
        description: 'Runnable engine calculation',
        purpose: `Calculate with the live ${run.engineId} engine.`,
        relation: 'engine capability',
      }
    case 'workflow':
      return {
        description: 'Runnable guided workflow',
        purpose: `Begin the live ${run.workflowId} workflow.`,
        relation: 'workflow capability',
      }
    case 'witness':
      return {
        description: 'Runnable witness reading',
        purpose: `Generate the ${run.mode} reading for ${run.minSubjects}–${run.maxSubjects} people.`,
        relation: 'witness capability',
      }
    case 'daily':
      return {
        description: 'Runnable daily reading',
        purpose: 'Read the current panchanga and sky conditions for a chosen location.',
        relation: 'daily capability',
      }
  }
}

function infoDescription(child: SelemeneChild): {
  description: string
  purpose: string
  relation: string
} {
  switch (child.id) {
    case 'live-status':
      return {
        description: 'Live operator evidence',
        purpose: 'Inspect endpoint-backed engine and infrastructure availability.',
        relation: 'operator instrument',
      }
    case 'sankalpa':
      return {
        description: 'Consent-gated desktop instrument',
        purpose: 'Review where Sankalpa practices continue outside this web surface.',
        relation: 'information instrument',
      }
    case 'noesis-mirror':
      return {
        description: 'Saved-reading mirror',
        purpose: 'Walk the authored packs represented by the Noesis Mirror.',
        relation: 'information instrument',
      }
    default:
      return {
        description: 'Information instrument',
        purpose: `Read the grounded context for ${child.label}.`,
        relation: 'information instrument',
      }
  }
}

function actionDescription(child: SelemeneChild): {
  description: string
  purpose: string
  relation: string
} {
  switch (child.action) {
    case 'search':
      return {
        description: 'Folio search doorway',
        purpose: 'Open the canonical Folio and search saved readings.',
        relation: 'Folio doorway',
      }
    case 'favorites':
      return {
        description: 'Folio favorites doorway',
        purpose: 'Open the canonical Folio and review favorite readings.',
        relation: 'Folio doorway',
      }
    default:
      return {
        description: 'Saved-reading doorway',
        purpose: 'Open the canonical Folio of saved readings.',
        relation: 'Folio doorway',
      }
  }
}

export function presentChild(
  child: SelemeneChild,
  parentLabel: string,
): ChildPresentation {
  const state: ChildPresentationState = child.action
    ? 'folio-doorway'
    : child.run
      ? 'runnable'
      : 'information'
  const copy = child.action
    ? actionDescription(child)
    : child.run
      ? runDescription(child.run)
      : infoDescription(child)

  return {
    id: child.id,
    label: child.label,
    state,
    description: copy.description,
    purpose: copy.purpose,
    relation: `${copy.relation} of ${parentLabel}`,
  }
}

export function presentNode(node: StellarNode): NodePresentation {
  const children = node.children ?? []
  const childPresentations = children.map((child) =>
    presentChild(child, node.label),
  )
  const orbitals: GraphOrbital[] = childPresentations.map((child, index) => ({
    id: child.id,
    label: child.label,
    angle: (index / Math.max(children.length, 1)) * 360,
    subCount: 0,
    color: node.color,
    epithet: child.description,
    description: child.purpose,
    relation: child.relation,
    glyph: children[index]?.glyph,
  }))
  const entries = buildGraphEntries(orbitals, node.label).map((entry, index) => ({
    ...entry,
    state: childPresentations[index].state,
  }))

  return {
    childCount: children.length,
    runnableCount: childPresentations.filter((child) => child.state === 'runnable').length,
    informationCount: childPresentations.filter((child) => child.state === 'information').length,
    density: node.id === 'engine' ? 'operator' : 'reading',
    interpretive: node.id !== 'engine',
    entries,
    orbitals,
  }
}
