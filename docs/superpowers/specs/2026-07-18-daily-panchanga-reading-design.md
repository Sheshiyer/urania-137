# Urania 137 — Daily Panchanga Reading Spec ("the day, witnessed")

**Date:** 2026-07-18
**Status:** design — awaiting review before implementation
**Related:** `ISA.md`, `docs/integrated-product-map.md`, `docs/urania-137-multi-page-integration-plan.md`, `docs/selemene-engine-requests.md` (new — the engine-changes ledger)

## 1. Intent

Urania 137 today produces **interpreted narrative** only for birth-data readings
(`integrated-reading`, `integrated-kundali-l0` via `/assets/generate`). The
**daily / panchanga surface has data but no interpretation**: the `panchanga` and
`transits` children run the deterministic engine and render **raw JSON in a code
block** ([`useDeterministicRun.ts:17`](../../../src/hooks/useDeterministicRun.ts)).
Birth readings get prose; "today" gets `JSON.stringify`.

This spec fills that gap: a **daily reading from the panchanga lens** — the day's
five limbs (vara · tithi · nakshatra · yoga · karana) read as a narrative, with a
**personal transit-to-natal overlay** layered on when birth data is present. It is
the missing daily-transit layer of the whole output.

The user's framing, verbatim: *"there are certain details that require birth data …
There are certain details, like daily transits and especially the panchanga flow,
that I want to build in … specifically for the day from the panchanga lens."*

## 2. Locked decisions

1. **Reading axis: layered.** Universal panchanga base (date + location, same for
   everyone) + personal transit overlay (birth data) that appends when present.
2. **Interpretation via a swappable source seam.** One `DailyReadingSource`
   interface, two implementations:
   - **① `DeterministicInterpreter`** — ships now. Engine JSON → authored
     lexicon + rubric → narrative. In-app, no new backend, no API keys, only the
     public Selemene engine API. Fully inside the ISA constraint *"no backend
     changes beyond the existing public Selemene API."*
   - **③ `WitnessModeSource`** — flips on later. `/assets/generate` with a real
     `daily-panchanga` mode, once the engine serves it.
3. **The engine route is tracked, not discarded.** A living ledger,
   `docs/selemene-engine-requests.md`, is a **first-class deliverable** — the
   frozen consumer→producer contract the user drives on the Selemene repo. When its
   requests land + verify live, urania flips the seam ① → ③ with **no UX change**.
4. **Output reuses the existing render pipe.** The interpreter returns the
   `AssetGenerateResponse` shape (`{ passes, assembled }`) so the Modal renderer and
   Folio archiving in `useReportGenerator` work unchanged, and ③ is a drop-in.
5. **Home is Sky Weather.** The daily reading is a new child of the existing
   `transit` node ("Sky Weather"); the seven home nodes stay fixed (ISA).
6. **Rubric = selemene-core's law.** Non-predictive, non-prescriptive witnessing,
   enforced at the lexicon data level (invitations, never imperatives). The
   `selemene-report` skill is the offline **authoring guide** for lexicon content —
   not a runtime dependency.

## 3. The seam (Section 1)

```
                         ┌─────────────────────────────┐
   Sky Weather ▸ "Today" │   DailyReadingSource (seam)  │
        (graph child)  → │   getDailyReading(input)     │
                         └──────────────┬──────────────┘
                        ships now       │        flips on when engine ready
              ┌──────────────────────────┴───────────────────────────┐
              ▼                                                        ▼
  ①  DeterministicInterpreter                        ③  WitnessModeSource
     panchanga + transits + vedic-clock                 POST /assets/generate
     engine JSON  →  lexicon + rubric  →  narrative     mode: 'daily-panchanga'
     (in-app, no backend, no keys, testable)            (real witness passes)
     rubric authored FROM selemene-report/core          unlocked by the ledger
```

**The seam is the anti-drift lever.** The graph child, the layered content model,
Folio archiving, and every verification gate bind to `DailyReadingSource` — never a
concrete implementation. Swapping ① → ③ is a config flip, not a rewrite (the same
discipline as `StellarNodeGraph` rendering every depth).

```ts
// src/lib/daily/source.ts
export interface DailyReadingInput {
  date: string                 // ISO date, defaults to "today" in location tz
  location: DailyLocation      // { display, latitude, longitude, timezone }
  birth?: BirthData            // present → personal overlay
}
export interface DailyReading {  // === AssetGenerateResponse shape (reused)
  mode: 'daily-panchanga'
  passes: { id: string; title: string; output: string }[]
  assembled: string
  engines_used: string[]
  meta: { date: string; location: string; hasOverlay: boolean; source: 'deterministic' | 'witness' }
}
export interface DailyReadingSource {
  getDailyReading(input: DailyReadingInput): Promise<DailyReading>
}
```

Source selection is a single config flag (`DAILY_SOURCE = 'deterministic' | 'witness'`),
defaulting to `deterministic` until the ledger's requests are all ✅.

## 4. The layered reading + interpreter/lexicon (Section 2)

**The interpreter is one pure function over composable pass-builders:**

```
interpret(bundle, ctx) → DailyReading            // pure, deterministic
   bundle = { panchanga, transits?, vedicClock? } // raw engine JSON
   ctx    = { date, location, hasBirthData }

   BASE passes (date + location only — always render)
     ├─ varaPass        the day's planetary ruler + its felt quality
     ├─ tithiPass       lunar day · paksha (waxing/waning) · category · deity
     ├─ nakshatraPass   moon's mansion · ruler · symbol · guna
     └─ conditionsPass  yoga + karana folded into "conditions of the day"
   OVERLAY pass (birth data present only — appends)
     └─ nativePass      today's transits landing on the natal pattern
   assembled            woven "Today" narrative (base movements + optional overlay)
```

**Lexicon = authored data, not prose-in-code.** Each limb is a keyed table; the
pass-builder assembles prose from it via rubric-following templates:

```
src/lib/daily/lexicon/
  vara.ts        7   entries   { ruler, keynote, field, invitation }
  tithi.ts       30  entries   { name, paksha, category, deity, motion, keynote, invitation }
  nakshatra.ts   27  entries   { ruler, deity, symbol, guna, keynote, invitation }
  yoga.ts        27  entries   { quality, keynote, invitation }
  karana.ts      11  entries   { type, keynote, invitation }
  transit.ts     aspect × planet-pair keynotes for the overlay
```

Each entry carries a one-line `keynote`, a few `field` phrases, and an `invitation`
clause ("you might notice…") — **never** an imperative. Because imperative-avoidance
lives in the data (not free-form generation), tone cannot drift.

**Layering = graceful degradation.** Base passes always produce a complete universal
reading. `nativePass` appends only with birth data; without it, `assembled` closes
with a gentle *"add your birth moment to see how today meets your pattern"* invitation
(a graph-native affordance, not an error). Honors *"never offer a surface whose input
we can't gather"* — the base is always gatherable, the overlay conditional.

**Determinism → verifiability.** `interpret()` is pure over (engine JSON, date,
location); freeze a panchanga JSON and the reading is byte-stable and
snapshot-testable. The only variance is the *input* (today's actual tithi) — exactly
the point.

## 5. Graph placement + location input (Section 3)

**Home:** the `transit` node ("Sky Weather"), described as *"current celestial
weather and its invitation to the native pattern"* — already the daily surface.

**New headline child, raw limbs preserved.** Add child **"Today"** (id
`panchanga-flow`) rendering the layered reading. The existing `panchanga` / `transits`
engine children stay as raw-data leaves ("depth must be earned").

**The seam enters the data model as a new `ChildRun` kind:**

```ts
// src/types/index.ts — ChildRun gains one variant, source-agnostic (IS the seam)
  | { kind: 'daily'; needsLocation: true }   // → DailyReadingSource (① now / ③ later)
```

A new **`useDailyReading`** hook (sibling to `useDeterministicRun` /
`useReportGenerator`): resolve location → call panchanga (+ transits with birth data)
for today → `interpret()` → `DailyReading`, archived to Folio via the same
`saveReport`. Rendered in the existing **Modal** with a compact `DailyReadingPanel`
(location/date header + reading body).

**Location input — the only genuinely new UX.** The universal base needs
date + location + timezone but **not** birth data. Never gate the graph: render
instantly against a resolved default, label what was used, allow change.

| Precedence for default location | Source |
|---|---|
| 1. Birth location, if birth data present | already-normalized `normalized_location` |
| 2. Last daily location chosen | `localStorage` (never the URL — privacy rule) |
| 3. Neutral configured default | app locale / canonical fallback, clearly labeled |

Change affordance reuses the existing geocode path
([`WitnessForm.tsx:142`](../../../src/components/forms/WitnessForm.tsx)) → `{lat, long,
timezone}`, plus an optional, opt-in "use my location" (`navigator.geolocation`).
**Timezone is carried, not dropped** — tithi/nakshatra boundaries shift by locale.
Date defaults to *today in that timezone*; a ±1-day stepper is a later nicety, not
slice 1.

**Out of scope now:** an ambient "today's tithi" beacon on the home graph (ISA:
depth is earned, seven-node home stays) — logged as a future enhancement.

## 6. Discovery probe (must run before the interpreter is written)

The lexicon keys and request shape bind to the engine's **actual** contract, which
has not yet been observed. The first build task probes the live engine and pins
everything to reality (the product-map's "verify against the live system" law):

- `POST /api/v1/engines/panchanga/calculate` — capture the real response schema:
  exact key names + enum spellings for tithi / nakshatra / yoga / karana / vara,
  paksha, transition times.
- `POST /api/v1/engines/transits/calculate` — capture aspect/planet shape for the
  overlay.
- **Resolve the "today at location L, no birth data" question:** does panchanga read
  `birth_data.date/time = now` or `current_time` + location? Pin the request builder
  to the verified answer.
- Output: `src/lib/daily/engine-contract.ts` (typed) + a saved fixture bundle used by
  the snapshot tests. **Interpreter input types are provisional until this lands.**

## 7. Verification strategy (Section 4)

Extends `scripts/verify/` (`taxonomy.mjs`, `mode-gates.mjs`). Law: **green ≠ done;
verify behavior.**

| # | Gate | Asserts | Why |
|---|---|---|---|
| G1 | Taxonomy (extended) | `{kind:'daily'}` resolves to the seam; underlying `panchanga`/`transits` are real live engines | no dangling capability |
| G2 | Live schema contract | today's live `panchanga` still carries the fields the interpreter reads | our own anti-"silent 200": schema drift fails loud |
| G3 | Lexicon completeness | every enum value has an entry — 30 tithis · 27 nakshatras · 27 yogas · 11 karanas · 7 varas, no `undefined` keynote | reading must be complete for *every possible day* |
| G4 | Determinism / snapshot | `interpret(frozenBundle)` byte-stable across fixtures (Nanda vs Rikta, waxing vs waning, overlay vs none) | proves purity |
| G5 | Voice / rubric | no predictive/imperative constructs ("you will", "must", commands) in output | enforces selemene-core's law mechanically |
| G6 | Graceful degradation | no birth data → complete base + closing invitation, overlay absent; birth data → overlay present | honors "never offer a surface we can't feed" |
| G7 | Behavioral (live) | running app: today's reading names the *actual* live tithi/nakshatra (not fallback) + archives to Folio | the real bar — verify the running service |
| G8 | Seam-swap | ① and ③ both satisfy `DailyReadingSource`, same shape | makes the ①→③ flip provably safe |

## 8. The engine-changes ledger — `docs/selemene-engine-requests.md`

A living consumer→producer contract the user drives. Each request: *what*, *why urania
needs it*, an **acceptance command** (the exact live check — a claim isn't evidence),
status, owner. Initial contents:

```md
# Selemene engine requests — unlocks the ③ witness route for the daily reading
# Status: ⬜ queued · 🔄 in-flight · ✅ landed + verified-live

## Capability: daily-panchanga witness mode  (flips DailyReadingSource ① → ③)
⬜ REQ-1  load_mode_document resolves `daily-panchanga` (+ `transit`) to a real mode doc
          why: today `/assets/generate {mode:'daily-panchanga'}` silently returns generic `default`
          accept: passes.length > 1 AND pass plan ≠ single `default: Reading` pass
⬜ REQ-2  Gate 1 — unknown mode → 400 UNKNOWN_MODE (not 200)
          accept: curl … {mode:'bogus'} → HTTP 400 UNKNOWN_MODE (verified live)
⬜ REQ-3  Gate 2 — daily-panchanga pass plan is DISTINCT (not the shared byte-identical `core`)
          accept: pass-plan compare by pass id/title, NOT assembled text (text embeds time-seeds)
⬜ REQ-4  Pass plan foregrounds the panchanga limbs (tithi·nakshatra·yoga·karana·vara) + transit overlay
          accept: pass titles map 1:1 to the interpreter's pass model
⬜ REQ-5  Mode reads current_time/date so it narrates "today", not the birth moment
          accept: two calls, different dates → different tithi in the reading

## Schema stability (the interpreter's contract baseline)
⬜ SCHEMA-1  panchanga response keys for tithi/nakshatra/yoga/karana/vara are stable;
             any rename is a breaking change logged here first (fails G2 until updated)
```

REQ-2/REQ-3 are exactly what `mode-gates.mjs` checks — so the ledger's acceptance
tests are already runnable. A request is ✅ only when its command goes green **against
the live engine**; then urania flips the source.

## 9. File-level architecture (new + touched)

**New**
- `src/lib/daily/source.ts` — `DailyReadingSource` seam + input/output types + config flag.
- `src/lib/daily/deterministic.ts` — ① `DeterministicInterpreter` (`interpret()` + pass-builders).
- `src/lib/daily/witness.ts` — ③ `WitnessModeSource` (thin `/assets/generate` adapter; dormant until ledger ✅).
- `src/lib/daily/engine-contract.ts` — typed engine response + request builder (from the probe).
- `src/lib/daily/lexicon/{vara,tithi,nakshatra,yoga,karana,transit}.ts` — authored tables.
- `src/lib/daily/location.ts` — default resolution + geocode + `localStorage` + opt-in geolocation.
- `src/hooks/useDailyReading.ts` — orchestrates fetch → interpret → archive.
- `src/components/panels/DailyReadingPanel.tsx` — location/date header + reading body (in Modal).
- `scripts/verify/daily-gates.mjs` — G2/G3/G5/G7 runnable checks.
- `docs/selemene-engine-requests.md` — the ledger.

**Touched**
- `src/types/index.ts` — add `{kind:'daily'}` to `ChildRun`.
- `src/data/selemeneNodes.ts` — add the `panchanga-flow` "Today" child to the `transit` node.
- the Modal/NodePage dispatch — route `{kind:'daily'}` to `useDailyReading` + `DailyReadingPanel`.
- `scripts/verify/taxonomy.mjs` — recognize `{kind:'daily'}` (G1).
- `ISA.md` — add ISCs for the daily reading; note the engine-request ledger.

## 10. Out of scope

- Any Selemene backend change in *this* repo's work (tracked in the ledger, executed
  on the Selemene repo by the user / an engine agent).
- LLM-backed interpretation (approach ②) — not chosen; the seam leaves room for it later.
- Pre-generated daily packs / offline authoring (approach ③-offline) — the universal
  base could later be pre-authored, but slice 1 computes live.
- Home-graph ambient "today" beacon; ±1-day date stepper; multi-day forecasts.

## 11. Open questions for review

1. **Neutral default location** (precedence #3) when there's no birth data and no
   remembered choice — a fixed canonical location, app-locale guess, or force the
   geocode field on first use? (Proposed: a clearly-labeled canonical default so the
   reading is never blank; user refines.)
2. **"Today" vs "Panchanga Flow"** as the child label. (Proposed: "Today".)
3. **Overlay depth in slice 1** — full transit-aspect interpretation, or a lean
   "moon-through-your-houses + vara-ruler-to-natal" first cut with aspects deferred?
   (Proposed: lean first cut; aspects are a fast-follow.)
```
