import { DAILY_SOURCE, DailyReadingInput, DailyReadingSource } from './source'
import { DeterministicInterpreter } from './deterministic'
import { WitnessModeSource } from './witness'
import { lexicon } from './lexicon'

/**
 * The single source-selection site (T-021, T-091) — the ①→③ flip-point (spec §3).
 * Default `deterministic` (①). Setting DAILY_SOURCE='witness' selects ③ — but that
 * flip is gated on the engine serving `daily-panchanga` (ledger REQ-1..5 ✅ live);
 * flipping it before then makes ③ 400 on every call. No silent fallback either way.
 */
let deterministic: DailyReadingSource | null = null
let witness: DailyReadingSource | null = null

function resolveSource(): DailyReadingSource {
  if (DAILY_SOURCE === 'witness') {
    if (!witness) witness = new WitnessModeSource()
    return witness
  }
  if (!deterministic) deterministic = new DeterministicInterpreter(lexicon)
  return deterministic
}

export function getDailyReading(input: DailyReadingInput) {
  return resolveSource().getDailyReading(input)
}
