import { BirthData } from '../../types'

/**
 * The DailyReadingSource seam (T-006) — the anti-drift lever of the whole feature.
 * The graph child, the useDailyReading hook, Folio archiving, and every gate bind
 * to this interface, never a concrete implementation. ① DeterministicInterpreter
 * ships now; ③ WitnessModeSource flips in later (Phase 4) behind DAILY_SOURCE.
 */

/** A resolved place the panchanga is computed for. Timezone is always carried. */
export interface DailyLocation {
  display: string
  latitude: number
  longitude: number
  /** IANA tz — tithi/nakshatra boundaries shift by locale, so this is never dropped. */
  timezone: string
}

export interface DailyReadingInput {
  /** ISO YYYY-MM-DD, resolved to "today in the location's timezone". */
  date: string
  location: DailyLocation
  /** Present → the personal transit overlay is appended. */
  birth?: BirthData
}

export type DailySource = 'deterministic' | 'witness'

export interface DailyReadingMeta {
  date: string
  location: string
  hasOverlay: boolean
  source: DailySource
}

export interface DailyReadingPass {
  id: string
  title: string
  output: string
}

/**
 * The reading. Structurally reuses the `{ passes, assembled, engines_used }`
 * render shape of `AssetGenerateResponse` so the Modal/Folio pipe renders it
 * unchanged — but it is deliberately NOT assignable to `AssetGenerateResponse`
 * (it omits the required `register` field): it is rendered by `DailyReadingBody`,
 * not `useReportGenerator`. Shape-parity, not type-assignability (plan §A3).
 */
export interface DailyReading {
  mode: 'daily-panchanga'
  passes: DailyReadingPass[]
  assembled: string
  engines_used: string[]
  meta: DailyReadingMeta
}

export interface DailyReadingSource {
  getDailyReading(input: DailyReadingInput): Promise<DailyReading>
}

/**
 * The single flip-point. Default `deterministic` (①) until the engine-request
 * ledger's REQs are all ✅ live and Phase 4 registers the `witness` source (③).
 */
export const DAILY_SOURCE: DailySource =
  ((import.meta.env?.VITE_DAILY_SOURCE as DailySource | undefined) ?? 'deterministic')
