import { useState } from 'react'
import { LocateFixed, Search } from 'lucide-react'
import { DailyLocation } from '../../../lib/daily/source'
import { requestGeolocation, tzFromLongitude } from '../../../lib/daily/location'

/**
 * Location change affordance (T-052) — reuses the WitnessForm Nominatim geocode
 * path (place → lat/long) plus opt-in geolocation. Timezone is approximated from
 * longitude. The chosen location is handed up; the panel persists it (localStorage,
 * never the URL).
 */
export function LocationPicker({ onPick }: { onPick: (loc: DailyLocation) => void }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  const geocode = async () => {
    if (!q.trim()) return
    setStatus('loading')
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&accept-language=en&limit=1`,
        { headers: { 'User-Agent': 'Urania137/0.1' } },
      )
      const data = await res.json()
      if (Array.isArray(data) && data.length) {
        const lon = parseFloat(data[0].lon)
        onPick({ display: data[0].display_name, latitude: parseFloat(data[0].lat), longitude: lon, timezone: tzFromLongitude(lon) })
      } else setStatus('error')
    } catch {
      setStatus('error')
    }
  }

  const useMyLocation = async () => {
    setStatus('loading')
    const pos = await requestGeolocation()
    if (pos) onPick({ display: 'My location', latitude: pos.latitude, longitude: pos.longitude, timezone: tzFromLongitude(pos.longitude) })
    else setStatus('error')
  }

  return (
    <div className="space-y-2 rounded-xl border border-gold/15 bg-void/40 p-3">
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && geocode()}
          placeholder="City or place…"
          aria-label="Location search"
          className="w-full rounded-lg border border-gold/20 bg-void/50 px-3 py-2 text-sm text-parchment placeholder:text-silver/40 focus:border-gold/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={geocode}
          disabled={status === 'loading'}
          aria-label="Search location"
          className="shrink-0 rounded-lg border border-gold/20 px-3 text-gold transition-colors hover:bg-gold/5 disabled:opacity-50"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={useMyLocation}
        className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-silver transition-colors hover:text-parchment"
      >
        <LocateFixed className="h-3.5 w-3.5" /> Use my location
      </button>
      {status === 'error' && <p className="text-[11px] text-terracotta">Couldn't resolve that place — try another.</p>}
    </div>
  )
}
