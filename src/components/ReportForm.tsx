import { useState } from 'react'
import { StellarNode, Subject, RelationshipContext, ReportLevel } from '../types'

interface ReportFormProps {
  node: StellarNode
  onSubmit: (data: Record<string, unknown>) => void
}

const EMPTY_SUBJECT: Subject = {
  role: 'primary',
  name: '',
  birthDate: '',
  birthTime: '',
  birthTimeConfidence: 'exact',
  birthLocation: '',
}

export function ReportForm({ node, onSubmit }: ReportFormProps) {
  const [subjects, setSubjects] = useState<Subject[]>([{ ...EMPTY_SUBJECT }])
  const [relationship, setRelationship] = useState<RelationshipContext>({
    type: 'family',
    mappingGoal: '',
    sensitivityLevel: 'medium',
  })
  const [language, setLanguage] = useState('en')
  const [reportLevel, setReportLevel] = useState<ReportLevel>('L2')
  const [consciousnessLevel, setConsciousnessLevel] = useState(2)
  const [transitDate, setTransitDate] = useState('')
  const [question, setQuestion] = useState('')

  const isMultiSubject = node.id === 'compat' || node.id === 'witness'
  const needsRelationship = node.id === 'compat'
  const needsTransitDate = node.id === 'transit'
  const needsQuestion = node.id === 'bridge'

  const updateSubject = (index: number, field: keyof Subject, value: string) => {
    setSubjects((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    )
  }

  const addSubject = () => setSubjects((prev) => [...prev, { ...EMPTY_SUBJECT, role: `subject-${prev.length + 1}` }])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: Record<string, unknown> = {
      nodeId: node.id,
      reportMode: node.reportMode,
      subjects,
      language,
      reportLevel,
    }
    if (needsRelationship) payload.relationship = relationship
    if (needsTransitDate) payload.transitDate = transitDate
    if (needsQuestion) payload.question = question
    if (node.id === 'witness') payload.consciousnessLevel = consciousnessLevel
    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-silver leading-relaxed">{node.description}</p>

      {subjects.map((subject, idx) => (
        <div key={idx} className="rounded-2xl border border-gold/10 bg-void/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-gold font-display">
              Subject {idx + 1}
            </span>
            {idx > 0 && (
              <button
                type="button"
                onClick={() => setSubjects((prev) => prev.filter((_, i) => i !== idx))}
                className="text-xs text-silver hover:text-terracotta"
              >
                Remove
              </button>
            )}
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
              value={subject.birthDate}
              onChange={(e) => updateSubject(idx, 'birthDate', e.target.value)}
              className="rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment placeholder-silver/50 focus:border-gold focus:outline-none"
            />
            <input
              type="time"
              value={subject.birthTime}
              onChange={(e) => updateSubject(idx, 'birthTime', e.target.value)}
              className="rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment placeholder-silver/50 focus:border-gold focus:outline-none"
            />
            <select
              value={subject.birthTimeConfidence}
              onChange={(e) => updateSubject(idx, 'birthTimeConfidence', e.target.value)}
              className="rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment focus:border-gold focus:outline-none"
            >
              <option value="exact">Exact time</option>
              <option value="approximate">Approximate time</option>
              <option value="unknown">Unknown time</option>
            </select>
            <input
              type="text"
              placeholder="Birth location"
              value={subject.birthLocation}
              onChange={(e) => updateSubject(idx, 'birthLocation', e.target.value)}
              className="col-span-2 rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment placeholder-silver/50 focus:border-gold focus:outline-none"
            />
          </div>
        </div>
      ))}

      {isMultiSubject && subjects.length < 2 && (
        <button
          type="button"
          onClick={addSubject}
          className="w-full py-2 rounded-lg border border-gold/20 text-gold text-sm hover:bg-gold/5 transition-colors"
        >
          + Add Subject
        </button>
      )}

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
            placeholder="Mapping goal (e.g. understand lineage transmission)"
            value={relationship.mappingGoal}
            onChange={(e) => setRelationship((r) => ({ ...r, mappingGoal: e.target.value }))}
            className="w-full rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment placeholder-silver/50 focus:border-gold focus:outline-none"
          />
          <select
            value={relationship.sensitivityLevel}
            onChange={(e) => setRelationship((r) => ({ ...r, sensitivityLevel: e.target.value as RelationshipContext['sensitivityLevel'] }))}
            className="w-full rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment focus:border-gold focus:outline-none"
          >
            <option value="low">Low sensitivity</option>
            <option value="medium">Medium sensitivity</option>
            <option value="high">High sensitivity</option>
          </select>
        </div>
      )}

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
      </div>

      {node.id === 'witness' && (
        <div className="rounded-lg bg-surface border border-gold/10 px-3 py-2"
        >
          <label className="text-xs uppercase tracking-widest text-silver block mb-2">
            Consciousness Level: {consciousnessLevel}
          </label>
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
      )}

      {needsTransitDate && (
        <input
          type="date"
          value={transitDate}
          onChange={(e) => setTransitDate(e.target.value)}
          className="w-full rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment focus:border-gold focus:outline-none"
        />
      )}

      {needsQuestion && (
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Enter your question for the Bridge..."
          rows={3}
          className="w-full rounded-lg bg-surface border border-gold/10 px-3 py-2 text-parchment placeholder-silver/50 focus:border-gold focus:outline-none"
        />
      )}

      <button
        type="submit"
        className="w-full py-3 rounded-full bg-gradient-to-r from-emerald to-gold text-void font-semibold text-sm hover:brightness-110 transition-all"
      >
        Generate {node.label}
      </button>
    </form>
  )
}
