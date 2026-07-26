import type { CSSProperties } from 'react'
import { Star } from 'lucide-react'
import type { ReadingDTO } from '../../lib/api/contract'
import {
  deriveFolioLayout,
  FOLIO_SECTORS,
} from '../../lib/readings/folioLayout'
import { COLORS, INTERACTION } from '../../styles/tokens'

function compact(value: string, max = 20): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

function dateLabel(value: number): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function sectorLabelPosition(index: number) {
  const angle = (-90 + index * (360 / FOLIO_SECTORS.length)) * Math.PI / 180
  return {
    left: `${50 + Math.cos(angle) * 45}%`,
    top: `${50 + Math.sin(angle) * 45}%`,
  } as CSSProperties
}

export function ReadingLibraryMap({
  readings,
  selectedId,
  onSelect,
  onToggleFavorite,
}: {
  readings: readonly ReadingDTO[]
  selectedId: string | null
  onSelect: (id: string) => void
  onToggleFavorite?: (id: string) => void
}) {
  const layout = deriveFolioLayout(readings)

  return (
    <figure
      className="console-card min-w-0 p-4 sm:p-5"
      aria-labelledby="folio-map-title"
      data-folio-map-encoding="node-family-angle__created-at-radius"
    >
      <header className="flex flex-col gap-3 border-b border-gold/15 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="console-eyebrow">Canonical records</p>
          <h2
            id="folio-map-title"
            className="mt-1 font-serif text-base uppercase tracking-[0.16em] text-parchment"
          >
            Folio map
          </h2>
        </div>
        <p className="max-w-md text-xs leading-relaxed text-secondary">
          Chat remains the primary doorway. Map and list reopen the same canonical Reading.
        </p>
      </header>

      <div className="mt-4 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div
          className="hidden md:block order-2 relative min-h-[32rem] overflow-hidden border border-gold/15 bg-void xl:order-1"
          aria-label="Folio map plot"
        >
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <circle cx="50" cy="50" r="23" fill="none" stroke={COLORS.gold} strokeOpacity="0.12" strokeWidth="0.25" />
            <circle cx="50" cy="50" r="38" fill="none" stroke={COLORS.gold} strokeOpacity="0.18" strokeWidth="0.2" strokeDasharray="1 2" />
            {layout.points.map(({ reading, x, y }) => (
              <line
                key={reading.id}
                x1="50"
                y1="50"
                x2={x}
                y2={y}
                stroke={selectedId === reading.id ? INTERACTION.selected : COLORS.gold}
                strokeOpacity={selectedId === reading.id ? 0.72 : 0.18}
                strokeWidth={selectedId === reading.id ? 0.5 : 0.22}
              />
            ))}
          </svg>

          {layout.sectors.map((sector, index) => (
            <span
              key={sector.id}
              className="pointer-events-none absolute z-10 w-20 -translate-x-1/2 -translate-y-1/2 text-center font-display text-[8px] uppercase tracking-[0.12em] text-metadata"
              style={sectorLabelPosition(index)}
            >
              {sector.label}
            </span>
          ))}

          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-gold/35 bg-void/95 text-center shadow-[0_0_48px_rgba(197,160,23,0.12)]">
            <span className="font-serif text-xs uppercase tracking-[0.2em] text-parchment">Folio</span>
            <span className="mt-1 font-mono text-[9px] text-gold">{readings.length} readings</span>
          </div>

          {layout.points.map(({ reading, x, y, sectorLabel }) => {
            const selected = selectedId === reading.id
            const style = {
              left: `${x}%`,
              top: `${y}%`,
            } as CSSProperties
            return (
              <button
                key={reading.id}
                type="button"
                style={style}
                onClick={() => onSelect(reading.id)}
                aria-pressed={selected}
                aria-label={`Open ${reading.title}, ${sectorLabel}`}
                className={[
                  'absolute z-20 min-h-11 w-24 -translate-x-1/2 -translate-y-1/2 cursor-pointer border px-2 py-2 text-center',
                  'transition-[border-color,background-color,box-shadow,color] duration-200 motion-reduce:transition-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interaction-focus',
                  selected
                    ? 'border-interaction-selected bg-interaction-flow/20 text-primary shadow-[0_0_24px_rgba(137,165,255,0.18)]'
                    : 'border-gold/25 bg-void/95 text-secondary hover:border-interaction-active hover:bg-surface',
                ].join(' ')}
              >
                <span className="block truncate font-display text-[9px] uppercase tracking-[0.1em]" title={reading.title}>
                  {compact(reading.title)}
                </span>
                <span className="mt-0.5 block truncate font-mono text-[8px] text-metadata">
                  {reading.nodeLabel}
                </span>
              </button>
            )
          })}
        </div>

        <div
          className="order-1 min-w-0 xl:order-2"
          data-folio-list-lens
          aria-label="Complete Folio list lens"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-display text-[9px] uppercase tracking-[0.18em] text-gold">
              Reading list
            </p>
            <span className="font-mono text-[9px] text-metadata">
              {layout.list.length} visible
            </span>
          </div>
          <ol className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
            {layout.list.map((reading, index) => {
              const selected = selectedId === reading.id
              return (
                <li
                  key={reading.id}
                  className={[
                    'grid min-w-0 grid-cols-[minmax(0,1fr)_2.75rem] border bg-surface/65',
                    selected
                      ? 'border-interaction-selected bg-interaction-flow/10'
                      : 'border-gold/20 hover:border-interaction-active',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(reading.id)}
                    aria-pressed={selected}
                    className="min-h-11 min-w-0 cursor-pointer px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-interaction-focus"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-[8px] text-metadata" aria-hidden="true">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="truncate font-serif text-xs uppercase tracking-[0.1em] text-primary">
                        {reading.title}
                      </span>
                    </span>
                    <span className="mt-1 block truncate font-mono text-[9px] text-metadata">
                      {reading.nodeLabel} · {dateLabel(reading.createdAt)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleFavorite?.(reading.id)}
                    aria-label={reading.favorite ? `Remove ${reading.title} from favorites` : `Favorite ${reading.title}`}
                    className="grid min-h-11 min-w-11 cursor-pointer place-items-center border-l border-gold/15 text-secondary hover:text-interaction-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-interaction-focus"
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${reading.favorite ? 'fill-gold text-gold' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      </div>

      <figcaption className="mt-4 border-t border-gold/15 pt-3 text-[10px] leading-relaxed text-metadata">
        Node family sets angular sector; creation time sets radial distance. The adjacent list contains every visible Reading, including any records beyond the plotted twenty-four.
      </figcaption>
    </figure>
  )
}
