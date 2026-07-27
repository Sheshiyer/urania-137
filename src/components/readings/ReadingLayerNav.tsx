const LAYERS = [
  { id: 'reading', label: 'Reading', description: 'Interpretation and source-shaped elements' },
  { id: 'evidence', label: 'Evidence', description: 'Systems, provenance, and confidence' },
  { id: 'source', label: 'Source', description: 'Collapsed, privacy-filtered record' },
] as const

export function readingLayerId(readingId: string, layer: (typeof LAYERS)[number]['id']): string {
  return `reading-${readingId}-${layer}`
}

function moveToLayer(event: MouseEvent<HTMLAnchorElement>, targetId: string) {
  const target = globalThis.document?.getElementById(targetId)
  if (!target) return
  event.preventDefault()
  target.scrollIntoView({ block: 'start' })
  target.focus({ preventScroll: true })
}

export function ReadingLayerNav({ readingId }: { readingId: string }) {
  return (
    <nav
      aria-label="Reading document layers"
      className="border-b border-reading-rule/35 px-4 py-3 text-reading-ink sm:px-7"
    >
      <ol className="grid gap-2 sm:grid-cols-3">
        {LAYERS.map((layer, index) => {
          const targetId = readingLayerId(readingId, layer.id)
          return (
            <li key={layer.id}>
              <a
              href={`#${targetId}`}
              onClick={(event) => moveToLayer(event, targetId)}
              className="block min-h-11 border-l border-reading-rule/45 pl-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-reading-rule"
            >
              <span className="block font-display text-[9px] uppercase tracking-[0.2em] text-reading-muted">
                {String(index + 1).padStart(2, '0')} · {layer.label}
              </span>
              <span className="mt-0.5 block text-[10px] leading-snug text-reading-muted">
                {layer.description}
              </span>
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
import type { MouseEvent } from 'react'
