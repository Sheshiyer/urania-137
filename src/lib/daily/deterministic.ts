import { calculateEngineRaw } from '../selemeneApi'
import { buildPanchangaRequest, buildTransitsRequest, PanchangaResult, TransitsResult } from './engine-contract'
import { PASS_MODEL } from './passModel'
import { DailyReading, DailyReadingInput, DailyReadingPass, DailyReadingSource } from './source'
import { DailyLexicon } from './lexicon/schema'

/**
 * ① The in-app DeterministicInterpreter. `interpret()` is a PURE function over
 * (engine bundle, ctx, lexicon) — byte-stable, snapshot-testable (Phase 3 G4).
 * The class wraps it with the engine fetch so it satisfies the DailyReadingSource
 * seam; ③ WitnessModeSource is a drop-in replacement (Phase 4, G8).
 */

export interface DailyBundle {
  panchanga: PanchangaResult
  transits?: TransitsResult
}

export interface ReadingContext {
  /** ISO date the reading is for (today-in-tz). */
  date: string
  /** Location display name, echoed into the reading's meta + header. */
  location: string
  hasBirthData: boolean
}

const titleOf = (id: string): string => PASS_MODEL.find((p) => p.id === id)?.title ?? id

/** The graceful closing shown only when there is no personal overlay. */
export const CLOSING_INVITATION =
  'The sky above is the same for everyone today. To see how this weather meets your own pattern, add your birth moment.'

// --- pass-builders (each reads one limb and composes from its lexicon entry) ---

function varaPass(p: PanchangaResult, lex: DailyLexicon): DailyReadingPass {
  const e = lex.vara(p.vara_index)
  return {
    id: 'vara',
    title: titleOf('vara'),
    output: `${p.vara_name} — the day of ${e.ruler}. ${e.keynote} ${e.field} ${e.invitation}`,
  }
}

function tithiPass(p: PanchangaResult, lex: DailyLexicon): DailyReadingPass {
  const e = lex.tithi(p.tithi_index)
  const phase = e.paksha === 'shukla' ? 'the waxing fortnight' : 'the waning fortnight'
  return {
    id: 'tithi',
    title: titleOf('tithi'),
    output: `${p.tithi_name} — a ${e.category} lunar day of ${phase}, ${e.motion}, held by ${e.deity}. ${e.keynote} ${e.invitation}`,
  }
}

function nakshatraPass(p: PanchangaResult, lex: DailyLexicon): DailyReadingPass {
  const e = lex.nakshatra(p.nakshatra_index)
  return {
    id: 'nakshatra',
    title: titleOf('nakshatra'),
    output: `The Moon rests in ${p.nakshatra_name}, ruled by ${e.ruler}, its symbol ${e.symbol} (${e.guna}). ${e.keynote} ${e.invitation}`,
  }
}

function conditionsPass(p: PanchangaResult, lex: DailyLexicon): DailyReadingPass {
  const y = lex.yoga(p.yoga_index)
  const k = lex.karana(p.karana_name)
  return {
    id: 'conditions',
    title: titleOf('conditions'),
    output: `The yoga is ${p.yoga_name} (${y.quality}); the karana is ${p.karana_name} (${k.type}). ${y.keynote} ${k.keynote} ${y.invitation}`,
  }
}

/** The personal overlay — the tightest few transits landing on the natal pattern. */
function nativePass(t: TransitsResult, lex: DailyLexicon): DailyReadingPass | null {
  const aspects = [...(t.aspects || [])].sort((a, b) => a.orb - b.orb).slice(0, 3)
  const lines = aspects.map((a) => {
    const e = lex.transit(a.transiting_planet)
    const tone = a.nature.toLowerCase()
    const motion = a.is_applying ? 'drawing closer' : 'separating'
    const core = e ? ` ${e.keynote} ${e.invitation}` : ''
    return `Transiting ${a.transiting_planet} ${a.aspect_type.toLowerCase()} your natal ${a.natal_planet} — a ${tone} contact, ${motion}.${core}`
  })
  if (!lines.length) return null
  return { id: 'native', title: titleOf('native'), output: lines.join(' ') }
}

function assemble(passes: DailyReadingPass[], hasOverlay: boolean): string {
  const body = passes.map((p) => `## ${p.title}\n\n${p.output}`).join('\n\n')
  return hasOverlay ? body : `${body}\n\n---\n\n${CLOSING_INVITATION}`
}

/** PURE: the same bundle always yields the same reading (Phase 3 G4). */
export function interpret(bundle: DailyBundle, ctx: ReadingContext, lex: DailyLexicon): DailyReading {
  const p = bundle.panchanga
  const passes: DailyReadingPass[] = [varaPass(p, lex), tithiPass(p, lex), nakshatraPass(p, lex), conditionsPass(p, lex)]
  const overlay = bundle.transits && ctx.hasBirthData ? nativePass(bundle.transits, lex) : null
  if (overlay) passes.push(overlay)
  return {
    mode: 'daily-panchanga',
    passes,
    assembled: assemble(passes, !!overlay),
    engines_used: ['panchanga', ...(bundle.transits ? ['transits'] : [])],
    meta: { date: ctx.date, location: ctx.location, hasOverlay: !!overlay, source: 'deterministic' },
  }
}

export class DeterministicInterpreter implements DailyReadingSource {
  constructor(private readonly lexicon: DailyLexicon) {}

  async getDailyReading(input: DailyReadingInput): Promise<DailyReading> {
    const panchangaRes = await calculateEngineRaw('panchanga', buildPanchangaRequest(input))
    const panchanga = panchangaRes.result as unknown as PanchangaResult

    let transits: TransitsResult | undefined
    const transitsReq = buildTransitsRequest(input)
    if (transitsReq) {
      const transitsRes = await calculateEngineRaw('transits', transitsReq)
      transits = transitsRes.result as unknown as TransitsResult
    }

    const ctx: ReadingContext = { date: input.date, location: input.location.display, hasBirthData: !!input.birth }
    return interpret({ panchanga, transits }, ctx, this.lexicon)
  }
}
