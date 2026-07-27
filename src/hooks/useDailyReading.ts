import { useCallback, useState } from 'react'
import { BirthData } from '../types'
import { getDailyReading } from '../lib/daily/registry'
import { DailyLocation, DailyReading, DailyReadingInput } from '../lib/daily/source'
import {
  LocationSource,
  loadRememberedLocation,
  rememberLocation,
  resolveDefaultLocation,
  todayInTz,
} from '../lib/daily/location'
import { saveReport } from '../lib/folioStore'

type Fetcher = (input: DailyReadingInput) => Promise<DailyReading>
type Archiver = (r: { nodeId: string; nodeLabel: string; mode: string; title: string; content: string }) => void | Promise<unknown>

export class DailyFolioSaveError extends Error {
  readonly reading: DailyReading

  constructor(message: string, reading: DailyReading) {
    super(message)
    this.name = 'DailyFolioSaveError'
    this.reading = reading
  }
}

/**
 * Pure orchestration (T-041) — fetch → archive → return. Dependencies are
 * injectable so it unit-tests in node with no React/DOM (T-042). Archives ONLY
 * on success; an engine error throws before archiving, so a failed reading is
 * never written to the Folio. The archive is AWAITED (T-047): saveReport is now
 * async against D1, so a save failure surfaces as an error instead of a
 * silently dropped floating promise.
 */
export async function fetchDailyReading(
  input: DailyReadingInput,
  fetcher: Fetcher = getDailyReading,
  archive: Archiver = saveReport,
): Promise<DailyReading> {
  const reading = await fetcher(input)
  try {
    await archive({
      nodeId: 'transit',
      nodeLabel: 'Sky Weather',
      mode: 'daily-panchanga',
      title: `Today · ${input.location.display} · ${input.date}`,
      content: reading.assembled,
    })
  } catch (error) {
    throw new DailyFolioSaveError(
      error instanceof Error
        ? error.message
        : 'Could not save the daily reading to Folio.',
      reading,
    )
  }
  return reading
}

export interface UseDailyReadingState {
  status: 'idle' | 'loading' | 'complete' | 'error'
  reading: DailyReading | null
  location: DailyLocation
  locationSource: LocationSource
  error: string | null
  saveError: string | null
}

/**
 * The React surface (T-041) — resolves the default location eagerly so the
 * handoff sink can fire `run` without extra inputs, and exposes a
 * `changeLocation` that re-runs + persists. Location, not birth, is the entry
 * input; birth (when present) drives the personal overlay.
 *
 * Phase 3: the run is fired EXPLICITLY by the caller (the chat handoff sink
 * in NodePage), never on mount — the hook now lives at page level, where an
 * auto-run would fetch + Folio-archive a reading on every page visit.
 */
export function useDailyReading(birth?: BirthData | null) {
  const [state, setState] = useState<UseDailyReadingState>(() => {
    const resolved = resolveDefaultLocation({
      birth: birth ? { latitude: birth.latitude, longitude: birth.longitude, timezone: birth.timezone, display: birth.name } : null,
      remembered: loadRememberedLocation(),
    })
    return {
      status: 'idle',
      reading: null,
      location: resolved.location,
      locationSource: resolved.source,
      error: null,
      saveError: null,
    }
  })

  const run = useCallback(
    async (location: DailyLocation) => {
      const date = todayInTz(location.timezone)
      setState((s) => ({
        ...s,
        status: 'loading',
        location,
        error: null,
        saveError: null,
      }))
      try {
        const reading = await fetchDailyReading({ date, location, birth: birth ?? undefined })
        setState((s) => ({
          ...s,
          status: 'complete',
          reading,
          location,
          saveError: null,
        }))
      } catch (e) {
        if (e instanceof DailyFolioSaveError) {
          setState((s) => ({
            ...s,
            status: 'complete',
            reading: e.reading,
            location,
            error: null,
            saveError: e.message,
          }))
        } else {
          setState((s) => ({
            ...s,
            status: 'error',
            reading: null,
            error: e instanceof Error ? e.message : 'Could not read the day.',
            saveError: null,
          }))
        }
      }
    },
    [birth],
  )

  const changeLocation = useCallback(
    (location: DailyLocation) => {
      rememberLocation(location)
      setState((s) => ({ ...s, location, locationSource: 'remembered' }))
      void run(location)
    },
    [run],
  )

  return { ...state, run, changeLocation }
}
