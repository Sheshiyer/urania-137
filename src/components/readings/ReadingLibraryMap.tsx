import type { CSSProperties, KeyboardEvent } from 'react'
import { Star } from 'lucide-react'
import type { ReadingDTO } from '../../lib/api/contract'
import { COLORS } from '../../styles/tokens'

function compact(value: string, max = 22): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

export function ReadingLibraryMap({
  readings,
  selectedId,
  onSelect,
}: {
  readings: readonly ReadingDTO[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const visible = readings.slice(0, 10)
  const positions = visible.map((reading, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / Math.max(visible.length, 1)
    return {
      reading,
      x: 50 + Math.cos(angle) * 38,
      y: 50 + Math.sin(angle) * 37,
    }
  })
  const keyboardSelect = (event: KeyboardEvent, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(id)
    }
  }

  return (
    <figure className="console-card relative min-h-[26rem] overflow-hidden" aria-labelledby="reading-map-title">
      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-4 sm:p-5">
        <div>
          <p className="console-eyebrow">Fallback & recovery</p>
          <h2 id="reading-map-title" className="mt-1 font-serif text-base uppercase tracking-[0.16em] text-parchment">
            Reading constellation
          </h2>
        </div>
        <p className="max-w-52 text-right text-[10px] leading-relaxed text-silver/60">
          Chat remains the primary doorway. This map reopens canonical Folio records.
        </p>
      </div>

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="20" fill="none" stroke={COLORS.gold} strokeOpacity="0.12" strokeWidth="0.25" />
        <circle cx="50" cy="50" r="37" fill="none" stroke={COLORS.gold} strokeOpacity="0.18" strokeWidth="0.2" strokeDasharray="1 2" />
        {positions.map(({ reading, x, y }) => (
          <line
            key={reading.id}
            x1="50"
            y1="50"
            x2={x}
            y2={y}
            stroke={COLORS.gold}
            strokeOpacity={selectedId === reading.id ? 0.62 : 0.2}
            strokeWidth={selectedId === reading.id ? 0.5 : 0.22}
          />
        ))}
      </svg>

      <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-gold/35 bg-void/90 text-center shadow-[0_0_48px_rgba(197,160,23,0.12)]">
        <span className="font-serif text-xs uppercase tracking-[0.2em] text-parchment">Folio</span>
        <span className="mt-1 font-mono text-[9px] text-gold/75">{readings.length} records</span>
      </div>

      {positions.map(({ reading, x, y }, index) => {
        const selected = selectedId === reading.id
        const style = {
          left: `${x}%`,
          top: `${y}%`,
          '--reading-delay': `${index * 45}ms`,
        } as CSSProperties
        return (
          <button
            key={reading.id}
            type="button"
            style={style}
            onClick={() => onSelect(reading.id)}
            onKeyDown={(event) => keyboardSelect(event, reading.id)}
            aria-pressed={selected}
            aria-label={`Open ${reading.title}`}
            className={[
              'absolute z-10 w-24 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-sm border px-2 py-2 text-center transition-[border-color,background-color,box-shadow,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:w-28',
              selected
                ? 'border-emerald/70 bg-emerald/10 text-parchment shadow-[0_0_24px_rgba(16,181,167,0.18)]'
                : 'border-gold/25 bg-void/90 text-silver hover:border-gold/65 hover:bg-surface',
            ].join(' ')}
          >
            <span className="flex items-center justify-center gap-1">
              <i
                className={`h-1.5 w-1.5 rotate-45 ${selected ? 'bg-emerald' : 'border border-gold/60'}`}
                aria-hidden="true"
              />
              {reading.favorite && <Star className="h-2.5 w-2.5 fill-gold text-gold" aria-hidden="true" />}
            </span>
            <span className="mt-1 block truncate font-display text-[7px] uppercase tracking-[0.12em]" title={reading.title}>
              {compact(reading.title)}
            </span>
            <span className="mt-0.5 block truncate text-[8px] text-silver/55">{reading.nodeLabel}</span>
          </button>
        )
      })}

      {readings.length > visible.length && (
        <figcaption className="absolute bottom-3 left-4 text-[9px] text-silver/55">
          Showing the {visible.length} most recent records · search reveals the rest.
        </figcaption>
      )}
    </figure>
  )
}
