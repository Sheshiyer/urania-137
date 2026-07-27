import type { ReadingElement } from '../../../lib/readings'
import {
  ENGINE_VISUAL_REGISTRY,
  WORKFLOW_VISUAL_REGISTRY,
  type EngineVisualContract,
  type EngineVisualFamily,
  type WorkflowVisualContract,
} from '../../../lib/readings/engineVisualRegistry'
import { ReadingElementView } from './ReadingElementView'

interface IndexedElement {
  element: ReadingElement
  sourceOrder: number
}

const FAMILY_BORDER: Record<EngineVisualFamily, string> = {
  foundation: 'border-gold/35',
  time: 'border-emerald/35',
  motion: 'border-indigo/40',
  symbol: 'border-violetglow/35',
  creation: 'border-goldwarm/35',
  capture: 'border-terracotta/40',
}

const FAMILY_LABEL: Record<EngineVisualFamily, string> = {
  foundation: 'Foundation',
  time: 'Time',
  motion: 'Motion',
  symbol: 'Symbol',
  creation: 'Creation',
  capture: 'Capture',
}

const SINGLE_COLUMN_WORKFLOWS = new Set(['daily-practice', 'self-inquiry'])

function titleCase(value: string): string {
  return value
    .split('-')
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join(' ')
}

function humanizeIdentifier(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
}

function hasOwnContract(
  registry: Record<string, unknown>,
  id: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(registry, id)
}

export function hasKnownReadingComposition(elements: ReadingElement[]): boolean {
  return elements.some(({ sourceSystem }) =>
    hasOwnContract(ENGINE_VISUAL_REGISTRY, sourceSystem)
    || hasOwnContract(WORKFLOW_VISUAL_REGISTRY, sourceSystem),
  )
}

function ElementRegion({
  item,
  owner,
}: {
  item: IndexedElement
  owner: string
}) {
  return (
    <div
      className="min-w-0 max-w-full"
      role="region"
      aria-label={`${item.element.title} source-shaped element`}
      data-composition-owner={owner}
      data-source-order={item.sourceOrder}
    >
      <ReadingElementView element={item.element} />
    </div>
  )
}

function ElementGrid({
  items,
  owner,
  slot,
  className = '',
}: {
  items: IndexedElement[]
  owner: string
  slot: 'primary' | 'supporting' | 'workflow-ledger' | 'unclassified' | 'technical-source'
  className?: string
}) {
  if (items.length === 0) return null
  return (
    <div
      className={`grid min-w-0 gap-4 ${className}`}
      data-composition-slot={slot}
    >
      {items.map((item) => (
        <ElementRegion key={`${item.element.id}:${item.sourceOrder}`} item={item} owner={owner} />
      ))}
    </div>
  )
}

function EngineComposition({
  engineId,
  contract,
  items,
}: {
  engineId: string
  contract: EngineVisualContract
  items: IndexedElement[]
}) {
  const primary = items.filter(({ element }) => element.kind === contract.primary)
  const supporting = items.filter(({ element }) => element.kind !== contract.primary)
  const owner = `engine:${engineId}`

  return (
    <section
      className={`min-w-0 border-y py-5 ${FAMILY_BORDER[contract.family]}`}
      role="region"
      aria-label={`${engineId.replace(/-/g, ' ')} engine composition`}
      data-engine-composition={engineId}
      data-engine-family={contract.family}
      data-engine-status={contract.status}
      data-engine-provenance={contract.provenance}
      data-atlas-primary={contract.atlasComponents.primary}
    >
      <header className="mb-4 flex min-w-0 flex-wrap items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="font-display text-xs uppercase tracking-[0.14em] text-reading-muted">
            {FAMILY_LABEL[contract.family]} · Engine composition
          </p>
          <p className="mt-1 break-words font-serif text-lg leading-tight text-reading-ink">
            {titleCase(engineId)}
          </p>
          <p className="mt-1 [overflow-wrap:anywhere] text-xs uppercase tracking-[0.1em] text-reading-muted">
            {humanizeIdentifier(contract.atlasComponents.primary)}
            {contract.atlasComponents.secondary
              ? ` · ${humanizeIdentifier(contract.atlasComponents.secondary)}`
              : ''}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2 text-xs uppercase tracking-[0.1em]">
          <span className="border border-reading-rule/35 px-2 py-1 text-reading-muted">
            {contract.status}
          </span>
          <span className="border border-reading-rule/35 px-2 py-1 text-reading-muted">
            {contract.provenance.replace('-', ' ')}
          </span>
        </div>
      </header>

      {primary.length > 0 ? (
        <ElementGrid
          items={primary}
          owner={owner}
          slot="primary"
          className="grid-cols-1"
        />
      ) : (
        <p
          className="border-l border-terracotta/35 px-4 py-3 text-xs leading-relaxed text-reading-muted"
          data-composition-slot="primary"
          data-composition-fallback={contract.atlasComponents.fallback}
        >
          The primary source layer was not returned. Available supporting
          elements remain visible without inferred replacement.
        </p>
      )}

      <ElementGrid
        items={supporting}
        owner={owner}
        slot="supporting"
        className="mt-4 grid-cols-1"
      />
    </section>
  )
}

function UnclassifiedComposition({ items }: { items: IndexedElement[] }) {
  if (items.length === 0) return null
  return (
    <section
      className="min-w-0 border-y border-reading-rule/30 py-5"
      role="region"
      aria-label="Unclassified source-shaped elements"
      data-reading-composition="unclassified"
    >
      <header className="mb-4 px-1">
        <p className="font-display text-xs uppercase tracking-[0.14em] text-reading-muted">
          Source-shaped fallback
        </p>
        <p className="mt-1 font-serif text-base text-reading-ink">
          Unclassified returned elements
        </p>
      </header>
      <ElementGrid
        items={items}
        owner="unclassified"
        slot="unclassified"
        className="reading-composition-grid"
      />
    </section>
  )
}

function TechnicalSourceComposition({ items }: { items: IndexedElement[] }) {
  if (items.length === 0) return null
  return (
    <section
      className="min-w-0 border-y border-reading-rule/30 py-5"
      role="region"
      aria-label="Technical source fallbacks"
      data-reading-composition="technical-source"
    >
      <ElementGrid
        items={items}
        owner="technical-source"
        slot="technical-source"
        className="grid-cols-1"
      />
    </section>
  )
}

function orderedEngineIds(
  items: IndexedElement[],
  declared: readonly string[] = [],
): string[] {
  const present = new Set(
    items
      .map(({ element }) => element.sourceSystem)
      .filter((id) => hasOwnContract(ENGINE_VISUAL_REGISTRY, id)),
  )
  const declaredPresent = declared.filter((id) => present.has(id))
  const declaredSet = new Set(declared)
  const undeclaredPresent = [...present].filter((id) => !declaredSet.has(id))
  return [...declaredPresent, ...undeclaredPresent]
}

function engineGroups(
  items: IndexedElement[],
  declared: readonly string[] = [],
) {
  return orderedEngineIds(items, declared).map((engineId) => ({
    engineId,
    contract: ENGINE_VISUAL_REGISTRY[engineId],
    items: items.filter(({ element }) => element.sourceSystem === engineId),
  }))
}

function WorkflowComposition({
  workflowId,
  contract,
  items,
}: {
  workflowId: string
  contract: WorkflowVisualContract
  items: IndexedElement[]
}) {
  const raw = items.filter(({ element }) => element.kind === 'raw')
  const visual = items.filter(({ element }) => element.kind !== 'raw')
  const workflowOwned = visual.filter(({ element }) => element.sourceSystem === workflowId)
  const engines = engineGroups(visual, contract.engineIds)
  const knownEngineIds = new Set(engines.map(({ engineId }) => engineId))
  const unknown = visual.filter(({ element }) =>
    element.sourceSystem !== workflowId && !knownEngineIds.has(element.sourceSystem),
  )

  return (
    <section
      className="min-w-0 space-y-5 border-y border-reading-rule/40 py-5"
      role="region"
      aria-label={`${contract.name} workflow composition`}
      data-workflow-composition={workflowId}
      data-workflow-layout={contract.atlasComponents.primary}
      data-atlas-primary={contract.atlasComponents.primary}
    >
      <header className="flex min-w-0 flex-wrap items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="font-display text-xs uppercase tracking-[0.14em] text-reading-muted">
            Workflow composition · {contract.status}
          </p>
          <p className="mt-1 break-words font-serif text-xl leading-tight text-reading-ink">
            {contract.surface}
          </p>
          <p className="mt-1 [overflow-wrap:anywhere] text-xs uppercase tracking-[0.1em] text-reading-muted">
            {humanizeIdentifier(contract.atlasComponents.primary)} · {contract.name}
          </p>
        </div>
        <p className="max-w-sm text-xs leading-relaxed text-reading-muted">
          {contract.nonVisual.label}
        </p>
      </header>

      <ElementGrid
        items={workflowOwned}
        owner={`workflow:${workflowId}`}
        slot="workflow-ledger"
        className="grid-cols-1"
      />

      <div
        className={[
          'reading-composition-grid grid min-w-0 gap-5',
          SINGLE_COLUMN_WORKFLOWS.has(workflowId)
            ? 'reading-composition-grid--single'
            : '',
        ].join(' ')}
        aria-label={`${contract.name} contributing Engine compositions`}
      >
        {engines.map((group) => (
          <EngineComposition key={group.engineId} {...group} />
        ))}
      </div>

      <UnclassifiedComposition items={unknown} />
      <TechnicalSourceComposition items={raw} />
    </section>
  )
}

export function ReadingComposition({ elements }: { elements: ReadingElement[] }) {
  const indexed = elements.map((element, sourceOrder) => ({ element, sourceOrder }))
  const workflowId = indexed
    .map(({ element }) => element.sourceSystem)
    .find((id) => hasOwnContract(WORKFLOW_VISUAL_REGISTRY, id))

  if (workflowId) {
    return (
      <WorkflowComposition
        workflowId={workflowId}
        contract={WORKFLOW_VISUAL_REGISTRY[workflowId]}
        items={indexed}
      />
    )
  }

  const raw = indexed.filter(({ element }) => element.kind === 'raw')
  const visual = indexed.filter(({ element }) => element.kind !== 'raw')
  const engines = engineGroups(visual)
  const knownEngineIds = new Set(engines.map(({ engineId }) => engineId))
  const unknown = visual.filter(({ element }) => !knownEngineIds.has(element.sourceSystem))

  return (
    <div className="min-w-0 space-y-5">
      {engines.map((group) => (
        <EngineComposition key={group.engineId} {...group} />
      ))}
      <UnclassifiedComposition items={unknown} />
      <TechnicalSourceComposition items={raw} />
    </div>
  )
}
