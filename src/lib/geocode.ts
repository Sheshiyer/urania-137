/**
 * Place geocoding (Threshold W2-A) — free-text place → `NormalizedLocation`
 * through the same public Nominatim seam `useChatHandoff` uses for the daily
 * doorway. The Threshold scene geocodes CLIENT-side and sends the structured
 * `{ query, normalized_location }` as the chat turn input — the state machine
 * accepts exactly that shape (`parseLocation` in stateMachine.ts), so the
 * stored self profile carries real coordinates/timezone instead of the
 * manual-entry convention. Best-effort: any failure resolves null and the
 * caller falls back to the plain-text turn (the machine's manual convention).
 */

import type { NormalizedLocation } from '../types'
import { tzFromLongitude } from './daily/location'

export interface GeocodeHit {
  display: string
  location: NormalizedLocation
}

interface NominatimRow {
  display_name?: string
  lat?: string
  lon?: string
}

/** Geocode a free-text place; null on any failure or empty result set. */
export async function geocodePlace(query: string, limit = 3): Promise<GeocodeHit[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&accept-language=en&limit=${limit}`,
      { headers: { 'User-Agent': 'Urania137/0.1' } },
    )
    const data = (await res.json()) as NominatimRow[]
    if (!Array.isArray(data)) return []
    return data
      .filter((r) => typeof r.display_name === 'string' && r.lat !== undefined && r.lon !== undefined)
      .map((r) => {
        const latitude = parseFloat(r.lat!)
        const longitude = parseFloat(r.lon!)
        return {
          display: r.display_name!,
          location: {
            display_name: r.display_name!,
            latitude,
            longitude,
            timezone: tzFromLongitude(longitude),
            provider: 'nominatim',
            confidence: 'geocoded',
          } satisfies NormalizedLocation,
        }
      })
      .filter((h) => Number.isFinite(h.location.latitude) && Number.isFinite(h.location.longitude))
  } catch {
    return []
  }
}
