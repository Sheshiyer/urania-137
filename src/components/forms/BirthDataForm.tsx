import { useState } from 'react'
import { BirthData } from '../../types'
import { Collapsible } from '../ui/Collapsible'

interface BirthDataFormProps {
  /** What this run needs, for the button label. */
  actionLabel: string
  /** sigil-forge requires `options.intention` — collect it rather than let the
   *  engine 422 and the workflow drop it without saying so. */
  needsIntention?: boolean
  onSubmit: (birth: BirthData, intention?: string) => void
  busy?: boolean
}

const EMPTY: BirthData = { name: '', date: '', time: '', latitude: 0, longitude: 0, timezone: 'Asia/Kolkata' }

/**
 * The deterministic surface takes `birth_data` (not `subjects[]`).
 *
 * `name` is required, not optional: numerology 422s without it and a workflow
 * will silently omit that engine from `engine_outputs` rather than failing — so
 * the form enforces it rather than letting the result quietly lose an engine.
 */
export function BirthDataForm({ actionLabel, needsIntention, onSubmit, busy }: BirthDataFormProps) {
  const [birth, setBirth] = useState<BirthData>({ ...EMPTY })
  const [intention, setIntention] = useState('')
  const [query, setQuery] = useState('')
  const [geo, setGeo] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  const set = <K extends keyof BirthData>(k: K, v: BirthData[K]) => setBirth((b) => ({ ...b, [k]: v }))

  const geocode = async () => {
    if (!query) return
    setGeo('loading')
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&accept-language=en&limit=1`,
        { headers: { 'User-Agent': 'Urania137/0.1' } },
      )
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        setBirth((b) => ({ ...b, latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) }))
        setGeo('done')
      } else setGeo('error')
    } catch {
      setGeo('error')
    }
  }

  const ready = Boolean(birth.name.trim() && birth.date && birth.time && birth.timezone && (!needsIntention || intention.trim()))
  const field = 'w-full rounded-lg border border-gold/10 bg-surface px-3 py-2 text-parchment placeholder-silver/50 focus:border-gold focus:outline-none'

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (ready) onSubmit(birth, needsIntention ? intention : undefined)
      }}
      className="space-y-4"
    >
      <input className={field} placeholder="Name (required — numerology needs it)" value={birth.name} onChange={(e) => set('name', e.target.value)} />

      {needsIntention && (
        <div className="space-y-1.5">
          <input className={field} placeholder="Intention (required — sigil-forge needs it)" value={intention} onChange={(e) => setIntention(e.target.value)} />
          <p className="text-[11px] text-silver/60">Without an intention the engine rejects sigil-forge and the workflow drops it silently.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <input type="date" className={field} value={birth.date} onChange={(e) => set('date', e.target.value)} />
        <input type="time" className={field} value={birth.time} onChange={(e) => set('time', e.target.value)} />
      </div>

      <div className="space-y-2">
        <input className={field} placeholder="Birth location (city, country)" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={geocode}
            disabled={geo === 'loading'}
            className="rounded-lg border border-gold/20 px-3 py-1.5 text-xs text-gold transition-colors hover:bg-gold/5 disabled:opacity-50"
          >
            {geo === 'loading' ? 'Geocoding…' : 'Auto-locate'}
          </button>
          {geo === 'done' && <span className="text-xs text-emerald">Located</span>}
          {geo === 'error' && <span className="text-xs text-terracotta">Not found — open “Precise coordinates”</span>}
        </div>
      </div>

      <Collapsible title="Precise coordinates" badge={`${birth.latitude || 0}, ${birth.longitude || 0}`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input type="number" step="any" className={field} placeholder="Latitude" value={birth.latitude || ''} onChange={(e) => set('latitude', parseFloat(e.target.value) || 0)} />
          <input type="number" step="any" className={field} placeholder="Longitude" value={birth.longitude || ''} onChange={(e) => set('longitude', parseFloat(e.target.value) || 0)} />
          <input className={field} placeholder="Timezone" value={birth.timezone} onChange={(e) => set('timezone', e.target.value)} />
        </div>
      </Collapsible>

      <button
        type="submit"
        disabled={!ready || busy}
        className="w-full rounded-full bg-gradient-to-r from-emerald to-gold py-3 text-sm font-semibold text-void transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? 'Computing…' : actionLabel}
      </button>
    </form>
  )
}
