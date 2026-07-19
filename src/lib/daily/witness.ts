import { generateAsset } from '../selemeneApi'
import { AssetGenerateRequest, SubjectInput } from '../../types'
import { DailyReading, DailyReadingInput, DailyReadingSource } from './source'

/**
 * ③ The witness-route adapter (T-090) — a dormant, drop-in-ready implementation of
 * the DailyReadingSource seam. It calls `/api/v1/assets/generate` with the
 * `daily-panchanga` mode and maps the AssetGenerateResponse onto a DailyReading
 * (same shape ① produces — G8). It is NOT wired into the default path: the registry
 * constructs it only when DAILY_SOURCE='witness', which is gated on the engine
 * serving the mode (ledger REQ-1..5 ✅ live). Until then it never runs.
 */
export function buildWitnessRequest(input: DailyReadingInput): AssetGenerateRequest {
  const subjects: SubjectInput[] = input.birth
    ? [
        {
          role: 'primary',
          name: input.birth.name,
          birth_date: input.birth.date,
          birth_time: input.birth.time,
          birth_time_confidence: 'exact',
          birth_location_query: input.location.display,
          normalized_location: {
            display_name: input.location.display,
            latitude: input.location.latitude,
            longitude: input.location.longitude,
            timezone: input.location.timezone,
            provider: 'manual',
            confidence: 'manual',
          },
        },
      ]
    : []
  return {
    mode: 'daily-panchanga',
    report_level: 'L0',
    language: 'en',
    subjects,
    // Carry the day + location so the engine narrates "today" (REQ-5), and the
    // conditional subject drives the overlay, mirroring ①'s base/overlay layering.
    options: {
      date: input.date,
      current_time: input.date,
      latitude: input.location.latitude,
      longitude: input.location.longitude,
      timezone: input.location.timezone,
    },
  }
}

export class WitnessModeSource implements DailyReadingSource {
  async getDailyReading(input: DailyReadingInput): Promise<DailyReading> {
    const res = await generateAsset(buildWitnessRequest(input))
    return {
      mode: 'daily-panchanga',
      passes: (res.passes || []).map((p) => ({ id: p.id, title: p.title, output: p.output })),
      assembled: res.assembled,
      engines_used: res.engines_used?.length ? res.engines_used : ['panchanga'],
      meta: { date: input.date, location: input.location.display, hasOverlay: !!input.birth, source: 'witness' },
    }
  }
}
