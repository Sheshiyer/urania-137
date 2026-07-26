import { SELEMENE_NODES } from '../../data/selemeneNodes'
import { InstrumentDialog } from '../ui/InstrumentDialog'

export interface BeginReadingDialogProps {
  open: boolean
  onClose: () => void
}

const RUNNABLE_LENSES = SELEMENE_NODES.map((node) => ({
  ...node,
  runnableChildren: (node.children ?? []).filter((child) => child.run),
})).filter((node) => node.runnableChildren.length > 0)

/**
 * A direct index of capabilities Urania can actually run. The taxonomy remains
 * the source of truth: reference-only children never become false doorways.
 */
export function BeginReadingDialog({ open, onClose }: BeginReadingDialogProps) {
  return (
    <InstrumentDialog
      open={open}
      title="Begin a reading"
      description="Choose a lens and a real Selemene doorway. The same narrator opens here as on the map."
      onClose={onClose}
      headerAlign="start"
      className="max-w-4xl"
      bodyClassName="max-h-[min(68vh,760px)] overflow-y-auto"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {RUNNABLE_LENSES.map((node) => (
          <section
            key={node.id}
            data-parent-lens={node.id}
            aria-labelledby={`reading-lens-${node.id}`}
            className="border-t border-gold/20 pt-4"
          >
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2
                id={`reading-lens-${node.id}`}
                className="font-serif text-lg text-parchment"
              >
                {node.label}
              </h2>
              <span className="font-display text-[9px] uppercase tracking-[0.2em] text-metadata">
                {node.epithet}
              </span>
            </div>
            <ul className="grid gap-2">
              {node.runnableChildren.map((child) => (
                <li key={child.id}>
                  <a
                    href={`#/node/${encodeURIComponent(node.id)}/${encodeURIComponent(child.id)}`}
                    data-reading-doorway={`${node.id}:${child.id}`}
                    onClick={onClose}
                    className="group flex min-h-11 items-center justify-between gap-4 border border-gold/15 bg-void/35 px-3.5 py-2.5 text-left transition-colors hover:border-gold/45 hover:bg-gold/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    <span className="font-display text-[10px] uppercase tracking-[0.16em] text-silver transition-colors group-hover:text-parchment">
                      {child.label}
                    </span>
                    <span
                      className="h-1.5 w-1.5 shrink-0 rotate-45 border border-gold/60"
                      aria-hidden="true"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </InstrumentDialog>
  )
}
