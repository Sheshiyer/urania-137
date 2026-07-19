import { useCallback, useEffect, useState } from 'react'
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
type Archiver = (r: { nodeId: string; nodeLabel: string; mode: string; title: string; content: string }) => void

/**
 * Pure orchestration (T-041) — fetch → archive → return. Dependencies are
 * injectable so it unit-tests in node with no React/DOM (T-042). Archives ONLY
 * on success; an engine error throws before archiving, so a failed reading is
 * never written to the Folio.
 */
export async function fetchDailyReading(
  input: DailyReadingInput,
  fetcher: Fetcher = getDailyReading,
  archive: Archiver = saveReport,
): Promise<DailyReading> {
  const reading = await fetcher(input)
  archive({
    nodeId: 'transit',
    nodeLabel: 'Sky Weather',
    mode: 'daily-panchanga',
    title: `Today · ${input.location.display} · ${input.date}`,
    content: reading.assembled,
  })
  return reading
}

export interface UseDailyReadingState {
  status: 'idle' | 'loading' | 'complete' | 'error'
  reading: DailyReading | null
  location: DailyLocation
  locationSource: LocationSource
  error: string | null
}

/**
 * The React surface (T-041) — resolves the default location, runs the reading on
 * mount, exposes a `changeLocation` that re-runs + persists. Location, not birth,
 * is the entry input; birth (when present) drives the personal overlay.
 */
export function useDailyReading(birth?: BirthData | null) {
  const [state, setState] = useState<UseDailyReadingState>(() => {
    const resolved = resolveDefaultLocation({
      birth: birth ? { latitude: birth.latitude, longitude: birth.longitude, timezone: birth.timezone, display: birth.name } : null,
      remembered: loadRememberedLocation(),
    })
    return { status: 'idle', reading: null, location: resolved.location, locationSource: resolved.source, error: null }
  })

  const run = useCallback(
    async (location: DailyLocation) => {
      const date = todayInTz(location.timezone)
      setState((s) => ({ ...s, status: 'loading', location, error: null }))
      try {
        const reading = await fetchDailyReading({ date, location, birth: birth ?? undefined })
        setState((s) => ({ ...s, status: 'complete', reading, location }))
      } catch (e) {
        setState((s) => ({ ...s, status: 'error', error: e instanceof Error ? e.message : 'Could not read the day.' }))
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

  // Run once on mount (and when birth presence changes).
  useEffect(() => {
    void run(state.location)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run])

  return { ...state, run, changeLocation }
}
