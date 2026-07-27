import type { ReadingCyclesElement } from '../../../lib/readings'
import { ElementFrame } from './ElementFrame'

function width(value: number, min = 0, max = 100): string {
  const span = max - min || 1
  return `${Math.max(0, Math.min(100, ((value - min) / span) * 100))}%`
}

export function ReadingCycles({ element }: { element: ReadingCyclesElement }) {
  return (
    <ElementFrame element={element} encoding="Bar length uses the source scale; every value and phase is also written in text.">
      {element.targetLabel && <p className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-silver/60">Target · {element.targetLabel}</p>}
      <ul className="space-y-3">
        {element.cycles.map((cycle) => (
          <li key={cycle.id}>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs text-parchment/90">{cycle.label}</span>
              <span className="font-mono text-xs tabular-nums text-gold">
                {cycle.value.toFixed(2)}{cycle.unit} {cycle.status ? `· ${cycle.status}` : ''}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden bg-parchment/10" aria-hidden="true">
              <span className="block h-full bg-emerald" style={{ width: width(cycle.value, cycle.min, cycle.max) }} />
            </div>
            {cycle.detail && <p className="mt-1 text-xs text-silver/55">{cycle.detail}</p>}
          </li>
        ))}
      </ul>
    </ElementFrame>
  )
}
