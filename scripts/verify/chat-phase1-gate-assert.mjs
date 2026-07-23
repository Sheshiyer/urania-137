#!/usr/bin/env node
/**
 * chat-phase1-gate-assert.mjs — assertion pass for the Phase 1 exit gate.
 * Reads the raw artifacts produced by chat-phase1-gate.sh and verifies:
 * SSE event order per turn, contiguous per-session event ids, in-stream
 * rejection of the invalid date, intake persistence, handoff-ready state,
 * disconnect durability, and replay fidelity (after= / Last-Event-ID).
 *
 * Usage: node chat-phase1-gate-assert.mjs <artifact-dir> <replay-cut-id>
 * Exits non-zero on the first failed assertion group (all results printed).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const [out, cutArg] = process.argv.slice(2)
if (!out || !cutArg) {
  console.error('usage: chat-phase1-gate-assert.mjs <artifact-dir> <replay-cut-id>')
  process.exit(2)
}
const CUT = Number(cutArg)

let passed = 0
let failed = 0
function check(label, cond, detail = '') {
  if (cond) {
    passed++
    console.log(`  PASS ${label}`)
  } else {
    failed++
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

function parseSse(file) {
  const text = readFileSync(file, 'utf8')
  const frames = []
  for (const block of text.split('\n\n')) {
    if (!block.trim() || block.startsWith(':')) continue
    let id
    let data
    for (const line of block.split('\n')) {
      if (line.startsWith('id: ')) id = Number(line.slice(4))
      else if (line.startsWith('data: ')) data = line.slice(6)
    }
    if (data !== undefined) frames.push({ id, event: JSON.parse(data) })
  }
  return frames
}

const read = (f) => JSON.parse(readFileSync(join(out, f), 'utf8'))

// --- turn 2 comes from the replay (its live stream was killed) --------------
const live = {}
for (const n of ['01', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']) {
  live[n] = parseSse(join(out, `turn-${n}.sse`))
}
const replayFull = parseSse(join(out, 'replay-full.sse'))
const replayTail = parseSse(join(out, 'replay-tail.sse'))
const replayLeid = parseSse(join(out, 'replay-leid.sse'))

// Group the authoritative replay stream into turns (reply_start..reply_end).
const replayTurns = []
let cur = null
for (const f of replayFull) {
  if (f.event.type === 'reply_start') cur = []
  cur?.push(f)
  if (f.event.type === 'reply_end') {
    replayTurns.push(cur)
    cur = null
  }
}

console.log('\n[1] session creation')
const session = read('session.json')
check('201 create returns resumed:false at chapter awakening', session.resumed === false && session.session.chapter === 'awakening')
check('seed stored with the witness capability card', session.session.seed?.mode === 'integrated-kundali-l0')

console.log('\n[2] per-turn SSE event order (live turns)')
function checkOrder(label, frames) {
  check(`${label}: first frame reply_start, last reply_end`, frames[0]?.event.type === 'reply_start' && frames.at(-1)?.event.type === 'reply_end')
  const tail = frames.slice(1, -1).map((f) => f.event.type)
  const firstMarker = tail.findIndex((t) => t === 'intake_recorded' || t === 'chapter_advanced')
  const lastBlock = tail.map((t, i) => (t.startsWith('block_') ? i : -1)).filter((i) => i >= 0).at(-1) ?? -1
  check(`${label}: block frames precede intake_recorded/chapter_advanced`, firstMarker === -1 || firstMarker > lastBlock)
  // per-index block_start → block_delta* → block_end well-formedness
  const stack = []
  let okBlocks = true
  for (const t of tail) {
    if (t === 'block_start') stack.push('open')
    else if (t === 'block_end') {
      if (stack.pop() !== 'open') okBlocks = false
    } else if (t === 'block_delta' && stack.length === 0) okBlocks = false
  }
  check(`${label}: block_start/delta/end nesting well-formed`, okBlocks && stack.length === 0)
}
for (const [n, frames] of Object.entries(live)) checkOrder(`turn ${n}`, frames)
checkOrder('turn 02 (from replay — live stream was disconnected)', replayTurns[1] ?? [])

console.log('\n[3] event ids are contiguous per session, live ids == replay ids')
const t1 = live['01']
check('turn 01 ids are 1..N', t1.every((f, i) => f.id === i + 1), JSON.stringify(t1.map((f) => f.id)))
check('turn 03 ids continue after turn 02 (from replay)', live['03'][0]?.id === replayTurns[1].at(-1)?.id + 1)
const liveAndReplay = [
  ...t1,
  ...replayTurns[1],
  ...['03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].flatMap((n) => live[n]),
]
check('every live frame id matches the replay frame at the same position',
  liveAndReplay.every((f, i) => f.id === replayFull[i]?.id && JSON.stringify(f.event) === JSON.stringify(replayFull[i]?.event)))
check('replay ids are exactly 1..N contiguous', replayFull.every((f, i) => f.id === i + 1))

console.log('\n[4] scripted intake events')
const intakeOf = (frames) => frames.filter((f) => f.event.type === 'intake_recorded').map((f) => [f.event.field, f.event.value])
const chapterOf = (frames) => frames.filter((f) => f.event.type === 'chapter_advanced').map((f) => f.event.chapter)
check('turn 02 advanced surface -> subjects', chapterOf(replayTurns[1] ?? []).join() === 'subjects')
check('turn 03 recorded subjects[0].name = Asha', JSON.stringify(intakeOf(live['03'])) === JSON.stringify([['subjects[0].name', 'Asha']]))
check('turn 05 recorded birth_date 1990-05-17', JSON.stringify(intakeOf(live['05'])) === JSON.stringify([['subjects[0].birth_date', '1990-05-17']]))
check('turn 06 unknown time -> noon convention (12:00)', JSON.stringify(intakeOf(live['06'])) === JSON.stringify([['subjects[0].birth_time', '12:00']]))
check('turn 07 recorded location and advanced to language_level',
  intakeOf(live['07']).length === 1 && chapterOf(live['07']).join() === 'language_level')
check('turn 10 consciousness_level -> advanced to mode', chapterOf(live['10']).join() === 'mode')
check('turn 12 assembly confirm -> handoff (ready)', chapterOf(live['12']).join() === 'handoff')

console.log('\n[5] invalid date 2023-02-30 rejected in-stream (turn 04)')
const t4 = live['04']
const t4msg = t4.at(-1)?.event.msg
check('no intake_recorded / chapter_advanced on the invalid turn',
  !t4.some((f) => f.event.type === 'intake_recorded' || f.event.type === 'chapter_advanced'))
check('reply_end.msg carries tool_result ok:false naming YYYY-MM-DD',
  t4msg?.blocks?.[0]?.kind === 'tool_result' && t4msg.blocks[0].ok === false && /YYYY-MM-DD/.test(t4msg.blocks[0].message ?? ''))
check('the invalid turn still persisted (has event ids)', t4.every((f) => typeof f.id === 'number'))

console.log('\n[6] disconnect durability (turn 02)')
const finalSnap = read('session-final.json')
check('turns persisted: 12 user + 12 narrator = 24', finalSnap.turns.length === 24, `got ${finalSnap.turns.length}`)
check('roles alternate user/narrator in order',
  finalSnap.turns.every((t, i) => t.role === (i % 2 === 0 ? 'user' : 'narrator')))
check('turn 02 user msg "yes" persisted despite the killed socket',
  finalSnap.turns[2]?.role === 'user' && finalSnap.turns[2]?.blocks?.[0]?.text === 'yes')

console.log('\n[7] handoff-ready final state')
const s = finalSnap.session
check('chapter is handoff', s.chapter === 'handoff')
const subj = s.intake?.subjects?.[0] ?? {}
check('intake.subjects[0] complete',
  subj.name === 'Asha' && subj.birth_date === '1990-05-17' && subj.birth_time === '12:00' &&
  subj.birth_time_confidence === 'unknown' && subj.birth_location_query === 'Pune, India' &&
  !!subj.normalized_location,
  JSON.stringify(subj))
check('language/report/consciousness levels recorded',
  s.intake?.language === 'en' && s.intake?.report_level === 'L2' && s.intake?.consciousness_level === 3)
check('solo witness -> relationship_context null', s.intake?.relationship_context === null)
check('mode from the seed, never negotiated', s.intake?.mode === 'integrated-kundali-l0')

console.log('\n[8] replay endpoint')
check(`replay-full starts at id 1 and has ${liveAndReplay.length} frames`, replayFull.length === liveAndReplay.length)
check(`replay ?after=${CUT} resumes at id ${CUT + 1}`, replayTail[0]?.id === CUT + 1)
check('replay tail equals the same slice of replay-full',
  JSON.stringify(replayTail) === JSON.stringify(replayFull.filter((f) => f.id > CUT)))
check('Last-Event-ID header equals ?after= behavior', JSON.stringify(replayLeid) === JSON.stringify(replayTail))
check('replay tail re-derives intake + chapter for a reconnecting client', (() => {
  const intake = {}
  let chapter
  for (const f of replayTail) {
    if (f.event.type === 'intake_recorded') intake[f.event.field] = f.event.value
    if (f.event.type === 'chapter_advanced') chapter = f.event.chapter
  }
  return intake['subjects[0].name'] === 'Asha' && intake['subjects[0].birth_date'] === '1990-05-17' && chapter === 'handoff'
})())

console.log(`\n${failed === 0 ? 'GATE PASS' : 'GATE FAIL'} — ${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
