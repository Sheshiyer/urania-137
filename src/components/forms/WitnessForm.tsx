import { useState } from 'react'
import { AssetGenerateRequest, ChildRun, NormalizedLocation, ReportLevel, SubjectInput } from '../../types'
import { Collapsible } from '../ui/Collapsible'

interface WitnessFormProps {
  /** The witness run this child is wired to — `mode` is fixed, never chosen. */
  run: Extract<ChildRun, { kind: 'witness' }>
  actionLabel: string
  onSubmit: (request: AssetGenerateRequest) => void
  busy?: boolean
}

const EMPTY_LOCATION: NormalizedLocation = {
  display_name: '',
  latitude: 0,
  longitude: 0,
  timezone: 'Asia/Kolkata',
  provider: 'manual',
  confidence: 'manual',
}

const emptySubject = (role: string): SubjectInput => ({
  role,
  name: '',
  birth_date: '',
  birth_time: '',
  birth_time_confidence: 'exact',
  birth_location_query: '',
  normalized_location: { ...EMPTY_LOCATION },
})

/**
 * The witness surface (`POST /api/v1/assets/generate`).
 *
 * The mode comes from the child and is one the engine actually resolves — there
 * is no mode picker, because offering modes that silently fall back to a generic
 * "default: Reading" is what made every surface look identical.
 */
export function WitnessForm({ run, actionLabel, onSubmit, busy }: WitnessFormProps) {
  const [subjects, setSubjects] = useState<SubjectInput[]>(() =>
    Array.from({ length: run.minSubjects }, (_, i) => emptySubject(i === 0 ? 'primary' : 'partner')),
  )
  const [language, setLanguage] = useState('en')
  const [reportLevel, setReportLevel] = useState<ReportLevel>(run.level ?? 'L0')
  const [consciousnessLevel, setConsciousnessLevel] = useState(2)
  const [geo, setGeo] = useState<Record<number, 'idle' | 'loading' | 'done' | 'error'>>({})

  const update = (i: number, field: keyof SubjectInput, value: unknown) =>
    setSubjects((prev) => prev.map((s, k) => (k === i ? { ...s, [field]: value } : s)))
  const updateLoc = (i: number, field: keyof NormalizedLocation, value: unknown) =>
    setSubjects((prev) => prev.map((s, k) => (k === i ? { ...s, normalized_location: { ...s.normalized_location, [field]: value } } : s)))

  const geocode = async (i: number) => {
    const q = subjects[i].birth_location_query
    if (!q) return
    setGeo((g) => ({ ...g, [i]: 'loading' }))
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&accept-language=en&limit=1`, {
        headers: { 'User-Agent': 'Urania137/0.1' },
      })
      const data = await res.json()
      if (Array.isArray(data) && data.length) {
        updateLoc(i, 'display_name', data[0].display_name)
        updateLoc(i, 'latitude', parseFloat(data[0].lat))
        updateLoc(i, 'longitude', parseFloat(data[0].lon))
        updateLoc(i, 'provider', 'nominatim')
        updateLoc(i, 'confidence', 'selected')
        setGeo((g) => ({ ...g, [i]: 'done' }))
      } else setGeo((g) => ({ ...g, [i]: 'error' }))
    } catch {
      setGeo((g) => ({ ...g, [i]: 'error' }))
    }
  }

  const ready = subjects.every((s) => s.name.trim() && s.birth_date && s.birth_time)
  const canAdd = subjects.length < run.maxSubjects
  const canRemove = subjects.length > run.minSubjects
  const field = 'w-full rounded-lg border border-gold/10 bg-surface px-3 py-2 text-parchment placeholder-silver/50 focus:border-gold focus:outline-none'

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ready) return
    onSubmit({
      mode: run.mode,
      report_level: reportLevel,
      language,
      consciousness_level: consciousnessLevel,
      subjects,
      options: { output_format: 'markdown', include_rubric: true, include_pattern_extraction: true },
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-xs text-silver">
        Witness pipeline · <span className="font-display uppercase tracking-widest text-gold">{run.mode}</span>
      </p>

      <Collapsible title="Reading options" badge={`${reportLevel} · ${language.toUpperCase()}`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className={field}>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
          <select value={reportLevel} onChange={(e) => setReportLevel(e.target.value as ReportLevel)} className={field}>
            {(['L0', 'L1', 'L2', 'L3', 'L4', 'L5'] as ReportLevel[]).map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-3 rounded-lg border border-gold/10 bg-surface px-3 py-2 sm:col-span-2">
            <label className="whitespace-nowrap text-xs text-silver">Consciousness L{consciousnessLevel}</label>
            <input type="range" min={0} max={5} step={1} value={consciousnessLevel} onChange={(e) => setConsciousnessLevel(Number(e.target.value))} className="w-full accent-gold" />
          </div>
        </div>
      </Collapsible>

      {subjects.map((s, i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-gold/10 bg-void/60 p-4">
          <div className="flex items-center justify-between">
            <span className="font-display text-xs uppercase tracking-widest text-gold">
              Subject {i + 1} — {s.role}
            </span>
            {canRemove && i >= run.minSubjects && (
              <button type="button" onClick={() => setSubjects((p) => p.filter((_, k) => k !== i))} className="text-xs text-silver hover:text-terracotta">
                Remove
              </button>
            )}
          </div>

          <input className={field} placeholder="Name" value={s.name} onChange={(e) => update(i, 'name', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <input type="date" className={field} value={s.birth_date} onChange={(e) => update(i, 'birth_date', e.target.value)} />
            <input type="time" className={field} value={s.birth_time} onChange={(e) => update(i, 'birth_time', e.target.value)} />
          </div>
          <input className={field} placeholder="Birth location (city, country)" value={s.birth_location_query} onChange={(e) => update(i, 'birth_location_query', e.target.value)} />
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => geocode(i)} disabled={geo[i] === 'loading'} className="rounded-lg border border-gold/20 px-3 py-1.5 text-xs text-gold transition-colors hover:bg-gold/5 disabled:opacity-50">
              {geo[i] === 'loading' ? 'Geocoding…' : 'Auto-locate'}
            </button>
            {geo[i] === 'done' && <span className="text-xs text-emerald">Located</span>}
            {geo[i] === 'error' && <span className="text-xs text-terracotta">Not found — open “Precise coordinates”</span>}
          </div>

          <Collapsible title="Precise coordinates" badge="auto-filled">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input type="number" step="any" className={field} placeholder="Latitude" value={s.normalized_location.latitude || ''} onChange={(e) => updateLoc(i, 'latitude', parseFloat(e.target.value) || 0)} />
              <input type="number" step="any" className={field} placeholder="Longitude" value={s.normalized_location.longitude || ''} onChange={(e) => updateLoc(i, 'longitude', parseFloat(e.target.value) || 0)} />
              <input className={field} placeholder="Timezone" value={s.normalized_location.timezone} onChange={(e) => updateLoc(i, 'timezone', e.target.value)} />
            </div>
          </Collapsible>
        </div>
      ))}

      {canAdd && (
        <button type="button" onClick={() => setSubjects((p) => [...p, emptySubject('partner')])} className="w-full rounded-lg border border-dashed border-gold/25 py-2 text-xs uppercase tracking-widest text-silver transition-colors hover:border-gold/50 hover:text-parchment">
          + Add subject ({subjects.length}/{run.maxSubjects})
        </button>
      )}

      <button type="submit" disabled={!ready || busy} className="w-full rounded-full bg-gradient-to-r from-emerald to-gold py-3 text-sm font-semibold text-void transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
        {busy ? 'Contacting the engines…' : actionLabel}
      </button>
    </form>
  )
}
