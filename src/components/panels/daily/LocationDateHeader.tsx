import { MapPin } from 'lucide-react'
import { DailyLocation } from '../../../lib/daily/source'
import { LocationSource } from '../../../lib/daily/location'

const SOURCE_LABEL: Record<LocationSource, string> = {
  birth: 'your birth place',
  remembered: 'your choice',
  default: 'a changeable default',
}

/**
 * The location/date/timezone header (T-051). Date is computed in the location's
 * timezone (passed in), never the browser's; the precedence source is labeled.
 */
export function LocationDateHeader({
  location,
  date,
  source,
  onToggleChange,
}: {
  location: DailyLocation
  date: string
  source: LocationSource
  onToggleChange: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gold/10 pb-3">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 font-display text-sm text-parchment">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-gold" />
          <span className="truncate">{location.display}</span>
        </div>
        <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-silver/60">
          {date} · {location.timezone} · {SOURCE_LABEL[source]}
        </div>
      </div>
      <button
        type="button"
        onClick={onToggleChange}
        className="shrink-0 rounded-full border border-gold/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-gold transition-colors hover:bg-gold/5"
      >
        Change
      </button>
    </div>
  )
}
