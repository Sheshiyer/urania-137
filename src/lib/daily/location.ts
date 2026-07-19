import { DailyLocation } from './source'

/**
 * Location resolution (T-039) — implements the frozen contract in
 * docs/daily/location-contract.md. Precedence: birth → localStorage → labeled
 * neutral default. Timezone is always carried. Coordinates live only in
 * localStorage, NEVER the URL (privacy rule, asserted by T-040).
 */
export const DAILY_LOCATION_STORAGE_KEY = 'urania.daily.location'

export type LocationSource = 'birth' | 'remembered' | 'default'

export interface ResolvedLocation {
  location: DailyLocation
  source: LocationSource
}

/** The frozen resolution signature (0-B contract). */
export type ResolveDefaultLocation = (args: {
  birth?: { latitude: number; longitude: number; timezone: string; display?: string } | null
  remembered?: DailyLocation | null
}) => ResolvedLocation

/**
 * The neutral canonical default — Ujjain, the traditional prime meridian of
 * Vedic astronomy. Clearly labeled as a default; the reading is never blank.
 */
export const DEFAULT_LOCATION: DailyLocation = {
  display: 'Ujjain, India · default',
  latitude: 23.1765,
  longitude: 75.7885,
  timezone: 'Asia/Kolkata',
}

const usable = (lat: number, lon: number, tz: string) => Number.isFinite(lat) && Number.isFinite(lon) && !!tz

/** Pure precedence resolution — birth → remembered → labeled default. */
export const resolveDefaultLocation: ResolveDefaultLocation = ({ birth, remembered } = {}) => {
  if (birth && usable(birth.latitude, birth.longitude, birth.timezone)) {
    return {
      location: {
        display: birth.display || 'Your birth place',
        latitude: birth.latitude,
        longitude: birth.longitude,
        timezone: birth.timezone,
      },
      source: 'birth',
    }
  }
  if (remembered && usable(remembered.latitude, remembered.longitude, remembered.timezone)) {
    return { location: remembered, source: 'remembered' }
  }
  return { location: DEFAULT_LOCATION, source: 'default' }
}

/** Persist the chosen location (browser only; localStorage, never the URL). */
export function rememberLocation(loc: DailyLocation): void {
  try {
    localStorage.setItem(DAILY_LOCATION_STORAGE_KEY, JSON.stringify(loc))
  } catch {
    /* SSR or storage denied — non-fatal */
  }
}

export function loadRememberedLocation(): DailyLocation | null {
  try {
    const raw = localStorage.getItem(DAILY_LOCATION_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as DailyLocation) : null
  } catch {
    return null
  }
}

/** Today's date (YYYY-MM-DD) computed in the location's timezone, not the browser's. */
export function todayInTz(timezone: string): string {
  // en-CA renders as YYYY-MM-DD; the timeZone option does the locale shift.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Opt-in browser geolocation — fires only when the user asks. Resolves null on denial. */
export function requestGeolocation(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 3600_000 },
    )
  })
}
