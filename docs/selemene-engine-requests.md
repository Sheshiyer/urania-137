# Selemene engine requests — unlocks the ③ witness route for the daily reading

The consumer→producer contract **urania-137 drives on the Selemene engine repo**. When
every request below is ✅ *live*, flip `DAILY_SOURCE='witness'` (spec §3) and the daily
reading is served by the engine's witness pipeline instead of the in-app interpreter ① —
with no UX change. **No engine code lives in this repo**; this ledger is the handoff.

**Status legend:** ⬜ queued · 🔄 in-flight · ✅ landed + verified-live
**Last verified:** 2026-07-19 against `https://urania-137.vercel.app/api/selemene` (prod proxy).

> Reality check (live, 2026-07-19): the engine's **gate-1 is already fixed** — both
> `daily-panchanga` and a bogus mode return `400 UNKNOWN_MODE`, not the old silent
> `200 default`. So the remaining work is not "stop faking it" but "actually **serve**
> `daily-panchanga` as a real, differentiated mode."

## Capability: `daily-panchanga` witness mode  (flips `DAILY_SOURCE` ① → ③)

### ⬜ REQ-1 — `load_mode_document` resolves `daily-panchanga` to a real mode doc
- **Why urania needs it:** today `/assets/generate {mode:'daily-panchanga'}` returns
  `400 UNKNOWN_MODE` (verified) — the mode is not served, so ③ has nothing to call.
- **Accept:** `POST /assets/generate {mode:'daily-panchanga', subjects:[…]}` returns
  `200` with `passes.length > 1` (a real multi-pass plan, not a single `default: Reading`).
- **Accept command:** `node scripts/verify/engine-requests.mjs https://urania-137.vercel.app` (REQ-1 row) *(harness authored in Phase 4, T-094)*
- **Current:** `400 UNKNOWN_MODE`.

### ✅ REQ-2 — unknown mode → `400 UNKNOWN_MODE` (not a silent `200`)
- **Why:** silence is indistinguishable from success on this API; ③ must be able to
  trust that an unserved mode fails loudly.
- **Accept command:** `curl -s -o /dev/null -w '%{http_code}' -X POST <base>/api/selemene/api/v1/assets/generate -H 'Content-Type: application/json' -d '{"mode":"bogus-xyz-123","subjects":[…]}'` → **`400`**, body `error_code: UNKNOWN_MODE`.
- **Current:** ✅ **satisfied live** (bogus → `400 UNKNOWN_MODE`, 2026-07-19). Also covered
  by the existing `scripts/verify/mode-gates.mjs` differentiation gate.

### ⬜ REQ-3 — `daily-panchanga` has a DISTINCT pass plan (not the shared `core` pass)
- **Why:** the 8 authored-but-unloaded modes collapse to one byte-identical `core` pass;
  a relabelled clone is not a differentiated reading.
- **Accept:** pass-plan comparison **by pass id/title**, NOT assembled text (assembled
  embeds time-varying seeds → a text hash false-PASSes). Reuse `scripts/verify/mode-gates.mjs`.
- **Accept command:** `node scripts/verify/mode-gates.mjs https://urania-137.vercel.app` — `daily-panchanga` must not hash-collide with another mode's plan.
- **Current:** blocked on REQ-1.

### ⬜ REQ-4 — the pass plan foregrounds the panchanga limbs + a transit overlay
- **Why:** keeps ① and ③ shape-interchangeable so the flip is a config change, not a rewrite.
- **Accept:** the mode's pass titles map 1:1 to the interpreter's pass model
  (`src/lib/daily/passModel.ts`: vara · tithi · nakshatra · conditions · native).
- **Current:** blocked on REQ-1.

### ⬜ REQ-5 — the mode narrates "today" (reads `current_time`/date), not the birth moment
- **Why:** a daily reading must vary by day; a birth-keyed reading does not.
- **Accept:** two `/assets/generate` calls with different dates yield a different tithi in
  the reading. (Mirrors the in-repo T-092 request-mapping check.)
- **Current:** blocked on REQ-1.

## Schema stability (the interpreter's contract baseline)

### ⬜ SCHEMA-1 — panchanga `result` keys are stable
The interpreter (`src/lib/daily/engine-contract.ts`) reads these exact keys; any rename is
a **breaking change** — log it here first and it fails gate **G2** until the interpreter is updated:

```
julian_day, solar_longitude, lunar_longitude,
vara_index, vara_name,
tithi_index, tithi_name, tithi_value,
nakshatra_index, nakshatra_name, nakshatra_value,
yoga_index, yoga_name, yoga_value,
karana_index, karana_name, karana_value
```
Paksha is embedded in `tithi_name` (`… (Shukla)` / `… (Krishna)`, plus `Purnima`/`Amavasya`);
there are **no transition timestamps**. Enum spellings frozen in `src/lib/daily/lexicon/domains.ts`
(7 vara · 30 tithi · 27 nakshatra · 27 yoga · 11 karana — all captured live).
- **Accept command:** `node scripts/verify/daily-gates.mjs <base>` (G2 stage — authored in Phase 3, T-081).
- **Current:** ✅ keys present live (2026-07-19).

## The flip procedure

Documented in Phase 4 (T-095): confirm all REQ ✅ live via the acceptance harness, set
`DAILY_SOURCE='witness'`, run `daily-seam-swap.mjs` + the G7 behavioral check, confirm no UX change.
