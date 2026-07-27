import { describe, it, expect } from 'vitest'
import type { ChildRun } from '../../types'
import type { ChatSessionState } from '../../types/chat'
import { SELEMENE_NODES } from '../../data/selemeneNodes'
import { applyUserInput, currentQuestion, initialSessionState, type StorySeed, type StoryTurn } from './stateMachine'
import { quickRepliesFor } from './quickReplies'

const IDS = { sessionId: 'sess-test', userId: 'user-test' }

/** Real capability cards from the node graph — never hand-rolled modes. */
function childRun(nodeId: string, childId: string): ChildRun {
  const child = SELEMENE_NODES.find((n) => n.id === nodeId)?.children?.find((c) => c.id === childId)
  if (!child?.run) throw new Error(`no run for ${nodeId}/${childId}`)
  return child.run
}

const KUNDALI = childRun('witness', 'integrated-kundali-l0') // witness 1..5, level L0
const DYAD = childRun('compat', 'composite-dyad') // witness 2..2 → relationship chapter
const FULL_SPECTRUM = childRun('witness', 'full-spectrum') // workflow, needsIntention
const DAILY = childRun('transit', 'panchanga-flow') // daily
const THRESHOLD: StorySeed = { kind: 'threshold' }

const SUBJECT_A = { name: 'Asha', date: '1990-12-31', time: '07:30', confidence: 'exact', location: 'Bengaluru, India' }
const SUBJECT_B = { name: 'Rohan', date: '1988-06-15', time: '18:45', confidence: 'approximate', location: 'Mumbai, India' }

function fillSubject(state: ChatSessionState, s: typeof SUBJECT_A): ChatSessionState {
  let turn: StoryTurn = { state, event: 'intake_recorded' }
  for (const input of [s.name, s.date, s.time, s.confidence, s.location]) {
    turn = applyUserInput(turn.state, input)
    expect(turn.event).not.toBe('invalid')
  }
  return turn.state
}

/** awakening → surface (confirmed) → whatever comes next. */
function walkOpening(state: ChatSessionState): ChatSessionState {
  const a = applyUserInput(state, 'begin')
  const b = applyUserInput(a.state, 'yes')
  expect(b.event).toBe('chapter_advanced')
  return b.state
}

const labels = (s: ChatSessionState) => quickRepliesFor(s).map((r) => r.label)

describe('quickRepliesFor', () => {
  it('awakening offers no chips — any text begins the story', () => {
    expect(quickRepliesFor(initialSessionState(KUNDALI, IDS))).toEqual([])
  })

  it('surface beat offers a single gold Confirm', () => {
    const s = applyUserInput(initialSessionState(KUNDALI, IDS), 'begin').state
    expect(s.chapter).toBe('surface')
    const r = quickRepliesFor(s)
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ input: 'yes', tone: 'primary' })
  })

  it('free-text subject slots offer no chips', () => {
    let s = walkOpening(initialSessionState(KUNDALI, IDS))
    expect(s.chapter).toBe('subjects')
    expect(quickRepliesFor(s)).toEqual([]) // name slot
    s = applyUserInput(s, SUBJECT_A.name).state
    expect(quickRepliesFor(s)).toEqual([]) // birth_date slot
  })

  it("birth_time slot offers the Gardener-rule 'unknown' escape only", () => {
    let s = walkOpening(initialSessionState(KUNDALI, IDS))
    s = applyUserInput(applyUserInput(s, SUBJECT_A.name).state, SUBJECT_A.date).state
    const r = quickRepliesFor(s)
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ input: 'unknown', tone: 'ghost' })
  })

  it('time_confidence slot offers the exact three-value enum', () => {
    let s = walkOpening(initialSessionState(KUNDALI, IDS))
    s = applyUserInput(applyUserInput(s, SUBJECT_A.name).state, SUBJECT_A.date).state
    s = applyUserInput(s, SUBJECT_A.time).state
    expect(labels(s)).toEqual(['Exact', 'Approximate', 'Unknown'])
    for (const r of quickRepliesFor(s)) expect(r.tone).toBe('choice')
  })

  it('completed subject between min and max offers yes/no at the add_another gate', () => {
    const s = fillSubject(walkOpening(initialSessionState(KUNDALI, IDS)), SUBJECT_A)
    expect(s.chapter).toBe('subjects') // gate holds (min 1, max 5)
    const r = quickRepliesFor(s)
    expect(r.map((x) => x.input)).toEqual(['yes', 'no'])
    expect(r[0].tone).toBe('affirm')
    expect(r[1].tone).toBe('ghost')
  })

  it('persist_offer beat renders NO chips here — CircleBar owns it', () => {
    // Dyad (min 2): the second fresh slot-by-slot subject completes and the
    // persist_offer interposes before the gate.
    let s = walkOpening(initialSessionState(DYAD, IDS))
    s = fillSubject(s, SUBJECT_A) // min not met → second slot appended
    s = fillSubject(s, SUBJECT_B) // fresh subject at idx 1 completes
    expect(s.chapter).toBe('subjects')
    expect(currentQuestion(s).prompt).toContain('subjects.persist_offer')
    expect(quickRepliesFor(s)).toEqual([])
  })

  it('every chip the UI could show is accepted by the machine — full witness walk, chips only', () => {
    let s = initialSessionState(KUNDALI, IDS)
    s = applyUserInput(s, 'begin').state // awakening — free text
    for (let guard = 0; guard < 60 && s.chapter !== 'handoff' && s.chapter !== 'complete'; guard++) {
      const chips = quickRepliesFor(s)
      if (chips.length > 0) {
        // Press the LAST chip — the escape / least-commitment option — so the
        // walk exercises exits as well as confirms.
        const t = applyUserInput(s, chips[chips.length - 1].input)
        expect(t.event).not.toBe('invalid')
        s = t.state
        continue
      }
      // Free-text beats: fill the slot the machine is asking for.
      const key = currentQuestion(s).prompt.split(' :: ')[0]
      const filler =
        key === 'subjects.name'
          ? SUBJECT_A.name
          : key === 'subjects.birth_date'
            ? SUBJECT_A.date
            : key === 'subjects.location'
              ? SUBJECT_A.location
              : key === 'subjects.persist_offer'
                ? 'no'
                : key === 'relationship.mapping_goal'
                  ? 'illuminate the field'
                  : key === 'mode.intention'
                    ? 'an intention for the test'
                    : 'begin'
      const t = applyUserInput(s, filler)
      expect(t.event).not.toBe('invalid')
      s = t.state
    }
    expect(s.chapter).toBe('handoff')
  })

  it('relationship chapter: type taxonomy chips, then free text, then sensitivity chips', () => {
    let s = walkOpening(initialSessionState(DYAD, IDS))
    s = fillSubject(s, SUBJECT_A)
    s = fillSubject(s, SUBJECT_B)
    const t = applyUserInput(s, 'no') // persist_offer declined → dyad at max → relationship
    expect(t.event).toBe('chapter_advanced')
    s = t.state
    expect(s.chapter).toBe('relationship')
    expect(quickRepliesFor(s).map((c) => c.input)).toEqual([
      'family',
      'friends',
      'business-partners',
      'unmarried-partners',
      'married-partners',
      'custom',
    ])
    s = applyUserInput(s, 'friends').state
    expect(quickRepliesFor(s)).toEqual([]) // mapping_goal is free text
    s = applyUserInput(s, 'illuminate the friendship').state
    expect(quickRepliesFor(s).map((c) => c.input)).toEqual(['low', 'medium', 'high'])
  })

  it('language_level: default escapes plus the closed enums', () => {
    let s = walkOpening(initialSessionState(DYAD, IDS))
    s = fillSubject(s, SUBJECT_A)
    s = fillSubject(s, SUBJECT_B)
    s = applyUserInput(s, 'no').state // persist_offer declined
    s = applyUserInput(s, 'friends').state
    s = applyUserInput(s, 'illuminate the friendship').state
    const t = applyUserInput(s, 'low')
    expect(t.event).toBe('chapter_advanced')
    s = t.state
    expect(s.chapter).toBe('language_level')
    const lang = quickRepliesFor(s)
    expect(lang).toHaveLength(1)
    expect(lang[0]).toMatchObject({ label: 'Default — English', input: 'default', tone: 'ghost' })
    s = applyUserInput(s, 'default').state
    expect(labels(s)).toEqual(['Default — L0', 'L0', 'L1', 'L2', 'L3', 'L4', 'L5'])
    s = applyUserInput(s, 'default').state
    expect(labels(s)).toEqual(['Default — C2', 'C0', 'C1', 'C2', 'C3', 'C4', 'C5'])
  })

  it('mode chapter: daily offers the default-sky escape, then a confirm', () => {
    let s = walkOpening(initialSessionState(DAILY, IDS))
    expect(s.chapter).toBe('mode')
    expect(quickRepliesFor(s)).toEqual([{ label: 'Use my default sky', input: 'skip', tone: 'ghost' }])
    s = applyUserInput(s, 'skip').state
    const r = quickRepliesFor(s)
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ input: 'yes', tone: 'primary' })
  })

  it('mode chapter: needsIntention workflow asks free text first, then confirm', () => {
    let s = walkOpening(initialSessionState(FULL_SPECTRUM, IDS))
    expect(s.chapter).toBe('subjects')
    s = fillSubject(s, SUBJECT_A) // single-subject doorway → straight to mode
    expect(s.chapter).toBe('mode')
    expect(quickRepliesFor(s)).toEqual([]) // intention is free text
    s = applyUserInput(s, 'clarity for the road ahead').state
    expect(quickRepliesFor(s).map((c) => c.input)).toEqual(['yes'])
  })

  it('assembly offers one interaction commitment — and it hands off', () => {
    let s = walkOpening(initialSessionState(KUNDALI, IDS))
    s = fillSubject(s, SUBJECT_A)
    s = applyUserInput(s, 'no').state // gate: no more subjects → language_level
    s = applyUserInput(s, 'default').state
    s = applyUserInput(s, 'default').state
    const t = applyUserInput(s, 'default')
    expect(t.event).toBe('chapter_advanced')
    s = t.state
    expect(s.chapter).toBe('mode')
    s = applyUserInput(s, 'yes').state
    expect(s.chapter).toBe('assembly')
    const r = quickRepliesFor(s)
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ input: 'yes', tone: 'commit' })
    expect(r[0].label).toContain('engines')
    expect(applyUserInput(s, r[0].input).event).toBe('ready')
  })

  it('threshold assembly confirm speaks to holding the pattern', () => {
    let s = applyUserInput(initialSessionState(THRESHOLD, IDS), 'begin').state
    expect(s.chapter).toBe('subjects') // threshold has no surface chapter
    s = fillSubject(s, SUBJECT_A) // single-slot doorway → straight to assembly
    expect(s.chapter).toBe('assembly')
    expect(quickRepliesFor(s)[0].label).toContain('pattern')
  })

  it('terminal chapters offer no chips', () => {
    let s = walkOpening(initialSessionState(DAILY, IDS))
    s = applyUserInput(s, 'skip').state
    s = applyUserInput(s, 'yes').state // mode confirm → assembly
    const ready = applyUserInput(s, 'yes')
    expect(ready.event).toBe('ready')
    expect(quickRepliesFor(ready.state)).toEqual([])
  })
})
