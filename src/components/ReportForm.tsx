import { useState, useMemo } from 'react'
import {
  StellarNode,
  SelemeneMode,
  SubjectInput,
  RelationshipContext,
  ReportLevel,
  Surface,
  ReportGenerationRequest,
  DeterministicRequest,
  NormalizedLocation,
} from '../types'

interface ReportFormProps {
  node: StellarNode
  onSubmit: (payload: { surface: Surface; request: ReportGenerationRequest | DeterministicRequest }) => void
}

const EMPTY_LOCATION: NormalizedLocation = {
  display_name: '',
  latitude: 0,
  longitude: 0,
  timezone: 'UTC',
  provider: 'manual',
  confidence: 'manual',
}

const EMPTY_SUBJECT: SubjectInput = {
  role: 'primary',
  name: '',
  birth_date: '',
  birth_time: '',
  birth_time_confidence: 'exact',
  birth_location_query: '',
  normalized_location: { ...EMPTY_LOCATION },
}

const EMPTY_RELATIONSHIP: RelationshipContext = {
  type: 'family',
  mapping_goal: '',
  sensitivity_level: 'medium',
}

export function ReportForm({ node, onSubmit }: ReportFormProps) {
  const [mode, setMode] = useState<SelemeneMode | null>(node.modes[0] || null)
  const [subjects, setSubjects] = useState<SubjectInput[]>([{ ...EMPTY_SUBJECT }])
  const [relationship, setRelationship] = useState<RelationshipContext>({ ...EMPTY_RELATIONSHIP })
  const [language, setLanguage] = useState('en')
  const [reportLevel, setReportLevel] = useState<ReportLevel>('L2')
  const [consciousnessLevel, setConsciousnessLevel] = useState(2)
  const [transitDate, setTransitDate] = useState('')
  const [question, setQuestion] = useState('')
  const [includeRubric, setIncludeRubric] = useState(true)
  const [includePatterns, setIncludePatterns] = useState(true)
  const [outputFormat, setOutputFormat] = useState<ReportGenerationRequest['output']['format']>('markdown')
  const [geocoding, setGeocoding] = useState<Record<number, 'idle' | 'loading' | 'done' | 'error'>>({})

  const needsRelationship = mode?.needsRelationship ?? false
  const needsTransitDate = mode?.needsTransitDate ?? false
  const needsQuestion = mode?.needsQuestion ?? false

  useMemo(() => {
    if (mode) {
      const count = Math.max(mode.minSubjects, Math.min(subjects.length, mode.maxSubjects))
      setSubjects((prev) => {
        const next = prev.slice(0, count)
        while (next.length < count) next.push({ ...EMPTY_SUBJECT })
        return next
      })
    }
  }, [mode])

  const updateSubject = (index: number, field: keyof SubjectInput, value: unknown) => {
    setSubjects((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    )
  }

  const updateSubjectLocation = (index: number, field: keyof NormalizedLocation, value: unknown) => {
    setSubjects((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s
        return { ...s, normalized_location: { ...s.normalized_location, [field]: value } }
      })
    )
  }

  const geocodeSubject = async (index: number) => {
    const query = subjects[index].birth_location_query
    if (!query) return
    setGeocoding((prev) => ({ ...prev, [index]: 'loading' }))
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}` +
          `&accept-language=en&limit=1`,
        { headers: { 'User-Agent': 'Urania137/0.1' } }
      )
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        const place = data[0]
        updateSubjectLocation(index, 'display_name', place.display_name)
        updateSubjectLocation(index, 'latitude', parseFloat(place.lat))
        updateSubjectLocation(index, 'longitude', parseFloat(place.lon))
        updateSubjectLocation(index, 'timezone', 'UTC')
        updateSubjectLocation(index, 'provider', 'nominatim')
        updateSubjectLocation(index, 'confidence', 'selected')
        setGeocoding((prev) => ({ ...prev, [index]: 'done' }))
      } else {
        setGeocoding((prev) => ({ ...prev, [index]: 'error' }))
      }
    } catch {
      setGeocoding((prev) => ({ ...prev, [index]: 'error' }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!mode) return

    if (mode.surface === 'witness') {
      const request: ReportGenerationRequest = {
        report_level: reportLevel,
        report_mode: mode.id as ReportGenerationRequest['report_mode'],
        subjects,
        language,
        output: {
          format: outputFormat,
          include_rubric: includeRubric,
          include_pattern_extraction: includePatterns,
        },
      }
      if (needsRelationship) request.relationship_context = relationship
      onSubmit({ surface: 'witness', request })
      return
    }

    const subject = subjects[0]
    const request: DeterministicRequest = {
      birth_data: {
        date: subject.birth_date,
        time: subject.birth_time || '00:00',
        latitude: subject.normalized_location.latitude || 0,
        longitude: subject.normalized_location.longitude || 0,
        timezone: subject.normalized_location.timezone || 'UTC',
      },
      options: {},
    }
    if (needsTransitDate) request.current_time = new Date(transitDate).toISOString()
    if (needsQuestion) request.options = { ...request.options, question }

    onSubmit({ surface: 'deterministic', request })
  }

  if (!mode) {
    return <p className="text-silver">No available modes for this node.</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-silver leading-relaxed">{node.description}</p>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-widest text-gold font-display">Surface + Mode</label>
        <select
          value={mode ? `${mode.surface}:${mode.id}` : ''}
          onChange={(e) => {
            const [surface, id] = e.target.value.split(':')
            const found = node.modes.find((m) => m.surface === surface && m.id === id)
            if (found) setMode(found)
          }}
          className="w-full rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment focus:border-gold focus:outline-none"
        >
          {node.modes.map((m) => (
            <option key={`${m.surface}:${m.id}`} value={`${m.surface}:${m.id}`}>
              {m.label} — {m.surface === 'deterministic' ? 'Rust engines' : 'Witness pipeline'}
            </option>
          ))}
        </select>
        {mode.description && <p className="text-xs text-silver">{mode.description}</p>}
      </div>

      {mode.surface === 'witness' && (
        <div className="grid grid-cols-2 gap-3">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment focus:border-gold focus:outline-none"
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>

          <select
            value={reportLevel}
            onChange={(e) => setReportLevel(e.target.value as ReportLevel)}
            className="rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment focus:border-gold focus:outline-none"
          >
            <option value="L0">L0 — Minimal</option>
            <option value="L1">L1 — Brief</option>
            <option value="L2">L2 — Standard</option>
            <option value="L3">L3 — Detailed</option>
            <option value="L4">L4 — Deep</option>
            <option value="L5">L5 — Comprehensive</option>
          </select>

          <select
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value as ReportGenerationRequest['output']['format'])}
            className="rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment focus:border-gold focus:outline-none"
          >
            <option value="markdown">Markdown</option>
            <option value="docx">DOCX</option>
            <option value="pdf">PDF</option>
            <option value="source-pack">Source Pack</option>
          </select>

          <div className="rounded-lg bg-surface border border-gold/10 px-3 py-2 flex items-center gap-3"
          >
            <label className="text-xs text-silver">Consciousness L{consciousnessLevel}</label>
            <input
              type="range"
              min={0}
              max={5}
              step={1}
              value={consciousnessLevel}
              onChange={(e) => setConsciousnessLevel(Number(e.target.value))}
              className="w-full accent-gold"
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {mode.surface === 'witness' && (
          <>
            <label className="flex items-center gap-2 text-sm text-silver">
              <input
                type="checkbox"
                checked={includeRubric}
                onChange={(e) => setIncludeRubric(e.target.checked)}
                className="accent-gold"
              />
              Include rubric
            </label>
            <label className="flex items-center gap-2 text-sm text-silver">
              <input
                type="checkbox"
                checked={includePatterns}
                onChange={(e) => setIncludePatterns(e.target.checked)}
                className="accent-gold"
              />
              Include pattern extraction
            </label>
          </>
        )}
      </div>

      {subjects.map((subject, idx) => (
        <div key={idx} className="rounded-2xl border border-gold/10 bg-void/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-gold font-display">
              Subject {idx + 1} — {subject.role}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Name"
              value={subject.name}
              onChange={(e) => updateSubject(idx, 'name', e.target.value)}
              className="col-span-2 rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment placeholder-silver/50 focus:border-gold focus:outline-none"
            />
            <input
              type="text"
              placeholder="Role (e.g. primary, mother, partner)"
              value={subject.role}
              onChange={(e) => updateSubject(idx, 'role', e.target.value)}
              className="rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment placeholder-silver/50 focus:border-gold focus:outline-none"
            />
            <input
              type="date"
              value={subject.birth_date}
              onChange={(e) => updateSubject(idx, 'birth_date', e.target.value)}
              className="rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment placeholder-silver/50 focus:border-gold focus:outline-none"
            />
            <input
              type="time"
              value={subject.birth_time}
              onChange={(e) => updateSubject(idx, 'birth_time', e.target.value)}
              className="rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment placeholder-silver/50 focus:border-gold focus:outline-none"
            />
            <select
              value={subject.birth_time_confidence}
              onChange={(e) => updateSubject(idx, 'birth_time_confidence', e.target.value)}
              className="rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment focus:border-gold focus:outline-none"
            >
              <option value="exact">Exact time</option>
              <option value="approximate">Approximate time</option>
              <option value="unknown">Unknown time</option>
            </select>
            <input
              type="text"
              placeholder="Birth location (city, country)"
              value={subject.birth_location_query}
              onChange={(e) => updateSubject(idx, 'birth_location_query', e.target.value)}
              className="col-span-2 rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment placeholder-silver/50 focus:border-gold focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => geocodeSubject(idx)}
              disabled={geocoding[idx] === 'loading'}
              className="px-3 py-1.5 rounded-lg border border-gold/20 text-gold text-xs hover:bg-gold/5 transition-colors disabled:opacity-50"
            >
              {geocoding[idx] === 'loading' ? 'Geocoding...' : 'Auto-locate'}
            </button>
            {geocoding[idx] === 'done' && <span className="text-xs text-emerald">Located</span>}
            {geocoding[idx] === 'error' && <span className="text-xs text-terracotta">Not found — fill manually below</span>}
          </div>

          <div className="grid grid-cols-3 gap-3"
          >
            <input
              type="number"
              step="any"
              placeholder="Latitude"
              value={subject.normalized_location.latitude || ''}
              onChange={(e) => updateSubjectLocation(idx, 'latitude', parseFloat(e.target.value) || 0)}
              className="rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment placeholder-silver/50 focus:border-gold focus:outline-none"
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude"
              value={subject.normalized_location.longitude || ''}
              onChange={(e) => updateSubjectLocation(idx, 'longitude', parseFloat(e.target.value) || 0)}
              className="rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment placeholder-silver/50 focus:border-gold focus:outline-none"
            />
            <input
              type="text"
              placeholder="Timezone (e.g. Asia/Kolkata)"
              value={subject.normalized_location.timezone}
              onChange={(e) => updateSubjectLocation(idx, 'timezone', e.target.value)}
              className="rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment placeholder-silver/50 focus:border-gold focus:outline-none"
            />
          </div>
        </div>
      ))}

      {needsRelationship && (
        <div className="rounded-2xl border border-gold/10 bg-void/60 p-4 space-y-3">
          <span className="text-xs uppercase tracking-widest text-gold font-display">
            Relationship Context
          </span>
          <select
            value={relationship.type}
            onChange={(e) => setRelationship((r) => ({ ...r, type: e.target.value as RelationshipContext['type'] }))}
            className="w-full rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment focus:border-gold focus:outline-none"
          >
            <option value="family">Family</option>
            <option value="friends">Friends</option>
            <option value="business-partners">Business Partners</option>
            <option value="unmarried-partners">Unmarried Partners</option>
            <option value="married-partners">Married Partners</option>
            <option value="custom">Custom</option>
          </select>
          <input
            type="text"
            placeholder="Mapping goal (e.g. understand lineage transmission patterns)"
            value={relationship.mapping_goal}
            onChange={(e) => setRelationship((r) => ({ ...r, mapping_goal: e.target.value }))}
            className="w-full rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment placeholder-silver/50 focus:border-gold focus:outline-none"
          />
          <select
            value={relationship.sensitivity_level}
            onChange={(e) => setRelationship((r) => ({ ...r, sensitivity_level: e.target.value as RelationshipContext['sensitivity_level'] }))}
            className="w-full rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment focus:border-gold focus:outline-none"
          >
            <option value="low">Low sensitivity</option>
            <option value="medium">Medium sensitivity</option>
            <option value="high">High sensitivity</option>
          </select>
        </div>
      )}

      {needsTransitDate && (
        <div className="rounded-2xl border border-gold/10 bg-void/60 p-4 space-y-3"
        >
          <span className="text-xs uppercase tracking-widest text-gold font-display">Transit Date</span>
          <input
            type="date"
            value={transitDate}
            onChange={(e) => setTransitDate(e.target.value)}
            className="w-full rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment focus:border-gold focus:outline-none"
          />
        </div>
      )}

      {needsQuestion && (
        <div className="rounded-2xl border border-gold/10 bg-void/60 p-4 space-y-3"
        >
          <span className="text-xs uppercase tracking-widest text-gold font-display">Bridge Question</span>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter your question for the Bridge..."
            rows={3}
            className="w-full rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment placeholder-silver/50 focus:border-gold focus:outline-none"
          />
        </div>
      )}

      <button
        type="submit"
        className="w-full py-3 rounded-full bg-gradient-to-r from-emerald to-gold text-void font-semibold text-sm hover:brightness-110 transition-all"
      >
        Generate {mode.label}
      </button>
    </form>
  )
}
