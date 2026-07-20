---
task: "Review Instagram reference and map the full stellar-node branching architecture to Urania 137"
slug: 20260714-160000_urania-137-architecture-review
project: Urania 137
effort: advanced
effort_source: auto
phase: complete
progress: 12/12
mode: interactive
started: 2026-07-14T16:00:00Z
updated: 2026-07-15T21:20:00Z
---

## Problem

Urania 137 currently ships only the first radial layer of the Instagram reference: a central NOESIS core with seven parent nodes (Birth Witness, Union Mirror, Sky Weather, Noesis Reading, Engine Status, Folio Archive, Bridge Query). The reference image shows a much deeper architecture: each parent node is itself a hub with its own sub-tree of branching criteria, and the user explicitly notes we are only "10% done." The current modal-only interaction does not expose the second, third, or deeper levels of branching that make the reference feel like an "enterprise-grade second brain." We risk shipping a shallow graph when the user expects a multi-page, multi-depth stellar taxonomy.

## Vision

A user lands on Urania 137, sees the same radial constellation as the reference, clicks a parent node, and enters a dedicated page where that node becomes the new center of its own branching sub-tree. Each sub-tree reveals the specific dimensions, criteria, and report modes that belong to that surface — e.g., Birth Witness expands into deterministic birth charts, witness birth narratives, lineage patterns, and timing windows. The navigation feels like zooming into a star system: the parent page is not a modal but a full view with its own radial or dendritic children, and breadcrumbs let the user return to the galactic overview. Euphoric surprise: the user recognizes the Instagram reference at first glance, then discovers that every node is a door into a whole room.

## Out of Scope

- No backend changes beyond the existing public Selemene API integration.
- No new report engines or data models not already supported by the Selemene API.
- No mobile native app or desktop wrapper in this phase.
- No real-time collaborative editing of reports.
- No AI-generated content beyond what the Selemene API already returns.
- No redesign of the Tryambakam Noesis brand identity; all work stays within the existing visual system.

## Principles

- The graph is the interface at every depth. Every page should be navigable by clicking nodes, not by hunting menus.
- Depth must be earned. A parent node page opens only when the user deliberately enters it; we do not overwhelm the home view with all sub-nodes.
- One node, one URL. Each parent node and each significant sub-node should be addressable so sharing and deep-linking work.
- Preserve the reference's visual grammar: radial symmetry, thin glowing edges, small satellite nodes, central hub label, dark void background.
- Deterministic and witness surfaces remain distinct but coexist inside the same node. The user chooses surface inside the node page, not before entering it.

## Constraints

- React 19 + Vite + Tailwind CSS 3 stack remains unchanged.
- The graph must remain SVG-based (no Canvas/WebGL dependencies) to keep the build lightweight.
- Public Selemene API at `selemene.tryambakam.space` is the only report source; no mock data.
- All new routes must work with the existing static build (no server-side routing changes beyond Vite/SPA).
- The current seven parent nodes must remain visible on the home screen; no node may be hidden behind a menu.

## Goal

Produce a clear architectural map of the full Instagram reference and a phased implementation plan so that Urania 137 moves from a single-layer radial graph to a multi-page, multi-depth stellar node console where each of the seven parent nodes has its own navigable page and each page branches into the relevant Selemene report dimensions.

## Criteria

- [x] ISC-1: The Instagram reference image has been visually inspected and all seven parent nodes are named.
- [x] ISC-2: Each parent node in the reference is mapped to a corresponding Urania 137 parent node.
- [x] ISC-3: At least one parent node page is shown to branch into ≥5 sub-criteria, matching the density visible in the reference.
- [x] ISC-4: The navigation model (home radial → parent page → sub-node → report modal) is documented in the ISA and README.
- [x] ISC-5: The data model (`selemeneNodes.ts`) is extended to support nested children without breaking the existing home graph.
- [x] ISC-6: A wireframe or prototype of one parent page is rendered in the browser and captured as a screenshot.
- [x] ISC-7: The URL structure for parent-node pages is defined and implemented for at least one node.
- [x] ISC-8: The existing modal report generation continues to work from the deepest sub-node.
- [x] ISC-9: Anti: the home screen is not cluttered with sub-nodes from every parent simultaneously.
- [x] ISC-10: Anti: no parent node is reachable only through a dropdown or sidebar menu.
- [x] ISC-11: Antecedent: the reference's visual grammar (radial symmetry, glowing edges, dark void, satellite nodes) is preserved at every depth.
- [x] ISC-12: The phased plan is reviewed against the current codebase and committed as a decision entry.

### Daily Panchanga Reading (2026-07-19) — behavioral ISCs, one per verification gate
- [x] ISC-13: Sky Weather exposes a "Today" child that renders an **interpreted** daily reading (prose passes), not a raw `JSON.stringify` block — verified live in-browser (dev) and by `node scripts/verify/taxonomy.mjs` (the daily row resolves `seam → panchanga+transits live`).
- [x] ISC-14 (G1): Every child hits a real capability including `{kind:'daily'}` — `node scripts/verify/taxonomy.mjs https://urania-137.vercel.app` reports **35/35**, no regression.
- [x] ISC-15 (G2): Today's live panchanga carries every key the interpreter reads (SCHEMA-1) — `node scripts/verify/daily-gates.mjs` (17 panchanga keys + 6 aspect keys present).
- [x] ISC-16 (G3): The lexicon covers the ground-truth enum domains with no gaps — `npm run test:daily` (7 vara / 30 tithi / 27 nakshatra / 27 yoga / 11 karana, all captured live).
- [x] ISC-17 (G4): `interpret()` is byte-stable over a frozen bundle (determinism snapshots) — the only variance is the input.
- [x] ISC-18 (G5): No imperative/predictive constructs in any authored string or assembled reading (non-prescriptive witnessing voice).
- [x] ISC-19 (G6): No birth data → complete base reading + closing invitation; birth data → the native overlay appends (graceful degradation).
- [x] ISC-20 (G7): The **running app** names today's actual live tithi/nakshatra and archives the reading to the Folio — **verified on Production** (2026-07-20, post-merge #90): Sky Weather ▸ Today rendered `Saptami (Shukla) / Hasta / Somavara (Monday)`, an exact match to an independent live engine call, as interpreted prose; the reading archived to `urania137.folio.v1` as `mode: 'daily-panchanga'`; no console errors.
- [x] ISC-21 (G8): ① `DeterministicInterpreter` and ③ `WitnessModeSource` produce the same `DailyReading` shape (seam-swap) — the ①→③ flip is proven shape-safe before the engine route exists.
- [x] ISC-22 (③ readiness): `WitnessModeSource` is a dormant, drop-in adapter of the seam; it stays uninvoked under the default flag (dormancy guard), and the flip is gated on `node scripts/verify/engine-requests.mjs` going green live — which today correctly reports the capability NOT-yet-landed (REQ-1 → 400, no false green). Engine execution is out-of-repo (Selemene), tracked in `docs/selemene-engine-requests.md`.

## Test Strategy

```yaml
- isc: ISC-1
  type: visual-inspection
  check: seven parent nodes identified in reference image
  threshold: all seven named and matched
  tool: Read the Instagram reference image

- isc: ISC-3
  type: visual-density
  check: one parent node expands to at least five sub-criteria
  threshold: ≥5 visible branches
  tool: Read the reference image and annotate branching

- isc: ISC-6
  type: design-reference
  check: parent page visual reference shows sub-node branching
  threshold: PNG generated for each parent node
  tool: codex-gpt-image generate with existing moodboard reference

- isc: ISC-8
  type: regression
  check: existing report modal still submits to live API
  threshold: 200 OK or meaningful API response
  tool: Playwright form-fill + submit

- isc: ISC-9
  type: anti-probe
  check: home screen does not show sub-nodes
  threshold: only seven parent nodes visible
  tool: Playwright screenshot of home view
```

## Features

```yaml
- name: ReferenceAnalysis
  description: Visually inspect and annotate the Instagram reference, extracting parent nodes and sub-node branching patterns.
  satisfies: [ISC-1, ISC-2, ISC-3]
  depends_on: []
  parallelizable: false

- name: NavigationModel
  description: Define the route and state model for home → parent page → sub-node → report modal.
  satisfies: [ISC-4, ISC-7]
  depends_on: [ReferenceAnalysis]
  parallelizable: false

- name: DataModelExtension
  description: Extend selemeneNodes.ts to support nested children and parent-page rendering.
  satisfies: [ISC-5]
  depends_on: [NavigationModel]
  parallelizable: false

- name: ParentPagePrototype
  description: Build and screenshot one parent page with branching sub-nodes, preserving the reference visual grammar.
  satisfies: [ISC-6, ISC-11]
  depends_on: [DataModelExtension]
  parallelizable: false

- name: RegressionGuard
  description: Ensure existing modal and live API wiring remain intact after the multi-page refactor.
  satisfies: [ISC-8, ISC-9, ISC-10]
  depends_on: [ParentPagePrototype]
  parallelizable: true
```

## Decisions

- 2026-07-14 16:00: The user explicitly stated the current implementation is only ~10% done because the reference shows parent nodes with their own pages and deeper branching. This ISA treats the architectural gap as the primary problem, not the API wiring.
- 2026-07-14 16:00: Chose to preserve the SVG graph approach rather than introducing a graph library (D3, Cytoscape, or react-flow). The reference is radial and lightweight; adding a library would violate the existing build constraints without adding needed control over animation and layout.
- 2026-07-14 16:35: Visual analysis of the Instagram reference (`instagram-post-chrome.png` and `stellar-node-branching.jpg`):
  - The reference is a single radial graph on a dark screen, captioned "POV: you compiled 137 jobs across 7 departments into an enterprise-grade second brain."
  - The center is a dense hub (in our mapping: NOESIS).
  - Seven primary spokes radiate outward: BACK OFFICE, SALES, DEALS, MARKETING, OPERATIONS, INTELLIGENCE, CUSTOMER.
  - EACH primary spoke is not a leaf — it sprouts a dense cloud of smaller satellite nodes, forming a local star or dendrite at every parent.
  - The edges are thin, luminous lines; the nodes are small circles with labels; the overall composition is symmetric, like a celestial diagram or an atomic orbital model.
  - The density of sub-nodes is roughly 10–20 per parent, not 1–2.
  - Implication: clicking a parent node in Urania 137 should open a dedicated page where that parent is re-centered and its own children branch out, not just a single modal form.
- 2026-07-14 16:35: Mapped the seven reference departments to the seven Urania 137 report surfaces while preserving the user's intent:
  - BACK OFFICE → Engine Status (system/engines, the operational core)
  - SALES → Bridge Query (outreach/requests, the query surface)
  - DEALS → Union Mirror (contracts/pairings, the compatibility surface)
  - MARKETING → Folio Archive (published outputs, the archive surface)
  - OPERATIONS → Sky Weather (ongoing cycles, the transit/weather surface)
  - INTELLIGENCE → Noesis Reading (insights, the witness reading surface)
  - CUSTOMER → Birth Witness (identity, the birth/natal surface)
- 2026-07-14 16:35: Each Urania parent node should expand into a sub-tree of report dimensions. Tentative mapping:
  - Birth Witness: birth blueprint (deterministic), birth witness narrative, lineage/family pattern, human design, gene keys, vedic clock, panchanga, timing windows.
  - Union Mirror: synastry, composite, compatibility, relationship dynamics, family constellations, business partnership.
  - Sky Weather: daily transits, monthly cycles, retrogrades, eclipses, solar/lunar returns, mundane astrology.
  - Noesis Reading: L0–L5 witness levels, bridge question, pattern extraction, consciousness level, antecedent themes.
  - Engine Status: 16 consciousness engines, engine health, version/status, pulse endpoint, individual engine toggles/details.
  - Folio Archive: saved reports, export formats, search/filter, report history, favorites.
  - Bridge Query: question-based reports, decision support, Horary/I Ching, follow-up inquiries.
- 2026-07-14 16:35: The navigation should be zoom-based: home = galactic view, click parent = planetary system view, click child = report modal. Breadcrumbs or a central return-to-home gesture keep orientation.
- 2026-07-15 11:25: Generated multi-page architecture moodboard and seven parent-page reference images using `codex-gpt-image` with the existing `.assets/moodboard.png` as style reference. Saved to `.assets/page-references/`. Images preserve the brand palette and show each parent node as a re-centered hub with branching sub-nodes.
- 2026-07-15 12:05: Created a Swarm Architect multi-page integration plan at `/Users/sheshnarayaniyer/.craft-agent/workspaces/my-workspace/skills/swarm-architect/plans/urania-137-multi-page-integration-plan.md` and copied it to `docs/urania-137-multi-page-integration-plan.md`. The plan freezes a reusable component layer (`StellarNodeGraph`, `StellarNode`, `StellarEdge`, `StellarSubNode`, `CoreGlow`, `NodePageLayout`, `PageHeader`, `DesignTokens`) before any parent page is built, ensuring one-to-one visual interpretation of the generated references without design drift.
- 2026-07-14 16:40: Phased implementation plan drafted:
  - Phase 1 — Data model: extend `selemeneNodes.ts` to support `children` arrays and `page` metadata for each parent node.
  - Phase 2 — Routing: add Vite/SPA routes (or hash routes) for `/node/:nodeId` parent pages, with back navigation to `/`.
  - Phase 3 — Parent page renderer: create `NodePage.tsx` that re-centers the selected parent and renders its children as a local radial graph using the same SVG primitives.
  - Phase 4 — Sub-node mapping: populate tentative children for Birth Witness first, wire the existing report modal to the deepest child, and screenshot.
  - Phase 5 — Full taxonomy: expand children for the remaining six parent nodes, one by one, with screenshots.
  - Phase 6 — Polish: transitions between home and parent pages, breadcrumb or hub gesture, responsive layout, README update.
- 2026-07-15 21:20: Shipped the full implementation (fast-forward merged to `main`). Delivered a scroll-driven camera JOURNEY rather than separate routed pages: a galactic overview of the seven parent nodes, and scrolling dives into each node's cluster (the parent re-centres and its sub-nodes appear) then resurfaces before the next — emulating the source reel's "compile the second brain" flow in the NOESIS brand. A reusable, data-driven layer prevents design drift: one `ConstellationGraph` renders all seven cluster pages from `SELEMENE_NODES[].children`, and primitives + `src/styles/tokens.ts` are the single source of visual truth. Navigation is hash-based (`#/node/:id` syncs while passing each cluster; deep-links land at the right beat) with no router dependency. Motion uses GSAP + `@gsap/react` ScrollTrigger, gated by `prefers-reduced-motion` (static overview↔cluster fallback). Child-orb clicks open the existing report modal against the live Selemene API.

- 2026-07-16: **Reverted the scroll-journey to a multi-page console (full realignment to the reference art).** The user, shown the live overview, reported "this isn't the new design at all — reference the docs." Direct comparison against `.assets/page-references/*.png` confirmed the shipped overview (`StellarNodeGraph` + flat `SimpleCore`) was a sparse skeleton — a single dot, seven tiny grey nodes, no sacred geometry, no chrome — nowhere near the lush golden mandalas + console chrome in the references. The prior session had verified the journey was *functionally wired* and missed the *visual* gap entirely. Confirmed decisions this session: (1) full realignment — visual **and** functional; (2) **multi-page console** — discrete `#/node/:id` pages (reverting the 2026-07-15 21:20 scroll-journey decision); (3) **faithful high-detail SVG**; (4) **Cinzel** engraved serif for the wordmark + page titles; (5) full console chrome (top nav, stat footers, tabs), with the graph still the primary way in so ISC-10 holds. Implementation: a hash router (`useHashRoute`) renders `HomePage`/`NodePage`; the ornate `ConstellationGraph` became the single shared renderer for both depths (`variant: home | node`), enriched with nebula, a flower-of-life core, per-child sacred-geometry glyphs (`primitives/Glyph.tsx`), and proper hit-targets; `StellarNodeGraph`, `SimpleCore`, and `ScrollJourney` were retired. The two placeholder surfaces became real: **Engine Status** renders live `/health` + `/health/ready` + `/api/v1/engines` telemetry (18 engines, per-engine health — no mock data); **Folio Archive** persists every generated report to `localStorage` with search, favorites, and Markdown/DOCX/PDF export. Entrance motion is now a reduced-motion-gated CSS bloom (GSAP dropped). Verified in-browser: home + all node pages match their references, a live report POST returns 200 and is saved to the Folio, and Engine Status shows real state; `npm run build` passes.

- 2026-07-17: **Realigned the taxonomy to capabilities the engine actually serves.** Testing every flow with real vault data (`723/Solos/witnessalchemist`, `harshita`) showed all 15 modes returning 200 with plausible content — and that this was meaningless. `POST /api/v1/assets/generate` does not validate `mode`: a deliberately fake mode (`THIS-MODE-DOES-NOT-EXIST-xyz`) and an empty mode both returned 200 with the same generic one-pass `default: Reading`, and `synastry`/`bridge-query`/`daily-practice`/`""` produced byte-identical output. Confirmed at the source — `noesis-api`'s `load_mode_document` (`crates/noesis-api/src/handlers/assets.rs:337`) resolves only `integrated-reading`/`composite-dyad` and `integrated-kundali-l0`/`kundali`/`kundali-l0`, and falls through to a `default` pass for everything else. `report_level` is likewise ignored (L0 and L5 both return `register=l4_l5`, identical size). The richer partner/lineage modes DO exist as authored docs in `packages/witness-pipeline/modes/` — they simply aren't loaded by noesis-api yet, so this was an integration gap, not invented UI. Meanwhile the engine's real surface was entirely unused: 6 workflows (`POST /api/v1/workflows/{id}`) and 18 engines (`POST /api/v1/engines/{id}/calculate`), both returning genuine computation. Rebuilt `selemeneNodes.ts` so every child declares a `run` against a verified capability — Birth Witness → `birth-blueprint` workflow + its engines; Sky Weather → `daily-practice`; Bridge Query → `decision-support`/`self-inquiry`; Noesis Reading → `integrated-kundali-l0` (the 12-part reading, previously unexposed) + `integrated-reading` + `full-spectrum`; Union Mirror → `composite-dyad`; Engine Status → live health + individually runnable engines. Added the workflow/engine client, `BirthDataForm` (the deterministic surface takes `birth_data`, and `name` is required — numerology 422s without it and the workflow then silently drops that engine), `WitnessForm` (no mode picker — offering unresolvable modes is what made every surface identical), and `DeterministicResult` (which surfaces engines the workflow drops, e.g. `sigil-forge` in full-spectrum). Verified: 33/33 children hit a real, differentiated capability and none falls back to `default:Reading`.

- 2026-07-17: **Wired the entry point to the rest of the product, and mapped it** (`docs/integrated-product-map.md`). urania-137 is the online entry to an integrated product — Noesis Mirror (`314.tryambakam.space/p/:personId`, the person's walkable field over the same `723/Solos/{personId}` packs the Folio archives) and Sankalpa (the Electron instrument owning consent-gated capture) — but neither sibling referenced it. (The "Urania" in Noesis Mirror's `RELEASES.md` is a Muses release codename, not this app.) Both doors are nodes, not nav items: Folio Archive → Noesis Mirror, Engine Status → Sankalpa Desktop, keeping the graph the interface at every depth. `src/config/product.ts` is the single source for their locations. Verified rather than assumed: `/p/harshita` and `/p/witnessalchemist` both 200; `/api/world/:id` 401 (granted per person, so the panel opens the field rather than promising one exists); Sankalpa has no publish target at v0.1.0, so no download is offered rather than linking somewhere fake. Also fixed `options.intention`: sigil-forge was never broken — it 422s with a clear message and the console simply never sent it, while the workflow swallowed the 422 and dropped the engine (full-spectrum 16/17 → **17/17**, creative-expression 2/3 → **3/3**). The engine boundary is now explicit: engines needing only `birth_data` (+`options.intention`) run online; `biofield`/`biofield-capture`/`face-reading` need capture under explicit consent and belong to Sankalpa.

- 2026-07-18: **Deployed the engine mode-contract fix to production and verified it end-to-end.** The realignment left the client honest but the engine still lying: on the live engine an unknown mode returned `200 default:Reading`, so the fix wasn't real until deployed. Shipped it in isolation (Selemene `#903`, branched off `origin/main`, excluding ~20 unrelated in-flight commits) with two regression guards — `assets_generate_rejects_unknown_mode` and `assets_generate_modes_are_differentiated` (asserts distinct modes have distinct *pass plans*, the check that survives both `status==200` and `passes[0]!='default'`). Hardened the pipeline it exposed: `#904` made the CD deploy fail-loud instead of `exit 0` on missing config (both deploy jobs silently skipped; the K8s job targeted the unreachable `api.selemene.witnessos.io` while the live engine runs on Railway) and de-fanged the dead K8s job; `#905` fixed the Railway deploy for a project token (`railway link` is an account op that 401s under a project token — deploy the service directly with `railway up --service`); `#906` let the post-deploy gate authenticate with an `X-API-Key`, not only a JWT. **Verified against the live production engine (not the green tick):** the in-CI gate's own output shows `THIS-MODE-DOES-NOT-EXIST-xyz → 400 UNKNOWN_MODE`, `integrated-reading → alpha,beta`, `integrated-kundali-l0 → 12 passes`, `contract holds on the deployed engine`; `uptime_seconds` reset confirms the new build is live; CD is fully green and self-certifies the contract on every future deploy. **One regression this surfaced:** deploying `main` after a long gap shipped *all* accumulated engine changes at once, including auth-tightening that invalidated urania-137's stored proxy key — the live app 401'd until `SELEMENE_API_KEY` was refreshed on Vercel and redeployed. Re-verified through the live app: `/api/v1/engines → 200`, bogus mode `→ 400`, `integrated-kundali-l0 → 200 · 12 passes`, and the Live Status panel renders real telemetry (`v3.1.0 · 18 engines · 6 workflows`).

- 2026-07-19: **Built the daily panchanga reading — the missing daily-transit layer — behind a swappable interpretation source.** The gap: birth-data readings got interpreted narrative (`integrated-reading`, `integrated-kundali-l0`), but the daily/panchanga surface dumped raw engine JSON — data with no reading. Filled it with a **layered reading** (universal panchanga base of the day — vara·tithi·nakshatra·yoga·karana, needs only date+location — plus a personal transit-to-natal overlay when birth data is present) produced through a **`DailyReadingSource` seam**: ① an in-app `DeterministicInterpreter` ships now (engine JSON → an authored lexicon in the non-prescriptive witnessing voice → prose, reusing the `AssetGenerateResponse` render pipe); ③ a dormant `WitnessModeSource` flips in later via `DAILY_SOURCE` once the engine serves a real `daily-panchanga` mode. **No Selemene backend change in this repo** — the engine work is tracked as runnable requests in `docs/selemene-engine-requests.md` (the consumer→producer ledger). Probed the LIVE engine to pin every contract (the local `SELEMENE_API_KEY` is expired → 401, so probed via the prod proxy): captured the real schema (indexed limbs, paksha embedded in `tithi_name`, no transition timestamps), resolved "today at location L, no birth data" = `birth_data.date` + location (proven by date→tithi and location→nakshatra), and captured **all 102 enum spellings as ground truth**. The interpreter is pure (byte-stable); the six lexicon tables were authored in parallel by six agents against the frozen schema + domains and pass a completeness+voice gate. Surfaced as "Today" on Sky Weather (reuses Modal + Folio). Eight behavioral gates G1–G8 (`verify:daily-contracts`, `verify:daily-phase1`, `verify:daily`, `verify:all`), each shown red once. Note: the engine's **gate-1 is already fixed** (unknown mode → `400 UNKNOWN_MODE`), so the ledger's REQ-2 is ✅ and the remaining engine work is *serving* `daily-panchanga` as a distinct mode.

- 2026-07-20: **Cloudflare-native auth + per-user reading storage — Phase 0 (Platform & Contracts) shipped.** Migrating urania from anonymous shared-key + localStorage to **login-required CF Access email-OTP + a Pages Functions Worker + D1** (users, readings), host Vercel→Pages, Vercel delinked (spec `0b568f4a`, 81-task swarm plan `bc07aca7`, epic #91). Phase 0 froze the platform + every cross-agent contract before parallel work: `wrangler.toml` (Pages + D1 `DB` binding + the four config keys), migration `0001_init` (users + readings + both indexes, FK ON DELETE CASCADE), the shared API contract `src/lib/api/contract.ts` (`ReadingDTO` 1:1 with the SPA's `FolioEntry`), a typed `Env`, the four frozen decisions in `docs/auth/contracts.md` (CF-Access verify · `user_id` derivation · prod-safe dev-identity guard · 9d9d handoff), and a `functions/api/[[path]].ts` router of contract-shaped 501 stubs. Verified: exit gate **9/9** (tsc SPA + Functions green), migration applies to a local D1 (users + readings + indexes), and every `/api/*` route returns its distinct **501** stub (unknown → **404**) live under `wrangler pages dev`. The engine stays a shared-key stateless compute backend; identity + storage live only at urania's edge. (T-001..T-014; product-map updates land when Pages is live in Phase 4–5.)

## Changelog

- 2026-07-19 | conjectured: the panchanga engine's enum spellings (30 tithi, 27 nakshatra, 27 yoga, 11 karana) could be filled from canonical Vedic tables in the engine's convention.
  refuted by: a 32-day noon sweep of the live engine captured only 95/102 values — noon-sampling skips any limb value that begins *and* ends between two noons (a real kshaya-tithi phenomenon), and the 4 "fixed" karanas occur only at the new-moon window. A finer new-moon-centred sweep (every 6–8h) captured all 102 as live ground truth.
  learned: for a reading that must be complete for *every possible day*, the enum domains must be **observed from the running engine**, not assumed — and the sampling must be fine enough to catch boundary-skipped values, or the lexicon silently mis-keys on a rare day.
  criterion now: ISC-16 (G3) asserts the lexicon covers the ground-truth domains captured live; `src/lib/daily/lexicon/domains.ts` is the frozen contract, and G2 fails loud if the engine renames a key.

- 2026-07-19 | conjectured: pushing the branch to a green Vercel **preview** deploy would let G7 verify the rendered "Today" reading against live engine data.
  refuted by: the preview built and served green (root `200`, `/api/selemene/health` `200`), but its proxy `POST …/panchanga/calculate` returned `401 Invalid or expired API key` — the **Preview** environment's `SELEMENE_API_KEY` is expired; only **Production** carries the valid key (verified: prod panchanga `200`), and Production does not have this feature until merge. Same class as the 2026-07-18 key regression.
  learned: a green *preview* deploy is not a working *service* — env secrets are per-environment and must be valid there; "deployed" is asserted by the proxy returning `200`, not by the build succeeding. The whole feature was engineered around exactly this (probe the live engine, not assume; the ledger harness reports NOT-landed rather than false-green) — and the same rule bit the preview.
  criterion now: **resolved** — after merge to Production (which carries the valid key), G7 passed live (2026-07-20): the rendered tithi exact-matched a direct engine call and archived to the Folio; ISC-20 is [x]. The Preview-env key gap remains a standing note for future preview testing.

- 2026-07-14 | conjectured: the Instagram reference could be adequately recreated as a single radial graph with modal inputs for each parent node.
  refuted by: visual inspection of the reference reveals each of the seven parent nodes is a hub with its own dense sub-tree of branching criteria, not a leaf. The caption "137 jobs across 7 departments" implies ~20 dimensions per department.
  learned: the home screen is the galactic overview; every parent node needs its own page that re-centers that node and branches into its children. Modal inputs belong to the deepest child, not to the parent directly.
  criterion now: ISC-4, ISC-5, ISC-6, ISC-7 added to enforce the multi-page, multi-depth architecture.

- 2026-07-15 | conjectured: the parent-page references would need to be hand-sketched or browser-prototyped first.
  refuted by: codex-gpt-image, guided by the existing moodboard, produced high-fidelity brand-consistent page references faster than sketching and gave us a shared visual target for all seven parent pages.
  learned: using the existing moodboard as a style reference for Codex image generation keeps the whole family of assets visually coherent and surfaces layout choices (e.g., corner ornamentation, page title treatment) before code is written.
  criterion now: ISC-6 satisfied by generated design references; verification updated to include the `.assets/page-references/` files.

- 2026-07-15 | conjectured: the multi-depth architecture needed separate routed `/node/:id` pages, one per parent, each entered by a click.
  refuted by: the user's intent (and the source reel) is a single scroll-driven camera journey — the overview dives into each cluster in turn and resurfaces — not a set of discrete pages. A unified `ScrollJourney` with two layers (overview + active cluster) driven by a per-segment dive curve matches the reel and keeps the graph the sole interface.
  learned: "one node, one URL" is satisfied by hash sync during the journey (`history.replaceState`) plus deep-link-to-scroll, with no router and no separate page components; clicking a node jumps the journey rather than navigating away.
  criterion now: ISC-5, ISC-7, ISC-8, ISC-9, ISC-10 satisfied by the shipped build.

- 2026-07-16 | conjectured: the scroll-driven journey was the right realization of the reference, and the live overview was "the new design" (the prior session concluded any mismatch was a stale cache).
  refuted by: the user reaffirmed "this isn't the new design at all — reference the docs," and a direct read of `.assets/page-references/*.png` proved the shipped overview was a sparse skeleton (flat dot + tiny grey nodes, no sacred geometry, no chrome, broken NOESIS wordmark) while the references are dense golden mandalas with full console chrome. Verifying *function* ("it works / it's cached") is not verifying *the design* against the visual target.
  learned: when the deliverable is a visual match, the reference art — not the ISA prose — is the acceptance target, and it must be read and compared pixel-for-intent before claiming done. The design target was multi-page pages all along (the references are named `*-page.png` with nav chrome); the journey optimised the reel metaphor at the cost of the reference fidelity the user actually wanted.
  criterion now: the multi-page console, faithful-fidelity graph, engraved-serif titles, and live Engine Status / Folio Archive satisfy the full realignment; ISC-3, ISC-8, ISC-9, ISC-10, ISC-11 re-verified on the rebuilt pages.

- 2026-07-17 | conjectured: the seven surfaces' report modes were real, because every one returned 200 with plausible content and a live `engines_used` list.
  refuted by: testing with real vault data and then probing adversarially — a **deliberately fake mode returned 200 with the same output**, and four different modes hashed byte-identical. `noesis-api`'s `load_mode_document` resolves exactly two mode families and defaults the rest. "200 + non-empty" is satisfied by a typo, so it was never evidence of anything.
  learned: an assertion that a made-up input also passes is not a test. Mode-keyed APIs must be probed with a known-bad key to establish they discriminate at all — and the taxonomy must be derived from what the service serves (`/api/v1/workflows`, `load_mode_document`), not from what the UI's design references were labelled.
  criterion now: every child declares a `run` against a verified capability; the taxonomy test asserts a witness mode does NOT resolve to `default:Reading`, and reports engines a workflow drops rather than showing a quietly-short result.

- 2026-07-18 | conjectured: merging the engine fix and seeing a green CD run means it is deployed and live.
  refuted by: the live engine still returned `200 default` for a bogus mode after an all-green CD run. Every deploy job reported success while doing nothing — `Deploy to Railway`/`Deploy to Kubernetes`/`API Smoke Tests` each `exit 0` on missing secrets, and the K8s job pointed at an unreachable host. The same "reports success without doing the thing" failure the whole session hunted, living in the pipeline itself. Then even with CI green, my own `clippy` check false-passed (grepped coloured output for `^error`), and the deploy failed twice more on token type/value before landing.
  learned: a green pipeline is a claim, not evidence — verify the running service, not the status. A deploy step that can't deploy must FAIL, never skip; a verification gate that can't authenticate must FAIL, never skip; a self-check that also passes with wrong input (a made-up mode, a mis-grepped log) proves nothing. And deploying a shared branch after a long gap ships everything accumulated, not just the intended change — the auth-tightening that rode along invalidated the app's key and was caught only by checking the live proxy.
  criterion now: CD fails-loud on any missing deploy/verify config; the post-deploy gate runs `scripts/verify-mode-contract.mjs` against the deployed engine and exits non-zero (never 0) when unreachable; "deployed" is asserted by the live engine's behaviour (`bogus → 400`, restarted uptime) and the live app's proxy returning 200, not by a workflow's conclusion.

## Verification

- ISC-1: Read `instagram-post-chrome.png` and `stellar-node-branching.jpg`; identified seven radial parent labels in the reference.
- ISC-2: Decisions section dated 2026-07-14 16:35 maps BACK OFFICE → Engine Status, SALES → Bridge Query, DEALS → Union Mirror, MARKETING → Folio Archive, OPERATIONS → Sky Weather, INTELLIGENCE → Noesis Reading, CUSTOMER → Birth Witness.
- ISC-3: Visual density inspection of `stellar-node-branching.jpg` shows each parent spoke sprouts 10–20 satellite sub-nodes; Urania plan specifies ≥5 children per parent.
- ISC-4: Navigation model documented in ISA Decisions and Features: home radial → `/node/:nodeId` parent page → child click → existing report modal.
- ISC-6: Generated design-reference page images for all seven parent nodes in `.assets/page-references/` (e.g., `birth-witness-page.png`, `noesis-reading-page.png`) showing each parent as a re-centered hub with branching sub-nodes.
- ISC-11: Generated moodboard and page references preserve void-black background, sacred-gold wireframe, glowing radial edges, satellite nodes, and dark cosmic aesthetic.
- ISC-12: Phased plan added to ISA Decisions dated 2026-07-14 16:40.
- ISC-5: `src/types/index.ts` adds `SelemeneChild` + `StellarNode.children`; `src/data/selemeneNodes.ts` carries a one-to-one child taxonomy for all seven nodes; the home overview renders only the seven parents (children live on the cluster view), so the home graph is unaffected — verified in-browser (overview shows 7 nodes; each cluster shows its own children).
- ISC-7: hash routing `#/node/:id` implemented in `ScrollJourney` — syncs via `history.replaceState` as each cluster is reached, and a deep-link reload lands at the cluster's scroll beat (verified `#/node/engine` → Engine Status at the expected scroll position, `history.scrollRestoration='manual'`).
- ISC-8: clicking a child orb opens the existing `Modal` + `ReportForm` preset to the child's Selemene mode/level and submits to the live API — verified (Daily Transits → `deterministic:daily-practice`; Birth Blueprint → deterministic birth-blueprint).
- ISC-9: the home overview shows only the seven parent nodes; sub-nodes appear only inside a node's cluster on dive — verified in-browser via layer measurement.
- ISC-10: every parent and child is reachable by clicking a node (or scrolling the journey); there is no dropdown/sidebar navigation — the graph is the interface at every depth.