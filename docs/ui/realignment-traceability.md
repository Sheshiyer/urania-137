# Urania graph-first UI realignment traceability

This document connects the directional visual references to implemented
runtime contracts. Generated boards are not runtime truth. Typed data,
executable registries, tests, and the bounded evidence manifest are.

## Reference laws

| Reference law | Runtime owner | Contract or evidence |
| --- | --- | --- |
| The graph remains the primary spatial interface | `ConstellationGraph`, `GraphLens`, `RelationList` | `src/components/graph/graphEntries.test.ts`; `scripts/verify/ui-realignment-contracts.test.mjs` |
| Every graph relationship has a written equivalent | `GraphLens`, `ReadingLibraryMap`, `ConsentConstellation` | `src/components/graph/graphEntries.test.ts`; visual manifest graph/list rows |
| Void and sacred gold frame instruments; Parchment holds sustained reading | `src/styles/tokens.ts`, `ReadingCanvas`, `ReadingFolio` | `src/styles/semanticTokens.test.ts`; `src/components/readings/ReadingCanvas.test.ts` |
| Reading, Evidence, and Source are separate layers | `ReadingFolio`, `ReadingTrustPanel`, `ReadingSourcePayload` | `src/components/readings/ReadingFolio.test.ts`; `scripts/verify/ui-folio-contracts.test.mjs` |
| Source is privacy-filtered and collapsed by default | `ReadingSourcePayload`, `ReadingRaw` | `src/components/readings/elements/ReadingSourcePayload.test.ts`; `scripts/verify/ui-realignment-contracts.test.mjs` |
| Interaction state never impersonates computed evidence | semantic `INTERACTION` and evidence tokens | `src/styles/semanticTokens.test.ts` |
| One overlay contract serves chat, information, and reading selection | `InstrumentDialog`, `ChatSheet`, `BeginReadingDialog` | `src/components/ui/InstrumentDialog.test.ts`; `src/components/readings/BeginReadingDialog.test.ts` |
| Chat transitions deliberately into a canonical Reading | `ReadingTransition`, `CanonicalReadingReference`, `useThreadScroll` | `src/components/chat/ReadingTransition.test.ts`; `src/hooks/useThreadScroll.test.ts` |
| Narrow and reflowed views preserve every destination | `GraphLens`, `TopNav`, `BottomChrome` | `scripts/verify/ui-home-contracts.test.mjs`; visual manifest mobile/reflow rows |
| Reduced motion removes choreography, never information | graph/dialog/reading motion guards | visual manifest reduced-motion rows |
| Generated images guide composition only | asset boundary and README labels | `scripts/verify/ui-asset-boundaries.test.mjs`; `scripts/verify/ui-realignment-contracts.test.mjs` |

Authoritative references:

- `.assets/moodboard.png` — reference;
- `.assets/page-references/` — approved page-composition contracts;
- `.assets/generated/readings-ecosystem/` — directional component contracts;
- `.assets/generated/engine-output-atlas/` — directional engine-family contracts;
- `docs/ui/evidence/realignment/manifest.json` — implemented browser evidence.

## Engine and workflow composition

Every runtime result passes through `EngineReading` or `WorkflowReading`,
`ReadingCanvas`, and the canonical Folio layers. The executable source of truth
is `src/lib/readings/engineVisualRegistry.ts`; reconciliation is enforced by
`scripts/readings/engine-output-atlas.test.mjs`.

| Engine | Status | Primary instrument | Written equivalent |
| --- | --- | --- | --- |
| `biofield` | capture-gated | `ChakraFieldMap` | consent/quality status |
| `biofield-capture` | capture-gated | `CapturedFieldReading` | sectioned capture report |
| `biorhythm` | partial | `BiorhythmCycleBands` | value table |
| `enneagram` | partial | `InquiryQuestionDeck` | ordered list |
| `face-reading` | capture-gated | `PhysiognomyObservationMap` | observation table |
| `gene-keys` | partial | `GeneKeySequence` | ordered value table |
| `human-design` | partial | `BodygraphMap` | center/channel/gate edge tables |
| `i-ching` | partial | `HexagramChangeMap` | six-row change table |
| `nadabrahman` | implemented | `RagaRecommendationList` | grouped recommendation list |
| `numerology` | implemented | `NumberReductionMap` | reduction value table |
| `panchanga` | implemented | `PanchangaFactGrid` | five-limb definition list |
| `raaga` | partial | `RaagaPlayer` | media metadata and swara table |
| `sacred-geometry` | partial | `SacredGeometryPlate` | form definition list |
| `sigil-forge` | partial | `SigilConstructionPlate` | ordered construction steps |
| `tarot` | implemented | `TarotSpread` | ordered spread table |
| `transits` | implemented | `TransitAspectMap` | aspect edge list |
| `vedic-clock` | implemented | `FieldFactGrid` | period definition list |
| `vimshottari` | implemented | `DashaTimeline` | hierarchical period table |

| Workflow | Declared engines | Runtime composition | Honest state |
| --- | ---: | --- | --- |
| `birth-blueprint` | 5 | `CompositeIdentityMap` + `SystemRunLedger` | proposed, present/missing/error ledger |
| `creative-expression` | 5 | `CreativeArtifactShelf` + ledger | proposed, artifact availability |
| `daily-practice` | 5 | `TemporalPracticeSequence` + ledger | proposed, chronological contributors |
| `decision-support` | 5 | `PerspectiveComparison` + ledger | proposed, per-engine comparison |
| `full-spectrum` | 17 | `FullSpectrumConstellation` + ledger | proposed, explicit dropped engines |
| `self-inquiry` | 4 | `InquiryLayerStack` + ledger | proposed, ordered question layers |

The visual registry tests require exactly 18 unique engines and six workflows;
an unknown or unresolved payload uses a visibly generic fallback instead of
invented geometry.

## Route and state evidence

The exact, bounded browser records live in
`docs/ui/evidence/realignment/manifest.json`; every row points to one PNG and
four allowlisted DOM/request/console/Axe records.

| Route or surface | Wide | Mobile | Effective reflow / reduced motion |
| --- | --- | --- | --- |
| `#/threshold` | threshold row | threshold critical-flow row | reduced-motion threshold contract |
| `#/` | home graph row | home list-lens row | home reflow and reduced-motion graph rows |
| `#/node/birth` | parent-node row | critical node row | node list-equivalence row |
| `#/node/compat` | parent-node row | Union Mirror critical row | node list-equivalence contract |
| `#/node/transit` | parent-node row | critical node row | node list-equivalence contract |
| `#/node/witness` | parent-node and chat rows | mobile sheet row | composing/transition reduced-motion rows |
| `#/node/engine` | node and operator rows | operator critical row | written operator state contract |
| `#/node/folio` | parent-node row | Folio doorway row | node list-equivalence contract |
| `#/node/bridge` | parent-node row | critical node row | node list-equivalence contract |
| `#/readings` | populated, empty, denied, failed rows | mobile Folio/list row | Folio reflow row |
| `#/readings/:id` | selected/long Reading rows | mobile reading-measure row | long-reading reflow row |
| `#/settings` | owner, consent, revoked rows | mobile Settings row | Settings reflow row |
| `#/relationships/:relationshipId/readings/:generationId` | current/historical grant rows | dyad critical row | participant-grant contract |

Deep-link parsing and browser-history behavior are additionally owned by
`src/hooks/useHashRoute.test.ts`. No visual row forwards a mutation, contacts
an external origin, or writes local D1.

## 2026-07-27 review findings

| Finding | Disposition | Implementation and proof |
| --- | --- | --- |
| Dialog semantics/focus incomplete | Resolved | `InstrumentDialog`; focus/escape/restore tests and dialog matrix rows |
| Simulated metrics | Resolved | registry-derived parent/runnable counts; `ui-home-contracts.test.mjs` |
| Prohibited path/journey vocabulary | Resolved | centralized `UI_COPY`; vocabulary and quick-reply tests |
| First viewport lacks product promise | Resolved | grounded promise + direct Begin action on `HomePage` |
| Chat requires two navigation depths | Resolved | global `BeginReadingDialog` plus graph doorways |
| Folio has too many names | Resolved | Folio/Browse Folio/Folio map/Reading contract |
| Engine data dominates reading | Resolved | Reading/Evidence/collapsed Source layers |
| Streaming and reading share a live region | Resolved | finite status narration, `ReadingTransition`, paused following |
| Long reading lacks material/measure | Resolved | Parchment `ReadingCanvas`, 70ch measure, heading offset |
| Muted microtype fails contrast | Resolved | semantic text roles and computed contrast tests |
| Graph lacks valid semantic equivalent | Resolved | `GraphLens` + ordered `RelationList` |
| Mobile tapping/reflow/chrome containment | Resolved | inert decoration, 44px targets, list lens, mobile inset browser PASS |
| Async states compete | Resolved | exclusive `AsyncBoundary` and typed Folio denied status |
| Folio constellation encodes no difference | Resolved | named node-family angular sector and creation-time radius |
| Reference-only page controls | Resolved | only implemented `Constellation` tab remains |
| Consent is secure but mechanical | Partially resolved | humane `ConsentConstellation`, expiry/status/action and participant-grant reader; authenticated share-link contract remains deferred |
| User/operator architecture is mixed | Explicitly retained | operator node is labelled endpoint-backed evidence and cannot interpret a person or grant authority |
| Narration/deterministic voice diverges | Resolved for current public surfaces | centralized prohibited-vocabulary tests and non-prescriptive witness tests |
| Token ownership incomplete | Partially resolved | semantic interaction/evidence/text roles landed; remaining hard-coded decorative glow cores are non-data visual debt |
| Concept plates vs shipped assets unclear | Resolved | README reference/contract/implemented labels plus runtime asset scan |

Deferred items remain deferred because this UI realignment may not invent a
share-link protocol, change the product's operator topology without product
direction, or rewrite decorative brand primitives outside the verified
semantic-state boundary.

## ISC-282 through ISC-313

| ISC range | Exact proof |
| --- | --- |
| 282–285 | `docs/plans/2026-07-27-urania-graph-first-ui-realignment.md`; this route/reference map |
| 286 | `docs/engine-output-atlas.json`; `src/lib/readings/engineVisualRegistry.ts`; atlas test |
| 287–294 | runtime owners and route matrix above; visual manifest |
| 295–296 | `src/lib/readings/types.ts`; element/Source tests; contract gate |
| 297–301 | visual manifest desktop/mobile/reflow/reduced-motion rows; hash-route tests |
| 302–308 | task plan RED/GREEN commands, ownership tables, atomic commits |
| 309–311 | contract/redaction gates; zero-mutation request logs; no backend diff |
| 312 | `docs/frontend-brand-flow-review-2026-07-27.md`, inspected references, baseline evidence |
| 313 | approved plan under `docs/plans/`; plan completeness evidence in `ISA.md` |

Implementation exit criteria ISC-342–345 are satisfied by the complete
orchestrator pass recorded in `ISA.md`: 33 matrix rows, four redaction checks,
the production build, and the enforced bundle budget all pass together.
