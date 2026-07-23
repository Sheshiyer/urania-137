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
    // count == max: loop closes, chapter advances — add_another is never asked.
    expect(s2.event).toBe('chapter_advanced')
    expect(s2.state.chapter).toBe('relationship')

    const type = applyUserInput(s2.state, 'business-partners')
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
    expect(currentQuestion(s2.state).prompt).toContain('subjects.add_another') // 2 < max 5
    const done = applyUserInput(s2.state, 'no')
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
