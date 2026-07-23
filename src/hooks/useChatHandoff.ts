import { useCallback, useRef } from 'react'
import type { AssetGenerateRequest, BirthData } from '../types'
import type { SubmitPayload } from '../lib/chat/stateMachine'
import type { DailyLocation } from '../lib/daily/source'
import { rememberLocation, tzFromLongitude } from '../lib/daily/location'

/**
 * Chat handoff routing (Phase 2 W3-B; Phase 3 in-thread sinks) — maps the
 * terminal `SubmitPayload` the story state machine emits onto the EXISTING
 * submit paths. No submit/save logic lives here; the sinks are the same hook
 * calls the retired modal forms made:
 *
 *   AssetGenerateRequest          → useReportGenerator.generateReport (witness)
 *   { birthData, intention? }     → useDeterministicRun.run (workflow/engine)
 *   { locationQuery? }            → useDailyReading.run / .changeLocation (daily)
 *
 * The chat stays open after the handoff: NodePage feeds each hook's result
 * state back into ChatSheet (`resultMessages`), where the reading renders as
 * in-thread narrator chapters.
 *
 * Variant discrimination is structural and order-independent for the three
 * shapes the machine can emit: `birthData` marks deterministic, `mode`
 * marks witness, anything else is the daily payload (including `{}`, the
 * "use my default place" skip).
 */

export interface HandoffSinks {
  /** Witness reading — the same `generateReport` call the retired form made. */
  witness: (request: AssetGenerateRequest) => void
  /** Deterministic workflow/engine — the same `det.run` call. */
  birth: (birthData: BirthData, intention?: string) => void
  /**
   * Fire the daily reading. Carries the chat-resolved place when the story
   * collected one (already geocoded + remembered); `undefined` means "use my
   * default place" — the sink runs the hook's resolved default location.
   */
  daily: (location?: DailyLocation) => void
}

/**
 * Geocode a free-text place through the same Nominatim seam the retired
 * LocationPicker used and persist it as the remembered daily location, so the
 * hook's resolution (birth → remembered → default) agrees with the story.
 * Best-effort: any failure resolves null and the sink fires with the normal
 * default — a chat-given place is a hint, never a blocker.
 */
async function geocodeDailyLocation(query: string): Promise<DailyLocation | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&accept-language=en&limit=1`,
      { headers: { 'User-Agent': 'Urania137/0.1' } },
    )
    const data = await res.json()
    if (Array.isArray(data) && data.length) {
      const lon = parseFloat(data[0].lon)
      const location: DailyLocation = {
        display: data[0].display_name,
        latitude: parseFloat(data[0].lat),
        longitude: lon,
        timezone: tzFromLongitude(lon),
      }
      rememberLocation(location)
      return location
    }
  } catch {
    /* geocoding is best-effort — the daily default is always a valid reading */
  }
  return null
}

/** Pure routing — separated from React so it unit-tests in node. */
export async function routeHandoff(payload: SubmitPayload, sinks: HandoffSinks): Promise<void> {
  if ('birthData' in payload) {
    sinks.birth(payload.birthData, payload.intention)
    return
  }
  // `mode` is required on AssetGenerateRequest and absent from both other
  // variants, so this `in` guard narrows the union exactly (optional
  // `subjects` cannot narrow — it may be absent at runtime).
  if ('mode' in payload) {
    sinks.witness(payload)
    return
  }
  // daily — { locationQuery? }; resolve the place, then fire the reading.
  const location =
    typeof payload.locationQuery === 'string' && payload.locationQuery.trim()
      ? await geocodeDailyLocation(payload.locationQuery.trim())
      : null
  sinks.daily(location ?? undefined)
}

/**
 * React seam — returns a stable `onHandoff` callback for ChatSheet that
 * always sees the latest sinks (NodePage recreates them each render as
 * `selectedChild` changes).
 */
export function useChatHandoff(sinks: HandoffSinks): (payload: SubmitPayload) => void {
  const ref = useRef(sinks)
  ref.current = sinks
  return useCallback((payload: SubmitPayload) => {
    void routeHandoff(payload, ref.current)
  }, [])
}
