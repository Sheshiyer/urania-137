import { useCallback, useRef } from 'react'
import type { AssetGenerateRequest, BirthData } from '../types'
import type { SubmitPayload } from '../lib/chat/stateMachine'
import { rememberLocation, tzFromLongitude } from '../lib/daily/location'

/**
 * Chat handoff routing (Phase 2, W3-B / Node_Splice) — maps the terminal
 * `SubmitPayload` the story state machine emits onto the EXISTING submit
 * paths. No submit/save logic lives here; the sinks are the same calls the
 * modal forms made:
 *
 *   AssetGenerateRequest          → useReportGenerator.generateReport (witness)
 *   { birthData, intention? }     → useDeterministicRun.run (workflow/engine)
 *   { locationQuery? }            → the daily reading surface
 *
 * Variant discrimination is structural and order-independent for the three
 * shapes the machine can emit: `birthData` marks deterministic, `mode`
 * marks witness, anything else is the daily payload (including `{}`, the
 * "use my default place" skip).
 */

export interface HandoffSinks {
  /** Witness reading — same call `submitWitness` makes in NodePage. */
  witness: (request: AssetGenerateRequest) => void
  /** Deterministic workflow/engine — same call `submitBirth` makes. */
  birth: (birthData: BirthData, intention?: string) => void
  /** Open the daily reading surface (DailyReadingPanel, unchanged). */
  daily: () => void
}

/**
 * Geocode a free-text place through the same Nominatim seam LocationPicker
 * uses and persist it as the remembered daily location, so the panel's
 * existing resolution (birth → remembered → default) picks it up on mount.
 * Best-effort: any failure resolves false and the daily surface opens with
 * its normal default — a chat-given place is a hint, never a blocker.
 */
async function seedDailyLocation(query: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&accept-language=en&limit=1`,
      { headers: { 'User-Agent': 'Urania137/0.1' } },
    )
    const data = await res.json()
    if (Array.isArray(data) && data.length) {
      const lon = parseFloat(data[0].lon)
      rememberLocation({
        display: data[0].display_name,
        latitude: parseFloat(data[0].lat),
        longitude: lon,
        timezone: tzFromLongitude(lon),
      })
      return true
    }
  } catch {
    /* geocoding is best-effort — the daily default is always a valid reading */
  }
  return false
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
  // daily — { locationQuery? }; seed the place, then open the surface.
  if (typeof payload.locationQuery === 'string' && payload.locationQuery.trim()) {
    await seedDailyLocation(payload.locationQuery.trim())
  }
  sinks.daily()
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
