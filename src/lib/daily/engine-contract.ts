import { DailyReadingInput } from './source'

/**
 * The consumer→engine contract (T-008), pinned to the LIVE schema captured in
 * docs/daily/engine-schema-notes.md (SCHEMA-1 baseline). Any rename by the engine
 * is a breaking change: it fails gate G2 and must be logged in the ledger.
 *
 * Envelope: `POST /api/v1/engines/{id}/calculate` → `{ engine_id, result, … }`.
 */
export interface EngineEnvelope<T> {
  engine_id: string
  result: T
  witness_prompt?: string
  consciousness_level?: number
  metadata?: Record<string, unknown>
  envelope_version?: string
}

/** `panchanga` engine `result` — indexed limbs; paksha is embedded in `tithi_name`. */
export interface PanchangaResult {
  julian_day: number
  solar_longitude: number
  lunar_longitude: number
  vara_index: number
  vara_name: string
  tithi_index: number
  tithi_name: string
  tithi_value: number
  nakshatra_index: number
  nakshatra_name: string
  nakshatra_value: number
  yoga_index: number
  yoga_name: string
  yoga_value: number
  karana_index: number
  karana_name: string
  karana_value: number
}
export type PanchangaResponse = EngineEnvelope<PanchangaResult>

/** One transit aspect — the overlay lexicon keys on (transiting × natal × aspect). */
export interface TransitAspect {
  aspect_type: string
  nature: string
  natal_planet: string
  transiting_planet: string
  orb: number
  is_applying: boolean
}
export interface TransitsResult {
  /** The only field the lean overlay reads; the rest are typed loosely on purpose. */
  aspects: TransitAspect[]
  natal_positions: unknown
  transit_positions: unknown
  retrograde_planets: unknown
  period_quality: unknown
  sade_sati: unknown
}
export type TransitsResponse = EngineEnvelope<TransitsResult>

/** Deterministic engine request body (mirrors `DeterministicRequest.birth_data`). */
export interface EngineRequestBody {
  birth_data: {
    date: string
    time: string
    latitude: number
    longitude: number
    timezone: string
  }
}

/**
 * "Today at location L, no birth data" — the shape RESOLVED live in T-003:
 * the engine reads `birth_data.date` + location; `current_time` is not required.
 * Noon anchors "the day"; the personal identity is intentionally absent.
 */
export function buildPanchangaRequest(input: DailyReadingInput): EngineRequestBody {
  const { date, location } = input
  return {
    birth_data: {
      date,
      time: '12:00',
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
    },
  }
}

/** The overlay: the user's real natal chart drives `transits`. Null when absent. */
export function buildTransitsRequest(input: DailyReadingInput): EngineRequestBody | null {
  if (!input.birth) return null
  const b = input.birth
  return {
    birth_data: {
      date: b.date,
      time: b.time,
      latitude: b.latitude,
      longitude: b.longitude,
      timezone: b.timezone,
    },
  }
}
