# Urania Engine Output Visualization Atlas

Status: executable design and implementation contract
Date: 2026-07-27
Scope: eighteen Selemene engines, six workflows, shared reading components,
non-JSON presentation, provenance, accessibility, and Urania visual references

## The governing rule

An engine name does not determine a chart. The relationship inside its payload
does:

- named value → fact,
- reduced value → number code,
- coordinate → position,
- endpoint-to-endpoint statement → relation,
- ordered or dated record → sequence,
- periodic measure → cycle,
- source-assigned slot → spread,
- named membership → collection,
- prompt → question,
- playable or viewable output → media/artifact,
- device-derived record → capture state,
- missing or unsupported record → notice.

Urania composes those relationships into engine-specific instruments. It does
not create eighteen unrelated dashboards and it does not use celestial ornament
to imply a relationship the source never returned.

## What “JSON is not the UI” means

The visible order is:

1. orientation — engine, subject, moment, run state, and provenance,
2. source-shaped visual components,
3. witness or deterministic narrative when one exists,
4. evidence and system membership,
5. one collapsed **Technical source** disclosure.

Literal JSON is never the default reading body when a named adapter exists.
Unknown fields remain inside the collapsed, privacy-filtered source disclosure.
Capture inputs, binary media, and credentials are redacted there as well as in
generic fallback disclosures. Missing, failed, partial, capture-gated, and
unsupported are distinct visible states.

The source disclosure is not a privacy control. Generated schema artifacts in
this repository contain paths and types only—never values, binary media,
absolute corpus paths, subject directory names, tokens, or secrets.

## Shared response anatomy

Most deterministic engines return this logical envelope:

```text
engine_id
result
witness_prompt | witness_prompts
consciousness_level
metadata | calculated_at | processing_time_ms
generated_audio?   ← Raaga media contract
generated_image?   ← Sigil Forge media contract
```

The visual adapter must receive the whole envelope. Reading only `result` loses
top-level audio and image output before the presentation layer can render it.

## Implementation-state legend

| State | Meaning |
| --- | --- |
| `implemented` | Current source fields have a named default visual projection |
| `partial` | Core fields are visual; secondary fields remain in Technical source |
| `capture-gated` | A consented device/persisted capture is required |
| `proposed` | Design contract exists but no runtime component does |

These states describe renderer coverage, not the truth or quality of a person’s
reading.

## All eighteen engines

The machine-readable path/type inventory is
[`engine-output-atlas.json`](./engine-output-atlas.json). The field groups below
are schematic JSON keys, never sample values.

### Engine matrix

| # | Engine | Schematic output fields | Reader-facing composition | State and boundary |
| ---: | --- | --- | --- | --- |
| 1 | `numerology` | `life_path`, `expression`, `soul_urge`, `personality`, `birthday`, `chaldean_name`; each may contain `value`, `reduction_chain`, `meaning`, `is_master` | **Number Code Matrix** + **Reduction Trail** + definition list | Implemented. Meaning is labeled source copy, not rewritten as fact. |
| 2 | `human-design` | `hd_type`, `authority`, `profile`, `definition`, `defined_centers[]`, `active_channels[]`, `personality_activations[]`, `design_activations[]` | current **Fact Grid** + **Collections**; target **Profile Seal** + verified **Center/Channel Field** | Partial. Activations remain tabular until a complete BodyGraph encoding is verified. |
| 3 | `gene-keys` | `activation_sequence`, `active_keys`, `frequency_assessments`; activation positions include life’s work, evolution, radiance, purpose | current **Fact Grid** + **Collections**; target **Activation Cross** + **Frequency Ledger** | Partial. Frequency language remains source attribution, never an objective score. |
| 4 | `vimshottari` | `birth_nakshatra`, `current_period`, `timeline`, `period_enrichment`, `upcoming_transitions[]` | **Nested Period Spiral** + **Period Timeline** + ordered list | Implemented adapter. Only source dates are shown; no inferred forecast windows. |
| 5 | `panchanga` | `vara_*`, `tithi_*`, `nakshatra_*`, `yoga_*`, `karana_*`, `solar_longitude`, `lunar_longitude`, `julian_day` | **Five-Limb Facts** + **Astronomical Facts** definition lists | Implemented adapter. The five limbs are not drawn as cyclic sectors because the payload supplies no cyclic relationship. |
| 6 | `vedic-clock` | `calculated_for`, `current_dosha`, `current_organ`, `timezone`, `upcoming_transitions[]`, `recommendation`, `synthesis` | **Current Window Facts** + **Transition Sequence** | Implemented adapter. Recommendations remain source copy and never become prescriptions. |
| 7 | `biorhythm` | named cycle records, `target_date`, `days_alive`, `critical_days`, `forecast`, `overall_energy` | current **Cycle Bands**; target **Critical-Day Timeline** | Partial. Every scale prints its source value; the unimplemented forecast layer is not claimed as shipped. |
| 8 | `transits` | `natal_positions[]`, `transit_positions[]`, `aspects[]`, `retrograde_planets`, `period_quality`, `sade_sati` | **Dual Position Wheel** + **Aspect Chord Field** + relation table | Implemented adapter. Edges mean named aspects, never causality. |
| 9 | `tarot` | `spread`, `positions[]`; positions may include `position`, `name|card`, `meaning` | **Source Spread** + ordered list | Implemented for source-assigned slots. No divinatory conclusion is manufactured. |
| 10 | `i-ching` | `primary_hexagram`, `relating_hexagram`, `changing_lines[]`, `casting`, `seed` | current **Source Spread**; target **Hexagram Transition** + **Changing-Line Sequence** | Partial. The shipped adapter does not yet claim a changing-line visualization. |
| 11 | `enneagram` | current observed shape: `mode`, `questions[]`; other contracts may return type/wing/instinct | **Inquiry Deck**; assessed records may add **Type Profile** | Partial. Questions never become a type diagnosis. |
| 12 | `sacred-geometry` | `form`, `intention`, `meditation`, `seed`, `svg_preview` | **Geometry Artifact** + **Form Facts** + safe preview state | Partial. Raw SVG never executes without sanitization; form does not imply certainty. |
| 13 | `nadabrahman` | `time_recommendation`, `recommendations[]`; fields include prahar, time range, primary raga, source-listed ragas | **Raga Time Dial** + **Recommendation Collection** | Implemented adapter. Therapeutic claims are not promoted into computed styling. |
| 14 | `raaga` | `melakarta`, `swaras[]`, `strudel_ratios[]`, `root_hz`, ascent/descent indices, `prahar`, dosha affinities; top-level `generated_audio` | **Melakarta Scale** + **Swara Ladder** + **Raaga Player** + metadata list | Implemented/partial. Audio appears only when a valid clip exists; consent and missing-clip states remain explicit. |
| 15 | `sigil-forge` | `intention`, `method`, `processing`, `charging_suggestions[]`, `guidance`, `svg_preview`, `generated_image`, provider state; optional top-level `generated_image` | **Intention Distillation** + **Method Sequence** + **Sigil Artifact** | Implemented/partial. Generated imagery is labeled generated; arbitrary SVG is never executed. |
| 16 | `biofield` | `computation_mode`, `is_mock_data`, `metrics`, `chakra_readings`, `areas_of_attention`, `analysis`, `interpretation` | **Capture Boundary**; verified records may add **Metric Field** + **Chakra Spectrum** | Capture-gated. Mock or context-free output receives unresolved treatment, never emerald computed treatment. |
| 17 | `biofield-capture` | `available`, `reading_id`, `engine_id`, `created_at`, `session_id`, version fields, `quality_assessment`, `input`, `analysis` | **Capture Provenance** + **Quality Panel** + allowlisted **Metric Field** | Capture-gated. Authenticated persisted reading only; raw capture input is never the visual default. |
| 18 | `face-reading` | observed archive fields include `analysis`, `notice`, `disclaimer`, `traditions`, `future_capabilities`; live contracts require image and consent | **Capture Boundary** + **Analysis Ledger** when verified | Capture-gated. No face image or trait conclusion is invented from missing capture context. |

## Six workflow compositions

Workflow output is best-effort: a failed engine may be absent while the workflow
still returns success. The implemented runtime begins with a **System Run
Ledger** that distinguishes declared, returned, missing, failed, and
capture-gated engines, then renders every returned engine through its current
adapter. The named composite surfaces below are proposed composition targets,
not shipped renderer components.

| Workflow | Canonical configured engines | Proposed composite surface |
| --- | --- | --- |
| `birth-blueprint` | numerology, human-design, vimshottari, biofield, face-reading | **Identity Atlas** — code matrix, profile/center field, nested periods, then capture boundaries |
| `daily-practice` | panchanga, vedic-clock, biorhythm, transits, nadabrahman | **Day Instrument** — five limbs, clock, cycles, transit relations, and raga-time layer |
| `decision-support` | tarot, i-ching, human-design, enneagram, gene-keys | **Triangulation Field** — ordered symbols, decision constraints, inquiry prompts, and system disagreements |
| `self-inquiry` | gene-keys, enneagram, face-reading, biofield | **Inquiry Lattice** — activation sequence and questions, with capture surfaces clearly conditional |
| `creative-expression` | sigil-forge, sacred-geometry, nadabrahman, numerology, raaga | **Studio Field** — intention process, visual artifacts, numerical structure, raga context, and playable media |
| `full-spectrum` | seventeen configured engines; all except `biofield-capture` | **System Atlas** — filterable constellation of returned engines plus missing-engine ledger; never seventeen cards at once |

`biofield-capture` is a persisted-record resolver rather than a default member
of the six canonical workflow registry definitions.

## Reusable component inventory

### Shell and trust

| Component | Encodes | Non-visual equivalent |
| --- | --- | --- |
| `ReadingInstrument` | one engine or workflow result surface | article with structured headings |
| `ResultOrientation` | subject, moment, mode, producer | definition list |
| `RunStateBadge` | implemented, partial, capture-gated, failed, missing | visible status text |
| `ProvenanceBadge` | observed data, source contract, generated design reference | visible provenance sentence |
| `SystemRunLedger` | declared/returned/missing engine membership | table |
| `EvidenceBoundary` | deterministic, witness, historical, unresolved treatment | labeled notice |
| `TechnicalSource` | locally available structured source | collapsed native `details` |
| `AsyncBoundary` | loading, empty, partial, stale, denied, failed | status region and recovery action |

### Data-shaped primitives

| Component | Source relationship | Primary visual | Non-visual equivalent |
| --- | --- | --- | --- |
| `FactConstellation` | name → value | framed nodes/grid | `dl` |
| `NumberCodeMatrix` | code → value → reductions | stepped numeric seals | ordered `dl` |
| `PositionWheel` | point → coordinate/sign | radial placement | sortable table |
| `RelationField` | endpoint → relation → endpoint | named edges | edge list/table |
| `TemporalSpine` | ordered/datetime record | vertical sequence | `ol` with dates |
| `CycleWavefield` | measure → value on scale | rails or curves | value table |
| `SpreadField` | source slot → assigned symbol | ordered spatial slots | ordered list |
| `CollectionOrbit` | named set → members | labeled cluster | grouped lists |
| `QuestionDeck` | ordered prompts | stacked inquiry cards | ordered list |
| `MetricField` | named measure → unit/scale | bars/dials with printed values | table |

### Engine artifacts

| Component | Contract | Boundary |
| --- | --- | --- |
| `FiveLimbMandala` | Panchanga’s five named limbs | no invented transition time |
| `ActivationCross` | Gene Keys’ four supplied activation positions | frequency copy remains sourced |
| `NestedPeriodSpiral` | nested current Vimshottari periods | text timeline is canonical |
| `DoshaClock` | current window plus explicit transitions | no medical claim |
| `HexagramTransition` | primary/relating/changing lines | source order only |
| `RaagaPlayer` | valid clip URL or ratios/root frequency | missing and consent states explicit |
| `MediaArtifact` | generated image/audio with metadata | generated provenance always visible |
| `CapturePanel` | consent, device, quality, analysis availability | no raw capture preview by default |
| `SafeGeometryPreview` | sanitized source geometry or static artifact | never inject arbitrary SVG/HTML |

### Reading compositions

| Component | Purpose |
| --- | --- |
| `EngineReading` | one engine’s composed primitives |
| `WorkflowReading` | system ledger plus returned engine nodes |
| `ReadingCanvas` | sustained prose and section navigation |
| `EvidenceDrawer` | provenance, confidence, source paths, and conflicts |
| `CompareField` | symmetrical consented subjects with identical component order |
| `OperatorField` | engine health and archive administration, separated from personal reading |

## Density modes

| Mode | What is visible |
| --- | --- |
| `thread` | orientation, one primary component, concise narrative, “Open reading” |
| `reading` | full primary/secondary components and section navigation |
| `folio` | reading plus provenance, checksum, recovery, and Technical source |
| `compare` | two symmetrical reading columns plus typed relation components |
| `operator` | run ledger, versions, latency/errors, and no personal interpretation |

## Visual grammar for generated reference boards

- Void Black is the field.
- Sacred Gold defines structure and active reading context.
- Coherence Emerald marks verified computation.
- Witness Violet marks interpretive witness material.
- Terracotta marks unavailable, capture-gated, failed, or unresolved state.
- Parchment is reserved for sustained reading surfaces and high-legibility text.
- Every tile prints its state and provenance; color is redundant.
- Every node, edge, ring, bar, and orbit names its actual encoding.
- No fake counts, resonance percentages, frequencies, or system-health claims.
- The images are generated design references, not screenshots of shipped state.

Existing references used for visual language:

- `.assets/moodboard.png`
- `.assets/generated/readings-ecosystem/component-atlas.png`
- `.assets/generated/readings-ecosystem/reading-folio.png`

`.assets/page-references/multi-page-architecture-moodboard.png` remains a
historical exploration only. Its fictional telemetry is not a data or trust
reference for runtime components.

Generated outputs:

- `.assets/generated/engine-output-atlas/engine-component-families.png`
- `.assets/generated/engine-output-atlas/engine-reading-surfaces-final.png`

Both references were generated with Codex OAuth, `gpt-image-2`, and high
quality at 1536 × 1024. Their source prompts are preserved beside them in
`.assets/generated/engine-output-atlas/prompts/`. The endpoint exposes neither
a pinned image-model version nor a seed; `generation-metadata.json` records
that boundary plus SHA-256 fingerprints for every final prompt, reference,
intermediate, and output used by the reviewable generation chain.

## Validation

```bash
node scripts/readings/build-engine-output-atlas.mjs
node --test scripts/readings/engine-output-atlas.test.mjs
npx vitest run src/lib/readings/elements.test.ts
npm run build
```

The executable manifest is the completeness source for identifiers, path/type
evidence, state, workflow membership, component assignments, provenance, and
non-visual alternatives. This document is the reader-facing design contract.
