/**
 * Narrator prompt-layer tests (Threshold W4 — dyad voice).
 *
 * Covers `buildNarratorSystemPrompt` from functions/lib/chat/prompts.ts:
 * guardrails 9 + 10 are universal; the Threshold amendment, Threshold
 * register, and {@link THRESHOLD_STAGE_DIRECTIONS} appear ONLY for
 * `threshold`-seeded sessions; every other seed keeps the shipped persona,
 * register arc, and shared {@link CHAPTER_STAGE_DIRECTIONS} — no naming, no
 * fourth wall. The recording discipline and machine-question protocol stay
 * universal and untouched.
 *
 * Location note: lives in functions/__tests__ because vitest.config.ts only
 * collects src/** and functions/__tests__/** — the existing convention.
 */
import { describe, it, expect } from 'vitest'
import {
  buildNarratorSystemPrompt,
  CHAPTER_STAGE_DIRECTIONS,
  THRESHOLD_STAGE_DIRECTIONS,
} from '../lib/chat/prompts'
import { initialSessionState, type StorySeed } from '../lib/chat/stateMachine'
import type { ChatSessionState, StoryChapter } from '../lib/chat/types'

const IDS = { sessionId: 'sess-p', userId: 'user-p' }

function stateFor(seed: StorySeed, chapter: StoryChapter): ChatSessionState {
  return { ...initialSessionState(seed, IDS), chapter }
}

const THRESHOLD_SEED: StorySeed = { kind: 'threshold' }
const NON_THRESHOLD_SEEDS: StorySeed[] = [
  { kind: 'witness', mode: 'synastry', minSubjects: 2, maxSubjects: 2 },
  { kind: 'workflow', workflowId: 'saturn-return', needsIntention: true },
  { kind: 'engine', engineId: 'numerology' },
  { kind: 'daily', needsLocation: true },
  { kind: 'info' },
]

/** Phrases that belong to the Threshold voice and must never leak elsewhere. */
const FOURTH_WALL_MARKERS = [
  'THRESHOLD AMENDMENT',
  'a character, and I know it',
  'the stars are sticklers',
  'Spunk decorates thresholds',
]

// ---------------------------------------------------------------------------
// Guardrails 9 + 10 — universal, never suspended
// ---------------------------------------------------------------------------

describe('guardrails 9 and 10 (universal)', () => {
  const allSeeds: StorySeed[] = [THRESHOLD_SEED, ...NON_THRESHOLD_SEEDS]

  for (const seed of allSeeds) {
    it(`are present for seed kind '${seed.kind}'`, () => {
      const prompt = buildNarratorSystemPrompt(stateFor(seed, 'awakening'))
      // 9 — sealed machinery, permitted self-awareness.
      expect(prompt).toContain('9. The machinery stays sealed; the character may be self-aware.')
      expect(prompt).toContain("never touches the user's sovereignty")
      // 10 — opt-in, revocable profile writes; no silent accumulation.
      expect(prompt).toContain('10. Profile writes are always opt-in and revocable.')
      expect(prompt).toContain('hold for next time?')
      expect(prompt).toContain('No accumulation without a clear ask and a clear yes')
    })
  }

  it('the original eight guardrails are still present, in order before 9 and 10', () => {
    const prompt = buildNarratorSystemPrompt(stateFor(THRESHOLD_SEED, 'awakening'))
    const g8 = prompt.indexOf('8. Capabilities derive only from the doorway')
    const g9 = prompt.indexOf('9. The machinery stays sealed')
    const g10 = prompt.indexOf('10. Profile writes are always opt-in and revocable.')
    expect(g8).toBeGreaterThan(-1)
    expect(g9).toBeGreaterThan(g8)
    expect(g10).toBeGreaterThan(g9)
  })
})

// ---------------------------------------------------------------------------
// Threshold seed — amendment + register + Threshold stage directions
// ---------------------------------------------------------------------------

describe('threshold-seeded sessions', () => {
  const THRESHOLD_WALK: StoryChapter[] = ['awakening', 'subjects', 'assembly', 'handoff', 'complete']

  it('include the Threshold amendment and drop the shipped register arc', () => {
    const prompt = buildNarratorSystemPrompt(stateFor(THRESHOLD_SEED, 'awakening'))
    expect(prompt).toContain('## THRESHOLD AMENDMENT')
    expect(prompt).not.toContain('## REGISTER ARC')
    // The dyad is named here — and the scoping is stated explicitly.
    expect(prompt).toContain('Pichet leads the opening')
    expect(prompt).toContain('Aletheia steps forward exactly twice')
    expect(prompt).toContain('Self-awareness is Threshold-scoped')
    expect(prompt).toContain('no fourth wall')
  })

  it.each(THRESHOLD_WALK)("chapter '%s' gets the Threshold-voiced stage direction", (chapter) => {
    const prompt = buildNarratorSystemPrompt(stateFor(THRESHOLD_SEED, chapter))
    const thresholdBeat = THRESHOLD_STAGE_DIRECTIONS[chapter]
    expect(thresholdBeat).toBeDefined()
    expect(prompt).toContain(`## STAGE DIRECTION — current chapter: ${chapter}`)
    expect(prompt).toContain(thresholdBeat!)
    // The shared doorway beat for the same chapter must NOT be selected.
    expect(prompt).not.toContain(CHAPTER_STAGE_DIRECTIONS[chapter])
  })

  it('awakening carries the POC fourth-wall greeting; subjects the compact + sticklers; assembly the liturgical read-back', () => {
    const awakening = buildNarratorSystemPrompt(stateFor(THRESHOLD_SEED, 'awakening'))
    expect(awakening).toContain("I'm the narrator — a character, and I know it. Someone had to say it first.")
    const subjects = buildNarratorSystemPrompt(stateFor(THRESHOLD_SEED, 'subjects'))
    expect(subjects).toContain('the stars are sticklers')
    expect(subjects).toContain('noon convention')
    const assembly = buildNarratorSystemPrompt(stateFor(THRESHOLD_SEED, 'assembly'))
    expect(assembly).toContain('like a dedication')
    expect(assembly).toContain('liturgical')
    const complete = buildNarratorSystemPrompt(stateFor(THRESHOLD_SEED, 'complete'))
    expect(complete).toContain('the graph knows it too')
  })

  it('falls back to the shared stage direction for chapters outside the threshold walk', () => {
    // Defensive: a threshold session should never visit `surface`, but if the
    // cursor lands there the shared beat is used rather than a hole.
    const prompt = buildNarratorSystemPrompt(stateFor(THRESHOLD_SEED, 'surface'))
    expect(prompt).toContain(CHAPTER_STAGE_DIRECTIONS.surface)
  })

  it('describes the seed as the Threshold, not a generic doorway', () => {
    const prompt = buildNarratorSystemPrompt(stateFor(THRESHOLD_SEED, 'awakening'))
    expect(prompt).toContain('the Threshold — the caller’s own profile')
  })

  it('keeps the recording discipline and machine-question protocol universal and untouched', () => {
    const prompt = buildNarratorSystemPrompt(stateFor(THRESHOLD_SEED, 'subjects'))
    expect(prompt).toContain('## HOW INTAKE IS RECORDED (hard rules)')
    expect(prompt).toContain('ONE QUESTION AT A TIME')
    expect(prompt).toContain("## THE MACHINE'S QUESTION")
    expect(prompt).toContain('never reveal the machinery')
  })
})

// ---------------------------------------------------------------------------
// Non-threshold seeds — shipped persona holds; no fourth-wall leakage
// ---------------------------------------------------------------------------

describe('non-threshold seeds (doorway chats keep the shipped persona)', () => {
  for (const seed of NON_THRESHOLD_SEEDS) {
    it(`seed kind '${seed.kind}' carries the register arc and no Threshold language`, () => {
      const prompt = buildNarratorSystemPrompt(stateFor(seed, 'awakening'))
      expect(prompt).toContain('## REGISTER ARC')
      for (const marker of FOURTH_WALL_MARKERS) expect(prompt).not.toContain(marker)
    })
  }

  it.each(['awakening', 'subjects', 'assembly', 'handoff', 'complete'] as StoryChapter[])(
    "a witness seed at chapter '%s' uses the shared stage direction, never the Threshold beat",
    (chapter) => {
      const witness: StorySeed = { kind: 'witness', mode: 'natal', minSubjects: 1, maxSubjects: 1 }
      const prompt = buildNarratorSystemPrompt(stateFor(witness, chapter))
      expect(prompt).toContain(CHAPTER_STAGE_DIRECTIONS[chapter])
      const thresholdBeat = THRESHOLD_STAGE_DIRECTIONS[chapter]
      if (thresholdBeat) expect(prompt).not.toContain(thresholdBeat)
    },
  )

  it('the dyad is never named as a cast of characters outside the Threshold', () => {
    const daily: StorySeed = { kind: 'daily', needsLocation: true }
    const prompt = buildNarratorSystemPrompt(stateFor(daily, 'subjects'))
    expect(prompt).not.toContain('the joke about being fictional')
    expect(prompt).not.toContain('Aletheia steps forward exactly twice')
    expect(prompt).toContain('never reveal the machinery — the user meets a narrator, not a form')
  })
})
