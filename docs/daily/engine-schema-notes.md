# Selemene engine schema notes — daily panchanga reading

**Captured:** 2026-07-19, live, via the **production proxy** `https://urania-137.vercel.app/api/selemene`
(the local `.env.local` `SELEMENE_API_KEY` returned `401 UNAUTHORIZED — "Invalid or expired API key"`;
`/health` is unauthenticated and returned `200`). Deliverable for **T-001 / T-002 / T-003**.
Fixtures live in `src/lib/daily/__fixtures__/` (`bundles.manifest.json` indexes them).

> ⚠️ **Action for the maintainer:** rotate the local `SELEMENE_API_KEY` in `.env.local`. It is
> expired, so `vercel dev` and the local G7 behavioral gate can't reach the keyed engine. The
> production proxy works because Vercel holds the valid key server-side.

---

## 1. `POST /api/v1/engines/panchanga/calculate` (T-001)

**Request** (verified): `{"birth_data":{"date":"YYYY-MM-DD","time":"HH:MM","latitude":<f>,"longitude":<f>,"timezone":"<IANA>"}}`

**Response envelope:** `{ engine_id, result, witness_prompt, consciousness_level, metadata, envelope_version }`
— the daily data is under **`result`**.

**`result` keys (the frozen contract — SCHEMA-1 baseline):**

| Field | Type | Today's sample (BLR 2026-07-19) |
|---|---|---|
| `julian_day` | number | 2461240.77 |
| `solar_longitude` / `lunar_longitude` | number | 92.91 / 157.13 |
| `vara_index` / `vara_name` | int / string | 0 / `Ravivara (Sunday)` |
| `tithi_index` / `tithi_name` / `tithi_value` | int / string / number | 5 / `Shashthi (Shukla)` / 5.35 |
| `nakshatra_index` / `nakshatra_name` / `nakshatra_value` | int / string / number | 11 / `Uttara Phalguni` / 11.78 |
| `yoga_index` / `yoga_name` / `yoga_value` | int / string / number | 18 / `Parigha` / 18.75 |
| `karana_index` / `karana_name` / `karana_value` | int / string / number | 2 / `Kaulava` / 11 |

**Decoding rules (pin the lexicon keys to these):**
- **Paksha is embedded in `tithi_name`**, not a separate field: `"… (Shukla)"` = waxing, `"… (Krishna)"` = waning. The two boundary tithis are unsuffixed: **`Purnima`** (full) and **`Amavasya`** (new).
- `tithi_index` is **0-based across the lunar month**: `0–14` = Shukla 1–15, `15–29` = Krishna 1–15.
  - ordinal-within-paksha: `ord = (tithi_index % 15) + 1`
  - **category** (Nanda/Bhadra/Jaya/Rikta/Purna): `["Nanda","Bhadra","Jaya","Rikta","Purna"][(ord-1) % 5]`
- `vara_index` `0–6`, `0 = Ravivara (Sunday)`.
- `nakshatra_index` `0–26` (27 mansions); `yoga_index` `0–26` (27 yogas); karana → 11 distinct names.
- **No transition timestamps** are returned — the interpreter cannot show "tithi changes at HH:MM". The
  reading is the *state at the requested moment*; a transition-time feature would need a different engine
  surface (out of slice 1; recorded so it is a decision, not a silent gap).

## 2. `POST /api/v1/engines/transits/calculate` (T-002 — the overlay source)

Same request shape (birth_data = the **natal** chart). **`result` keys:**
`aspects[]`, `natal_positions`, `transit_positions`, `retrograde_planets`, `period_quality`, `sade_sati`.

**`aspects[]` entry (what `nativePass` reads):**
```json
{ "aspect_type":"Sextile", "nature":"Harmonious", "natal_planet":"Jupiter",
  "transiting_planet":"Venus", "orb":0.11, "is_applying":false }
```
- Overlay lexicon key = `(transiting_planet, natal_planet, aspect_type)`; `nature` (`Harmonious`/`Challenging`) drives tone; `orb` + `is_applying` rank prominence. The lean first-cut overlay (spec §11 Q3) picks the tightest-orb / applying aspects.

## 3. "Today at location L, no birth data" — request shape RESOLVED (T-003)

**Answer: use `birth_data.date/time` + location; `current_time` is NOT required.** Proven live:

| Call | tithi | nakshatra | vara |
|---|---|---|---|
| BLR **2026-07-19** | 5 Shashthi (Shukla) | Uttara Phalguni | Sunday |
| BLR **2026-07-20** | 6 Saptami (Shukla) | Hasta | Monday |
| **NYC** 2026-07-19 | 5 Shashthi (Shukla) | **Hasta** | Sunday |

- **Date drives the day** (07-19 → 07-20 changes tithi + vara). **Location/timezone drives the moon-position limbs** (NYC's nakshatra differs from BLR's on the same date). So the base reading is correct only if **timezone is carried**.
- **`buildDailyRequest` (T-008):** base = synthetic `birth_data{ date: today-in-tz, time: "12:00", latitude, longitude, timezone }`, no birth identity. Overlay = the user's real natal `birth_data` sent to `transits`.

## 4. Enum domains still to enumerate in Phase 0-B (T-009)

The **shape** is frozen above; the **full spelling tables** the lexicon keys against are not yet fully
observed. T-009 must enumerate, in the engine's exact spellings: **7 vara · 30 tithi (incl. Purnima/Amavasya)
· 27 nakshatra · 27 yoga · 11 karana** — either by a one-month probe sweep (a lunar month cycles all 30
tithis) plus a nakshatra/yoga sweep, or from the engine's canonical name tables. Samples captured so far:
Ravivara/Somavara (vara); Shashthi/Saptami/Navami/Dwadashi/Chaturthi/Purnima (tithi); Uttara Phalguni/Hasta
(nakshatra); Parigha (yoga); Kaulava (karana).

## 5. SCHEMA-1 baseline (ledger)

The panchanga `result` keys in §1 and the transits `aspects[]` shape in §2 are the interpreter's frozen
contract. Any rename by the engine is a breaking change — it must be logged in
`docs/selemene-engine-requests.md` (SCHEMA-1) and it fails gate **G2** until the interpreter is updated.
