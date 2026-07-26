import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMsg, ChatSessionState } from '../types/chat'
import { isValidISODate, isValidTime } from '../lib/chat/stateMachine'
import { completeSession, createOrResumeSession, getSession, streamTurn } from '../lib/chatApi'
import { geocodePlace, type GeocodeHit } from '../lib/geocode'
import { navigate } from '../hooks/useHashRoute'
import { Starfield } from '../components/threshold/Starfield'
import { Fade, Scene, SplitText, REDUCED_MOTION } from '../components/threshold/sceneKit'
import { HomePage } from './HomePage'

/**
 * The Threshold (W2-A + W2-B) — the pre-graph onboarding scene. Seven
 * scroll-scrubbed scenes in the POC's grammar (`prototypes/threshold.html`,
 * owner-approved): Arrival / Compact / Name / Moment / Place / Dedication /
 * Crossing. The four form scenes are HARD GATES — the scroll position clamps
 * at the first unpassed gate, with the POC's nudge affordance.
 *
 * Unlike the POC, the gates are not local theater: each one drives the
 * caller's real `threshold` chat session over SSE (the narrator voice rides
 * along as the whisper line). Turn inputs are the validated form values —
 * including the geocoded `{ query, normalized_location }` object the state
 * machine's `parseLocation` accepts — so the session's intake is complete and
 * authoritative when the Dedication confirms. The confirm then calls
 * `completeSession` (advance-on-consume, W1-B): the backend persists the
 * caller's `self` subject profile at that seam, and only then does the
 * Crossing unlock. Resume-after-reload works because create-or-resume returns
 * the open session and the gates re-derive from its intake.
 *
 * The Crossing reveal IS the graph entrance (plan §6): the real HomePage
 * mounts inside the clip-path opening (deferred until the profile is sealed),
 * and the Enter beat simply navigates to `#/`.
 *
 * No new deps: the POC's Lenis smooth-scroll is dropped in favor of native
 * scroll (Lenis was a CDN script in the POC, never a package), and the scrub
 * math is the POC's own scroll arithmetic. `prefers-reduced-motion` collapses
 * every animation; the whole flow remains keyboard-completable.
 */

// ---------------------------------------------------------------------------
// Scroll math + helpers (ported from the POC)
// ---------------------------------------------------------------------------

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))

function scrollToY(y: number, immediate = false) {
  window.scrollTo({ top: y, behavior: immediate || REDUCED_MOTION() ? 'auto' : 'smooth' })
}

function scrollToScene(id: string, immediate = false) {
  const el = document.getElementById(id)
  if (el) scrollToY(el.offsetTop, immediate)
}

function msgText(msg: ChatMsg): string {
  return msg.blocks
    .map((b) => (b.kind === 'text' || b.kind === 'stage_direction' ? b.text : ''))
    .join('')
    .trim()
}

// ---------------------------------------------------------------------------
// Gate model
// ---------------------------------------------------------------------------

type GateKey = 'name' | 'moment' | 'place' | 'dedication'
type Gates = Record<GateKey, boolean>

const NO_GATES: Gates = { name: false, moment: false, place: false, dedication: false }
const GATE_SCENE: Record<GateKey, string> = { name: 's3', moment: 's4', place: 's5', dedication: 's6' }

function firstOpenGate(g: Gates): GateKey | null {
  if (!g.name) return 'name'
  if (!g.moment) return 'moment'
  if (!g.place) return 'place'
  if (!g.dedication) return 'dedication'
  return null
}

/** Re-derive gates from an authoritative session (mount-resume / error resync). */
function deriveGates(s: ChatSessionState): Gates {
  const subj = s.intake.subjects?.[0]
  return {
    name: Boolean(subj?.name),
    moment: Boolean(subj?.birth_date && subj?.birth_time && subj?.birth_time_confidence),
    place: Boolean(subj?.birth_location_query),
    // Dedication is never restored: sealing the record is an explicit act.
    dedication: false,
  }
}

type Confidence = 'exact' | 'approximate' | 'unknown'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ThresholdPage() {
  const [loading, setLoading] = useState(true)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [narrator, setNarrator] = useState<string | null>(null)
  const [gates, setGates] = useState<Gates>(NO_GATES)
  const [crossed, setCrossed] = useState(false)

  // Form state (the POC's `state` object)
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [confidence, setConfidence] = useState<Confidence | ''>('')
  const [placeQuery, setPlaceQuery] = useState('')
  const [placePick, setPlacePick] = useState<GeocodeHit | null>(null)
  const [placeHeld, setPlaceHeld] = useState(false)
  const [sugg, setSugg] = useState<GeocodeHit[]>([])

  const sessionRef = useRef<ChatSessionState | null>(null)
  const gatesRef = useRef<Gates>(NO_GATES)
  const streamingRef = useRef(false)
  const initRef = useRef(false)
  const abortRef = useRef<(() => void) | null>(null)
  const lastNudgeRef = useRef(0)
  const crossingRef = useRef<HTMLDivElement | null>(null)

  const setGate = (key: GateKey) => {
    const next = { ...gatesRef.current, [key]: true }
    gatesRef.current = next
    setGates(next)
  }

  // -------------------------------------------------------------------------
  // Turn driver — one input in, narrator voice + chapter cursor out
  // -------------------------------------------------------------------------

  const send = useCallback((input: unknown, after?: () => void) => {
    const sess = sessionRef.current
    if (!sess || streamingRef.current) return
    streamingRef.current = true
    setStreaming(true)
    setError(null)
    abortRef.current = streamTurn(sess.sessionId, input, {
      onEvent: (ev) => {
        if (ev.type === 'chapter_advanced') {
          sessionRef.current = sessionRef.current ? { ...sessionRef.current, chapter: ev.chapter } : sessionRef.current
        } else if (ev.type === 'reply_end') {
          const text = msgText(ev.msg)
          if (text) setNarrator(text)
        } else if (ev.type === 'error') {
          setError(ev.message)
        }
      },
      onDone: () => {
        streamingRef.current = false
        setStreaming(false)
        after?.()
      },
      onError: (err) => {
        // W2 contract: the turn persisted server-side before any frame, so a
        // transport break is recovered by resyncing from the authoritative
        // session — the gates re-derive from what actually landed.
        void (async () => {
          try {
            const { session: fresh } = await getSession(sess.sessionId)
            sessionRef.current = fresh
            const g = deriveGates(fresh)
            gatesRef.current = g
            setGates(g)
            setError(`${err.message} — the story was recovered from the server; continue where it stands.`)
          } catch {
            setError(err.message)
          } finally {
            streamingRef.current = false
            setStreaming(false)
          }
        })()
      },
    })
  }, [])

  /** Serialize several turn inputs (the Moment gate is up to three slots). */
  const chain = useCallback(
    (inputs: unknown[]) => {
      const [head, ...rest] = inputs
      if (head === undefined) return
      send(head, () => chain(rest))
    },
    [send],
  )

  // -------------------------------------------------------------------------
  // Mount — create/resume the threshold session, derive gates, kick off
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (initRef.current) return // StrictMode double-invoke guard
    initRef.current = true
    // NOTE: no `cancelled` flag — under StrictMode's dev double-mount the
    // first run's cleanup would cancel the only fetch ever started (the
    // second run returns early above), wedging the page on its loading beat
    // forever. setState after a real unmount is a harmless no-op; the
    // in-flight stream is aborted by the unmount effect below.
    void (async () => {
      try {
        const created = await createOrResumeSession({ kind: 'threshold' })
        const { session: loaded, turns } = await getSession(created.sessionId)
        sessionRef.current = loaded
        const g = deriveGates(loaded)
        gatesRef.current = g
        setGates(g)
        // Prefill the forms from whatever the story already holds (resume).
        const subj = loaded.intake.subjects?.[0]
        if (subj?.name) setName(subj.name)
        if (subj?.birth_date) setDate(subj.birth_date)
        if (subj?.birth_time_confidence) setConfidence(subj.birth_time_confidence)
        if (subj?.birth_time_confidence === 'unknown') setTimeUnknown(true)
        else if (subj?.birth_time) setTime(subj.birth_time)
        if (subj?.birth_location_query) {
          setPlaceQuery(subj.birth_location_query)
          setPlaceHeld(true)
        }
        const lastNarrator = [...turns].reverse().find((t) => t.role === 'narrator')
        if (lastNarrator) setNarrator(msgText(lastNarrator))
        setLoading(false)
        if (turns.length === 0 && loaded.chapter === 'awakening') {
          send('') // awakening → subjects; the narrator speaks first
        } else {
          // Resume mid-Threshold: jump straight to the first open gate.
          const open = firstOpenGate(g)
          const target = open ? GATE_SCENE[open] : 'crossing-track'
          requestAnimationFrame(() => scrollToScene(target, true))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'The Threshold could not be opened.')
        setLoading(false)
      }
    })()
  }, [send])

  // Abort any in-flight stream on unmount.
  useEffect(() => () => abortRef.current?.(), [])

  // -------------------------------------------------------------------------
  // Hard-gate clamp + crossing scrub (the POC's master scroll loop)
  // -------------------------------------------------------------------------

  useEffect(() => {
    const enforceGate = () => {
      const open = firstOpenGate(gatesRef.current)
      if (!open) return
      const el = document.getElementById(GATE_SCENE[open])
      if (!el) return
      const limit = el.offsetTop
      if (window.scrollY > limit + 8) {
        scrollToY(limit, true)
        const now = performance.now()
        if (now - lastNudgeRef.current > 700) {
          lastNudgeRef.current = now
          const card = el.querySelector('.threshold-card')
          if (card) {
            card.classList.remove('threshold-nudge')
            void (card as HTMLElement).offsetWidth
            card.classList.add('threshold-nudge')
          }
        }
      }
    }
    const updateCrossing = () => {
      const track = document.getElementById('crossing-track')
      const el = crossingRef.current
      if (!track || !el) return
      const vh = window.innerHeight
      const range = track.offsetHeight - vh
      const p = clamp((window.scrollY - track.offsetTop) / range, 0, 1)
      const e = easeOutExpo(clamp(p / 0.62, 0, 1)) // reveal completes at 62%
      const inset = lerp(50, 0, e)
      el.style.clipPath = `inset(${inset}% ${inset}% round ${lerp(6, 0, e)}px)`
      el.style.pointerEvents = e > 0.85 ? 'auto' : 'none'
      setCrossed(e > 0.85)
    }
    const onScroll = () => {
      enforceGate()
      updateCrossing()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // -------------------------------------------------------------------------
  // Geocoder (scene 005) — debounced Nominatim, same seam as the daily doorway
  // -------------------------------------------------------------------------

  useEffect(() => {
    const q = placeQuery.trim()
    if (q.length < 3 || placeHeld) {
      setSugg([])
      return
    }
    const t = setTimeout(() => {
      void geocodePlace(q).then(setSugg)
    }, 350)
    return () => clearTimeout(t)
  }, [placeQuery, placeHeld])

  // -------------------------------------------------------------------------
  // Gate passes
  // -------------------------------------------------------------------------

  const passName = () => {
    const value = name.trim()
    if (value.length < 2 || streamingRef.current) return
    setGate('name')
    if (!sessionRef.current?.intake.subjects?.[0]?.name) send(value)
    setTimeout(() => scrollToScene('s4'), 420)
  }

  const dateOk = isValidISODate(date.trim())
  const timeOk = timeUnknown || isValidTime(time.trim())
  const confOk = confidence === 'exact' || confidence === 'approximate' || confidence === 'unknown'
  const momentReady = dateOk && timeOk && confOk

  const passMoment = () => {
    if (!momentReady || streamingRef.current) return
    setGate('moment')
    const subj = sessionRef.current?.intake.subjects?.[0]
    const steps: unknown[] = []
    if (!subj?.birth_date) steps.push(date.trim())
    if (timeUnknown) {
      // The machine's 'unknown' beat at the time slot records BOTH the noon
      // convention and the unknown confidence — never send a third turn.
      if (!subj?.birth_time) steps.push('unknown')
      else if (!subj?.birth_time_confidence) steps.push('unknown')
    } else {
      if (!subj?.birth_time) steps.push(time.trim())
      if (!subj?.birth_time_confidence) steps.push(confidence)
    }
    chain(steps)
    setTimeout(() => scrollToScene('s5'), 420)
  }

  const passPlace = () => {
    if (!placeHeld || !placeQuery.trim() || streamingRef.current) return
    setGate('place')
    if (!sessionRef.current?.intake.subjects?.[0]?.birth_location_query) {
      const normalized = placePick?.location
      send(normalized ? { query: placeQuery.trim(), normalized_location: normalized } : placeQuery.trim())
    }
    setTimeout(() => scrollToScene('s6'), 420)
  }

  /** Seal the record: assembly 'yes' → handoff, then advance-on-consume. */
  const finalize = useCallback(async () => {
    const sess = sessionRef.current
    if (!sess) return
    streamingRef.current = true
    setStreaming(true)
    setError(null)
    try {
      // W1-B: the backend writes the caller's `self` profile at this seam.
      const done = await completeSession(sess.sessionId)
      sessionRef.current = done
      setGate('dedication')
      setNarrator('The mirror is aimed. The sky is yours to open.')
      scrollToY((document.getElementById('crossing-track')?.offsetTop ?? 0) + window.innerHeight * 0.4)
    } catch (err) {
      setError(
        `${err instanceof Error ? err.message : 'The record could not be sealed.'} — the story is safe; confirm once more.`,
      )
    } finally {
      streamingRef.current = false
      setStreaming(false)
    }
  }, [])

  const passDedication = () => {
    if (streamingRef.current || loading) return
    if (sessionRef.current?.chapter !== 'handoff') send('yes', () => void finalize())
    else void finalize()
  }

  // -------------------------------------------------------------------------
  // Derived display state
  // -------------------------------------------------------------------------

  const placeDisplay = placePick?.location.display_name ?? placeQuery.trim()
  const momentDisplay = timeUnknown ? 'the noon convention (time unknown)' : `${time.trim()} (${confidence || '—'})`

  // -------------------------------------------------------------------------
  // Shared class vocabulary (the POC's CSS, as tailwind)
  // -------------------------------------------------------------------------

  const eyebrow = 'mb-7 font-display text-[10px] font-medium uppercase tracking-[0.3em] text-silver/75'
  const card = 'threshold-card w-[min(480px,92vw)] flex flex-col gap-4 rounded-[14px] border border-gold/15 bg-surface/60 p-7 backdrop-blur-xl'
  const label = 'text-left font-display text-[9px] font-medium uppercase tracking-[0.26em] text-silver/80'
  const input =
    'w-full border-b border-silver/30 bg-transparent px-0.5 py-2.5 font-serif text-[22px] tracking-wide text-parchment transition-colors placeholder:text-lg placeholder:text-silver/45 focus:border-gold focus:outline-none disabled:opacity-40'
  const hint = 'text-left text-xs leading-relaxed text-silver/70'
  const btn =
    'self-end rounded-full border border-gold px-6 py-3 font-display text-[10px] font-medium uppercase tracking-[0.26em] text-gold transition-all hover:bg-gold hover:text-void disabled:cursor-default disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-gold'
  const chip = (on: boolean) =>
    `rounded-full border px-4 py-2 font-display text-[10px] font-medium uppercase tracking-[0.2em] transition-all disabled:cursor-default disabled:opacity-30 ${
      on ? 'border-gold bg-gold/10 text-gold' : 'border-silver/30 text-silver hover:border-gold/50 hover:text-parchment'
    }`

  return (
    <div className="min-h-screen overflow-x-hidden bg-void font-body text-parchment">
      <style>{`
        .threshold-nudge { animation: threshold-nudge .45s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes threshold-nudge {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-7px); }
          60% { transform: translateX(5px); }
          85% { transform: translateX(-2px); }
        }
        .threshold-drip { transform-origin: top; animation: threshold-drip 2.2s cubic-bezier(0.16, 1, 0.3, 1) infinite; }
        @keyframes threshold-drip {
          0% { transform: scaleY(0); } 55% { transform: scaleY(1); }
          100% { transform: scaleY(1); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .threshold-nudge, .threshold-drip { animation: none; }
        }
      `}</style>

      <Starfield />

      <header className="fixed left-1/2 top-[18px] z-40 flex -translate-x-1/2 items-center gap-3.5 whitespace-nowrap rounded-full border border-gold/10 bg-surface/55 px-[18px] py-2 font-display text-[10px] uppercase tracking-[0.28em] text-silver backdrop-blur-xl">
        <b className="font-medium text-gold">✳ Urania 137</b>
        <span className="text-gold/60">·</span>
        <span>The Threshold</span>
      </header>

      {/* The narrator travels with you — latest reply, or a streaming pulse */}
      {(narrator || streaming) && (
        <p className="fixed bottom-6 left-6 z-40 max-w-xs text-left text-xs italic leading-relaxed text-silver/70">
          {streaming ? 'The narrator is composing…' : narrator}
        </p>
      )}

      {error && (
        <p className="fixed bottom-6 right-6 z-40 max-w-sm rounded-lg border border-terracotta/25 bg-terracotta/10 px-3 py-2 text-right text-xs text-evidence-copy-unresolved">
          {error}
        </p>
      )}

      <main className="relative z-10">
        {/* 001 — ARRIVAL */}
        <Scene id="s1" ariaLabel="Arrival">
          {(show) => (
            <>
              <Fade show={show} className={eyebrow}>001 — Arrival</Fade>
              <h1 className="flex flex-col font-serif text-[clamp(38px,6.2vw,96px)] leading-[1.05] tracking-[0.01em] text-parchment">
                <SplitText per="char" show={show} delay={0} parts={[{ t: 'You found' }]} />
                <SplitText per="char" show={show} delay={0.15} parts={[{ t: 'the ' },{ t: 'Threshold.', gold: true }]} />
              </h1>
              <Fade show={show} className="mt-8 max-w-[520px] text-[15px] leading-[1.7] text-silver">
                <p>
                  I&apos;m the narrator — <span className="text-parchment">a character, and I know it.</span>{' '}
                  Someone had to say it first. Scroll, and let&apos;s aim the mirror.
                </p>
              </Fade>
              <Fade show={show} className="absolute bottom-[34px] left-1/2 flex -translate-x-1/2 flex-col items-center gap-2.5">
                <span className="font-display text-[9px] uppercase tracking-[0.3em] text-silver/60">scroll</span>
                <span className="threshold-drip block h-[42px] w-px bg-gold/50" />
              </Fade>
            </>
          )}
        </Scene>

        {/* 002 — THE COMPACT */}
        <Scene id="s2" ariaLabel="The Compact">
          {(show) => (
            <>
              <Fade show={show} className={eyebrow}>002 — The Compact</Fade>
              <p className="max-w-[880px] font-serif text-[clamp(21px,2.9vw,36px)] leading-[1.45] text-parchment">
                <SplitText
                  per="word"
                  show={show}
                  parts={[
                    { t: 'Before the sky can be read, the mirror must be aimed. Five facts — a name, a date, a time, a place, and your honesty about all four. ' },
                    { t: 'No predictions. No diagnoses.', gold: true },
                    { t: ' You remain the author. I am only the glass.' },
                  ]}
                />
              </p>
            </>
          )}
        </Scene>

        {/* 003 — THE NAME (gate) */}
        <Scene id="s3" ariaLabel="The Name">
          {(show) => (
            <>
              <Fade show={show} className={eyebrow}>003 — The Name</Fade>
              <Fade show={show} className="mb-10 max-w-[760px] font-serif text-[clamp(24px,3.4vw,44px)] leading-[1.25] text-parchment">
                <p>What name should <span className="text-gold">the mirror hold?</span></p>
              </Fade>
              <div className={card}>
                <label className={label} htmlFor="th-name">Name</label>
                <input
                  id="th-name"
                  className={input}
                  type="text"
                  placeholder="As it was given to you"
                  autoComplete="off"
                  value={name}
                  disabled={gates.name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') passName() }}
                />
                <p className={hint}>
                  {gates.name
                    ? 'Held. The mirror learns its first word.'
                    : 'The numerology engine rejects nameless subjects — its words, not mine.'}
                </p>
                <button className={btn} disabled={name.trim().length < 2 || gates.name || loading || streaming} onClick={passName}>
                  Continue
                </button>
              </div>
            </>
          )}
        </Scene>

        {/* 004 — THE MOMENT (gate) */}
        <Scene id="s4" ariaLabel="The Moment">
          {(show) => (
            <>
              <Fade show={show} className={eyebrow}>004 — The Moment</Fade>
              <Fade show={show} className="mb-10 max-w-[760px] font-serif text-[clamp(24px,3.4vw,44px)] leading-[1.25] text-parchment">
                <p>Forgive the clipboard — <span className="text-gold">the stars are sticklers.</span></p>
              </Fade>
              <div className={card}>
                <label className={label} htmlFor="th-date">Birth date</label>
                <input
                  id="th-date"
                  className={input}
                  type="text"
                  placeholder="YYYY-MM-DD"
                  autoComplete="off"
                  inputMode="numeric"
                  value={date}
                  disabled={gates.moment}
                  onChange={(e) => setDate(e.target.value)}
                />
                <label className={`${label} mt-1.5`} htmlFor="th-time">Birth time · 24-hour</label>
                <input
                  id="th-time"
                  className={input}
                  type="text"
                  placeholder="HH:MM"
                  autoComplete="off"
                  inputMode="numeric"
                  value={time}
                  disabled={gates.moment || timeUnknown}
                  onChange={(e) => setTime(e.target.value)}
                />
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    className={chip(timeUnknown)}
                    disabled={gates.moment}
                    onClick={() => {
                      const next = !timeUnknown
                      setTimeUnknown(next)
                      if (next) { setTime(''); setConfidence('unknown') }
                      else setConfidence('')
                    }}
                  >
                    I don&apos;t know the time
                  </button>
                </div>
                <span className={`${label} mt-1.5`}>How well is it known</span>
                <div className="flex flex-wrap gap-2.5">
                  {(['exact', 'approximate', 'unknown'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={chip(confidence === c)}
                      disabled={gates.moment || timeUnknown}
                      onClick={() => setConfidence(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <p className={hint}>
                  {gates.moment ? (
                    'Recorded in the family record — plainly, unhurriedly.'
                  ) : date.trim() && !dateOk ? (
                    <><span className="text-evidence-copy-unresolved">That date does not exist on any calendar I serve.</span> YYYY-MM-DD.</>
                  ) : time.trim() && !timeUnknown && !isValidTime(time.trim()) ? (
                    <><span className="text-evidence-copy-unresolved">HH:MM, 24-hour</span> — or the honesty button above.</>
                  ) : timeUnknown ? (
                    'Noon it is. The stars forgive; the engines average.'
                  ) : (
                    'A real calendar date, and HH:MM — or honesty. Both are accepted here.'
                  )}
                </p>
                <button className={btn} disabled={!momentReady || gates.moment || loading || streaming} onClick={passMoment}>
                  Continue
                </button>
              </div>
            </>
          )}
        </Scene>

        {/* 005 — THE PLACE (gate) */}
        <Scene id="s5" ariaLabel="The Place">
          {(show) => (
            <>
              <Fade show={show} className={eyebrow}>005 — The Place</Fade>
              <Fade show={show} className="mb-10 max-w-[760px] font-serif text-[clamp(24px,3.4vw,44px)] leading-[1.25] text-parchment">
                <p>And <span className="text-gold">the place</span> that first held you?</p>
              </Fade>
              <div className={card}>
                <label className={label} htmlFor="th-place">Birth location</label>
                <input
                  id="th-place"
                  className={input}
                  type="text"
                  placeholder="City, country"
                  autoComplete="off"
                  value={placeQuery}
                  disabled={gates.place}
                  onChange={(e) => {
                    setPlaceQuery(e.target.value)
                    setPlacePick(null)
                    setPlaceHeld(false)
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') passPlace() }}
                />
                {!gates.place && (
                  <div className="flex max-h-[168px] flex-col gap-1.5 overflow-hidden">
                    {sugg.map((hit) => (
                      <button
                        key={hit.display}
                        type="button"
                        className={`flex items-baseline justify-between gap-3 rounded-[9px] border px-3.5 py-2.5 text-left text-[13.5px] transition-all ${
                          placePick?.display === hit.display
                            ? 'border-gold/55 bg-gold/10 text-parchment'
                            : 'border-silver/15 bg-void/50 text-parchment hover:border-gold/55 hover:bg-gold/10'
                        }`}
                        onClick={() => { setPlacePick(hit); setPlaceHeld(true); setSugg([]) }}
                      >
                        <span className="truncate">{hit.display}</span>
                        <small className="shrink-0 text-[11px] text-silver/70">{hit.location.timezone}</small>
                      </button>
                    ))}
                    {placeQuery.trim().length >= 3 && !placeHeld && (
                      <button
                        type="button"
                        className="flex items-baseline justify-between gap-3 rounded-[9px] border border-silver/15 bg-void/50 px-3.5 py-2.5 text-left text-[13.5px] text-parchment transition-all hover:border-gold/55 hover:bg-gold/10"
                        onClick={() => { setPlacePick(null); setPlaceHeld(true); setSugg([]) }}
                      >
                        <span className="truncate">Hold “{placeQuery.trim()}” as written</span>
                        <small className="shrink-0 text-[11px] text-silver/70">manual entry</small>
                      </button>
                    )}
                  </div>
                )}
                <p className={hint}>
                  {gates.place
                    ? `The sky over ${placeQuery} is now the reference sky.`
                    : 'Pick the geocoder’s card, or hold what you typed — the story takes both.'}
                </p>
                <button className={btn} disabled={!placeHeld || gates.place || loading || streaming} onClick={passPlace}>
                  Continue
                </button>
              </div>
            </>
          )}
        </Scene>

        {/* 006 — THE DEDICATION (gate) */}
        <Scene id="s6" ariaLabel="The Dedication">
          {(show) => (
            <>
              <Fade show={show} className={eyebrow}>006 — The Dedication</Fade>
              <Fade show={show} className="max-w-[720px] font-serif text-[clamp(19px,2.4vw,30px)] leading-[1.8] text-parchment [font-feature-settings:'onum']">
                <p>
                  Read back, as a dedication:<br />
                  <span className="text-gold">{name.trim() || '—'}</span>,
                  arrived <span className="text-gold">{date.trim() || '—'}</span>
                  {' '}at <span className="text-gold">{momentDisplay}</span>,
                  in <span className="text-gold">{placeDisplay || '—'}</span>.<br />
                  The mirror is aimed.
                </p>
              </Fade>
              <Fade show={show} className="mt-[42px]">
                <button className={btn} disabled={gates.dedication || loading || streaming} onClick={passDedication}>
                  {gates.dedication ? 'Sealed — the sky is open below' : 'This is true — open the sky'}
                </button>
              </Fade>
            </>
          )}
        </Scene>

        {/* 007 — THE CROSSING (scrub track) */}
        <section id="crossing-track" className="relative z-10 w-full" style={{ height: '240vh' }} aria-label="The Crossing" />
      </main>

      {/* The Crossing — clip-path reveal. The real graph mounts inside the
          opening (deferred until the profile is sealed), so the reveal IS the
          entrance, not a redirect-with-spinner (plan §6). */}
      <div
        ref={crossingRef}
        className="fixed inset-0 z-30 overflow-hidden bg-surface"
        style={{ clipPath: 'inset(50% 50% round 6px)', pointerEvents: 'none' }}
      >
        {gates.dedication && <HomePage />}
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-[8vh] z-10 flex flex-col items-center gap-5 px-6 text-center transition-opacity duration-700 ${
            crossed ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <p className="max-w-[440px] text-sm leading-[1.7] text-silver [text-shadow:0_1px_12px_rgba(7,11,29,0.9)]">
            The graph opens around you. Every doorway from here already knows your name — the story remembers.
          </p>
          <button
            className="pointer-events-auto rounded-full border border-gold bg-void/70 px-[34px] py-4 font-display text-[11px] font-medium uppercase tracking-[0.3em] text-gold backdrop-blur-md transition-all hover:bg-gold hover:text-void disabled:opacity-0"
            disabled={!crossed}
            onClick={() => navigate('/')}
          >
            Enter Urania 137
          </button>
        </div>
      </div>
    </div>
  )
}
