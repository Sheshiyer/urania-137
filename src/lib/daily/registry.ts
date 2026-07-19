import { DAILY_SOURCE, DailyReadingInput, DailyReadingSource } from './source'
import { DeterministicInterpreter } from './deterministic'
import { lexicon } from './lexicon'

/**
 * The single source-selection site (T-021) — the ①→③ flip-point (spec §3).
 * Default `deterministic` (①). Phase 4 registers the `witness` source (③) here;
 * until then a `witness` flag throws loudly rather than silently falling back to ①
 * (the anti-drift discipline mirrored from the mode-gates law).
 */
let deterministic: DailyReadingSource | null = null

function resolveSource(): DailyReadingSource {
  if (DAILY_SOURCE === 'witness') {
    throw new Error("daily: the 'witness' source (③) is not yet registered — it lands in Phase 4")
  }
  if (!deterministic) deterministic = new DeterministicInterpreter(lexicon)
  return deterministic
}

export function getDailyReading(input: DailyReadingInput) {
  return resolveSource().getDailyReading(input)
}
