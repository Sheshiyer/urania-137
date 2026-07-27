import { RunStateBadge, type ReadingRunState } from './RunStateBadge'

export interface SystemRunEntry {
  id: string
  state: Extract<ReadingRunState, 'declared' | 'returned' | 'missing' | 'failed' | 'capture-gated'>
}

const ORDER: SystemRunEntry['state'][] = ['declared', 'returned', 'failed', 'capture-gated', 'missing']
const LABEL: Record<SystemRunEntry['state'], string> = {
  declared: 'Declared systems',
  returned: 'Returned systems',
  failed: 'Failed systems',
  'capture-gated': 'Capture-gated systems',
  missing: 'Missing systems',
}

export function SystemRunLedger({ entries }: { entries: SystemRunEntry[] }) {
  return (
    <section className="console-card min-w-0 p-4" aria-labelledby="system-run-ledger-title">
      <p className="console-eyebrow">Workflow evidence</p>
      <h2 id="system-run-ledger-title" className="mt-1 font-serif text-base text-primary">System run ledger</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {ORDER.map((state) => {
          const systems = entries.filter((entry) => entry.state === state)
          if (systems.length === 0) return null
          return (
            <section key={state} className="border border-reading-rule/30 bg-void/35 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs uppercase tracking-[0.14em] text-secondary">{LABEL[state]}</h3>
                <RunStateBadge state={state} />
              </div>
              <ul className="mt-2 space-y-1 text-xs text-primary">
                {systems.map(({ id }) => <li key={id}>{id}</li>)}
              </ul>
            </section>
          )
        })}
      </div>
    </section>
  )
}
