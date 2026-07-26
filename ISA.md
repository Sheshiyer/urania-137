---
task: "Execute branded graph-first frontend realignment from completed engine atlas"
slug: 20260726-urania-living-readings-ecosystem
project: Urania 137
effort: advanced
effort_source: classifier
phase: plan
progress: 0/32
mode: interactive
started: 2026-07-14T16:00:00Z
updated: 2026-07-27T12:10:00+05:30
iteration: 10
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
- [x] ISC-14 (G1): Every child hits a real capability including `{kind:'daily'}` — `node scripts/verify/taxonomy.mjs https://urania-137.vercel.app` reports **35/35**, no regression. *(Verified 2026-07-19 against the pre-migration prod host; the live base is now the Pages deployment — `URANIA_API_BASE` env > argv > `https://urania-137.pages.dev`.)*
- [x] ISC-15 (G2): Today's live panchanga carries every key the interpreter reads (SCHEMA-1) — `node scripts/verify/daily-gates.mjs` (17 panchanga keys + 6 aspect keys present).
- [x] ISC-16 (G3): The lexicon covers the ground-truth enum domains with no gaps — `npm run test:daily` (7 vara / 30 tithi / 27 nakshatra / 27 yoga / 11 karana, all captured live).
- [x] ISC-17 (G4): `interpret()` is byte-stable over a frozen bundle (determinism snapshots) — the only variance is the input.
- [x] ISC-18 (G5): No imperative/predictive constructs in any authored string or assembled reading (non-prescriptive witnessing voice).
- [x] ISC-19 (G6): No birth data → complete base reading + closing invitation; birth data → the native overlay appends (graceful degradation).
- [x] ISC-20 (G7): The **running app** names today's actual live tithi/nakshatra and archives the reading to the Folio — **verified on Production** (2026-07-20, post-merge #90): Sky Weather ▸ Today rendered `Saptami (Shukla) / Hasta / Somavara (Monday)`, an exact match to an independent live engine call, as interpreted prose; the reading archived to `urania137.folio.v1` as `mode: 'daily-panchanga'`; no console errors.
- [x] ISC-21 (G8): ① `DeterministicInterpreter` and ③ `WitnessModeSource` produce the same `DailyReading` shape (seam-swap) — the ①→③ flip is proven shape-safe before the engine route exists.
- [x] ISC-22 (③ readiness): `WitnessModeSource` is a dormant, drop-in adapter of the seam; it stays uninvoked under the default flag (dormancy guard), and the flip is gated on `node scripts/verify/engine-requests.mjs` going green live — which today correctly reports the capability NOT-yet-landed (REQ-1 → 400, no false green). Engine execution is out-of-repo (Selemene), tracked in `docs/selemene-engine-requests.md`.

### CF Access auth & per-user identity (Phase 1, 2026-07-20) — behavioral ISCs tied to gates V2/V8
- [x] ISC-23 (V2 groundwork, local): `GET /api/me` returns the verified identity `{id,email}` and upserts **exactly one** `users` row — `created_at` stable across repeat calls, `last_seen_at` advanced; a request with no valid Access assertion (and no dev var) → **401**, never a redirect. Proven locally under `wrangler pages dev` + local D1 (T-026; evidence `docs/auth/2026-07-20-t026-local-identity-proof.md`). LIVE V2 across two real OTP accounts is Phase 5 (T-070) — not claimed here.
- [x] ISC-24 (V8): the Worker accepts a valid RS256 Access JWT and rejects wrong-aud, expired, tampered-signature, unsigned/`alg=none`, and unknown-`kid` (refetch-then-verify) tokens — the six enumerated mock-JWKS cases against `functions/lib/cf-access.ts` (T-021). Verified green 2026-07-20: `npx vitest run functions/__tests__` → **85/85 passed** across 8 files (incl. the two cf-access V8 suites); one-command `npm test` wiring + CI is T-028, consolidated run at the T-029 exit gate.
- [x] ISC-25 (identity stability): `user_id = identity.sub` when present and stable, else the lowercase-hex SHA-256 of the lowercased, trimmed email — deterministic across logins, casing, and whitespace (`extractIdentity`, T-018; frozen contract `docs/auth/contracts.md` §b). Dev-mode ids carry the intended `dev:<email>` shape, distinct from any real Access `sub`.
- [ ] ISC-26 (no dev-bypass in prod): `DEV_IDENTITY_EMAIL` injection fires only when the var is set AND no production marker exists (`CF_PAGES` / `ENVIRONMENT=production`) AND the host is loopback — one fail-closed conditional; only the binding var is read, never client headers (T-017). Fail-closed behavior is unit-covered (T-017/T-022); a dev-bypass sent to the deployed app yields no identity, proven live in Phase 5 (T-073).
- [x] ISC-27 (logout surface): `GET|POST /api/logout` responds 302 with `Location: /cdn-cgi/access/logout` and no token in the body — session teardown belongs to CF Access (T-020; asserted in the T-020 unit tests, exercised at the T-029 gate).

### Vercel delink & Pages hosting (Phase 4, 2026-07-21) — behavioral ISCs tied to gate V7
- [x] ISC-28 (host = Cloudflare Pages): the app hosts on **Cloudflare Pages** — the SPA as static assets from `dist/` plus the `/api/*` API surface as Pages Functions (`functions/api/[[path]].ts`: `/api/me`, `/api/logout`, `/api/selemene/*` engine proxy, `/api/folio/*` CRUD over the D1 `DB` binding), one `wrangler.toml` with `pages_build_output_dir = "dist"`; `wrangler pages dev` is the single local entrypoint (`npm run dev` = build + serve). No Vercel project, deploy path, or config remains (T-055/T-056/T-057).
- [x] ISC-29 (V7, static half): the repo carries **zero live Vercel references** — no `vercel.json`, no `api/proxy.ts`, no `.vercel/`, no `@vercel/*` dependency, no `/api/proxy` routing, no `vercel dev` instruction, and no `vercel.app` host string outside an explicit allowlist of historical records — `node scripts/verify/delink-check.mjs` exits 0, and a deliberately reintroduced token makes it exit non-zero (T-062).
- [x] ISC-30 (V7, deploy half): a Cloudflare Pages deployment serves the SPA **and** the `/api/*` Functions with migration `0001_init` applied to the remote D1 — verified live 2026-07-23/24 against `https://urania-137.pages.dev` and the custom domain `https://urania.tryambakam.space` (T-063 + Phase-5 live gates; remote D1 `users` row written/read via `/api/me` + `/api/folio` with a real OTP session).
- [ ] ISC-31 (tracked fast-follow): `birth_profiles` — per-user saved birth profiles — is **recorded, not omitted**: deliberately out of the readings slice, it lands as its own future ISC once V7/V1–V4 are live.

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

- 2026-07-20: **Cloudflare auth Phase 1 (Auth & Identity) shipped and proven locally — the app is now login-required at one trust boundary.** Every `/api/*` request passes the auth middleware in `functions/api/[[path]].ts` (T-019): the token is read from the `Cf-Access-Jwt-Assertion` header or `CF_Authorization` cookie and verified against the Access app JWKS — RS256 signature, `aud` contains `CF_ACCESS_AUD`, `exp` not past, `iss` == team domain; `alg=none`/unsigned is rejected before any key lookup (T-015, `functions/lib/cf-access.ts`, WebCrypto — zero deps). **Stable user_id derivation (frozen contract §b):** `user_id = claims.sub` when present (survives an email change), else the lowercase-hex SHA-256 of the lowercased, trimmed email — deterministic across logins and casing (T-018, `extractIdentity`). **Surface:** `GET /api/me` → verified claims → identity → single-row `users` upsert (T-016/T-020) → `{id,email}` (no token in the response body; CF Access owns the session cookie); `GET|POST /api/logout` → 302 to `/cdn-cgi/access/logout` (session teardown is Access's, not ours). **Prod-safe dev identity (frozen contract §c):** local `wrangler pages dev` injects a synthetic identity only when `DEV_IDENTITY_EMAIL` is set AND no production marker exists (`CF_PAGES`, `ENVIRONMENT=production`) AND the host is loopback — a single fail-closed conditional that cannot fire in Pages production (T-017). **Verified (T-026, evidence `docs/auth/2026-07-20-t026-local-identity-proof.md`):** unauthenticated `/api/me` → **401**; with the dev identity → **200** `{"id":"dev:dev@urania.local","email":"dev@urania.local"}` (the `dev:<email>` shape is intended — clearly synthetic); local D1 holds **exactly one** `users` row with `created_at` stable and `last_seen_at` advanced (+5.5s) on the repeat call. **Environment finding:** wrangler 4.112 synthesizes `CF_PAGES="1"` inside `pages dev`, which trips the guard's prod marker — local-only fix is `CF_PAGES=""` in `.dev.vars` (gitignored; prod unaffected, recorded in the evidence note for T-029/T-035). The V8 mock-JWKS suite and its one-command wiring are T-021/T-028; the consolidated Phase-1 exit gate is T-029. LIVE V1–V4 (real OTP, two accounts) remain Phase 5 — not claimed here.

- 2026-07-21: **Cloudflare auth Phase 4 (Vercel delink) shipped — host is now Cloudflare Pages, statically proven.** The Vercel surface is fully removed: `vercel.json`, `api/proxy.ts`, and `.vercel/` deleted (the proxy logic had already moved, parity-proven, into `functions/lib/engine-proxy.ts`); no `@vercel/*` dependency ever existed, so the lockfile is untouched (T-055). Every verify-script prod default (`daily-gates`/`engine-requests`/`mode-gates` bases, phase-2/V5 record targets, `verify:daily`/`verify:all`) moved from the old Vercel host to the future Pages host `https://urania-137.pages.dev` (T-055 amendment). The Vite dev server and its `/api/selemene` dev-proxy are retired — `vite.config.ts` is build-only and `npm run dev` = `npm run build && wrangler pages dev dist`, the single local entrypoint serving SPA + Functions + local D1 exactly as Pages does (T-056). Pages build settings (`npm run build` → `dist`, `functions/` auto-detected, Node 22) are recorded in `wrangler.toml` and proven locally: fresh `vite build`, `wrangler pages functions build` compiles the Functions, and a boot probe serves `/` (SPA HTML) and `/api/me` + `/api/folio` from the Functions (T-057). README + the engine-request ledger moved to the wrangler pages workflow (local dev, `.dev.vars` incl. the `CF_PAGES=""` guard note, deploy runbook with the remote steps marked pending-user) (T-060); ISA + product-map record host=Cloudflare Pages and the V7 ISC (T-061). The V7 static gate `scripts/verify/delink-check.mjs` greps the whole repo — including the literal `vercel.app` host string — with an explicit allowlist for historical records, and is negative-probe proven (T-062). **Remote remainder (pending the owner's Cloudflare account):** `wrangler login`, Pages project creation, preview+prod D1 provisioning + real `database_id` (T-080), remote migrations + first deploy (T-058), production secrets (T-059) — then the V7 deploy half (T-063) and the Phase 5 live gates. `birth_profiles` stays a tracked fast-follow (ISC-31).

- 2026-07-23/24: **Cloudflare auth Phase 5 LIVE — the app is login-gated in production on both hostnames, and the owner declared the build functional (V3 live waived).** T-081 was resolved by **reuse** — no new Access app: `urania-137.pages.dev` joined the existing `selemene` app (team `red-queen-4dfa`, 9d9d). The decisive catch: the live edge 302's `kid`/meta-`aud` revealed the covering app's real AUD is `df8a00b1…b6b4`, **not** the immersive API's `11a62a84…` from the sibling config — deploying the sibling value would have failed every real login with `wrong-aud`. T-066 cutover verified (302 → OTP on `/` and every `/api/*`); T-067 vars shipped in the production deploy (`--branch main`, the project's production branch), the secrets script staged for the deferred `SELEMENE_API_KEY` rotation (owner: "rotate later"). Custom domain `urania.tryambakam.space` attached and **active** — two infra lessons captured: a legacy Vercel CNAME (`d2f0dbd2…vercel-dns-017.com`) squatted on the subdomain post-delink, and Access can only intercept **proxied** traffic (the grey-cloud record bypassed the zone pipeline entirely; orange cloud restored the challenge). Live gates (`scripts/verify/auth-gates.mjs`): **16 PASS · 0 FAIL** unauthenticated on both hostnames (V1 edge-enforced ×8 shapes, SPA gated, 7 bypass variants dead); with a real OTP session: **18 PASS · 0 FAIL** — V2 identity-mapped (D1 `users.id` == JWT `sub`, `created_at` frozen, `last_seen_at` +117 s across calls) and V4 durable read (credential-only fresh client). Bonus evidence: the grey-cloud window proved the Worker's own 401 `{error,message}` envelope holds with **no** edge help (defense in depth, live). Harness lessons committed: the edge rejects an *inbound* `Cf-Access-Jwt-Assertion` header (cookie form required), and session tokens are hostname-bound. **V3 live check waived by the owner 2026-07-24** (a second OTP identity was the only input; the T-050 local isolation proof stands) — declared functional; advancing to 5C. All work published: `main` at `369771e`. Evidence: `docs/auth/evidence/2026-07-23-*`, `2026-07-24-v2-v4-session-a.json`.

- 2026-07-24: **Chat onboarding Phase 3 — readings render in the thread, and the modal era is retired.** The chat no longer closes at handoff: NodePage fires the SAME submit hooks the modal forms used (`useReportGenerator.generateReport` / `useDeterministicRun.run` / `useDailyReading.run`) and feeds their state back into ChatSheet as a `ThreadResult` prop, where the reading arrives as narrator chapters (`src/lib/chat/resultMessages.ts` pure mapping + `src/components/chat/ResultThread.tsx`): a luminous-witness composing beat while the engines run ("The witness takes the pattern…"), then ONE chapter per `{id,title,output}` pass (witness/daily — pass title as chapter heading, output as body) or a single chapter carrying the byte-identical fenced-json markdown the Folio archive stores (deterministic, via the now-exported `deterministicMarkdown`), then a closing beat naming the Folio archive as the reading's durable home. Result chapters are client-side presentation ONLY — never persisted as chat turns; the session is already `complete` via advance-on-consume, so reopening a doorway starts a fresh story and nothing is lost (the Folio row saved inside the hook is the durable copy). Errors are never silent: hook failures render an in-thread error block with the exact error text plus a retry that re-fires the same hook call with the same arguments; a witness Folio-save failure after a complete reading surfaces as `saveError` while the reading stays whole; dropped workflow engines keep their honesty warning. **Modal retirement:** the `VITE_CHAT_ONBOARDING` flag and all five run-related Modal instances are gone from NodePage — only the INFO modal remains (info children have no run); `WitnessForm`, `BirthDataForm`, `DailyReadingPanel`, `DeterministicResult`, and the panel-only `daily/` trio (DailyReadingBody, LocationDateHeader, LocationPicker) were deleted after a full-repo grep proved every one unreferenced (Collapsible/Modal stay — EngineStatusPanel and the info modal use them). Hook refactors were minimal and API→Folio internals are byte-equivalent: `useDailyReading` only lost its auto-run-on-mount (its only consumer was the deleted panel; NodePage now fires `run` explicitly at handoff — an auto-run at page level would have fetched + Folio-archived a reading on every page visit), and `useDeterministicRun` only gained the exported `deterministicMarkdown` helper (`toMarkdown` composes it unchanged). The handoff router's daily sink now carries the chat-resolved `DailyLocation` into the in-thread run instead of opening a panel. Docs moved to the narrative era: README (leaf description, mermaid flow, structure), `docs/chat-protocol.md` (new Result-delivery section), `docs/integrated-product-map.md` (dropped-engine + intention rows), and the form-driving browser e2e `spa-generate-e2e.mjs` is marked deprecated-UI (its fixture exports remain valid engine-contract fixtures). **Gates:** `tsc --noEmit` (SPA) + `tsc --noEmit -p tsconfig.functions.json` exit 0; `vitest run` **283/283 green** (15 new result-mapping tests — passes→chapters, error→retry state, saveError, dropped-engine warning — plus updated daily-sink routing tests); `npm run build` succeeds; `grep -ri "modal" src/pages/NodePage.tsx` matches only the info modal; no new dependencies.

- 2026-07-24: **Cloudflare auth Phase 5 SIGNED OFF (T-079) — all 8 gates green LIVE or owner-waived.** The rotated `SELEMENE_API_KEY` landed (the secrets-script invariant was fixed to match frozen contract §c — `.dev.vars` is the sanctioned local home of the dev identity), chat migrations `0002/0003` were applied to remote D1, and the engine proxy was verified live (`/api/v1/workflows` + `/api/v1/engines` → 200 with real data through the Access edge). T-074 ran the engine-dependent gates live with session-plumbed verify scripts: daily-gates + taxonomy + v5-compute + contracts PASS; mode-gates/engine-requests FAIL only on documented **engine-side** requests REQ-1/REQ-3 (not app defects). T-075 hardening: **no-change-required** verdict proven by 12 new negative tests (error-hygiene sweep asserts no key/stack/foreign-data in any envelope; JWKS cache bounded under rotation storms). T-076 SPA polish: useMe classifies every unauthenticated manifestation → full-navigation Access re-challenge (no spinner, no stale identity), logout is the real `/api/logout` navigation, Folio loading/empty/error states live-verified (5/5 Playwright evidence; the logout navigation was intercepted, never followed, preserving the session). Final sweep **18 PASS · 0 FAIL · 1 SKIP** (the waived V3); 305/305 tests; sign-off document `docs/auth/2026-07-24-t079-phase5-signoff.md`; `main` at `42970e5`. Residuals: the owner's manual browser walkthrough, an optional V3 re-run with a second identity, engine REQ-1/REQ-3 (Selemene-side), and `birth_profiles` (ISC-31). (T-077 dossier + T-078 ISA ISCs included herein.)

## Changelog

- 2026-07-24 | conjectured: Command Code is an OpenAI-compatible gateway at `https://api.commandcode.ai/v1`, so the llm-proxy could point the command-code provider at `/v1/chat/completions` with the preferred narrator model `claude-sonnet-5`.
  refuted by: live probes — `GET /v1/models` and `POST /v1/chat/completions` both 404 ("not a registered API route"); the CLI's own inference route `/alpha/generate` answers non-CLI requests with "This endpoint only serves CLI … violates the TOS and will result in account ban"; and the official Provider API (`/provider/v1/…`, discovered via Command Code docs) accepts the key but answers `claude-sonnet-5` with `PREMIUM_CREDITS_EXHAUSTED` (and that model demands the Anthropic Messages shape, not chat-completions).
  learned: vendor "OpenAI-compatible" claims must be probed route-by-route against the live gateway before wiring — the usable surface was the documented Provider API, not the assumed `/v1`. Model *existence* in a catalog is not model *availability* on the account: the default had to be chosen by test-completion, landing on `deepseek/deepseek-v4-pro` (prose + tool-calling verified live).
  criterion now: the llm-proxy provider chain is fixed by live smoke evidence — `POST /v1/chat/completions` to the deployed worker returns `"provider":"command-code"`; the gate 401s without `x-chat-key` and answers with it; the narrator E2E (solo + dyad sessions over `wrangler pages dev :8792`) shows `det=false` LLM-voiced replies on every turn, the prediction bait ("will I get the job?") refused with the slot re-asked, the romantic-default trap rejected with the explicit taxonomy, one question at a time, and intake unpolluted by invalid turns.

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
- ISC-28: `git ls-files` lists none of `vercel.json`, `api/proxy.ts`, `.vercel/`; `package.json` has no `@vercel/*` dependency or Vercel script; `npm run dev -- --help` invokes `wrangler pages dev`; a local boot of `wrangler pages dev dist` serves `/` (SPA HTML) and `/api/me` + `/api/folio` from the Functions (T-055/T-056/T-057 evidence, 2026-07-21).
- ISC-29: `node scripts/verify/delink-check.mjs` exits **0** on the delinked HEAD (2026-07-21) and exits **non-zero** when a Vercel token is deliberately reintroduced into a staged fixture — the negative probe proving the gate detects, captured in the T-062 commit evidence.
- ISC-30: **verified live 2026-07-23/24** — both hostnames serve the SPA + Functions; remote D1 proven by a real OTP session (`users` row id == JWT `sub`; folio create/read/delete round-trip). Evidence: `docs/auth/evidence/2026-07-23-*`, `2026-07-24-v2-v4-session-a.json`.
- ISC-31: **tracked, not started** — `birth_profiles` fast-follow; gets its own ISC + verification when scheduled.

## Iteration 2 — Living Readings Ecosystem (2026-07-26)

### Problem

Urania now has strong chat-first intake, verified Selemene execution, and durable
per-user Folio storage, but the saved-reading surface still exposes a flat content
record rather than the anatomy of a reading. The historical `723` corpus contains
roughly 1,579 mixed artifacts across solo, dyadic, run, and legacy contexts, yet
the current D1 row cannot preserve owner, subject, provenance, source systems,
witness passes, learned patterns, or companion media as distinct relationships.
Without a canonical document shared by chat and Folio, Urania risks becoming two
products: a conversational generator and an unrelated archive viewer.

### Vision

Urania is a living atlas of readings. Chat remains the primary threshold: it
learns who or what the reading concerns, assembles a request, and renders the
result as it arrives. The same canonical reading document then opens as an
explorable folio with a system stack, convergence map, evidence ledger, timing
spine, pattern constellation, and bridge question. Sacred geometry communicates
real structure—source, relation, sequence, confidence, or convergence—and every
visual mark can explain what it encodes.

The authenticated owner and the reading subject are separate identities. The
verified Cloudflare Access account `sheshnarayan.iyer@gmail.com` may own the
catalogue while every person, dyad, family system, and research run retains its
own subject identity and consent boundary. Historical material enters through a
catalogue-and-review pipeline, not a blind flattening import.

### Principles

- **One document, two views.** Chat thread and folio reader render the same model.
- **Witness, not seer.** Describe structure without prediction, diagnosis, or command.
- **Geometry carries evidence.** Decorative marks never masquerade as meaningful data.
- **Owner is not subject.** Authentication never collapses the people being read.
- **Engine facts stay primary.** Synthesis memory cannot override deterministic results.
- **Historical language stays attributable.** Legacy copy is evidence, not current voice.
- **Continuous learning is consented.** Only anonymized approved abstractions reach retrieval.
- **A reading remains legible without animation, color, or hidden interaction.**

### Scope

This iteration ships the canonical front-end reading document, shared visual
components, chat/Folio integration, vocabulary realignment, visual reference
assets, and an evidence-backed architecture and migration specification. It does
not bulk-import private `723` content, mutate the Selemene database, deploy a new
embedding model, or claim that the existing Vectorize library is already a
continuous production learning loop.

### Criteria

- [x] ISC-32: Chat and Folio render one canonical reading document.
- [x] ISC-33: Owner and subject identities remain structurally distinct.
- [x] ISC-34: Reading sections preserve source and witness provenance.
- [x] ISC-35: Every data graphic exposes its encoded relationship.
- [x] ISC-36: Folio entries render as readable structured documents.
- [x] ISC-37: Current public copy avoids prohibited wellness vocabulary.
- [x] ISC-38: Witness copy remains non-predictive and non-prescriptive.
- [x] ISC-39: Historical copy remains labeled rather than silently rewritten.
- [x] ISC-40: Retrieval patterns remain subordinate to deterministic chart facts.
- [x] ISC-41: Private birth data never enters vector metadata.
- [x] ISC-42: Corpus migration preserves subject and artifact relationships.
- [x] ISC-43: Legacy files are catalogued before any remote mutation.
- [x] ISC-44: Visual components work across narrow and wide viewports.
- [x] ISC-45: Reduced-motion users retain the complete reading structure.
- [x] ISC-46: Generated references follow the existing Urania visual language.
- [x] ISC-47: Build, type checks, and focused tests all pass.
- [x] ISC-A8: No decorative geometry implies unsupported analytical certainty.
- [x] ISC-A9: No bulk import flattens unrelated subjects into owner identity.
- [x] ISC-A10: No custom embedding capability is claimed without deployed evidence.

### Test Strategy

```yaml
- isc: ISC-32
  type: component-contract
  check: thread result and stored row adapt to ReadingDocument
  threshold: both adapters pass focused unit tests

- isc: ISC-33
  type: schema-inspection
  check: owner reference and subject references are separate fields
  threshold: no adapter derives subject identity from authenticated owner

- isc: ISC-35
  type: accessibility
  check: each visualization provides title, description, legend, or text alternative
  threshold: no semantic graphic is unlabeled

- isc: ISC-37
  type: vocabulary-gate
  check: reader-facing source strings are scanned for prohibited vocabulary
  threshold: zero unreviewed prohibited terms

- isc: ISC-42
  type: migration-design
  check: corpus map retains owner, subject, relationship, artifact, and provenance
  threshold: no canonical entity is represented only inside prose

- isc: ISC-47
  type: regression
  check: focused tests, TypeScript checks, and production build
  threshold: every command exits zero
```

### Decisions

- 2026-07-26: The fallback reading UI is not a separate product route. It is a
  second projection of the same `ReadingDocument` used by in-thread results.
- 2026-07-26: `723` is treated as a private historical corpus with mixed-quality
  language and artifacts. This iteration maps it but performs no remote import.
- 2026-07-26: Cloudflare Access ownership maps to the verified Urania identity;
  Selemene admin ownership remains unverified until its Postgres connection or
  authenticated admin surface is available.
- 2026-07-26: Vectorize currently uses Workers AI
  `@cf/baai/bge-small-en-v1.5`; custom embedding and continuous write-loop claims
  remain future-state until deployment evidence exists.
- 2026-07-26: Visual language keeps Void Black, Sacred Gold, Witness Violet,
  Flow Indigo, Coherence Emerald, and Parchment, but sacred geometry becomes
  semantic: nodes are entities, edges are relationships, rings are layers, and
  density is convergence.
- 2026-07-26: The Algorithm's deep thinking passes run inline because the active
  developer policy prohibits unsolicited subagents. Forge and Cato floors are
  therefore recorded as policy-skipped rather than falsely claimed.

### Verification Evidence

- ISC-32/34: `src/lib/readings/types.ts` is the canonical model;
  `threadResultToReadingDocument` and `folioEntryToReadingDocument` are the two
  source adapters; `ReadingFolio` renders both. Six adapter tests are green.
- ISC-33/A9: `ReadingDocument.owner` and `.subject` are distinct non-nullable
  objects. Browser evidence showed `Owned by dev@urania.local` beside
  `Reading subject: Subject not recorded · unknown`; cross-owner D1 routes
  remain protected by the existing adversarial Folio suites.
- ISC-35/A8: `ReadingAtlas` supplies SVG title, description, visible legend,
  and a flat-state description. Browser accessibility snapshot announced
  `One stored body · zero inferred sections`.
- ISC-36: The Folio no longer renders the archive body in a raw `<pre>`;
  Playwright opened a local-only saved row through the graph and rendered the
  full reading article, atlas, body, and evidence ledger.
- ISC-37/38: `vocabulary.test.ts`, existing prompt tests, and daily
  non-prescription tests are green; the authored lexicon scan returns zero
  prohibited-register hits.
- ISC-39/42/43: `docs/living-readings-ecosystem.md` defines origin treatment and
  the relationship-preserving schema. `catalog-corpus.mjs` catalogued 1,522
  files, 51 subject candidates, two relationship candidates, and 71 manifests
  with `catalogue-owner-only` mapping and no file-body reads or writes.
- ISC-40/41/A10: the architecture records the inspected BGE-small model,
  privacy scrub, deterministic precedence, missing retrieval filters, and
  unverified deployment loop; `architectureClaims.test.ts` prevents those
  current/future claims from drifting.
- ISC-44/45: Playwright verified 1440×1000 and 390×844 layouts. Reduced-motion
  emulation retained the flat structure and `zero inferred sections`; browser
  console contained zero errors or warnings.
- ISC-46: GPT Image 2 generated `component-atlas.png` and `reading-folio.png`
  through Codex OAuth using the project moodboard and page references.
- ISC-47: `npm test` → 40 files and 440 tests green; `npm run build` and
  `npm run typecheck:functions` exit zero; `git diff --check` exits zero.

### Iteration 2 Changelog

- 2026-07-26 | conjectured: one richer reading hierarchy could be reconstructed
  from both live thread chapters and every flat D1 Folio body.
  refuted by: independent Advisor review showed that manufacturing chapters from
  a flat body would make sacred geometry encode relationships the source never
  supplied.
  learned: visual integrity depends on loss-aware adapters. A less elaborate
  `flat` state is more truthful than a beautiful invented constellation.
  criterion now: every document declares `structureSource`; the flat adapter
  emits zero sections and the atlas states `zero inferred sections`.

- 2026-07-26 | conjectured: “Vectorize + embeddings” in the integrated engine
  implied a deployed custom embedding and continuous learning loop.
  refuted by: source inspection found BGE-small fixed in the store, example/plan
  wiring around worker bindings, and missing language/relationship filters in
  the active retrieval filter builder.
  learned: a library capability, deployment, and closed learning loop are three
  different states. Product copy must name only the evidenced state.
  criterion now: the architecture names BGE-small as current, custom embedding
  and continuous deployment as future, and a test guards the distinction.

- 2026-07-26 | conjectured: a structured frame around flat Markdown was enough
  to make the Folio a reading surface.
  refuted by: browser inspection showed the title and source boundary still
  exposed literal Markdown markers inside the otherwise refined folio.
  learned: fallback reading quality includes typography, not only provenance
  chrome. Presentation markup can be interpreted without inferring semantic
  reading structure.
  criterion now: `ReadingBody` safely renders headings, paragraphs, lists, and
  fenced engine output; three parser tests and a browser assertion verify it.

## Iteration 3 — Reading-Specific Visual Elements (2026-07-26)

### Problem

The canonical `ReadingDocument` now gives chat and Folio one honest reading
substrate, but deterministic engine output still collapses into a fenced JSON
body. The `723` corpus proves that the underlying readings already contain
distinct semantic shapes: the five panchanga limbs, number codes, planetary
positions, transit-to-natal aspects, Vimshottari periods, Human Design channels,
Gene Keys sequences, cyclic measurements, oracle spreads, witness passes,
questions, provenance manifests, and incomplete or mock-source notices.
Treating all of these as prose or arbitrary cards hides the real relationships
the engine computed.

### Vision

Each reading becomes a composed field of typed visual elements. The element
registry chooses a truthful renderer from explicit source structure: a limb band
for panchanga, a code grid for numerology, a positional field and relationship
ledger for transits, a period path for Vimshottari, a sequence for Gene Keys, and
accessible tables or notices when richer geometry would overclaim. The same
elements appear beneath chat results and when a deterministic Folio record is
reopened. The complete source payload remains inspectable, while unknown data
falls back without loss or invented interpretation.

### Principles

- **The graph remains the interface.** Elements reveal nodes, edges, sequence,
  layers, and cycles already present in the source.
- **Shape before decoration.** Renderer choice follows payload semantics rather
  than a desire to fill a dashboard.
- **Specific when known, lossless when unknown.** Known engines receive named
  adapters; unknown fields remain available in source evidence.
- **A calculation is not a command.** Visual components orient and witness; they
  do not prescribe behavior or predict outcomes.
- **Source status is visible.** Missing, mock, historical, and incomplete inputs
  never receive the visual authority of verified computation.
- **Flat is still flat.** Rehydrating explicit JSON elements does not manufacture
  witness chapters or archive structure.

### Scope

This iteration adds the typed element union, source extractors, shared element
registry, reading-specific components, deterministic chat integration, daily
source-payload integration, safe Folio JSON rehydration, tests, and a component
matrix. It does not change the D1 schema, bulk-import `723`, persist new private
metadata, deploy new engines, or generate interpretations beyond source output.

### Criteria

- [x] ISC-48: Representative `723` engine payload shapes are catalogued by keys and types.
- [x] ISC-49: `ReadingDocument` carries typed elements separately from prose sections.
- [x] ISC-50: Every typed element names its source system and evidence confidence.
- [x] ISC-51: The complete deterministic source payload remains inspectable.
- [x] ISC-52: Known engine extractors read an explicit allowlist of source fields.
- [x] ISC-53: Unknown engine payloads receive a lossless, visibly generic fallback.
- [x] ISC-54: Panchanga renders its five limbs without inventing transition times.
- [x] ISC-55: Numerology renders named codes, values, reductions, and meanings.
- [x] ISC-56: Planetary positions render planet, sign, degree, and retrograde state.
- [x] ISC-57: Transit aspects expose both endpoints, aspect, orb, nature, and motion.
- [x] ISC-58: Vimshottari periods and explicit transitions render as sequence.
- [x] ISC-59: Gene Keys activation positions render as a named four-step sequence.
- [x] ISC-60: Human Design facts, centers, and channels remain separate structures.
- [x] ISC-61: Cyclic measurements expose labels, values, units, and target date.
- [x] ISC-62: Tarot and I Ching outputs render ordered source-supplied positions.
- [x] ISC-63: Enneagram and reflection prompts render as questions, not conclusions.
- [x] ISC-64: Mock, missing, incomplete, or unavailable outputs render an explicit notice.
- [x] ISC-65: The element renderer is exhaustive over the discriminated union.
- [x] ISC-66: Panchanga payloads map through a focused named extractor.
- [x] ISC-67: Numerology payloads map through a focused named extractor.
- [x] ISC-68: Transit payloads map through a focused named extractor.
- [x] ISC-69: Vimshottari payloads map through a focused named extractor.
- [x] ISC-70: Human Design and Gene Keys map through focused named extractors.
- [x] ISC-71: Other observed engines map through semantic generic primitives.
- [x] ISC-72: Deterministic chat results carry typed elements beside their source body.
- [x] ISC-73: Daily deterministic readings carry panchanga and transit source payloads.
- [x] ISC-74: Stored deterministic Folio JSON safely rehydrates the same elements.
- [x] ISC-75: Rehydrated Folio records remain `structureSource: flat`.
- [x] ISC-76: Witness and historical prose behavior remains unchanged.
- [x] ISC-77: Every element uses semantic headings, lists, tables, or figures.
- [x] ISC-78: Every non-tabular visual explains its encoding in visible copy.
- [x] ISC-79: Status never depends on color alone.
- [x] ISC-80: The element field reflows at narrow and wide viewports.
- [x] ISC-81: The complete reading remains usable with reduced motion.
- [x] ISC-82: Raw source evidence is disclosed progressively rather than hidden.
- [x] ISC-83: Source Markdown and JSON cannot inject arbitrary HTML.
- [x] ISC-84: Focused tests cover every element kind and known extractor family.
- [x] ISC-85: Full tests, type checks, build, and diff hygiene pass.
- [x] ISC-86: A reading-to-element component matrix documents present coverage.
- [x] ISC-87: Anti: no component authors predictive or prescriptive copy.
- [x] ISC-88: Anti: mock or incomplete data never appears as verified computation.
- [x] ISC-89: Anti: visual extraction never collapses owner and subject identity.
- [x] ISC-90: Anti: this pass makes no API, D1, or remote production mutation.

### Test Strategy

```yaml
- isc: ISC-49
  type: type-contract
  check: canonical documents expose a discriminated ReadingElement array
  threshold: adapters always return an array and registry is exhaustive

- isc: ISC-54
  type: fixture-extraction
  check: frozen panchanga fixture becomes exactly five named limbs
  threshold: no inferred timestamp or unlisted limb

- isc: ISC-57
  type: fixture-extraction
  check: frozen transit aspects preserve endpoints, orb, nature, and applying state
  threshold: every mapped relation is lossless for its allowlisted fields

- isc: ISC-74
  type: roundtrip
  check: deterministic Markdown saved through the frozen Folio contract rehydrates elements
  threshold: document stays flat and source JSON remains byte-inspectable

- isc: ISC-85
  type: regression
  check: focused tests, full tests, TypeScript checks, build, and diff check
  threshold: every command exits zero
```

### Decisions

- 2026-07-26: The first visual grammar is derived from 51 archived L0 engine
  bundles plus frozen live-contract fixtures. It is not derived from labels in
  the design references.
- 2026-07-26: Components are semantic primitives with engine-specific adapters.
  This avoids one bespoke component per engine while retaining a truthful
  panchanga, transit, timeline, channel, sequence, cycle, oracle, and question
  vocabulary.
- 2026-07-26: Existing deterministic Folio rows can regain typed elements from
  their explicit fenced JSON source. This is source parsing, not section
  inference; archive structure remains flat.
- 2026-07-26: Historical biofield and face-reading payloads may contain
  `is_mock_data` or notices. Those states receive an unresolved notice and do
  not acquire computed styling.
- 2026-07-26: `codex-gpt-image` remains deferred until the implemented element
  grammar is verified. Generated reference art must describe real components,
  not decide their semantics.

### Iteration 3 Verification Evidence

- ISC-48/52/66–71/86: inspected 51 archived L0 `engines.json` bundles by key
  and value type, then documented the observed source-to-element matrix in
  `docs/reading-element-library.md`. Fifteen named engine families map through
  allowlisted extractors; unknown shapes preserve a raw source fallback.
- ISC-49–65/77–79/82/87–89: the canonical document carries an eleven-kind
  discriminated `ReadingElement` union. Each element records source system,
  source path, evidence kind, and confidence; the exhaustive React registry
  renders semantic definitions, tables, lists, sequences, relations, cycles,
  spreads, questions, notices, or a progressive raw disclosure.
- ISC-72–76/83: deterministic chat, daily reading, and strict single-fence
  Folio rehydration share the same extraction path. The frozen Folio adapter
  remains `structureSource: flat`; witness prose is unchanged; React escaping
  and strict JSON-fence parsing prevent arbitrary HTML injection.
- ISC-80/81: Playwright checked the real production build at 1440px and
  390×844. Cards measured 422px and 292px respectively, document scroll width
  equalled viewport width, exact source disclosure opened, console errors and
  warnings were zero, and reduced-motion emulation left no running animation
  inside any reading element.
- ISC-84/85: `npm test` passed 43 files and 467 tests; `npm run build`,
  `npm run typecheck:functions`, and `git diff --check` all exited zero. The
  inherited missing `astro/tsconfigs/strict` warning remains non-failing and
  outside this package's changes.
- ISC-90: browser QA used one synthetic local Wrangler Folio row only. The row
  was deleted successfully after verification; no remote API, D1, deployment,
  or production data was changed.
- Independent Advisor was invoked after the durable deliverable, but its third
  response was not parseable JSON. It is recorded as unavailable, not counted
  as verification evidence.

### Iteration 3 Changelog

- 2026-07-26 | conjectured: each observed reading engine needed a bespoke visual
  component.
  refuted by: the 51-bundle inventory repeatedly exposed the same semantic
  shapes across systems: facts, positions, relations, sequences, cycles,
  spreads, collections, questions, and notices.
  learned: a small typed visual grammar preserves engine identity while keeping
  the component library coherent.
  criterion now: engine-specific adapters target an exhaustive eleven-kind
  semantic union, with raw preservation for every unknown shape.

- 2026-07-26 | conjectured: viewport breakpoints were sufficient for responsive
  element cards.
  refuted by: browser inspection inside the narrow Folio modal showed desktop
  viewport breakpoints compressing two cards into roughly 203px columns.
  learned: modal components must respond to their containing field, not only the
  browser viewport.
  criterion now: outer and inner grids use container-width-aware `auto-fit`
  tracks, proven at both desktop and 390px mobile widths.

## Iteration 4 — Grounded Non-Report Interpretation Agents (2026-07-26)

### Problem

Urania currently presents one surface as “chat,” but that surface is an
onboarding state machine with an optional narrator voice. It collects validated
intake and hands work to deterministic engines, workflows, witness assets, or
the daily seam. It does not interpret a completed reading or sustain a
post-reading conversation. Selemene exposes one distinct non-report
interpretation route, `POST /api/v1/witness/interpret`, whose Aletheios and
Pichet passes require live biofield scores and are therefore not a general
follow-up endpoint. The raw OpenAI-compatible LLM proxy is provider transport,
not a product interpretation contract. Without explicit scaffolding, these
three responsibilities can collapse into one ungrounded generalist prompt that
sounds authoritative, loses source lineage, and quietly diverges from the
deterministic reports.

### Vision

A completed or archived reading can open a conversational interpretation seam
without becoming a new report. The caller chooses a named interpretive posture;
the server loads only the authenticated owner's reading; a route registry
selects one narrow agent; and every returned claim names its evidence pointer
and epistemic status. Aletheios reflects source-visible patterns, Pichet offers
embodied inquiry, Synthesis connects already-grounded observations, and
Navigator returns typed graph destinations. The existing narrator remains the
voice of onboarding and never impersonates these agents. When the model or
source is unavailable, the response says so directly and invents nothing.

### Out of Scope

- No Cloudflare Agents SDK or Durable Object migration in this iteration.
- No replacement of D1 chat sessions, SSE replay, or the intake state machine.
- No new deterministic engine, witness calculation, or report renderer.
- No Vectorize retrieval, custom embedding deployment, or continuous-learning claim.
- No automatic memory extraction from prose or cross-reading personalization.
- No remote deployment, production data mutation, or account remapping.
- No use of the live witness endpoint without its required live biofield scores.

### Constraints

- Authentication and ownership remain the sole trust boundary for reading access.
- Existing Pages Functions, D1 persistence, and LLM-proxy bindings remain in place.
- Reading evidence is untrusted model input and can never alter routing or policy.
- Agent routing is explicit; an unknown posture has no implicit default.
- Deterministic reports and witness assets remain byte- and route-independent.
- Model output is parsed into a bounded response contract before reaching clients.
- Framework ports remain replaceable if Durable Objects become justified later.

### Goal

Ship and document a framework-neutral agent layer for owned-reading follow-up:
an explicit agent registry, grounded interpretation envelope, narrow model port,
honest fallback behavior, authenticated non-report endpoint, and contract tests
that explain what Urania and Selemene currently do without overstating memory,
retrieval, learning, or agent autonomy.

### Criteria

- [x] ISC-91: The current onboarding narrator, witness interpreter, and raw LLM proxy are documented as three distinct responsibilities.
- [x] ISC-92: The live Selemene witness interpretation route and its required live-score fields are documented.
- [x] ISC-93: The absence of a general post-reading interpretation endpoint before this iteration is stated explicitly.
- [x] ISC-94: A typed registry defines every supported non-report interpretation route.
- [x] ISC-95: Every registry entry names its intent, agent, allowed evidence, and response posture.
- [x] ISC-96: Unknown or omitted routes fail validation without selecting a default agent.
- [x] ISC-97: Pairwise-distinct routes resolve to pairwise-distinct agent identifiers.
- [x] ISC-98: The onboarding narrator is catalogued but cannot be selected by the interpretation endpoint.
- [x] ISC-99: Aletheios reflects patterns and cannot originate deterministic facts.
- [x] ISC-100: Pichet frames embodied inquiry as provisional observation, not instruction.
- [x] ISC-101: Synthesis combines grounded claims and cannot introduce unsupported evidence.
- [x] ISC-102: Navigator returns typed node destinations rather than prose-only links.
- [x] ISC-103: Each interpretation request names exactly one authenticated owned reading.
- [x] ISC-104: Cross-owner and unknown reading identifiers remain indistinguishable.
- [x] ISC-105: User questions and optional conversation history are length- and count-bounded.
- [x] ISC-106: Reading content is projected into stable evidence excerpts with source pointers.
- [x] ISC-107: Every source-grounded response claim cites at least one supplied evidence identifier.
- [x] ISC-108: Interpretive synthesis claims are labeled separately from source-grounded claims.
- [x] ISC-109: Model responses with unknown evidence identifiers are rejected or degraded.
- [x] ISC-110: Empty, malformed, timed-out, and failed model responses become explicit unavailable responses.
- [x] ISC-111: Degraded responses contain no engine, retrieval, or deterministic factual claims.
- [x] ISC-112: Prompt-like text inside reading evidence cannot modify agent, route, tools, or provenance.
- [x] ISC-113: The LLM proxy is accessed only through a replaceable model port.
- [x] ISC-114: The model adapter sends the configured chat secret only when present.
- [x] ISC-115: The endpoint response exposes agent, route, provenance, degradation, claims, question, and targets.
- [x] ISC-116: The response's first sentence reflects the caller's present concern when the model succeeds.
- [x] ISC-117: Follow-up history can preserve conversational continuity without persisting speculative memory.
- [x] ISC-118: The default chat response never dumps the entire reading or raw engine payload.
- [x] ISC-119: Report generation, report persistence, and result rendering routes remain untouched by interpretation.
- [x] ISC-120: No Vectorize, custom-embedding, or continuous-learning capability is represented as live.
- [x] ISC-121: No Cloudflare Agents SDK package, Durable Object binding, or migration is added.
- [x] ISC-122: Contract tests cover route resolution, evidence validation, degradation, and prompt-injection-shaped evidence.
- [x] ISC-123: Route tests cover authentication, ownership, malformed bodies, and successful interpretation.
- [x] ISC-124: Full tests, Functions typecheck, application build, and diff hygiene pass.
- [x] ISC-125: Architecture documentation gives a staged path from this scaffold to durable multi-agent conversation.

### Test Strategy

```yaml
- isc: ISC-94
  type: registry-contract
  check: every public interpretation route resolves to one frozen agent definition
  threshold: no duplicate agent id and no implicit fallback

- isc: ISC-107
  type: grounded-response
  check: parsed model claims reference only evidence ids projected by the server
  threshold: every grounded claim has at least one known pointer

- isc: ISC-110
  type: failure-matrix
  check: timeout, non-2xx, invalid JSON, empty answer, and invalid citations
  threshold: explicit degraded response with zero claims

- isc: ISC-104
  type: ownership-adversarial
  check: own, unknown, and cross-owner reading ids through the route
  threshold: own succeeds; unknown and cross-owner return identical 404 envelopes

- isc: ISC-119
  type: regression
  check: existing report, witness asset, Folio, and onboarding chat suites
  threshold: no changed snapshots, routes, or persisted report payloads

- isc: ISC-124
  type: repository-gate
  check: focused tests, full tests, Functions typecheck, build, diff check
  threshold: every command exits zero
```

### Features

- A closed agent catalogue that makes existing and new responsibilities visible.
- A server-owned reading evidence projector with stable, inspectable pointers.
- A route policy that separates pattern, embodied, synthesis, and navigation answers.
- A narrow model adapter over the already-configured Selemene LLM proxy.
- A bounded interpretation response suitable for later chat and reading UI integration.
- An explicit degraded state that preserves trust when interpretation is unavailable.

### Decisions

- 2026-07-26: Keep the interpretation kernel framework-neutral. The current
  Cloudflare Agents SDK would add a second Durable Object state architecture
  before durable post-reading behavior is proven.
- 2026-07-26: Interpret only an authenticated owner's stored reading in this
  slice. The browser may name the reading but cannot provide trusted evidence.
- 2026-07-26: Keep follow-up history bounded and ephemeral. Persisted
  interpretation sessions require their own consent and lifecycle contract.
- 2026-07-26: Return model failure as HTTP 200 plus a typed degraded response.
  This lets the reading UI preserve a coherent fallback without pretending the
  interpretation succeeded.
- 2026-07-26: Defer visible chat controls to the next reading-UI slice. The
  current deliverable is the callable, tested backend contract those controls
  will consume.

### Verification

- ISC-91–93/120/121/125:
  `docs/chat-interpretation-architecture.md` records the live endpoint
  inventory, Witness Dyad input boundary, absence of a previous general
  interpreter, current/future capability distinction, official Cloudflare
  migration requirements, concept map, and five-stage evolution path.
- ISC-94–102:
  `functions/lib/agents/registry.ts` defines four routes and four pairwise
  distinct agents. The existing Narrator and Witness Dyad are catalogued as
  non-selectable. The registry test proves unknown and `general` routes resolve
  to no agent.
- ISC-103–118:
  the route loads `getReadingById(DB, userId, readingId)` before interpretation;
  the request validator bounds route, concern, and history; the evidence
  projector emits stable source paths; the prompt treats all evidence as
  untrusted; and the parser accepts only bounded claims and typed targets that
  cite known evidence ids.
- ISC-104/123:
  route tests prove missing auth returns 401, malformed route returns 400, own
  reading succeeds, and cross-owner/unknown ids return byte-equivalent 404
  envelopes.
- ISC-109–114/122:
  kernel tests cover unknown citations, non-JSON content, empty/unavailable and
  unconfigured models, prompt-injection-shaped reading content, and conditional
  `x-chat-key` forwarding. Every degraded case has zero claims.
- ISC-119/124:
  `npm test` passed 45 files and 483 tests, including all existing onboarding,
  SSE replay, Folio, Selemene proxy, daily, witness, and result suites.
  `npm run typecheck:functions`, `npm run build`, and `git diff --check` exited
  zero. The inherited non-failing missing `astro/tsconfigs/strict` warning is
  unchanged.
- The Algorithm Advisor returned no parseable payload. Forge and Anvil halted
  at missing external prerequisites (`codex` executable; Moonshot credential
  and progress tool) and changed no files. None is counted as verification.

### Changelog

- 2026-07-26 | conjectured: Selemene's Witness Dyad could serve every
  post-reading question.
  refuted by: its live request contract requires a six-field biofield score
  envelope and runs its own engine context assembly.
  learned: a witness calculation and an archive interpretation have different
  prerequisites and provenance.
  criterion now: the existing Dyad remains catalogued but non-selectable; the
  new endpoint starts only from an owned stored reading.

- 2026-07-26 | conjectured: “agent scaffolding” implied immediate adoption of
  Cloudflare's Agents SDK.
  refuted by: the application already persists onboarding sessions and replay
  events in D1, while the SDK requires a Durable Object binding, SQLite-class
  migration, package, compatibility flag, and its own state authority.
  learned: agent identity and evidence policy are domain concerns; durable
  runtime state is an adapter chosen when a real synchronization need appears.
  criterion now: the kernel depends on a model port and makes no SDK migration.

- 2026-07-26 | conjectured: one capable generalist prompt would be the simplest
  conversational layer.
  refuted by: failure and experiential passes showed that generic routing erases
  epistemic posture, source lineage, navigation contracts, and honest failure.
  learned: a small closed registry is simpler to verify than one unconstrained
  persona.
  criterion now: four explicit routes resolve to four agents, and an unknown
  route has no default.

## Iteration 5 — Living Archive, Admin Authority, and Consented Synastry (2026-07-26)

### Problem

The production systems contain many generated Selemene readings, one
owner-scoped Urania Folio record, and a 1.21 GB historical corpus, but the
corpus has not been imported with verifiable source provenance. The current D1
Folio row cannot preserve many-to-many subjects, relationship context, source
runs, companion artifacts, editorial state, or deletion lineage. The Selemene
admin browser exists, but the named owner's local database role is `viewer`;
Cloudflare Access claims replace that role on login, so a direct database patch
would not be durable. Urania supports same-owner subject dyads, but it has no
consent model for pairing two authenticated accounts.

### Vision

Historical readings enter a living archive through a deterministic manifest,
reviewed identity mappings, a reversible one-reading pilot, and then restartable
approved batches. Admin access is granted at the Cloudflare group boundary and
every admin detail view explains its provenance and visibility. Two account
owners can invite, accept, generate, browse, and revoke a synastry relationship
without giving administrators or either participant silent access to the
other's profile. Chat remains the threshold; the visual reading remains the
durable fallback.

### Out of Scope

- No blind bulk import of all 1,522 corpus files.
- No binary corpus bodies stored directly in D1 or Postgres.
- No automatic merge of directory aliases into one person.
- No Postgres-only role patch represented as durable Cloudflare admin access.
- No admin override of participant consent for synastry generation.
- No Vectorize write, custom embedding training, or continuous-learning claim.
- No rewrite of historical reading copy during provenance ingestion.

### Constraints

- Owner, subject, producer, and source remain separate relations.
- Urania D1 remains owner-scoped conversational state and Folio storage.
- Selemene Postgres remains the canonical shared reading and admin archive.
- Object bytes require content-addressed object storage plus checksums.
- Cloudflare Access groups are the human-admin source of truth.
- Cross-account relationship generation requires two active consents.
- Existing same-owner `subjects[]` relationship modes remain compatible.
- Every import mutation is idempotent, auditable, and reversible.

### Goal

Land the first implementation batch for a provenance-safe living archive and
consented relationship layer: a deterministic corpus manifest, canonical
archive schema, and cross-account consent contract. Preserve clear blockers for
Cloudflare admin policy mutation and full production import until their explicit
preflight and pilot gates pass.

### Criteria

- [x] ISC-126: The corpus manifest has an explicit versioned schema.
- [x] ISC-127: Every file record carries a SHA-256 content checksum.
- [x] ISC-128: Every source identifier is stable across repeated runs.
- [x] ISC-129: Manifest ordering and identifier output are deterministic.
- [x] ISC-130: Symbolic links cannot escape or enter the manifest.
- [x] ISC-131: Catalogue-only mode never reads source file bodies.
- [x] ISC-132: Manifest ownership never implies reading subject identity.
- [x] ISC-133: Subject directory names remain provisional candidates.
- [x] ISC-134: Synastry directories remain explicit relationship candidates.
- [x] ISC-135: Manifest generation cannot mutate remote storage or databases.
- [x] ISC-136: Selemene has a canonical living-readings archive migration.
- [x] ISC-137: Stable source IDs and locators prevent duplicate import rows.
- [x] ISC-138: Import runs have stable idempotency keys and terminal states.
- [x] ISC-139: Archived readings can reference multiple subjects with roles.
- [x] ISC-140: Artifact records store checksums and object locators, not bytes.
- [x] ISC-141: Evidence and readings expose explicit editorial states.
- [x] ISC-142: Subject aliases cannot merge automatically during import.
- [ ] ISC-143: Archive deletion preserves auditable run and source boundaries.
- [ ] ISC-144: Archive records are queryable through permissioned admin boundaries.
- [ ] ISC-145: `selemene-admin` remains the durable `platform-admin` mapping.
- [ ] ISC-146: Access-login role replacement is documented and regression-tested.
- [x] ISC-147: Relationship invitations expose opaque tokens and store hashes.
- [x] ISC-148: Only the intended authenticated recipient can accept an invite.
- [x] ISC-149: Each relationship participant supplies one personally owned subject.
- [x] ISC-150: Pending, active, declined, revoked, and expired states are enforced.
- [x] ISC-151: Cross-account generation requires two currently active consents.
- [x] ISC-152: Either participant can revoke future synastry generation.
- [x] ISC-153: Existing same-owner Composite Dyad behavior remains unchanged.
- [ ] ISC-154: Administrative permissions cannot bypass relationship consent.
- [x] ISC-155: Full corpus import remains blocked before pilot verification.
- [x] ISC-156: Focused and full repository verification gates pass.
- [x] ISC-157: Documentation distinguishes current, landed, blocked, and future states.

### Test Strategy

```yaml
- isc: ISC-126
  type: fixture-manifest
  check: run the manifest builder twice over a frozen mixed-format fixture
  threshold: byte-identical semantic output and matching manifest id

- isc: ISC-131
  type: negative-io
  check: catalogue-only fixture contains an unreadable regular file
  threshold: structural catalogue succeeds without opening its body

- isc: ISC-136
  type: migration
  check: apply and roll back the living-readings migration locally
  threshold: every table, key, constraint, and index is present then removable

- isc: ISC-138
  type: roundtrip
  check: insert the same manifest and import-run key twice
  threshold: the second run creates no duplicate source or reading relation

- isc: ISC-148
  type: authorization
  check: intended recipient, wrong recipient, inviter, and unauthenticated acceptance
  threshold: only the intended recipient can bind an owned subject

- isc: ISC-151
  type: state-machine
  check: generation gate across every consent-state pair
  threshold: only active plus active is allowed

- isc: ISC-153
  type: regression
  check: existing subject and relationship chat suites
  threshold: no request, snapshot, or ownership behavior changes

- isc: ISC-156
  type: repository-gate
  check: focused tests, full tests, typecheck, build, and diff hygiene
  threshold: every required command exits zero
```

### Features

- `CorpusManifest`: deterministic local source inventory and checksum contract;
  satisfies ISC-126–135; parallelizable.
- `LivingArchiveSchema`: provenance, subject, relationship, artifact, evidence,
  and import-run entities in Selemene; satisfies ISC-136–144; parallelizable.
- `CloudflareAdminAuthority`: durable Access group mapping and verification;
  satisfies ISC-145–146; depends on an Access-write credential.
- `RelationshipConsent`: invite, accept, decline, revoke, expire, and authorize;
  satisfies ISC-147–154; parallelizable with archive work.
- `PilotImport`: one approved reading plus artifacts, round-trip and deletion;
  satisfies ISC-137–143 and ISC-155; depends on archive schema and review.
- `AdminReadingExperience`: provenance-aware admin browsing and filters;
  satisfies ISC-144–146 and ISC-157; depends on archive API and admin mapping.
- `ConsentedSynastryExperience`: two-account settings and generation flow;
  satisfies ISC-148–154; depends on RelationshipConsent.
- `RegressionAndTruthGate`: repository checks and capability-state documentation;
  satisfies ISC-153, ISC-155–157; depends on all landed slices.

### Decisions

- 2026-07-26 22:30: refined: the existing `plan.md` is a completed
  Cloudflare/Folio migration plan and explicitly excludes this backend work.
  Execution now follows
  `docs/superpowers/plans/2026-07-26-living-readings-admin-synastry.md`.
- 2026-07-26 22:30: canonical shared archive metadata belongs in Selemene
  Postgres so its protected admin surface can query it. Urania D1 remains the
  owner-scoped chat, subject, and Folio store.
- 2026-07-26 22:30: corpus bytes remain content-addressed artifacts in object
  storage; relational stores carry checksums, locators, subjects, evidence, and
  editorial state.
- 2026-07-26 22:30: Cloudflare `selemene-admin` membership, not a local
  Postgres role patch, is the durable admin-access intervention because Access
  login replaces `user_roles`.
- 2026-07-26 22:30: cross-account synastry is a peer-consent product flow, not
  an administrator pairing tool. Platform-admin access cannot substitute for
  participant consent.

### Risks

- An ambiguous alias can merge two people and leak private readings.
- A full import can make historical placeholders appear current or verified.
- An artifact upload without checksum and deletion lineage can orphan private data.
- A direct local role update can disappear on the next Cloudflare login.
- An invitation token leak can bind the wrong account without recipient matching.
- Cross-system identity drift can confuse a CF subject with a Selemene UUID.
- A new relationship route can accidentally weaken existing owner-scoped subject checks.
- Treating Vectorize as archive storage can make deletion and provenance unverifiable.

### Verification

- ISC-126–135: fixture and full-corpus probes —
  `node --test scripts/readings/corpus-manifest.test.mjs` returned
  `tests 6`, `pass 6`, `fail 0`; catalogue-only traversal returned
  `files: 1522`, `directories: 550`, `bytes: 1210480462`, and stable
  `manifest_7d3414cf0a774f9560e0d680054dc8324362a455d20d9bc36192642c5fddd3f8`.
- ISC-136–142: PostgreSQL schema contract —
  `cargo test -p noesis-data --test living_readings_schema` returned
  `3 passed; 0 failed`. The live PostgreSQL 16 probe applied migration 036,
  inserted two-subject relationship provenance, permitted duplicate hashes at
  distinct locators, rejected cross-owner alias provenance, round-tripped the
  reading/artifact/evidence/editorial graph, and applied the dependency-ordered
  rollback.
- ISC-147–152: authorization and transition matrix —
  `npx vitest run functions/__tests__/relationships.test.ts` returned
  `1 passed` file and `9 passed` tests. The suite proves hash-only one-time
  tokens, intended-email matching, subject ownership, accept-once behavior,
  decline, expiry, participant revocation, and active-plus-active generation.
- ISC-153: full Urania regression —
  `npm test` returned `46 passed` files and `492 passed` tests, including the
  existing same-owner dyad and relationship-context suites.
- ISC-155: production read-only boundary probe —
  Selemene Postgres returned `corpus_723_markers|0` and
  `archive_table|absent` inside `BEGIN READ ONLY ... ROLLBACK`; no corpus or
  archive schema was written remotely.
- ISC-156: repository gates —
  `npm run typecheck:functions`, `npm run build`,
  `cargo fmt --check -p noesis-data`, focused Cargo tests, tracked and
  untracked whitespace checks, and both repository diff checks exited zero.
- ISC-157: capability-state documentation —
  `docs/superpowers/plans/2026-07-26-living-readings-admin-synastry.md`
  separates landed foundations, product-surface work, credential-gated admin
  policy, one-reading pilot, reviewed rollout, and stop conditions.
- Open gates: ISC-143/144 require the pilot importer and permissioned admin
  query surface; ISC-145/146 require a Cloudflare Access-write credential and
  fresh login; ISC-154 requires the authenticated route layer to prove no admin
  bypass at the HTTP boundary.

### Changelog

- 2026-07-26 | conjectured: globally unique content checksums would provide
  archive-import idempotence.
  refuted by: the corpus contains legitimate repeated files at distinct source
  locators.
  learned: stable record identifiers and locators enforce idempotence while
  checksums remain integrity evidence and lookup indexes.
  criterion now: ISC-137 permits repeated hashes when provenance locators
  differ.
- 2026-07-26 | conjectured: assigning the production Postgres account an admin
  role would complete durable administrator access.
  refuted by: Cloudflare login replaces local roles from Access-group claims,
  and the available OAuth token cannot write Access groups or policies.
  learned: `selemene-admin` membership is the authority of record and must be
  followed by a fresh Access login.
  criterion now: ISC-145 and ISC-146 remain open until policy mutation and
  replacement are verified.
- 2026-07-26 | conjectured: finishing corpus ingestion meant importing all 723
  content immediately.
  refuted by: unresolved subject aliases, editorial classifications, and
  deletion propagation make an unreviewed bulk import unsafe.
  learned: catalogue-only discovery must precede a one-reading round-trip and
  deletion pilot, then a reviewed rollout.
  criterion now: ISC-143 and ISC-155 retain the pilot boundary before any
  production corpus write.

### Learn Decisions

- 2026-07-26 21:48: the external Temperance audit rail produced task plans but
  no `index.json` or `SUMMARY.md` within the verification window. The rail
  failed open: implementation proceeded through isolated Codex workers and was
  independently verified by the primary agent.
- 2026-07-26 21:48: Batch 1 is a checkpoint, not project completion. The
  continuation plan remains active for the permissioned query/API surface,
  Cloudflare policy activation, pilot import, admin reading UI, and
  authenticated synastry routes.

## Iteration 6 — Complete Living Readings Product and Pilots (2026-07-26)

### Problem

The archive schema, deterministic manifest, and consent domain exist, but they
are not yet connected to protected HTTP boundaries or product surfaces.
Selemene cannot browse living-archive provenance through its admin API, Urania
cannot manage cross-account relationships through Settings, and no reversible
reading or two-account pilot proves the system end to end. The current
Cloudflare OAuth token also lacks Access-policy write authority.

### Vision

Chat remains the primary doorway into interpretation while a calm visual
library makes every canonical reading recoverable. Administrators can inspect
provenance without gaining consent powers. Two people can understand, accept,
generate, browse, and revoke a shared synastry bond while the system visibly
explains owner, subject, source, producer, and access reason.

### Out of Scope

- No blind bulk import of unresolved or unconsented corpus material.
- No administrative consent override for cross-account synastry.
- No archive bytes stored directly in Postgres or D1.
- No claim of durable admin activation without fresh Access claims.
- No continuous-learning or Vectorize write before deletion filters pass.

### Constraints

- Cloudflare Access remains the durable administrator authority.
- Selemene Postgres remains the canonical provenance archive.
- Urania D1 remains the owner-scoped relationship and Folio boundary.
- Chat and visual browsing must resolve the same canonical reading identity.
- Cross-account authorization must hold at request and archival commit time.
- Pilot ingestion must be idempotent, reversible, and failure-injection tested.
- The graph remains the primary interface; navigation chrome stays additive.

### Goal

Ship and verify the protected archive browser, Urania reading/settings
experience, authenticated relationship routes and synastry generation, durable
Cloudflare administrator mapping, and reversible one-reading plus two-account
pilots. Stop before broad corpus rollout unless identity, consent, deletion,
and provenance reviews are explicitly satisfied.

### Criteria

- [x] ISC-158: Archive repository lists living readings with bounded pagination.
- [x] ISC-159: Archive repository filters subject, relationship, source, run, and editorial state.
- [x] ISC-160: Archive detail returns provenance, visibility, artifacts, evidence, and subjects.
- [x] ISC-161: Living-archive admin routes require `admin:analytics:read`.
- [x] ISC-162: Non-administrators receive denial from every living-archive route.
- [x] ISC-163: Living-archive administrator routes expose no mutation operation.
- [x] ISC-164: Admin web exposes a distinct living-readings browser surface.
- [x] ISC-165: Admin detail visibly explains why the administrator can view each record.
- [x] ISC-166: Admin filters expose source, subject, relationship, run, and editorial state.
- [x] ISC-167: Admin detail displays checksums and locators without fetching bytes implicitly.
- [x] ISC-168: Pilot importer reruns without duplicating archive relations.
- [x] ISC-169: Failed pilot object/database boundaries leave zero orphan artifacts.
- [x] ISC-170: Pilot deletion removes content links while retaining auditable run boundaries.
- [x] ISC-171: One explicitly owned Shesh reading has a frozen pilot manifest.
- [x] ISC-172: Pilot object upload round-trips with matching SHA-256 checksum.
- [x] ISC-173: The imported pilot reading is browsable through protected admin boundaries.
- [x] ISC-174: Authenticated HTTP routes create and list relationship invitations.
- [x] ISC-175: Authenticated HTTP routes accept, decline, and revoke invitations.
- [x] ISC-176: Anti: Administrator permissions cannot bypass either participant’s consent.
- [x] ISC-177: Generation resolves both owned subject snapshots exclusively server-side.
- [x] ISC-178: Consent is revalidated before generated reading archival commit.
- [x] ISC-179: Synastry generation sends two subjects and typed relationship context.
- [x] ISC-180: Generated relationship readings create explicit participant visibility grants.
- [x] ISC-181: Revocation immediately denies every future cross-account generation.
- [x] ISC-182: Revocation preserves independently owned participant audit records.
- [x] ISC-183: Settings shows self profile, circle, shared relationships, and reading visibility.
- [x] ISC-184: Pending, active, declined, revoked, and expired states are visually distinct.
- [x] ISC-185: Antecedent: Chat and library open one matching reading identifier and checksum.
- [x] ISC-186: Reading views explain owner, subject, source, producer, and access reason.
- [x] ISC-187: The named email belongs to durable `selemene-admin` Access authority.
- [ ] [DEFERRED-VERIFY: FV-188-production-admin-session] ISC-188: Fresh Access login yields `platform-admin` and `admin:analytics:read`.
- [ ] [DEFERRED-VERIFY: FV-189-two-account-synastry] ISC-189: Two authenticated accounts pass invite, accept, generate, browse, revoke, and deny.

### Test Strategy

```yaml
- isc: ISC-158
  type: postgres-integration
  check: seed two archive owners and exercise pagination plus filter combinations
  threshold: bounded deterministic rows with no cross-filter leakage

- isc: ISC-161
  type: authorization
  check: call every living-archive route with viewer and administrator claims
  threshold: viewer denied and administrator read succeeds

- isc: ISC-168
  type: idempotency
  check: run the frozen pilot import twice
  threshold: second run creates zero additional archive relations

- isc: ISC-169
  type: failure-injection
  check: interrupt before and after object upload and database commit
  threshold: reconciliation reports zero unowned object locators

- isc: ISC-176
  type: authorization
  check: generate as administrator without both active participant consents
  threshold: request denied before engine invocation

- isc: ISC-178
  type: race
  check: revoke consent after request authorization but before archive commit
  threshold: commit denied and result invisible to both participants

- isc: ISC-185
  type: user-interface
  check: open one archived reading from chat and the visual library
  threshold: identifiers and checksums match exactly

- isc: ISC-189
  type: live-e2e
  check: run the full lifecycle with two distinct authenticated accounts
  threshold: post-revocation generation is denied
```

### Features

- `LivingArchiveRepository`: query and detail models for migration 036;
  satisfies ISC-158–160; parallelizable.
- `LivingArchiveAdminAPI`: protected read-only handlers and route permissions;
  satisfies ISC-161–163; depends on LivingArchiveRepository.
- `LivingArchiveAdminWeb`: branded browse, filter, and provenance detail UI;
  satisfies ISC-164–167; depends on LivingArchiveAdminAPI.
- `PilotImporter`: frozen manifest, object lifecycle, idempotence, deletion,
  and failure recovery; satisfies ISC-168–173; parallelizable after schema.
- `RelationshipHTTP`: authenticated invitation lifecycle routes;
  satisfies ISC-174–176; parallelizable.
- `ConsentedSynastry`: server snapshots, double authorization, generation,
  grants, and revocation; satisfies ISC-177–182; depends on RelationshipHTTP.
- `ReadingSettingsExperience`: visual library, profiles, relationship states,
  provenance language, and canonical-reading links; satisfies ISC-183–186.
- `CloudflareAdminActivation`: group membership and fresh-claim verification;
  satisfies ISC-187–188; depends on Access write authority.
- `TwoAccountPilot`: live lifecycle and denial proof; satisfies ISC-189;
  depends on RelationshipHTTP, ConsentedSynastry, and two authenticated owners.

### Decisions

- 2026-07-26 22:28: refined: completion now means end-to-end product and pilot
  behavior, not only schema and domain foundations.
- 2026-07-26 22:28: the failure lens added object/database partial-commit,
  mid-generation consent revocation, stale-role, and deletion-boundary probes.
- 2026-07-26 22:28: the experiential lens made canonical identity and visible
  access reason prerequisites of a trustworthy chat-plus-library experience.
- 2026-07-26 22:33: SystemsThinking selected the system-rules boundary
  (Meadows level 5) as the highest feasible leverage: Access claims govern
  administrator authority, participant state governs synastry, and neither can
  substitute for the other. Visible access reasons are the bundled
  information-flow intervention (level 6).
- 2026-07-26 22:33: Science compared five falsifiable completion hypotheses:
  backend-first, Urania-first, UI-first, one-shot deployment, and isolated
  reversible slices. UI-first is refuted by absent routes; one-shot deployment
  is refuted by credential and rollback risk. The selected hypothesis is
  isolated slices with local failure probes, then dependency-ordered deployment.
- 2026-07-26 22:33: the current Access credential cannot satisfy ISC-187 or
  ISC-188 through the API. Implementation continues while the primary session
  tests whether an authenticated dashboard session can provide the missing
  control surface.
- 2026-07-26 22:45: root-cause-at-ingestion checkpoint: the incomplete state
  enters at missing transport and persistence boundaries, not at rendering.
  Selemene archive queries are fixed database-up; Urania consent and synastry
  are fixed request-to-commit; product views consume those typed boundaries
  instead of reconstructing authority client-side.
- 2026-07-26 22:45: dirty repository changes are intentional user work and
  will not be stashed or reset. Each producer has explicit file ownership,
  must preserve surrounding edits, and returns focused before/after evidence.
- 2026-07-26 23:22: Cloudflare Access rule groups are reusable policy
  collections, not identity-provider group claims. Production persisted the
  authenticated owner as `viewer`, falsifying the former assumption that the
  rule-group name would arrive in JWT `groups`. Selemene now keeps JWT
  signature, issuer, and audience validation primary, then requires an exact
  fail-closed `CF_PLATFORM_ADMIN_EMAILS` match before assigning
  `platform-admin`; unmatched identities remain viewers.
- 2026-07-26 23:34: a stale in-flight Folio GET could overwrite the newly
  inserted client snapshot after a successful POST. Saving now invalidates
  older refresh sequences, and compact chat provenance includes the actionable
  canonical-record link instead of identity text alone.

### Risks

- Object storage may be unavailable or unbound in the current Pages project.
- The Selemene production migration can expose an older-schema incompatibility.
- A generated reading may complete after either participant revokes consent.
- A user-facing library can accidentally duplicate instead of reference Folio.
- Admin UI permission checks can drift from API permission enforcement.
- A second real authenticated owner cannot be simulated as production consent.

### Verification

- Preflight: `wrangler 4.114.0` is authenticated to the intended 9d9d account
  as `sheshnarayan.iyer@gmail.com`; its OAuth permissions include Pages, D1,
  Workers, and storage writes but do not include Zero Trust Access policy
  writes.
- Preflight: the Urania project has production D1 configured; no R2 binding is
  currently declared in `wrangler.toml`.
- Preflight: `temperance-batch`, Railway CLI, and PostgreSQL client are
  installed; the Urania directory itself is not linked to a Railway project.
- ISC-168: isolated PostgreSQL 16 integration — two executions of the generated
  pilot transaction returned exactly `runs|1`, `sources|1`, `subjects|1`,
  `readings|1`, `artifacts|2`, and `editorial|1`.
- ISC-169: failure-injection unit probe — an injected archive-commit failure
  left `objects.size === 0`, while a checksum-matching pre-existing object
  remained present and was not compensated.
- ISC-170: PostgreSQL and object-adapter deletion probes — soft deletion
  returned `deleted|1|1|2`, preserving one import run and one source while both
  artifacts entered the deleted state; fake object bytes were removed.
- ISC-171: file/checksum probe — the frozen descriptor identifies only
  `Sheshnarayan Cumbipuram Nateshan`; `manifest.json` is 608 bytes with
  SHA-256 `ae56…c989`, and `reading.md` is 147,658 bytes with SHA-256
  `d1bd…8f18`.
- ISC-172: live R2 object probe — the dedicated private
  `tryambakam-noesis-readings` bucket accepted both pilot artifacts; remote
  reads hashed to the frozen `ae56…c989` and `d1bd…8f18` digests.
- ISC-174–182: authenticated Functions matrix —
  `relationships.test.ts` plus `relationship-http.test.ts` returned
  `16 passed; 0 failed`. The suite proves the full invitation lifecycle,
  unauthenticated denial, foreign/admin non-access, exactly two server-resolved
  subjects plus typed relationship context, revocation-during-generation
  rejection, two grants, one canonical checksum-protected result, historical
  grantee browse after revocation, and denial of new generation.
- ISC-174–182: D1 contract — migrations 0001–0007 applied locally as eight
  successful commands and `PRAGMA foreign_key_check` returned an empty result.
- ISC-158–161/163–167: Selemene archive repository/API/admin-web verification —
  three live PostgreSQL repository tests passed, the permission test passed,
  `cargo check -p noesis-data -p noesis-api` exited zero, and the protected
  admin-web typecheck plus production build completed with `/living-readings`.
  The API router exposes only GET operations for this archive and the UI
  renders access reason, filters, locators, and checksums without an artifact
  byte-fetch client.
- Production archive pilot: migration 036 applied to Railway PostgreSQL in one
  transaction. The frozen pilot SQL then ran twice and still returned exactly
  `runs|1`, `sources|1`, `readings|1`, `artifacts|2`, and `editorial|1`;
  the active record is owner-only and `needs_review`.
- ISC-183/184/186: Urania SPA verification — the full suite passed 51 files and
  510 tests, Functions typecheck exited zero, and the production build
  transformed 1,616 modules. Settings exposes profile, circle, consent
  lifecycle, and visibility; canonical reading views expose the owner,
  subject, source, producer, access reason, identifier, and checksum.
- ISC-187: authenticated Cloudflare dashboard inspection showed durable rule
  group `selemene-admin` (`8423500a-493e-4314-8b93-a488804da984`) includes
  `sheshnarayan.iyer@gmail.com` and is referenced by the reusable
  `Selemene-admin` allow policy used by the Selemene application.
- ISC-162: route-level authorization probe —
  `living_readings_auth_tests.rs` called both living-archive GET routes with a
  viewer JWT; both returned `403 FORBIDDEN` and named
  `admin:analytics:read` before repository access.
- ISC-173: live production API probe — an ephemeral API key carrying only
  `basic:access` plus `admin:analytics:read` returned `200` from list and
  detail through the Railway origin. Reading
  `75c78363-a307-4b4c-a26c-e9cc96470ce7` exposed owner-only
  `needs_review`, its protected access reason, two available R2 locators, and
  the frozen `ae56…c989` / `d1bd…8f18` checksums. The key was revoked
  immediately after the probe.
- ISC-185: QATester browser proof — a fresh local chat generation returned
  Selemene `200`, Folio `201`, and an actionable `Open record`. Chat and
  Library both exposed reading
  `2ceacf42-527e-41c4-934c-4bf0132bd76a` with SHA-256
  `4886cef8a1e8acfc3acc0931c8743ac859820f0a577c741d7be313d8ceda2bcc`;
  ten of ten assertions passed with zero console errors or warnings.
- ISC-188 implementation evidence — nine Cloudflare role-mapping tests and
  `cargo check -p noesis-api` pass; Railway deployment
  `a0753629-4fc2-4f78-827e-b418fa6752c1` is healthy with the exact admin
  allowlist configured. Fresh human-session proof remains open because the
  authenticated Chrome session closed before `/admin/session` could be read.
  Follow-up `FV-188-production-admin-session`: authorize a fresh browser login,
  then capture `/api/v1/admin/session` and the protected pilot detail.
- ISC-189 remains open: remote D1 contains only one authenticated owner and
  zero relationship generations. A second real Access identity and its
  participant-owned subject are required; the system will not fabricate either
  or substitute administrator authority for consent. Follow-up
  `FV-189-two-account-synastry`: sign in as a second real user and run invite,
  accept, generate, browse, revoke, then verify a new generation is denied.

## Iteration 7 — Frontend Brand, Components, and Journey Review (2026-07-26)

### Problem

Urania now contains a constellation map, ritual Threshold, chat-first reading
doorways, canonical Reading Library, visual reading components, identity
settings, and consented-relationship controls. Each surface is individually
functional, but the product has not received one integrated review against the
original `.assets` aesthetic, the graph-first philosophy, the living-reading
vocabulary, responsive behavior, and accessibility fundamentals.

### Vision

The constellation, conversation, reading, archive, and consent surfaces feel
like one calm celestial instrument. Chat remains the primary way to begin;
visual readings make complexity legible; Library remains a trusted recovery
surface; and Settings makes ownership and consent understandable without
turning Urania into a generic administration dashboard.

### Out of Scope

- No frontend redesign or component implementation during this review.
- No production data mutation, corpus import, or consent lifecycle execution.
- No replacement of the established palette, typography, or generated assets.
- No claims about experiences that cannot be inspected in code or a browser.

### Constraints

- The current dirty worktree is the reviewed source and must remain intact.
- The review environment, viewport, route, and data limitation must be recorded.
- Access-gated or data-empty states cannot be described as populated production proof.
- Visual recommendations must extend the current brand rather than introduce a substitute.
- Accessibility findings require source evidence, computed contrast, or browser interaction.

### Goal

Produce one evidence-backed frontend review that explains the present Urania
brand, maps its integrated journeys, identifies the most consequential design
and accessibility gaps, and defines a prioritized living-reading component
system without modifying the user-facing implementation.

### Criteria

- [x] ISC-190: The review maps every primary route and its intended user job.
- [x] ISC-191: The first-time, returning, reading, recovery, and synastry journeys are diagrammed.
- [x] ISC-192: The `.assets` moodboard and generated reading components are visually inspected.
- [x] ISC-193: Implemented palette, typography, frames, motion, and iconography are compared with the references.
- [x] ISC-194: The review identifies where the constellation remains primary and where dashboard chrome displaces it.
- [x] ISC-195: Chat onboarding, composing, result, canonical-link, and archive-return beats are reviewed as one flow.
- [x] ISC-196: Reading visualizations are reviewed for semantic meaning, hierarchy, and accessible alternatives.
- [x] ISC-197: Component and token consistency is evaluated without proposing a new unrelated visual language.
- [x] ISC-198: Vocabulary is evaluated for sacred, technical, trustworthy, and plain-language balance.
- [x] ISC-199: Desktop and mobile routes are exercised in a real browser with screenshots.
- [x] ISC-200: Browser console and network diagnostics are captured for the reviewed journeys.
- [x] ISC-201: Small text, opacity, focus, dialog, keyboard, motion, and graph accessibility risks are identified.
- [x] ISC-202: Contrast evidence includes computed ratios for recurring muted text treatments.
- [x] ISC-203: Findings distinguish strengths, material problems, and deliberate product tradeoffs.
- [x] ISC-204: Recommendations are prioritized by user impact and implementation sequence.
- [x] ISC-205: The review defines a coherent component-library direction for readings, evidence, time, relations, and trust.
- [x] ISC-206: No existing intentional workspace change is overwritten or reformatted.
- [x] ISC-207: Final claims cite inspected source, assets, or browser evidence.
- [x] ISC-208: The reviewed commit, worktree state, runtime, routes, and viewport matrix are recorded.
- [x] ISC-209: Loading, empty, error, disabled, validation, overflow, and long-content states are evaluated.
- [x] ISC-210: Design-token adherence and hardcoded style drift are assessed.
- [x] ISC-211: Findings use blocker, major, moderate, or minor severity with reproducible guidance.

### Test Strategy

```yaml
- isc: ISC-192
  type: visual-reference
  check: inspect moodboard, architecture reference, component atlas, and folio image
  threshold: palette, type, framing, geometry, and information-density observations recorded

- isc: ISC-199
  type: browser-matrix
  check: exercise home, node, chat, library, settings at desktop and mobile widths
  threshold: screenshots plus route-level observations for every available surface

- isc: ISC-201
  type: accessibility
  check: inspect semantics, focus behavior, motion handling, text size, and contrast
  threshold: every material finding cites source, browser behavior, or computed ratio

- isc: ISC-202
  type: contrast-calculation
  check: composite recurring silver and gold opacity treatments over the void background
  threshold: ratios recorded and compared with text-size requirements

- isc: ISC-208
  type: environment
  check: record git state, runtime host, browser, data state, and viewport sizes
  threshold: audit can be reproduced without assuming unobserved production data
```

### Features

- `BrandCoherenceAudit`: compares the shipped visual grammar with `.assets`.
- `ComponentSemanticsAudit`: evaluates tokens, visualization meaning, and content hierarchy.
- `JourneyAudit`: traces Threshold, graph, chat, canonical record, Library, and Settings.
- `AccessibilityAudit`: reviews keyboard, focus, dialog, contrast, graph, and motion behavior.
- `PrioritizedDirection`: turns findings into an ordered component-system roadmap.

### Decisions

- 2026-07-27: Keep the task review-only. The user requested understanding and
  evaluation; implementation requires a subsequent explicit change request.
- 2026-07-27: Treat `.assets` as intended direction, never as proof that a
  component exists in the running application.
- 2026-07-27: Distinguish semantic visualizations from decorative celestial
  framing. A visual earns authority only when its marks encode stored data.
- 2026-07-27: Add accessibility, state coverage, responsive behavior, token
  drift, and environment pinning after the commitment-boundary Advisor review.

### Risks

- Reference imagery can be mistaken for an implemented component system.
- Dense celestial ornament can hide weak information hierarchy.
- Chat-first language can conflict with map-first navigation and library chrome.
- Very small tracked labels can look distinctive while becoming unreadable.
- Network graphs can encode relationships visually without an equivalent list.
- A live Access boundary can obscure product behavior during browser review.

### Verification

- ISC-190–198/203–205/207/210–211: the durable review maps the route and
  reading loop, compares the shipped identity with canonical assets and voice,
  ranks findings by severity, and defines a component taxonomy that extends the
  existing Urania visual language.
- ISC-192–193: the moodboard, seven page references, component atlas, and
  reading-folio image were inspected alongside the shipped palette, type,
  frames, geometry, and motion. A source import scan confirmed those images are
  reference material rather than runtime assets.
- ISC-199–200: QATester exercised Home, Witness, Folio, Readings, and Settings
  in headless Chromium at 1440×1000 and 390×844, plus a 720×1000 CSS-pixel
  viewport proxy for effective 200% reflow. Diagnostics contained zero console
  errors or warnings, page errors, failed requests, or HTTP failures.
- ISC-201–202: source and browser probes reproduced dialog focus escape,
  missing Escape/focus restoration, invisible graph focus, mobile SVG pointer
  interception, clipped chrome, zoom-reflow node loss, and contrast ratios from
  2.24:1 to 4.28:1 for recurring muted text.
- ISC-206: `git status` confirms the pre-existing dirty application worktree
  remains present; this review changed only `ISA.md` and added
  `docs/frontend-brand-flow-review-2026-07-27.md`.
- ISC-208–209: the report records commit/worktree, runtime identity, local data,
  viewport matrix, live-state limitations, and source-reviewed loading, empty,
  error, disabled, validation, overflow, and long-content behavior.
- Production build: `npm run build` passed with 1,616 transformed modules; the
  pre-existing missing `astro/tsconfigs/strict` warning remains non-blocking.
- Diff hygiene: `git diff --check` passed.

### ReReadCheck

The latest request requires Temperance parallel dispatch, appropriate local
skills, one integrated frontend review, and an understanding of brand
aesthetics plus end-to-end flow. The external Temperance run was attempted and
failed open without an index; three bounded Codex auditors then supplied live
QA, brand/vocabulary, and component-semantics evidence. The durable review
explicitly covers the requested visual identity, vocabulary, route journey,
reading components, responsive behavior, and accessibility.

### Changelog

- Added the durable frontend brand, component, and journey review.
- Added desktop, mobile, zoom-reflow, focus, pointer, console, and network
  evidence to the original source and asset review.
- Added canonical vocabulary findings, including critical `Path(s)` drift,
  first-encounter proposition gaps, deterministic-copy drift, and typography.
- Added a semantic reading-component taxonomy and P0–P3 implementation order.
- Refined the initial “chat-first” assumption: Urania is currently graph-first
  for discovery, conversation-first for intake, and visual-reading-first for
  return.

### Learn

- The initial conjecture that visual inconsistency was the primary design
  problem was refuted. The palette, frame, and celestial grammar are already
  coherent; semantic accountability and interaction access are the larger gaps.
- The initial conjecture that the shipped product was chat-first was refuted by
  route and browser evidence. The honest designation is graph-first discovery,
  conversation-first intake, and visual-reading-first return.
- The initial conjecture that clean mobile width implied responsive stability
  was refuted. Decorative SVG hit interception, clipped Logout chrome, invisible
  focus, and viewport-proxy node loss show that interaction and reflow must be
  tested independently from document overflow.
- The final Advisor review correctly challenged an over-broad accessibility
  completion claim. The report now states that the run used headless Chromium,
  that the 720 CSS-pixel check was a viewport proxy rather than actual browser
  zoom, and that screen-reader, cross-engine, and formal 320 CSS-pixel WCAG
  reflow tests remain future implementation verification.
- Advisor priority guidance was incorporated: dialog focus management and a
  non-graph navigation equivalent now precede simulated-data and vocabulary
  refinement in P0.
- Temperance external dispatch produced no aggregate index within the bounded
  window, so the documented fail-open path was used. The resulting three Codex
  audits remained independent and converged on the same trust/access diagnosis.
- `frontend-design-direction`, `ui-ux-pro-max`, `frontend-a11y`,
  `noesis-writer-skill`, browser automation, ISA, and Advisor skills materially
  shaped the evidence model, canonical vocabulary gate, responsive matrix,
  component taxonomy, and conformance boundary.

## Iteration 8 — Engine Output Visualization Atlas (2026-07-27)

### Problem

Urania preserves deterministic engine responses for provenance, but an
unrecognized or weakly adapted payload can still collapse into literal JSON or
JSON-shaped prose. The existing element layer covers many recurrent shapes, yet
there is no single exhaustive, executable inventory connecting all eighteen
Selemene engines and six workflows to their source fields, visual grammar,
fallback state, and branded component.

### Vision

Every engine result opens as an intelligible visual reading: measures become
scales, positions become plotted placements, relationships become named edges
plus lists, periods become sequences, spreads preserve source order, media
becomes a playable artifact, and capture-gated engines state their boundary.
Exact JSON remains available only as collapsed provenance. The graph remains
the interface: engine and workflow nodes open these visual reading surfaces
without forcing the reader to inspect developer payloads.

### Out of Scope

- No change to Selemene engine calculations or response contracts.
- No invention of meaning for unknown, null, mock, or capture-gated fields.
- No public exposure of private `723` reading values in documentation or images.
- No automatic generative interpretation added to deterministic facts.
- No replacement of the existing Urania brand identity or graph navigation.
- No claim that a generated concept board is shipped application behavior.

### Principles

- Visual form follows the source relationship, never the engine’s mystical name.
- JSON is provenance, not the reader-facing experience.
- Every quantitative mark prints its value, scale, unit, and source path.
- Every graph has a text or table equivalent.
- Unknown data stays unknown; missing data stays visibly missing.
- Gold frames structure, emerald denotes computation, violet denotes witness,
  terracotta denotes unresolved state, and none of them imply moral value.
- The graph remains the primary spatial navigation at every depth.

### Constraints

- The current dirty worktree contains intentional user changes and must remain intact.
- Schema mining may record paths and types but never private source values.
- Generated imagery must use the existing `.assets` references.
- Image generation must use Codex OAuth through `codex-gpt-image`.
- External parallel work must fail open to Codex agents.
- Durable outputs live in the repository under `docs/`, `scripts/`, or `.assets/generated/`.

### Goal

Create an executable, evidence-backed engine-output atlas covering all eighteen
engines and six workflows, define the complete branded component inventory that
replaces visible JSON, and generate reference boards from the existing Urania
assets without altering engine truth.

### Criteria

- [x] ISC-212: Numerology has an observed path/type schema and named visual mapping.
- [x] ISC-213: Human Design has an observed path/type schema and named visual mapping.
- [x] ISC-214: Gene Keys has an observed path/type schema and named visual mapping.
- [x] ISC-215: Vimshottari has an observed path/type schema and named visual mapping.
- [x] ISC-216: Panchanga has an observed path/type schema and named visual mapping.
- [x] ISC-217: Vedic Clock has an observed path/type schema and named visual mapping.
- [x] ISC-218: Biorhythm has an observed path/type schema and named visual mapping.
- [x] ISC-219: Transits has an observed path/type schema and named visual mapping.
- [x] ISC-220: Tarot has an observed path/type schema and named visual mapping.
- [x] ISC-221: I Ching has an observed path/type schema and named visual mapping.
- [x] ISC-222: Enneagram has an observed path/type schema and named visual mapping.
- [x] ISC-223: Sacred Geometry has an observed path/type schema and named visual mapping.
- [x] ISC-224: Nadabrahman has an observed path/type schema and named visual mapping.
- [x] ISC-225: Raaga has an observed path/type schema and named visual mapping.
- [x] ISC-226: Sigil Forge has an observed path/type schema and named visual mapping.
- [x] ISC-227: Biofield has an observed path/type schema and explicit capture boundary.
- [x] ISC-228: Biofield Capture has an observed path/type schema and explicit capture boundary.
- [x] ISC-229: Face Reading has an observed path/type schema and explicit capture boundary.
- [x] ISC-230: Birth Blueprint names its contributing engines and composite presentation.
- [x] ISC-231: Daily Practice names its contributing engines and composite presentation.
- [x] ISC-232: Full Spectrum names its contributing engines and composite presentation.
- [x] ISC-233: Creative Expression names its contributing engines and composite presentation.
- [x] ISC-234: Decision Support names its contributing engines and composite presentation.
- [x] ISC-235: Self Inquiry names its contributing engines and composite presentation.
- [x] ISC-236: Anti: reader-facing defaults never expose expanded raw JSON.
- [x] ISC-237: Non-sensitive source fields remain available through collapsed, privacy-filtered provenance.
- [x] ISC-238: Fact-grid payloads map to a branded facts component.
- [x] ISC-239: Number-code payloads map to a branded reduction component.
- [x] ISC-240: Position payloads map to tables or plotted placements with values.
- [x] ISC-241: Relationship payloads map to named edges plus an equivalent list.
- [x] ISC-242: Ordered-period payloads map to a sequence or timing component.
- [x] ISC-243: Cyclic payloads map to labeled scales with printed values.
- [x] ISC-244: Spread payloads preserve source order and source labels.
- [x] ISC-245: Collection payloads expose named membership without invented rank.
- [x] ISC-246: Question payloads remain questions rather than conclusions.
- [x] ISC-247: Media payloads map to playable/downloadable artifact components.
- [x] ISC-248: Capture-gated payloads map to consent and device-state components.
- [x] ISC-249: Null and unknown payloads map to an explicit unresolved component.
- [x] ISC-250: A machine-readable manifest contains exactly eighteen engine entries.
- [x] ISC-251: A machine-readable manifest contains exactly six workflow entries.
- [x] ISC-252: The durable atlas lists every engine’s primary, secondary, and fallback component.
- [x] ISC-253: The durable atlas lists the complete reusable component inventory.
- [x] ISC-254: One generated overview board shows the component families.
- [x] ISC-255: One generated detail board shows representative engine surfaces.
- [x] ISC-256: Generated boards visibly follow the existing palette, framing, and geometry.
- [x] ISC-257: Image generation uses Codex OAuth and reports model and dimensions.
- [x] ISC-258: Anti: schema outputs contain no private source values.
- [x] ISC-259: Anti: no intentional application change is overwritten or reformatted.
- [x] ISC-260: The schema miner runs successfully against the current `723` corpus.
- [x] ISC-261: The schema miner produces deterministic ordering.
- [x] ISC-262: The manifest validates without duplicate engine identifiers.
- [x] ISC-263: Existing reading-element tests pass.
- [x] ISC-264: Production TypeScript and Vite build passes.
- [x] ISC-265: Documentation links each mapping to inspected code or source evidence.
- [x] ISC-266: The atlas distinguishes implemented, partial, capture-gated, and proposed states.
- [x] ISC-267: The component inventory includes accessible text/table alternatives.
- [x] ISC-268: The component inventory includes loading, empty, partial, error, and stale states.
- [x] ISC-269: The component inventory includes thread, reading, Folio, compare, and operator densities.
- [x] ISC-270: No generated board presents fictional statistics as stored telemetry.
- [x] ISC-271: Antecedent: exact engine identifiers and workflow membership are verified before visual assignment.
- [x] ISC-272: Every visual mapping names the field relationship it encodes.
- [x] ISC-273: The atlas explains why engine-specific dashboards are composed from shared grammars.
- [x] ISC-274: The generated assets are saved under `.assets/generated/engine-output-atlas/`.
- [x] ISC-275: A validation probe confirms all eighteen engines have non-JSON default presentations.
- [x] ISC-276: Every engine entry declares implemented, partial, capture-gated, or proposed status.
- [x] ISC-277: Anti: generated artifacts contain no absolute corpus paths or subject directory names.
- [x] ISC-278: Every generated tile declares observed-data or generated-reference provenance.
- [x] ISC-279: The manifest encodes the complete engine-by-workflow membership matrix.
- [x] ISC-280: Every visual component contract names its non-visual equivalent.
- [x] ISC-281: Anti: the generated manifest embeds no raw values, binary media, tokens, or secrets.

### Test Strategy

| ISC | Type | Check | Threshold | Tool |
| --- | --- | --- | --- | --- |
| 212–229 | schema | mine path/type shapes and inspect source contracts | one entry per engine | schema miner + source |
| 230–235 | workflow | inspect workflow registry and live taxonomy evidence | six exact compositions | source + evidence |
| 236–249 | renderer | inspect presentation rules and fallbacks | no expanded JSON default | manifest validation |
| 250–262 | artifact | validate JSON manifest invariants | exact counts, stable order | Node test |
| 263–264 | build | run focused tests and production build | exit zero | npm |
| 254–257/270/274 | visual | inspect generated boards against references | branded, factual, saved | image inspection |
| 258–259 | anti | scan outputs and worktree | no values or clobbering | rg + git |
| 265–273/275 | completeness | cross-check document and manifest | every entry mapped | validation script |
| 276–281 | trust | validate status, provenance, matrix, alternatives, and redaction | no ambiguous or private cells | manifest test |

### Features

| Feature | Satisfies | Depends on | Parallelizable |
| --- | --- | --- | --- |
| Corpus schema miner | 212–229, 258, 260–262 | local `723` bundles | yes |
| Engine/workflow contract audit | 212–235, 265, 271 | Selemene source | yes |
| Visualization grammar matrix | 236–253, 266–273, 275 | schema inventory | yes |
| Generated component boards | 254–257, 270, 274 | converged component list | no |
| Verification sweep | 263–275 | all artifacts | yes |

### Decisions

- 2026-07-27: Extend the implemented `ReadingElement` grammar rather than
  invent eighteen isolated dashboard languages.
- 2026-07-27: Treat raw JSON as collapsed source evidence, never the default
  reader-facing output.
- 2026-07-27: Use local historical bundles for path/type discovery only; do not
  publish private values or infer subject meaning.
- 2026-07-27: Generated image boards are design contracts, explicitly distinct
  from shipped application state.
- 2026-07-27: Advisor required per-engine implementation status, tile-level
  provenance, normalized corpus evidence, and a full engine-by-workflow matrix;
  these are now explicit criteria rather than documentation conventions.
- 2026-07-27: “Collapsed JSON” is not treated as a privacy guarantee. Generated
  artifacts will contain schema paths/types only and no raw values or binary
  media; authenticated source inspection remains a separate product surface.

### Verification

- `node --test scripts/readings/engine-output-atlas.test.mjs`: 8/8 passed.
- `npm test`: 54 files and 529/529 tests passed.
- `npm run build`: TypeScript and Vite production build passed.
- `cargo test -p noesis-orchestrator --lib`: 96/96 passed.
- `cargo test -p noesis-orchestrator --test workflow_integration_tests`: 21/21 passed.
- Atlas totals: 18 engines, 6 workflows, 108 membership cells, 49 components.
- Generated boards: two final 1536 × 1024 PNG references via Codex OAuth,
  `gpt-image-2`, high quality.
- Cato final trust audit: PASS after workflow, semantic, media, and privacy
  corrections.
- `git diff --check`: passed in both Urania and Selemene.

### Changelog

- Added deterministic privacy-safe engine-output schema miner and manifest.
- Added exhaustive engine/workflow visualization and component contract.
- Added media, artifact, capture, failure, workflow-ledger, and privacy-safe
  technical-source renderers.
- Preserved top-level Raaga audio and Sigil Forge image envelopes.
- Added live nested Tarot cards with visible reversal orientation.
- Added Panchanga astronomical scalar facts without inventing cyclic geometry.
- Unified Selemene API workflow execution with the canonical WorkflowRegistry.
- Generated and visually inspected final component-family and eighteen-engine
  reference boards from existing Urania assets.
- Added a cross-language supported-engine reconciliation contract across
  Selemene, Urania extractors, and the generated atlas.
- Added default-deny capture-source filtering and SHA-256 generation metadata.

### Learn

- Presence counts do not prove semantic truth. Engine status must describe the
  renderer that exists today; specialist targets remain `partial` or
  `proposed`.
- Multiple registries require one executable reconciliation gate. Selemene’s
  runtime, Urania’s named extractors, and the atlas now fail together on drift.
- Collapsing source data is presentation, not privacy. Capture envelopes and
  results default-deny unreviewed keys, and all fallbacks share the same filter.
- Whole-envelope handling is a durable invariant because generated media and
  failure state live beside `result`, not necessarily inside it.
- Generative reference boards are quarantined from deterministic product truth.
  Because the endpoint exposes no pinned `gpt-image-2` version or seed, exact
  prompts, references, intermediates, and outputs are fingerprinted instead.
- Visual semantics follow payload relationships. Panchanga remains facts,
  Tarot reversal stays explicit, and decorative cross-engine edges are removed.

## Iteration 9 — Branded Graph-First UI Realignment Plan (2026-07-27)

### Problem

Urania now has a functioning graph-first shell, chat-to-reading handoff, durable
reading grammar, settings surface, engine-output atlas, and branded reference
boards. Those pieces were developed across several passes and are not yet
captured as one executable frontend realignment sequence. Without a precise
plan, implementation can drift into generic dashboard composition, duplicate
the reading renderers, expose raw JSON, or disturb the backend contracts and
working chat orchestration.

### Vision

A future implementation session can follow one test-first plan to make the
current product feel like one living celestial instrument. Chat remains the
gentle onboarding doorway; the constellation remains the primary spatial
navigation; every result resolves into the shared reading grammar; the library,
folio, settings, and admin surfaces share the same sacred-technical visual
system; and technical source evidence remains a deliberately secondary,
privacy-filtered disclosure.

### Out of Scope

- Runtime source changes in this planning-only iteration.
- Backend, database, KV, Vectorize, or Selemene contract changes.
- Inventing engine outputs, relationships, workflow telemetry, or user data.
- Replacing the Tryambakam Noesis identity with a new visual brand.
- Shipping generated moodboard images as literal application screenshots.

### Constraints

- The current worktree contains intentional integrated frontend changes and is
  the authoritative object of this audit.
- The plan must preserve all existing user edits and modify no runtime file.
- Every implementation task must name exact paths, tests, code shape, commands,
  expected outcomes, and an atomic commit.
- Visual status, provenance, privacy, reduced motion, and narrow viewport
  behavior are product contracts, not finishing polish.
- The graph remains the interface at every depth; secondary chrome supports it
  instead of becoming the dominant navigation model.

### Goal

Create and verify a durable, file-specific, test-first implementation plan that
maps the current Urania frontend to the established moodboards, brand system,
reading-element grammar, and engine-output atlas while preserving chat
onboarding, reading fallback, backend contracts, and privacy boundaries.

### Criteria

- [x] ISC-282: The plan maps every current top-level route and its owning page component.
- [x] ISC-283: The plan maps graph, chrome, chat, reading, settings, and admin component ownership.
- [x] ISC-284: The plan maps existing color, typography, spacing, border, glow, and state tokens.
- [x] ISC-285: The plan catalogs the authoritative moodboard and generated board references by exact path.
- [x] ISC-286: The plan maps all eighteen engine families and six workflows to reusable UI surfaces.
- [x] ISC-287: Every planned product surface preserves the graph as the primary spatial interface.
- [x] ISC-288: The plan specifies the chat-onboarding to canonical-reading handoff and reading-UI fallback.
- [x] ISC-289: The plan specifies the home-constellation visual realignment without changing its seven parent nodes.
- [x] ISC-290: The plan specifies node-page hierarchy, child-doorway, status, and result presentation changes.
- [x] ISC-291: The plan specifies reading-library discovery, filtering, grouping, and empty-state behavior.
- [x] ISC-292: The plan specifies canonical folio and reading-detail surfaces using the shared reading grammar.
- [x] ISC-293: The plan specifies settings and authorized admin presentation without weakening access controls.
- [x] ISC-294: The plan specifies workflow-ledger presentation with provenance and honest proposed/live states.
- [x] ISC-295: The plan maps engine outputs to scalar, cycle, timeline, relation, matrix, media, and text primitives.
- [x] ISC-296: The plan makes privacy-filtered technical source a collapsed, explicit disclosure.
- [x] ISC-297: Every visual task declares mobile, tablet, and wide-screen behavior.
- [x] ISC-298: Every interactive task declares keyboard, focus, semantic-label, and contrast acceptance checks.
- [x] ISC-299: Motion tasks declare meaningful transitions and reduced-motion behavior.
- [x] ISC-300: Data-bearing tasks declare loading, empty, partial, unavailable, capture-gated, and failure states.
- [x] ISC-301: Route tasks preserve deep links, hash history, browser navigation, and refresh behavior.
- [x] ISC-302: Every implementation task starts with a failing focused test or auditable visual assertion.
- [x] ISC-303: Every implementation task names exact files to create or modify.
- [x] ISC-304: Every implementation task includes concrete code or contract snippets.
- [x] ISC-305: Every implementation task includes exact commands that an executor can run.
- [x] ISC-306: Every implementation task names the expected failure and passing result.
- [x] ISC-307: Every implementation task ends with an atomic commit checkpoint.
- [x] ISC-308: The plan identifies dependencies and safe parallel execution lanes.
- [x] ISC-309: Anti: no planned default surface renders raw JSON or private capture values.
- [x] ISC-310: Anti: no planned surface replaces the brand with generic SaaS cards, glassmorphism, or decorative telemetry.
- [x] ISC-311: Anti: the plan requires no database, KV, Vectorize, embedding, or Selemene API contract change.
- [x] ISC-312: Antecedent: the plan is based on inspected current UI code, rendered UI evidence, and authoritative local visual references.
- [x] ISC-313: The completed plan is saved under `docs/plans/` and passes an explicit completeness check.

### Test Strategy

| ISC | Type | Binary probe | Pass threshold |
| --- | --- | --- | --- |
| 282–283 | architecture | route/component matrix in plan | every current surface appears once with an owner |
| 284–286 | design-system | asset/token/engine tables in plan | exact paths and all 18 engines / 6 workflows present |
| 287–301 | product contract | task acceptance checks | every relevant behavior and state is testable |
| 302–308 | executability | inspect each task template | failing test, files, snippet, commands, pass result, commit |
| 309–311 | anti-criteria | plan text scan | no raw-JSON default, rebrand, or backend mutation |
| 312 | antecedent | evidence ledger | code, rendered UI, and visual assets all cited |
| 313 | artifact | file and completeness check | plan exists and all 32 criteria are addressed |

### Features

| Feature | Satisfies | Depends on | Parallelizable |
| --- | --- | --- | --- |
| Current-surface architecture audit | 282–283, 287–301, 312 | live source and rendered UI | yes |
| Brand and moodboard translation map | 284–285, 289–300, 310, 312 | authoritative local assets | yes |
| Engine-to-component system map | 286, 294–296, 300, 309 | completed atlas and reading grammar | yes |
| Test-first execution sequence | 302–308, 311 | all audit outputs | no |
| Completeness and anti-drift verification | 309–313 | finished plan | no |

### Decisions

- 2026-07-27: This iteration writes a plan only; runtime implementation is
  deferred to the execution mode chosen after review.
- 2026-07-27: No clean worktree is created because the intentional uncommitted
  integrated UI is the subject being mapped. The plan artifact and this ISA
  extension are the only authorized edits in the current worktree.
- 2026-07-27: Existing shared reading elements remain the canonical output
  grammar; the engine atlas extends them rather than creating isolated
  dashboards.
- 2026-07-27: The generated boards are directional design contracts. Product
  truth comes from source contracts, authenticated data, and honest status
  labels.
- 2026-07-27: Parallel reviews are read-only and converge before the final task
  ordering is written.

### Verification

- Saved `docs/plans/2026-07-27-urania-graph-first-ui-realignment.md`.
- Plan validator found 13 tasks, 15 atomic commit checkpoints, and no malformed
  task; the baseline/harness and engine-registry/artifact pairs are separate
  buildable commits.
- Existing/create path validator checked 75 plan references with no missing path.
- `git diff --check` passed for the plan and this ISA extension.
- Architecture, brand, and verification audits were dispatched in parallel.
- All audit blockers were integrated: token/evidence separation, Parchment ink,
  generated-asset boundaries, engine artifact families, historical grants,
  Threshold ownership, duplicate-surface retirement, synthetic UI fixtures,
  Axe scanning, evidence redaction, exact commands, and safe staging.
- The external Temperance rail produced no terminal index; its required
  fail-open Codex audits completed successfully.

### Learn

- A visual reference can define composition while remaining untrusted for
  identifiers, counts, status, and provenance.
- Evidence color and interaction color must be separate token systems; generic
  selection must never masquerade as computed or witness state.
- Revocation semantics are temporal: it blocks future shared generation but
  does not erase a previously granted historical reading.
- A test-first visual plan needs characterization gates, per-surface behavior
  probes, Axe audits, synthetic fixtures, and screenshot evidence—not brittle
  class snapshots.
- A dirty integrated worktree needs a reviewed path allowlist and checkpoint
  commit before task-level commits can be trusted.

## Iteration 10 — Graph-First UI Realignment Execution (2026-07-27)

### Problem

The approved graph-first UI realignment exists as a precise implementation
plan, but the runtime still carries pre-realignment vocabulary, ambiguous
interaction/evidence colors, blurred console-card defaults, duplicated overlay
shells, and uneven loading and reading states. The integrated worktree must be
preserved before these shared foundations are changed.

### Vision

Urania behaves as one living celestial instrument. The graph remains the
primary spatial interface; chat gently establishes context; every engine result
resolves into the same readable Folio grammar; and interaction, evidence,
privacy, consent, and unavailable states are always visually and textually
distinct.

### Out of Scope

- No database, KV, Vectorize, embedding, or Selemene API contract changes.
- No browser-side email authorization or owner/subject identity collapse.
- No generated image used as runtime data, telemetry, or product truth.
- No raw private payload as a default reader-facing surface.
- No unrelated dirty-worktree change is reverted or reformatted.

### Constraints

- Execute `docs/plans/2026-07-27-urania-graph-first-ui-realignment.md`
  task-by-task with its named tests and atomic checkpoints.
- Preserve the existing React SPA, hash routing, D1 Folio persistence,
  relationship consent model, and `ReadingDocument` substrate.
- The graph is the interface at every depth; chrome and lists are accessible
  equivalents rather than replacement navigation.
- Runtime status, identifiers, counts, and provenance come from typed data,
  never generated references.

### Goal

Implement and verify all thirteen tasks in the approved realignment plan so
Urania presents chat, constellation navigation, canonical readings, Folio,
engine/workflow instruments, settings, and dyad readings as one accessible
branded ecosystem without weakening existing data or authorization contracts.

### Criteria

- [ ] ISC-314: Recoverable binary-diff and untracked-file backups exist before runtime edits.
- [ ] ISC-315: The implementation runs on the dedicated `codex/urania-graph-first-ui-realignment` branch.
- [ ] ISC-316: The baseline checkpoint contains exactly the reviewed intentional path allowlist.
- [ ] ISC-317: The baseline harness records known violations and a non-zero production bundle size.
- [ ] ISC-318: Semantic text tokens meet WCAG contrast on Void and instrument surfaces.
- [ ] ISC-319: Evidence colors and interaction colors are structurally distinct.
- [ ] ISC-320: Parchment reading ink and muted text meet WCAG contrast.
- [ ] ISC-321: Typography roles declare readable minimums and sustained-reading measure.
- [ ] ISC-322: Centralized UI copy passes the prohibited-vocabulary gate.
- [ ] ISC-323: Runtime source imports no generated moodboard or page-reference asset.
- [ ] ISC-324: Default instrument panels use structural rules without generic SaaS blur.
- [ ] ISC-325: Meaningful motion collapses under reduced motion and data marks stay static.
- [ ] ISC-326: AsyncBoundary renders ready content without a status shell.
- [ ] ISC-327: AsyncBoundary renders exactly one loading, empty, partial, stale, denied, or error state.
- [ ] ISC-328: InstrumentDialog provides one accessible focus-managed overlay contract.
- [ ] ISC-329: Chat and informational overlays use InstrumentDialog without duplicate shells.
- [ ] ISC-330: Every graph relationship has a named non-visual equivalent.
- [ ] ISC-331: Graph interaction remains keyboard reachable at narrow and wide viewports.
- [ ] ISC-332: Canonical readings render separate Reading, Evidence, and privacy-filtered Source layers.
- [ ] ISC-333: Chat transitions explicitly into the canonical reading without a mutating long-form live region.
- [ ] ISC-334: Home retains exactly seven parent nodes and offers a direct reading doorway.
- [ ] ISC-335: Folio browsing, filtering, grouping, and reading detail use one coherent surface.
- [ ] ISC-336: All eighteen engines map to typed reusable reading instruments.
- [ ] ISC-337: All six workflows expose honest member, state, provenance, and fallback presentation.
- [ ] ISC-338: Node pages distinguish runnable, partial, capture-gated, unavailable, and informational children.
- [ ] ISC-339: Operator evidence contains no personal interpretation or browser-side authorization.
- [ ] ISC-340: Settings preserve owner, subject, consent, relationship, and revocation boundaries.
- [ ] ISC-341: Dyad readings present both subjects symmetrically in the canonical grammar.
- [ ] ISC-342: Deep links, hash history, browser navigation, and refresh behavior remain verified.
- [ ] ISC-343: Desktop, effective-reflow, and mobile visual matrices pass with deterministic fixtures.
- [ ] ISC-344: Accessibility, evidence-redaction, build, focused tests, and bundle budgets pass.
- [ ] ISC-345: Anti: no default surface exposes raw JSON, fictional telemetry, generic SaaS styling, or generated-image truth.

### Test Strategy

| ISC | Type | Check | Threshold | Tool |
| --- | --- | --- | --- | --- |
| 314–317 | baseline | backup, branch, allowlist, characterization | exact path match and non-zero bundle | git + Node |
| 318–325 | design contract | contrast, vocabulary, asset boundary, CSS motion | all focused tests pass | Vitest + Node |
| 326–331 | component behavior | async, dialog, graph and non-visual paths | exclusive states and keyboard reachability | Vitest + Playwright |
| 332–341 | product integration | reading, chat, Folio, engines, nodes, settings, dyad | typed fixtures and route assertions pass | Vitest + Playwright |
| 342–345 | exit gate | navigation, viewports, Axe, redaction, build and budget | zero critical violations | Playwright + npm |

### Features

| Feature | Satisfies | Depends on | Parallelizable |
| --- | --- | --- | --- |
| Recoverable integrated baseline | 314–317 | current dirty worktree | no |
| Semantic visual contract | 318–325 | baseline checkpoint | no |
| Shared interface primitives | 326–331 | semantic visual contract | yes |
| Canonical reading ecosystem | 332–341 | shared primitives | yes, file-isolated |
| Full exit verification | 342–345 | all implementation tasks | no |

### Decisions

- 2026-07-27: Execution follows the approved thirteen-task plan in checkpoint
  batches; the first review boundary is Tasks 0–2.
- 2026-07-27: Temperance is used for independent read-only audits until shared
  semantic foundations are committed; overlapping runtime edits remain on the
  primary rail.
- 2026-07-27: A reviewed allowlist is required before the integrated baseline
  commit because the starting worktree intentionally contains broad prior work.
