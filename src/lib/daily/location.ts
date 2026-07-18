import { DailyLocation } from './source'

/**
 * The location resolution CONTRACT (T-011). The resolution logic itself lands in
 * Phase 1 Wave C (T-039); only the contract is frozen here.
 *
 * Precedence: birth normalized_location → last chosen (localStorage) → labeled
 * neutral default. Timezone is always carried. Coordinates NEVER touch the URL —
 * they live only in localStorage under DAILY_LOCATION_STORAGE_KEY.
 */
export const DAILY_LOCATION_STORAGE_KEY = 'urania.daily.location'

export type LocationSource = 'birth' | 'remembered' | 'default'

export interface ResolvedLocation {
  location: DailyLocation
  /** Which precedence tier supplied it (surfaced in the panel header). */
  source: LocationSource
}

/** Frozen signature — implemented in Phase 1 Wave C (T-039). */
export type ResolveDefaultLocation = (args: {
  birth?: { latitude: number; longitude: number; timezone: string; display?: string } | null
  remembered?: DailyLocation | null
}) => ResolvedLocation
