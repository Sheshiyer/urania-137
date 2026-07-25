import { describe, it, expect } from 'vitest'
import type { AssetGenerateRequest, ChildRun, RelationshipContext, SubjectInput } from '../../types'
import type { ChatSessionState } from '../../types/chat'
import { SELEMENE_NODES } from '../../data/selemeneNodes'
import {
  applyUserInput,
  currentQuestion,
  initialSessionState,
  isValidISODate,
  isValidTime,
  toSubmitPayload,
  type StorySeed,
  type StoryTurn,
} from './stateMachine'

const IDS = { sessionId: 'sess-test', userId: 'user-test' }

/** Real capability cards from the node graph — never hand-rolled modes. */
function childRun(nodeId: string, childId: string): ChildRun {
  const child = SELEMENE_NODES.find((n) => n.id === nodeId)?.children?.find((c) => c.id === childId)
  if (!child?.run) throw new Error(`no run for ${nodeId}/${childId}`)
  return child.run
}

const KUNDALI = childRun('witness', 'integrated-kundali-l0') // witness 1..5, level L0
const DYAD = childRun('compat', 'composite-dyad') // witness 2..2
const FULL_SPECTRUM = childRun('witness', 'full-spectrum') // workflow, needsIntention
const NUMEROLOGY = childRun('birth', 'numerology') // engine, no intention
const DAILY = childRun('transit', 'panchanga-flow') // daily
const INFO: StorySeed = { kind: 'info' }

/**
 * Minimal completeness predicate reimplemented locally — equivalent to the
 * upstream `isCompleteReportRequest` semantics (subjects present, every
 * subject carrying a normalized location). Do NOT import from Selemene-engine.
 */
function isCompleteReportRequestLocal(req: { subjects?: Array<{ normalized_location?: unknown }> }): boolean {
  return Array.isArray(req.subjects) && req.subjects.length > 0 && req.subjects.every((s) => Boolean(s && s.normalized_location))
}

const SUBJECT_A = { name: 'Asha', date: '1990-12-31', time: '07:30', confidence: 'exact', location: 'Bengaluru, India' }
const SUBJECT_B = { name: 'Rohan', date: '1988-06-15', time: '18:45', confidence: 'approximate', location: 'Mumbai, India' }

/** Walk one full subject (name → date → time → confidence → location). */
function fillSubject(state: ChatSessionState, s: typeof SUBJECT_A): StoryTurn {
  let turn: StoryTurn = { state, event: 'intake_recorded' }
  for (const input of [s.name, s.date, s.time, s.confidence, s.location]) {
    turn = applyUserInput(turn.state, input)
    expect(turn.event).not.toBe('invalid')
  }
  return turn
}

/** Walk awakening → surface confirmation. */
function walkOpening(state: ChatSessionState): ChatSessionState {
  const a = applyUserInput(state, 'begin')
  expect(a.event).toBe('chapter_advanced')
  expect(a.state.chapter).toBe('surface')
  const b = applyUserInput(a.state, 'yes')
  expect(b.event).toBe('chapter_advanced')
  return b.state
}

// ---------------------------------------------------------------------------

describe('validators', () => {
  it('strict YYYY-MM-DD with real calendar dates', () => {
    expect(isValidISODate('1990-12-31')).toBe(true)
    expect(isValidISODate('2024-02-29')).toBe(true) // leap year
    expect(isValidISODate('2023-02-29')).toBe(false) // not a leap year
    expect(isValidISODate('1990-02-30')).toBe(false)
    expect(isValidISODate('31/12/1990')).toBe(false)
    expect(isValidISODate('1990-1-1')).toBe(false)
    expect(isValidISODate('1990-13-01')).toBe(false)
  })

  it('strict HH:MM 24-hour', () => {
    expect(isValidTime('07:30')).toBe(true)
    expect(isValidTime('23:59')).toBe(true)
    expect(isValidTime('00:00')).toBe(true)
    expect(isValidTime('7:30')).toBe(false)
    expect(isValidTime('24:00')).toBe(false)
    expect(isValidTime('12:60')).toBe(false)
  })
})

describe('witness solo flow (integrated-kundali-l0, 1..5 subjects)', () => {
  function walkToHandoff() {
    let state = initialSessionState(KUNDALI, IDS)
    expect(state.chapter).toBe('awakening')
    expect(currentQuestion(state).prompt).toContain('awakening.open')

    state = walkOpening(state)
    expect(state.chapter).toBe('subjects')

    const afterSubject = fillSubject(state, SUBJECT_A)
    // Between min (1) and max (5): chapter holds, next question is add_another.
    expect(afterSubject.state.chapter).toBe('subjects')
    expect(currentQuestion(afterSubject.state).prompt).toContain('subjects.add_another')

    const declined = applyUserInput(afterSubject.state, 'no')
    expect(declined.event).toBe('chapter_advanced')
    // Solo guardrail: relationship chapter skipped entirely.
    expect(declined.state.chapter).toBe('language_level')
    expect(declined.state.intake.relationship_context).toBeNull()

    const lang = applyUserInput(declined.state, 'default')
    expect(lang.state.intake.language).toBe('en')
    const level = applyUserInput(lang.state, 'default')
    expect(level.state.intake.report_level).toBe('L0') // seed.level is the default
    const cons = applyUserInput(level.state, 'default')
    expect(cons.event).toBe('chapter_advanced')
    expect(cons.state.intake.consciousness_level).toBe(2)
    expect(cons.state.chapter).toBe('mode')

    expect(currentQuestion(cons.state).prompt).toContain("mode.confirm")
    expect(currentQuestion(cons.state).prompt).toContain('integrated-kundali-l0')
    const confirmed = applyUserInput(cons.state, 'yes')
    expect(confirmed.state.chapter).toBe('assembly')
    expect(currentQuestion(confirmed.state).prompt).toContain('FINAL ASSEMBLED REQUEST')
    expect(currentQuestion(confirmed.state).prompt).toContain('Asha')

    const ready = applyUserInput(confirmed.state, 'confirm')
    expect(ready.event).toBe('ready')
    expect(ready.state.chapter).toBe('handoff')
    return ready.state
  }

  it('walks a full scripted intake to handoff', () => {
    walkToHandoff()
  })

  it('terminal payload is complete and solo relationship_context is null', () => {
    const state = walkToHandoff()
    const payload = toSubmitPayload(state) as AssetGenerateRequest
    expect(isCompleteReportRequestLocal(payload)).toBe(true)
    expect(payload.mode).toBe('integrated-kundali-l0')
    expect(payload.report_level).toBe('L0')
    expect(payload.language).toBe('en')
    expect(payload.consciousness_level).toBe(2)
    expect(payload.subjects).toHaveLength(1)
    expect(payload.subjects![0].name).toBe('Asha')
    expect(payload.subjects![0].normalized_location).toBeTruthy()
    expect(payload.relationship_context).toBeNull()
    expect(payload.options).toEqual({ output_format: 'markdown', include_rubric: true, include_pattern_extraction: true })
  })

  it('rejects invalid date/time input with no chapter advance and no intake write', () => {
    let state = walkOpening(initialSessionState(KUNDALI, IDS))
    state = applyUserInput(state, SUBJECT_A.name).state

    for (const badDate of ['31/12/1990', '1990-2-3', '1990-02-30', '']) {
      const r = applyUserInput(state, badDate)
      expect(r.event).toBe('invalid')
      expect(r.error).toContain('YYYY-MM-DD')
      expect(r.state.chapter).toBe('subjects')
      expect((r.state.intake.subjects as SubjectInput[])[0].birth_date).toBeUndefined()
    }

    state = applyUserInput(state, SUBJECT_A.date).state
    for (const badTime of ['7:30', '25:00', '12:60', 'morning']) {
      const r = applyUserInput(state, badTime)
      expect(r.event).toBe('invalid')
      expect(r.state.chapter).toBe('subjects')
      expect((r.state.intake.subjects as SubjectInput[])[0].birth_time).toBeUndefined()
    }

    state = applyUserInput(state, SUBJECT_A.time).state
    const badConf = applyUserInput(state, 'maybe')
    expect(badConf.event).toBe('invalid')
    expect(badConf.state.chapter).toBe('subjects')
  })

  it("unknown birth time follows the noon convention and skips the confidence question", () => {
    let state = walkOpening(initialSessionState(KUNDALI, IDS))
    state = applyUserInput(state, SUBJECT_A.name).state
    state = applyUserInput(state, SUBJECT_A.date).state
    const r = applyUserInput(state, 'unknown')
    expect(r.event).toBe('intake_recorded')
    const s = (r.state.intake.subjects as SubjectInput[])[0]
    expect(s.birth_time).toBe('12:00')
    expect(s.birth_time_confidence).toBe('unknown')
    // Confidence already recorded — the next question is location.
    expect(currentQuestion(r.state).prompt).toContain('subjects.location')
  })

  it('one question at a time: every turn records at most one slot or advances one chapter', () => {
    let state = initialSessionState(KUNDALI, IDS)
    const inputs = ['begin', 'yes', SUBJECT_A.name, SUBJECT_A.date, SUBJECT_A.time, SUBJECT_A.confidence, SUBJECT_A.location]
    let prevQuestion = currentQuestion(state).prompt
    for (const input of inputs) {
      const turn = applyUserInput(state, input)
      expect(['intake_recorded', 'chapter_advanced']).toContain(turn.event)
      const q = currentQuestion(turn.state).prompt
      expect(q).not.toBe(prevQuestion) // exactly one step forward each turn
      prevQuestion = q
      state = turn.state
    }
  })
})

describe('witness dyad flow (composite-dyad, exactly 2 subjects)', () => {
  function walkToHandoff() {
    let state = initialSessionState(DYAD, IDS)
    state = walkOpening(state)
    expect(state.chapter).toBe('subjects')

    const s1 = fillSubject(state, SUBJECT_A)
    // count (1) < min (2): no add_another gate — straight to subject 2.
    expect(s1.state.chapter).toBe('subjects')
    expect(s1.state.subjectIndex).toBe(1)
    expect(currentQuestion(s1.state).prompt).toContain('Subject 2')

    const s2 = fillSubject(s1.state, SUBJECT_B)
    // W3-A: the fresh partner is offered circle persistence before advancing.
    expect(s2.event).toBe('intake_recorded')
    expect(s2.state.chapter).toBe('subjects')
    expect(currentQuestion(s2.state).prompt).toContain('subjects.persist_offer')
    const offered = applyUserInput(s2.state, 'no')
    // count == max: the loop closes after the beat — add_another is never asked.
    expect(offered.event).toBe('chapter_advanced')
    expect(offered.state.chapter).toBe('relationship')
    expect(offered.state.circlePersist).toBeUndefined()

    const type = applyUserInput(offered.state, 'business-partners')
    expect(type.event).toBe('intake_recorded')
    const goal = applyUserInput(type.state, 'map decision dynamics and complementary patterns')
    const sens = applyUserInput(goal.state, 'medium')
    expect(sens.event).toBe('chapter_advanced')
    expect(sens.state.chapter).toBe('language_level')

    let st = applyUserInput(sens.state, 'en').state
    st = applyUserInput(st, 'L2').state
    st = applyUserInput(st, '3').state
    expect(st.chapter).toBe('mode')
    st = applyUserInput(st, 'yes').state
    expect(st.chapter).toBe('assembly')
    const ready = applyUserInput(st, 'yes')
    expect(ready.event).toBe('ready')
    return ready.state
  }

  it('subjects loop respects min/max (no add_another below min or at max)', () => {
    walkToHandoff()
  })

  it('payload carries an exact-taxonomy relationship_context and passes completeness', () => {
    const payload = toSubmitPayload(walkToHandoff()) as AssetGenerateRequest
    expect(isCompleteReportRequestLocal(payload)).toBe(true)
    expect(payload.subjects).toHaveLength(2)
    expect(payload.relationship_context).toEqual({
      type: 'business-partners',
      mapping_goal: 'map decision dynamics and complementary patterns',
      sensitivity_level: 'medium',
    } satisfies RelationshipContext)
  })

  it("rejects 'romantic' — relationship type must come from the exact taxonomy", () => {
    let state = initialSessionState(DYAD, IDS)
    state = walkOpening(state)
    state = fillSubject(state, SUBJECT_A).state
    state = fillSubject(state, SUBJECT_B).state
    // W3-A: answer the persist_offer beat to reach the relationship chapter.
    expect(currentQuestion(state).prompt).toContain('subjects.persist_offer')
    state = applyUserInput(state, 'no').state
    expect(state.chapter).toBe('relationship')
    const r = applyUserInput(state, 'romantic')
    expect(r.event).toBe('invalid')
    expect(r.state.chapter).toBe('relationship')
    expect(r.state.intake.relationship_context).toBeUndefined()
  })
})

describe('subjects loop — optional subjects between min and max (kundali 1..5)', () => {
  it('accepting add_another grows the loop; declining after 2 routes through relationship', () => {
    let state = initialSessionState(KUNDALI, IDS)
    state = walkOpening(state)
    const s1 = fillSubject(state, SUBJECT_A)
    const add = applyUserInput(s1.state, 'yes')
    expect(add.event).toBe('intake_recorded')
    expect(add.state.subjectIndex).toBe(1)
    expect((add.state.intake.subjects as SubjectInput[])[1].role).toBe('partner')

    const s2 = fillSubject(add.state, SUBJECT_B)
    // W3-A: the persist_offer beat interposes before add_another for the
    // fresh slot-by-slot subject; holding them records the index.
    expect(currentQuestion(s2.state).prompt).toContain('subjects.persist_offer')
    const held = applyUserInput(s2.state, 'yes')
    expect(held.event).toBe('intake_recorded')
    expect(held.state.circlePersist).toEqual([1])
    expect(currentQuestion(held.state).prompt).toContain('subjects.add_another') // 2 < max 5
    const done = applyUserInput(held.state, 'no')
    expect(done.event).toBe('chapter_advanced')
    // Two subjects ⇒ relationship chapter is live for kundali too.
    expect(done.state.chapter).toBe('relationship')
  })
})

describe('deterministic flows (workflow / engine → BirthDataForm payload)', () => {
  function walkDeterministic(seed: ChildRun, withIntention: boolean) {
    let state = initialSessionState(seed, IDS)
    state = walkOpening(state)
    expect(state.chapter).toBe('subjects')
    const s = fillSubject(state, SUBJECT_A)
    // min == max == 1: loop closes immediately after one subject.
    expect(s.event).toBe('chapter_advanced')
    expect(s.state.chapter).toBe('mode')

    let st = s.state
    if (withIntention) {
      expect(currentQuestion(st).prompt).toContain('mode.intention')
      const empty = applyUserInput(st, '')
      expect(empty.event).toBe('invalid') // intention is required, never silently dropped
      const intent = applyUserInput(st, 'clarity on the pivot')
      expect(intent.event).toBe('intake_recorded')
      expect(intent.field).toBe('options.intention')
      st = intent.state
    } else {
      expect(currentQuestion(st).prompt).toContain('mode.confirm')
    }

    st = applyUserInput(st, 'yes').state
    expect(st.chapter).toBe('assembly')
    const ready = applyUserInput(st, 'yes')
    expect(ready.event).toBe('ready')
    return ready.state
  }

  it('workflow with needsIntention collects intention and emits {birthData, intention}', () => {
    const payload = toSubmitPayload(walkDeterministic(FULL_SPECTRUM, true)) as {
      birthData: { name: string; date: string; time: string; latitude: number; longitude: number; timezone: string }
      intention?: string
    }
    expect(payload.birthData).toEqual({
      name: 'Asha',
      date: '1990-12-31',
      time: '07:30',
      latitude: 0,
      longitude: 0,
      timezone: 'Asia/Kolkata',
    })
    expect(payload.intention).toBe('clarity on the pivot')
  })

  it('engine without needsIntention skips the intention question', () => {
    const payload = toSubmitPayload(walkDeterministic(NUMEROLOGY, false)) as { birthData: unknown; intention?: string }
    expect(payload.birthData).toBeTruthy()
    expect(payload.intention).toBeUndefined()
    expect('intention' in payload).toBe(false)
  })
})

describe('daily flow (panchanga-flow → DailyReadingPanel payload)', () => {
  it('never enters the subjects chapter; skip yields an empty payload', () => {
    let state = initialSessionState(DAILY, IDS)
    state = walkOpening(state)
    expect(state.chapter).toBe('mode') // no subjects/relationship/language_level for daily
    expect(currentQuestion(state).prompt).toContain('mode.location')

    const skipped = applyUserInput(state, 'skip')
    expect(skipped.event).toBe('intake_recorded')
    let st = applyUserInput(skipped.state, 'yes').state
    expect(st.chapter).toBe('assembly')
    const ready = applyUserInput(st, 'yes')
    expect(ready.event).toBe('ready')
    expect(toSubmitPayload(ready.state)).toEqual({})
  })

  it('a place answer yields {locationQuery}', () => {
    let state = initialSessionState(DAILY, IDS)
    state = walkOpening(state)
    state = applyUserInput(state, 'Bengaluru, India').state
    state = applyUserInput(state, 'yes').state
    const ready = applyUserInput(state, 'yes')
    expect(toSubmitPayload(ready.state)).toEqual({ locationQuery: 'Bengaluru, India' })
  })
})

describe('info doorway', () => {
  it('goes awakening → complete, never reaches handoff, and has no payload', () => {
    const state = initialSessionState(INFO, IDS)
    expect(state.chapter).toBe('awakening')
    const turn = applyUserInput(state, 'tell me')
    expect(turn.event).toBe('chapter_advanced')
    expect(turn.state.chapter).toBe('complete')
    expect(turn.state.chapter).not.toBe('handoff')
    expect(() => toSubmitPayload(turn.state)).toThrow()
    const closed = applyUserInput(turn.state, 'anything')
    expect(closed.event).toBe('invalid')
  })
})

describe('handoff close-out + purity', () => {
  function quickSoloHandoff(): ChatSessionState {
    let state = initialSessionState(KUNDALI, IDS)
    state = walkOpening(state)
    state = fillSubject(state, SUBJECT_A).state
    state = applyUserInput(state, 'no').state
    state = applyUserInput(state, 'en').state
    state = applyUserInput(state, 'L0').state
    state = applyUserInput(state, '2').state
    state = applyUserInput(state, 'yes').state
    return applyUserInput(state, 'yes').state // ready → handoff
  }

  it('handoff closes to complete on the next turn', () => {
    const state = quickSoloHandoff()
    expect(state.chapter).toBe('handoff')
    const closed = applyUserInput(state, 'ok')
    expect(closed.event).toBe('chapter_advanced')
    expect(closed.state.chapter).toBe('complete')
    // Payload is still producible after close-out.
    expect(isCompleteReportRequestLocal(toSubmitPayload(closed.state) as AssetGenerateRequest)).toBe(true)
  })

  it('toSubmitPayload refuses to fire before handoff', () => {
    const state = initialSessionState(KUNDALI, IDS)
    expect(() => toSubmitPayload(state)).toThrow()
  })

  it('the reducer never mutates the input state and always returns new objects', () => {
    const state = walkOpening(initialSessionState(KUNDALI, IDS))
    const snapshot = JSON.parse(JSON.stringify(state)) as ChatSessionState

    const valid = applyUserInput(state, SUBJECT_A.name)
    expect(valid.state).not.toBe(state)
    expect(state).toEqual(snapshot) // untouched

    const invalidTurn = applyUserInput(state, '')
    expect(invalidTurn.state).not.toBe(state)
    expect(invalidTurn.state).toEqual(snapshot) // new object, same values
    expect(state).toEqual(snapshot)
  })
})

// ---------------------------------------------------------------------------
// Threshold W0-A — threshold seed + profile prefill
// ---------------------------------------------------------------------------

const THRESHOLD: StorySeed = { kind: 'threshold' }

/** A complete stored profile, mapped server-side into an intake slot. */
const SELF: SubjectInput = {
  role: 'primary',
  name: 'Asha',
  birth_date: '1990-12-31',
  birth_time: '07:30',
  birth_time_confidence: 'exact',
  birth_location_query: 'Bengaluru, India',
  normalized_location: {
    display_name: 'Bengaluru, India',
    latitude: 12.9716,
    longitude: 77.5946,
    timezone: 'Asia/Kolkata',
    provider: 'test',
    confidence: 'high',
  },
}

describe('threshold flow (pre-graph profile onboarding)', () => {
  it('walks awakening → subjects → assembly → handoff and yields the self profile', () => {
    let state = initialSessionState(THRESHOLD, IDS)
    expect(state.chapter).toBe('awakening')
    expect(state.prefilledCount).toBe(0)

    const opened = applyUserInput(state, 'begin')
    expect(opened.event).toBe('chapter_advanced')
    // No surface / language_level / mode chapters on the threshold walk.
    expect(opened.state.chapter).toBe('subjects')

    const filled = fillSubject(opened.state, SUBJECT_A)
    // Exactly one subject (min = max = 1): straight to assembly.
    expect(filled.state.chapter).toBe('assembly')
    const recap = currentQuestion(filled.state).prompt
    expect(recap).toContain('assembly.confirm')
    expect(recap).toContain('threshold')
    expect(recap).toContain('pattern')

    const confirmed = applyUserInput(filled.state, 'yes')
    expect(confirmed.event).toBe('ready')
    expect(confirmed.state.chapter).toBe('handoff')

    const payload = toSubmitPayload(confirmed.state)
    expect('subject' in payload).toBe(true)
    const subject = (payload as { subject: SubjectInput }).subject
    expect(subject.name).toBe('Asha')
    expect(subject.birth_date).toBe('1990-12-31')
    expect(subject.normalized_location).toBeTruthy()

    const closed = applyUserInput(confirmed.state, 'ok')
    expect(closed.state.chapter).toBe('complete')
  })

  it('applies the Gardener rule for an unknown birth time', () => {
    let state = applyUserInput(initialSessionState(THRESHOLD, IDS), 'begin').state
    state = applyUserInput(state, SUBJECT_A.name).state
    state = applyUserInput(state, SUBJECT_A.date).state
    const unknown = applyUserInput(state, 'unknown')
    expect(unknown.event).toBe('intake_recorded')
    const s = (unknown.state.intake.subjects as SubjectInput[])[0]
    expect(s.birth_time).toBe('12:00') // noon convention, never a warning
    expect(s.birth_time_confidence).toBe('unknown')
  })
})

describe('profile prefill (prefilledSubjects)', () => {
  it('witness 1..5 with a stored self opens the subjects chapter at add_another', () => {
    let state = initialSessionState(KUNDALI, IDS, [SELF])
    expect(state.prefilledCount).toBe(1)
    expect(state.subjectIndex).toBe(1)
    expect((state.intake.subjects as SubjectInput[])[0].name).toBe('Asha')

    state = walkOpening(state)
    expect(state.chapter).toBe('subjects')
    // Never re-asks the five facts — the gate is the first question.
    const q = currentQuestion(state).prompt
    expect(q).toContain('subjects.add_another')
    expect(q).not.toContain('subjects.name')

    const declined = applyUserInput(state, 'no')
    expect(declined.event).toBe('chapter_advanced')
    expect(declined.state.chapter).toBe('language_level')
    expect(declined.state.intake.relationship_context).toBeNull()
  })

  it('witness 1..5 accepting add_another appends a fresh partner slot after the profile', () => {
    let state = walkOpening(initialSessionState(KUNDALI, IDS, [SELF]))
    const accepted = applyUserInput(state, 'yes')
    expect(accepted.event).toBe('intake_recorded')
    expect((accepted.state.intake.subjects as SubjectInput[])[1].role).toBe('partner')
    expect(accepted.state.subjectIndex).toBe(1)
    expect(currentQuestion(accepted.state).prompt).toContain('subjects.name')
  })

  it('witness 2..2 with a stored self still collects the required partner', () => {
    let state = initialSessionState(DYAD, IDS, [SELF])
    expect(state.prefilledCount).toBe(1)
    // One fresh slot under the cursor — the partner is required, not optional.
    expect(state.intake.subjects).toHaveLength(2)
    expect(state.subjectIndex).toBe(1)

    state = walkOpening(state)
    expect(state.chapter).toBe('subjects')
    expect(currentQuestion(state).prompt).toContain('subjects.name')

    const filled = fillSubject(state, SUBJECT_B)
    // W3-A: the required partner is fresh — persist_offer fires before the
    // loop closes at max; declining advances to relationship.
    expect(currentQuestion(filled.state).prompt).toContain('subjects.persist_offer')
    const offered = applyUserInput(filled.state, 'no')
    expect(offered.event).toBe('chapter_advanced')
    expect(offered.state.chapter).toBe('relationship')
  })

  it('witness 2..2 with two stored profiles skips the subjects chapter entirely', () => {
    const partner: SubjectInput = { ...SELF, role: 'partner', name: 'Rohan' }
    let state = initialSessionState(DYAD, IDS, [SELF, partner])
    expect(state.prefilledCount).toBe(2)
    state = walkOpening(state)
    // Relationship context is per-reading, never profile data — still asked.
    expect(state.chapter).toBe('relationship')
  })

  it('engine doorway with a stored self skips subjects and still produces birthData', () => {
    let state = initialSessionState(NUMEROLOGY, IDS, [SELF])
    expect(state.prefilledCount).toBe(1)
    state = walkOpening(state)
    // Sequence without subjects: awakening → surface → mode.
    expect(state.chapter).toBe('mode')

    const confirmed = applyUserInput(state, 'yes')
    expect(confirmed.state.chapter).toBe('assembly')
    const ready = applyUserInput(confirmed.state, 'yes')
    expect(ready.event).toBe('ready')

    const payload = toSubmitPayload(ready.state)
    expect('birthData' in payload).toBe(true)
    const birth = (payload as { birthData: { name: string; date: string; timezone: string } }).birthData
    expect(birth.name).toBe('Asha')
    expect(birth.date).toBe('1990-12-31')
    expect(birth.timezone).toBe('Asia/Kolkata')
  })

  it('incomplete profile rows are dropped, not trusted', () => {
    const partial = { role: 'primary', name: 'Asha' } as SubjectInput
    const state = initialSessionState(KUNDALI, IDS, [partial])
    expect(state.prefilledCount).toBe(0)
    expect(state.subjectIndex).toBe(0)
    // A fresh empty slot replaces the untrusted partial row.
    expect((state.intake.subjects as SubjectInput[])[0].name).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// W3-A — wholesale circle picks + the persist_offer beat
// ---------------------------------------------------------------------------

/** A stored circle member exactly as the ChatSheet picker sends it (intake fields = SubjectInput). */
const CIRCLE_ROHAN: SubjectInput = {
  role: 'partner',
  name: 'Rohan',
  birth_date: '1988-06-15',
  birth_time: '18:45',
  birth_time_confidence: 'approximate',
  birth_location_query: 'Mumbai, India',
  normalized_location: {
    display_name: 'Mumbai, India',
    latitude: 19.076,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
    provider: 'test',
    confidence: 'high',
  },
}

/** Kundali (1..5) with the stored self prefilled, at the name slot of subject 2. */
function walkToFreshNameSlot(): ChatSessionState {
  let state = walkOpening(initialSessionState(KUNDALI, IDS, [SELF]))
  const accepted = applyUserInput(state, 'yes') // add_another → fresh slot at index 1
  expect(accepted.event).toBe('intake_recorded')
  expect(currentQuestion(accepted.state).prompt).toContain('subjects.name')
  return accepted.state
}

describe('wholesale circle picks (W3-A)', () => {
  it('a stored circle member can be picked at the add_another gate — the whole subject records in one turn', () => {
    const state = walkOpening(initialSessionState(KUNDALI, IDS, [SELF]))
    expect(currentQuestion(state).prompt).toContain('subjects.add_another')

    const picked = applyUserInput(state, CIRCLE_ROHAN)
    expect(picked.event).toBe('intake_recorded')
    expect(picked.field).toBe('subjects[1]')
    const subjects = picked.state.intake.subjects as SubjectInput[]
    expect(subjects).toHaveLength(2)
    expect(subjects[0].name).toBe('Asha') // prefilled self untouched
    expect(subjects[1]).toEqual(CIRCLE_ROHAN)
    expect(picked.state.subjectIndex).toBe(1)
    // The cursor advanced exactly as if all five slots had been answered —
    // and a picked member is already persisted, so NO persist_offer beat.
    const q = currentQuestion(picked.state).prompt
    expect(q).toContain('subjects.add_another')
    expect(q).not.toContain('persist_offer')
  })

  it('the name slot of subject index >= 1 accepts a wholesale pick; absent/self roles coerce to partner', () => {
    const roleless = walkToFreshNameSlot()
    const { role: _omit, ...withoutRole } = CIRCLE_ROHAN
    const picked = applyUserInput(roleless, withoutRole)
    expect(picked.event).toBe('intake_recorded')
    const s = (picked.state.intake.subjects as SubjectInput[])[1]
    expect(s.name).toBe('Rohan')
    expect(s.role).toBe('partner') // absent → forced

    const asSelf = walkToFreshNameSlot()
    const coerced = applyUserInput(asSelf, { ...CIRCLE_ROHAN, role: 'self' })
    expect((coerced.state.intake.subjects as SubjectInput[])[1].role).toBe('partner') // self → forced

    const asFamily = walkToFreshNameSlot()
    const kept = applyUserInput(asFamily, { ...CIRCLE_ROHAN, role: 'family' })
    expect((kept.state.intake.subjects as SubjectInput[])[1].role).toBe('family') // valid roles kept
  })

  it('an invalid wholesale object is an invalid turn with a clear message and no intake write', () => {
    const state = walkToFreshNameSlot()
    const bads: unknown[] = [
      { name: 'Rohan' }, // missing everything else
      { ...CIRCLE_ROHAN, birth_date: '1988-15-99' }, // not a real date
      { ...CIRCLE_ROHAN, birth_time: '6pm' }, // not HH:MM
      { ...CIRCLE_ROHAN, birth_time_confidence: 'maybe' }, // not in the enum
      { ...CIRCLE_ROHAN, normalized_location: null }, // location required
    ]
    for (const bad of bads) {
      const r = applyUserInput(state, bad)
      expect(r.event).toBe('invalid')
      expect(r.error).toContain('incomplete')
      expect(r.state.chapter).toBe('subjects')
      expect((r.state.intake.subjects as SubjectInput[])[1].name).toBeUndefined()
    }
  })

  it('the threshold seed rejects wholesale picks — the self profile is collected by hand', () => {
    const state = applyUserInput(initialSessionState(THRESHOLD, IDS), 'begin').state
    expect(currentQuestion(state).prompt).toContain('subjects.name')
    const r = applyUserInput(state, CIRCLE_ROHAN)
    expect(r.event).toBe('invalid')
    expect(r.state.chapter).toBe('subjects')
    expect((r.state.intake.subjects as SubjectInput[])[0].name).toBeUndefined()
  })

  it('slot 0 of an unprefilled witness (the primary/self slot) rejects wholesale picks', () => {
    const state = walkOpening(initialSessionState(KUNDALI, IDS))
    expect(currentQuestion(state).prompt).toContain('subjects.name')
    const r = applyUserInput(state, CIRCLE_ROHAN)
    expect(r.event).toBe('invalid')
    expect((r.state.intake.subjects as SubjectInput[])[0].name).toBeUndefined()
  })
})

describe('persist_offer beat (W3-A)', () => {
  it('fires for a fresh slot-by-slot subject, never for prefilled or picked ones', () => {
    // Fresh: dyad subject 2 collected by hand.
    let state = walkOpening(initialSessionState(DYAD, IDS))
    state = fillSubject(state, SUBJECT_A).state // index 0 — no beat, straight to subject 2
    expect(currentQuestion(state).prompt).toContain('subjects.name')
    const s2 = fillSubject(state, SUBJECT_B)
    expect(currentQuestion(s2.state).prompt).toContain('subjects.persist_offer')
    expect(currentQuestion(s2.state).prompt).toContain('Rohan')

    // Picked: wholesale circle member — already persisted, no beat.
    const pre = walkOpening(initialSessionState(KUNDALI, IDS, [SELF]))
    const picked = applyUserInput(pre, CIRCLE_ROHAN)
    expect(currentQuestion(picked.state).prompt).not.toContain('persist_offer')

    // Prefilled: two stored profiles skip the subjects chapter entirely.
    const partner: SubjectInput = { ...SELF, role: 'partner', name: 'Rohan' }
    const skipped = walkOpening(initialSessionState(DYAD, IDS, [SELF, partner]))
    expect(skipped.chapter).toBe('relationship')
  })

  it('an affirmative answer records the index in circlePersist and moves on', () => {
    let state = walkOpening(initialSessionState(DYAD, IDS))
    state = fillSubject(state, SUBJECT_A).state
    const s2 = fillSubject(state, SUBJECT_B)
    const held = applyUserInput(s2.state, 'yes')
    expect(held.state.circlePersist).toEqual([1])
    // count == max: "moves on" = the pre-W3-A advance to relationship.
    expect(held.event).toBe('chapter_advanced')
    expect(held.state.chapter).toBe('relationship')
    expect(currentQuestion(held.state).prompt).not.toContain('persist_offer')
  })

  it('a declined answer records nothing, moves on, and the beat is not re-asked', () => {
    let state = walkOpening(initialSessionState(KUNDALI, IDS, [SELF]))
    state = applyUserInput(state, 'yes').state
    const s2 = fillSubject(state, SUBJECT_B)
    expect(currentQuestion(s2.state).prompt).toContain('subjects.persist_offer')

    // A non-yes/no answer is invalid and re-asks the same beat.
    const unclear = applyUserInput(s2.state, 'maybe')
    expect(unclear.event).toBe('invalid')
    expect(currentQuestion(unclear.state).prompt).toContain('subjects.persist_offer')

    const declined = applyUserInput(s2.state, 'no')
    expect(declined.state.circlePersist).toBeUndefined()
    // Moved on: the add_another gate (2 < max 5), NOT the beat again.
    expect(currentQuestion(declined.state).prompt).toContain('subjects.add_another')
    const done = applyUserInput(declined.state, 'no')
    expect(done.event).toBe('chapter_advanced')
    expect(done.state.chapter).toBe('relationship')
  })

  it('circle bookkeeping never leaks into the witness engine payload', () => {
    let state = walkOpening(initialSessionState(DYAD, IDS))
    state = fillSubject(state, SUBJECT_A).state
    state = fillSubject(state, SUBJECT_B).state
    state = applyUserInput(state, 'yes').state // persist_offer → hold index 1
    expect(state.circlePersist).toEqual([1])
    state = applyUserInput(state, 'family').state
    state = applyUserInput(state, 'map the household patterns').state
    state = applyUserInput(state, 'low').state
    state = applyUserInput(state, 'en').state
    state = applyUserInput(state, 'L2').state
    state = applyUserInput(state, '2').state
    state = applyUserInput(state, 'yes').state
    const ready = applyUserInput(state, 'yes')
    expect(ready.event).toBe('ready')

    const payload = toSubmitPayload(ready.state) as AssetGenerateRequest
    expect(isCompleteReportRequestLocal(payload)).toBe(true)
    expect(payload.subjects).toHaveLength(2)
    expect('circlePersist' in payload).toBe(false)
    // The intake-carried meta never reaches the engine options block.
    expect(payload.options).toEqual({ output_format: 'markdown', include_rubric: true, include_pattern_extraction: true })
    // …and SubjectInput stays exactly the engine's shape.
    expect(Object.keys(payload.subjects![1]).sort()).toEqual(
      ['birth_date', 'birth_location_query', 'birth_time', 'birth_time_confidence', 'name', 'normalized_location', 'role'].sort(),
    )
  })

  it('the solo walk never sees the beat (slot 0 is the primary/self slot) and still ends with a valid payload', () => {
    let state = walkOpening(initialSessionState(KUNDALI, IDS))
    const s1 = fillSubject(state, SUBJECT_A)
    // Slot 0 fresh: straight to add_another — persist_offer is never offered.
    expect(currentQuestion(s1.state).prompt).toContain('subjects.add_another')
    state = applyUserInput(s1.state, 'no').state
    state = applyUserInput(state, 'en').state
    state = applyUserInput(state, 'L0').state
    state = applyUserInput(state, '2').state
    state = applyUserInput(state, 'yes').state
    const ready = applyUserInput(state, 'yes')
    expect(ready.event).toBe('ready')
    expect(ready.state.circlePersist).toBeUndefined()
    const payload = toSubmitPayload(ready.state) as AssetGenerateRequest
    expect(isCompleteReportRequestLocal(payload)).toBe(true)
    expect(payload.subjects).toHaveLength(1)
    expect(payload.relationship_context).toBeNull()
  })
})
