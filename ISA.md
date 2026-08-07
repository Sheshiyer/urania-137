---
task: "Publish the verified Urania witness-prompt landing to Cloudflare Pages"
slug: 20260801-landing-production-deploy
project: Urania 137
effort: advanced
effort_source: classifier
phase: complete
progress: 32/32
mode: interactive
started: 2026-08-01T11:53:06Z
updated: 2026-08-01T13:21:45Z
iteration: 23
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

Produce a clear architectural map of the full Instagram reference and a phased implementation plan so that Urania 137 moves from a single-layer radial graph to a multi-page, multi-depth stellar node console where each of the seven parent nodes has its own navigable page and each page branches into the relevant Selemene report dimensions. The completed console must preserve the graph-first brand, chat-to-reading continuity, canonical Folio recovery, zero-trust consent boundaries, and honest source-shaped engine presentation under one reproducible exit gate.

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

## Architecture

<!-- arch-assets:start -->

_Auto-maintained by `ArchitectureAssetsSync.hook.ts` on release events._  
_Last refreshed: 2026-08-01T11:49:40.125Z_

| Asset | Status | How it's generated |
|---|---|---|
| [`docs/architecture/SERVICES.md`](docs/architecture/SERVICES.md) | ✓ current | auto (file scan) |
| [`docs/architecture/DEPENDENCY-GRAPH.md`](docs/architecture/DEPENDENCY-GRAPH.md) | ✓ current | auto (file scan) |
| [`docs/architecture/architecture.html`](docs/architecture/architecture.html) | ✗ not yet generated | manual (LLM skill) |
| [`docs/architecture/notebooklm-prompt.md`](docs/architecture/notebooklm-prompt.md) | ✗ not yet generated | manual (LLM skill) |

**To refresh LLM-generated assets:** invoke `/refresh-architecture` in any Claude Code session.

<!-- arch-assets:end -->

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

- 2026-07-27 | conjectured: semantic token tests, source contracts, and focused component tests were sufficient to prove the realigned reading surfaces accessible and evidence-safe.
  refuted by: the stable-state Axe matrix exposed computed contrast and ARIA defects that source tests missed, while the evidence gate exposed whitespace backtracking in the quoted `[MASKED]` sentinel detector.
  learned: accessibility and privacy claims require one integrated gate that combines static contracts with computed built-runtime behavior, deterministic synthetic fixtures, and exact allowlisted artifacts.
  criterion now: ISC-344 and ISC-345 require the complete `verify:ui-realignment` orchestrator, including 33 stable-state browser rows, blocking Axe, evidence redaction, build, and bundle budget.

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

- [x] ISC-314: Recoverable binary-diff and untracked-file backups exist before runtime edits.
- [x] ISC-315: The implementation runs on the dedicated `codex/urania-graph-first-ui-realignment` branch.
- [x] ISC-316: The baseline checkpoint contains exactly the reviewed intentional path allowlist.
- [x] ISC-317: The baseline harness records known violations and a non-zero production bundle size.
- [x] ISC-318: Semantic text tokens meet WCAG contrast on Void and instrument surfaces.
- [x] ISC-319: Evidence colors and interaction colors are structurally distinct.
- [x] ISC-320: Parchment reading ink and muted text meet WCAG contrast.
- [x] ISC-321: Typography roles declare readable minimums and sustained-reading measure.
- [x] ISC-322: Centralized UI copy passes the prohibited-vocabulary gate.
- [x] ISC-323: Runtime source imports no generated moodboard or page-reference asset.
- [x] ISC-324: Default instrument panels use structural rules without generic SaaS blur.
- [x] ISC-325: Meaningful motion collapses under reduced motion and data marks stay static.
- [x] ISC-326: AsyncBoundary renders ready content without a status shell.
- [x] ISC-327: AsyncBoundary renders exactly one loading, empty, partial, stale, denied, or error state.
- [x] ISC-328: InstrumentDialog provides one accessible focus-managed overlay contract.
- [x] ISC-329: Chat and informational overlays use InstrumentDialog without duplicate shells.
- [x] ISC-330: Every graph relationship has a named non-visual equivalent.
- [x] ISC-331: Graph interaction remains keyboard reachable at narrow and wide viewports.
- [x] ISC-332: Canonical readings render separate Reading, Evidence, and privacy-filtered Source layers.
- [x] ISC-333: Chat transitions explicitly into the canonical reading without a mutating long-form live region.
- [x] ISC-334: Home retains exactly seven parent nodes and offers a direct reading doorway.
- [x] ISC-335: Folio browsing, filtering, grouping, and reading detail use one coherent surface.
- [x] ISC-336: All eighteen engines map to typed reusable reading instruments.
- [x] ISC-337: All six workflows expose honest member, state, provenance, and fallback presentation.
- [x] ISC-338: Node pages distinguish runnable, partial, capture-gated, unavailable, and informational children.
- [x] ISC-339: Operator evidence contains no personal interpretation or browser-side authorization.
- [x] ISC-340: Settings preserve owner, subject, consent, relationship, and revocation boundaries.
- [x] ISC-341: Dyad readings present both subjects symmetrically in the canonical grammar.
- [x] ISC-342: Deep links, hash history, browser navigation, and refresh behavior remain verified.
- [x] ISC-343: Desktop, effective-reflow, and mobile visual matrices pass with deterministic fixtures.
- [x] ISC-344: Accessibility, evidence-redaction, build, focused tests, and bundle budgets pass.
- [x] ISC-345: Anti: no default surface exposes raw JSON, fictional telemetry, generic SaaS styling, or generated-image truth.

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
- 2026-07-27: The external Temperance rail emitted only two plan descriptors
  and no terminal index, so the documented fail-open path used three independent
  read-only Codex audits. Those lanes reported no workspace writes; primary-rail
  staging remained limited to the named task files.
- 2026-07-27: The first executing-plans checkpoint stops after Tasks 0–2. Mobile
  SVG label density and Folio map overlap are carried into the already-planned
  SemanticGraph and Folio tasks rather than hidden inside the token task.
- 2026-07-27: The user explicitly resumed Tasks 3–12 to finish the plan.
  Execution continues in dependency-safe batches: shared primitives 3–5;
  home/chat/Folio/engine surfaces 6–9; node/settings integration 10–11; then
  the non-parallel full exit gate 12.
- 2026-07-27: Tasks 3–5 use non-overlapping Codex write lanes while Temperance
  external lanes audit their accessibility, graph, and reading-privacy
  contracts. External failures fail open to read-only Codex review; no external
  mutation is applied directly to the shared worktree.
- 2026-07-27: Advisor initially blocked Batch A until exact ownership was
  proven. Parsed manifests contain 6 Task-3 paths, 8 Task-4 paths, and 14
  Task-5 paths with pairwise-empty intersections. The dependency graph has no
  reverse edge from Tasks 6–12 into Tasks 3–5.
- 2026-07-27: Task 4 may only add to `tokens.ts` and `types/index.ts`; it must
  not remove or rename `STATE.goldWarm`, `ChildRun`, `RelationshipContext`,
  `SubjectInput`, or any symbol read by Tasks 3/5. Every lane's actual write
  list is compared exactly with its manifest before integration.
- 2026-07-27: Root-cause-at-ingestion: interface drift enters when Modal,
  constellation, and reading surfaces each encode behavior downstream.
  Repairing the shared primitives makes their later home/chat/Folio/settings
  consumers converge; display-down patches would repeat the defect.
- 2026-07-27: Task-4 read-only audit expanded ownership to `HomePage.tsx` and
  `CoreGlow.tsx`: the home adapter dropped source purpose before graph entry
  construction, and the interactive central hub remained mouse-only. Both are
  repaired test-first before accepting the graph commit.
- 2026-07-27: Task-5 read-only audit blocked acceptance after focused tests
  passed: raw-only flat records could bypass Source filtering through Reading,
  nested capture objects reset the default-deny policy, contextual Markdown
  headings could duplicate the section heading level, and portable Evidence
  lacked explicit access-reason/checksum slots. Adversarial tests now own these
  boundaries before the reading commit.
- 2026-07-27: Batch-A acceptance is evidence-based: the shared dialog, graph,
  and reading commits remain atomic; the full browser matrix is read-only and
  exercises the built Cloudflare Pages runtime at wide, effective-reflow, and
  mobile widths before Tasks 6–9 are allowed to begin.
- 2026-07-27: Tasks 6–9 converge on one saved Reading identity. Home and chat
  are doorways, Folio is recovery and browsing, and engine/workflow output
  registries are source-shaped instruments rather than raw JSON surfaces.
- 2026-07-27: Independent Task-9 review blocked analyzed capture payloads that
  lacked a persisted reading/session identifier and a nested period spiral
  that hid its planetary value. Adversarial tests now fail both cases closed.
- 2026-07-27: Tasks 10–11 preserve authority boundaries: operator facts remain
  endpoint-backed, while dyad access requires a current or historical
  participant grant. Neither email identity nor an administrative role can
  substitute for consent.
- 2026-07-27: The first Batch-B browser gate passed 63/70 checks and exposed
  two real shared-boundary defects: 401/403 Folio responses lost their typed
  denied state, and several chrome/reading actions rendered below 44×44.
  Both repairs were added test-first before the remediation rerun.
- 2026-07-27: The Task-12 Axe matrix remains blocking for serious and critical
  findings. It exposed reading-instrument contrast, a transient dialog-motion
  measurement, and a composing-beat ARIA defect; runtime issues were repaired
  test-first, while the harness now waits for finite dialog entrance motion
  before measuring the stable state.
- 2026-07-27: The checked-in browser evidence is entirely synthetic and
  allowlisted. It uses only `.test` identities, forwards no mutations, contacts
  no live corpus or Selemene endpoint, and contains no raw capture, birth,
  credential, absolute-path, or production-identity material.

### Verification

- ISC-314: `stat` reported a 183,180-byte tracked patch and a 13,297,526-byte
  untracked archive before runtime edits.
- ISC-315: `git branch --show-current` returned
  `codex/urania-graph-first-ui-realignment`.
- ISC-316: staged-path equality was silent for all 128 reviewed paths;
  `git diff --cached --check` passed and the staged secret scan returned zero.
  Baseline commit: `f8ea4c145b621fa8520eb8aafb09ba77c6b0a0d8`.
- ISC-317: `npm run verify:ui-baseline` passed after transforming 1,619 modules
  and recorded three known violation groups plus `516660` bundle bytes.
- ISC-326: server-render verification passes ready children through without a
  `data-async-state` shell.
- ISC-327: eight focused tests verify exclusive non-ready states, distinct
  labels/icons, status/alert live regions, loading-only busy state, and a
  single recoverable retry callback; independent read-only audit returned PASS.
- ISC-318–321: five semantic-token tests verify Void/Surface copy, separate
  evidence and interaction hues, contrast-safe evidence copy, Parchment ink,
  six typography roles, 12px metadata, and 70ch reading measure.
- ISC-322: vocabulary tests pass for both daily lexicons and centralized
  interface copy with no prohibited Folio synonyms.
- ISC-323: the Node asset-boundary test recursively scanned runtime TypeScript
  and found no generated or page-reference asset dependency.
- ISC-324: browser QA found zero visible default backdrop filters across home,
  Birth Witness, Folio, and Settings at 1440×1000 and 390×844.
- ISC-325: browser QA found zero running animations under reduced motion across
  eight route/viewport cases; brand audit returned PASS after motion timing and
  ambient-animation corrections.
- Task 1 coverage is explicit rather than inferred from the aggregate count:
  `semanticTokens.test.ts` maps to ISC-318–321,
  `vocabulary.test.ts` and `quickReplies.test.ts` map to ISC-322, and
  `ui-asset-boundaries.test.mjs` maps to ISC-323. Browser evidence maps default
  materials and reduced motion to ISC-324–325.
- Task 2 adds eight `AsyncBoundary.test.ts` cases for ISC-326–327; ready,
  loading, empty, partial, stale, denied, and error states are mutually
  exclusive, and retry exists only for recoverable error.
- `npm test` passed 56 files and 543 tests. The standalone generated-asset
  boundary passed, the production build transformed 1,619 modules, and the
  current JS+CSS bundle measured 515,753 bytes versus the recorded 516,660-byte
  starting baseline.
- Browser QA is reproducible from machine-readable reports and screenshots
  under the task visualization directory. The first matrix exercised home,
  Birth Witness, Folio, and Settings at 1440×1000 and 390×844 with console,
  page, request, response, overflow, blur, metadata, and reduced-motion probes;
  the final Settings report records the corrected 12px, 9.96:1 labels and zero
  browser diagnostics.
- The committed production bundle was then exercised through the actual
  Cloudflare Pages runtime at `http://127.0.0.1:8794`, not a Vite-only server.
  `task1-pages-runtime-report.json` records both Settings viewports and six
  home/Birth Witness/Folio smoke cases at HTTP 200 with zero console, page,
  request, bad-response, or horizontal-overflow findings. The graph exposes
  seven home nodes and eight Birth Witness nodes; all Settings APIs returned
  200 and the four metadata labels remained 12px at 9.96:1.
- ISC-328–329: `InstrumentDialog.test.ts` and 37 focused chat/dialog tests pass;
  the real Pages runtime verifies the focus-managed overlay at 1440×1000 and
  390×844. Commit: `c578660`.
- ISC-330–331: six graph-entry tests pass. Browser QA verifies every home and
  Birth Witness relation has the same named list path, every graph target is at
  least 44px, Tab reaches each destination in order with visible focus, and the
  semantic CoreGlow control owns its 44px center hit target. Commit: `3c4ce74`.
- ISC-332: 18 focused reading tests prove Reading/Evidence/Source separation,
  70ch measure, raw-only suppression, heading offset, honest Evidence fallback,
  and schema-aware nested capture redaction. Commit: `9599272`.
- Batch-A browser gate: 105/105 Playwright assertions pass across 1440×1000,
  720×1000, and 390×844, including reduced motion. It records zero console,
  page, request, or response diagnostics, zero overflow, zero workspace writes,
  and zero D1 mutations in
  `batch-a-visual-gate/report-all.md`.
- Fresh primary verification after both audit repairs passed 24/24 focused
  tests and a production build of 1,626 modules; CSS is 48.51 kB and JS is
  488.45 kB before gzip.
- ISC-333: `ReadingTransition` and `useThreadScroll` tests prove that composing
  narration is finite, long-form reading content is outside the live region,
  following pauses on user scroll, and only “Return to latest” resumes it.
  Commit: `80ef9b4`.
- ISC-334: home contracts and live browser evidence retain seven parent nodes,
  a direct Begin doorway, canonical Folio navigation, and collision-free
  mobile graph/card geometry. Commit: `f6380c7`.
- ISC-335: Folio view/layout tests and Pages evidence prove exclusive async
  states, deterministic map/list equivalence, canonical direct selection,
  structured Parchment reading detail, and collapsed Source. Commit: `ed51439`.
- ISC-336–337: the executable atlas reconciles exactly 18 engines and six
  workflows with typed instruments, written state, provenance, accessible
  equivalents, and honest fallback/capture gates. Commits: `f9767e2`,
  `d191cdb`.
- ISC-338–339: 15 node/operator contract checks prove real capability states,
  equivalent graph/list doorways, canonical Folio routes, endpoint-backed
  operator evidence, and no email-derived authority. Commit: `bc4058e`.
- ISC-340–341: independent read-only review passed 46 focused consent, dyad,
  provenance, HTTP, and accessibility checks. Settings uses exclusive shared
  boundaries; foreign/admin access fails closed; revocation blocks future
  generation while persisted participant grants remain historical. Commit:
  `cfbc072`.
- Integrated primary verification after Tasks 10–11 and Batch-B repairs passed
  75 files and 639 tests, the engine atlas and UI Node contracts passed 21/21,
  TypeScript/Vite built 1,649 modules, and `git diff --check` was silent.
- ISC-342: the focused exit suite passed all four hash-route history/deep-link
  checks; the deterministic route matrix opened every canonical home, node,
  Folio, selected Reading, Settings, operator, denied, current-grant, and
  historical-grant URL through the built Pages runtime.
- ISC-343: all 33 deterministic browser rows passed across desktop, mobile,
  effective 320px reflow, and reduced-motion contexts. Every row owns a PNG,
  DOM transcript, request ledger, console ledger, and Axe record in the exact
  168-file allowlist under `docs/ui/evidence/realignment/`.
- ISC-344: `npm run verify:ui-realignment -- http://127.0.0.1:8788` passed
  seven UI contract checks, 103 focused tests, nine engine-atlas checks, all
  77 test files and 653 tests, Functions typechecking, a production build of
  1,649 modules, 33 browser rows, four evidence-redaction checks, and
  `git diff --check`. JS+CSS measured 567,565 bytes against the unexplained
  568,326-byte ceiling.
- ISC-345: every matrix row records zero blocking Axe violations and zero
  forwarded mutations; technical JSON stays collapsed and privacy-filtered,
  runtime imports exclude generated design boards and fixture modules, and the
  registry remains exactly eighteen real engines plus six honest workflows.
  Accessibility remediation commit: `a3395ce`.

### Learn

- Passing source-token assertions did not guarantee computed browser contrast;
  browser inspection caught translucent metadata combinations that required a
  second correction.
- A non-terminal Temperance rail must fail open into explicitly read-only
  equivalent audits, while preserving path ownership and recording that the
  external index never arrived.
- The characterization command intentionally rewrites its JSON measurement.
  Post-task verification must restore the immutable starting measurement before
  the working tree is considered clean.
- Vite preview is not a valid integrated QA target for this Pages application:
  it omits `/api/*` Functions and can create false UI failures. Browser gates
  must use `wrangler pages dev dist` or a deployed Pages environment.
- Static token checks are necessary but insufficient for nested dark
  instruments: computed Axe contrast found opacity, font-size, and inherited
  reading-ink combinations that source-level checks could not prove.
- Accessibility measurements must target the stable interaction state.
  Finite entrance animations now settle before Axe, while reduced-motion rows
  still independently prove that meaningful motion collapses.
- Evidence redaction tests must distinguish an actual sensitive value from a
  quoted `[MASKED]` sentinel without regex whitespace backtracking; the fixed
  detector preserves fail-closed scanning for all unmasked values.

## Iteration 11 — Role-Aware Journey and Reading Presentation Repair (2026-07-27)

### Problem

The production home and Reading surfaces expose three regressions that the
previous source-level contracts did not catch. Independent fixed chrome layers
compete for the same viewport, mobile navigation presents four equally weighted
labels, and technical engine serialization can still appear as reader-facing
narrative. The first-run gate also treats any subject row as a completed self
profile and never refreshes lifecycle state after Threshold completion.

### Vision

Urania opens as one coherent celestial instrument. New readers cross a semantic,
progressively enhanced Threshold; returning readers resume directly inside
their map; authorized operators gain an additive evidence doorway without
losing the personal reading journey. Every engine and witness result resolves
into the branded typed component grammar, while exact technical provenance
remains lossless, collapsed, and privacy-filtered in Source.

### Out of Scope

- No client-side email rule authorizes operator data or cross-user actions.
- No replacement of the existing Threshold state machine or persisted sessions.
- No database, D1 ReadingDTO, relationship-consent, or Selemene engine contract
  migration.
- No scroll hijacking that blocks keyboard, touch, screen-reader, or reduced
  motion access.
- No generated moodboard asset becomes runtime data, evidence, or telemetry.

### Constraints

- CF Access identity remains the sole authentication boundary.
- Operator presentation is asserted by server configuration and remains
  separate from all owner, subject, relationship, and consent authorization.
- The graph remains the primary spatial interface at every depth.
- Exact engine responses remain available for persistence and provenance, but
  never become default reading prose.
- The existing Urania Void, Gold, Parchment, Silver, serif, display, hairline,
  and constellation vocabulary remains the complete visual token family.

### Goal

Ship and verify a responsive shared shell, correct new/returning/operator
journeys, and a typed reading handoff that eliminates the raw JSON visible in
the supplied production screenshot without weakening persistence, privacy, or
authorization.

### Criteria

- [x] ISC-346: A profile without a stored `self` subject classifies as new.
- [x] ISC-347: A stored `self` subject classifies the reader as returning.
- [x] ISC-348: Operator presentation derives only from a server-asserted capability.
- [x] ISC-349: Operator presentation never bypasses server-side ownership or consent authorization.
- [x] ISC-350: Experience-resolution failure exposes one explicit recoverable degraded state.
- [x] ISC-351: Returning readers land on the map without Threshold redirection.
- [x] ISC-352: Incomplete Threshold sessions resume at the first unfinished gate.
- [x] ISC-353: Threshold completion promotes lifecycle state before map interaction begins.
- [x] ISC-354: Returning home foregrounds continuation, Folio, and reading doorways.
- [x] ISC-355: Operator home adds evidence tools without hiding personal doorways.
- [x] ISC-356: Shared chrome reserves layout space instead of overlaying page content.
- [x] ISC-357: Mobile navigation initially exposes one menu trigger, not four labels.
- [x] ISC-358: Home graph labels remain inside explicit top and bottom safe zones.
- [x] ISC-359: Reduced-motion onboarding remains complete without scrubbed animation.
- [x] ISC-360: Keyboard and screen-reader users can complete every Threshold gate sequentially.
- [x] ISC-361: Home, node, Folio, settings, and dyad routes share one navigation contract.
- [x] ISC-362: Completed deterministic results contain no fenced-JSON presentation chapter.
- [x] ISC-363: Deterministic results preserve the exact response in `sourcePayload`.
- [x] ISC-364: Deterministic archive content remains lossless and storage-only.
- [x] ISC-365: Reading adapters never copy deterministic serialization into visible body text.
- [x] ISC-366: Every known single-engine payload produces a non-raw reading element.
- [x] ISC-367: Known workflows expose their returned system ledger.
- [x] ISC-368: Returned known workflow engines produce their typed element families.
- [x] ISC-369: Unknown deterministic payloads render an explicit source-only orientation.
- [x] ISC-370: Typed deterministic previews expose neither code fences nor JSON syntax.
- [x] ISC-371: Save-failed deterministic readings retain typed presentation without JSON.
- [x] ISC-372: Technical Source remains closed and privacy-filtered by default.
- [x] ISC-373: Witness results preserve `source_pack` for typed presentation and provenance.
- [x] ISC-374: Technical witness passes never render serialized objects as narrative sections.
- [x] ISC-375: Legacy Folio technical bodies never render as default prose.
- [x] ISC-376: Valid legacy named payload fragments recover into typed reading elements.
- [x] ISC-377: Unrecognized legacy technical bodies degrade to source-only orientation.
- [x] ISC-378: Reading navigation occupies flow and never covers the Reading title.
- [x] ISC-379: Expanded technical Source cannot create viewport-level horizontal overflow.
- [x] ISC-380: Threshold motion is progressive enhancement over semantic section content.
- [x] ISC-381: The operator doorway is visible only when the server capability is present.
- [x] ISC-382: Anti: no browser code contains a privileged-email allowlist.
- [x] ISC-383: Anti: no raw braces, `engine_id`, or JSON fence appears outside Source.
- [x] ISC-384: Anti: no route composes multiple independently fixed chrome regions.
- [x] ISC-385: Anti: no mobile header presents four competing primary text controls.
- [x] ISC-386: Role, route, viewport, motion, and reading-payload browser fixtures all pass.
- [x] ISC-387: Build, focused tests, Axe, redaction, and bundle budgets pass.

### Test Strategy

| ISC | Type | Check | Threshold | Tool |
| --- | --- | --- | --- | --- |
| 346–355 | lifecycle | self-subject classification, server capability, completion refresh, route policy | complete state matrix passes | Vitest + Functions tests |
| 356–361 | shell and onboarding | flow layout, menu disclosure, safe zones, semantic gates, motion fallback | no overlap or blocked gate | Vitest + Playwright |
| 362–373 | live reading | deterministic/witness result mapping, typed extraction, archive separation | zero JSON outside Source | Vitest |
| 374–380 | legacy and accessibility | technical-section classification, named fragment recovery, overflow, sequential forms | typed or source-only fallback | Vitest + Playwright |
| 381–385 | authority and anti-regression | server assertion, no email inference, no fixed-layer or mobile-label recurrence | all negative probes absent | Node + Playwright |
| 386–387 | exit gate | full role/route/payload matrix, Axe, redaction, build, bundle | zero blocking findings | Playwright + npm |

### Features

| Feature | Satisfies | Depends on | Parallelizable |
| --- | --- | --- | --- |
| Server-authoritative viewer context | 346–355, 381–382 | CF Access identity and subjects | yes |
| Shared responsive viewport shell | 356–361, 378, 384–385 | existing chrome primitives | yes |
| Structured live-result handoff | 362–374 | ReadingDocument and element registry | yes |
| Legacy technical-reading recovery | 375–377, 383 | structured handoff classifiers | yes |
| Integrated browser exit matrix | 379–380, 386–387 | all implementation lanes | no |

### Decisions

- 2026-07-27: The user screenshots are the primary visual reference. Refero
  live search returned `NO_SUBSCRIPTION`, so the offline path preserves the
  existing Urania assets and established craft references without importing a
  new visual family.
- 2026-07-27: The production reading screenshot is a separate witness/native
  pass leak in addition to the deterministic fenced-JSON defect. Both ingress
  paths are explicit test surfaces.
- 2026-07-27: Lifecycle and privilege are orthogonal. Lifecycle derives from
  a stored `self` subject; operator presentation derives from a server-side
  allowlist evaluated only after CF Access verification.
- 2026-07-27: Operator presentation is not authorization. Existing owner,
  participant, and consent checks remain unchanged and cannot be bypassed by
  the new viewer capability.
- 2026-07-27: Threshold already owns the required seven-scene scroll journey
  and persisted chat state. This iteration integrates its completion signal,
  removes gate-clamping for reduced motion, and treats scrub effects as
  progressive enhancement rather than rebuilding the onboarding engine.
- 2026-07-27: Storage and presentation split at the reading adapter boundary.
  `sourcePayload` and archive content stay lossless; reader-facing sections
  admit only narrative or typed component output.
- 2026-07-27: A single shared shell owns navigation and graph/footer safe
  zones. Decorative framing may remain fixed because it is non-interactive and
  occupies no content space.
- 2026-07-27: The immutable 516,660-byte historical bundle baseline remains
  intact. The exact pre-change commit `e7d5d8e` rebuilt to 567,565 bytes, so
  iteration 11 carries a separate reviewed two-percent incremental ceiling.

### Changelog

- 2026-07-27: Iteration 11 opened after production screenshots falsified the
  previous anti-JSON and non-overlap acceptance criterion.
- 2026-07-27: IterativeDepth ran eight stakeholder, temporal, experiential,
  failure, literal, constraint-inversion, analogical, and meta lenses across
  two read-only implementation lanes.
- 2026-07-27: SystemsThinking identified shifting-the-burden: route-local
  fixed offsets and renderer-local serialization decisions repeatedly
  reproduce the same visual defect.
- 2026-07-27: RootCauseAnalysis traced raw JSON to a missing boundary between
  persistence serialization and presentation chapters, compounded by missing
  source-level witness payload propagation.
- 2026-07-27: Advisor blocked email-derived administrator UI and made
  server-authoritative capability assertion a build prerequisite.
- 2026-07-27: Browser QA found two failures missed by source checks: the mobile
  graph list ran behind bottom chrome and a selected Reading inherited a
  576-pixel min-content width. Measured viewport assertions now guard both.
- 2026-07-27: The final read-only audit found no blocking or high-severity
  defects. Its three P2 probes are closed by broader witness serialization
  classification, validated subject responses, and a new-lifecycle first-paint
  gate; the P3 live-handoff browser gap remains covered at component/integration
  level rather than being promoted into this bounded visual matrix.
- 2026-07-27: The integrated exit gate completed with 681 application tests,
  106 focused UI tests, 36 deterministic browser rows, blocking Axe, evidence
  redaction, Functions typecheck, build, and bundle budget all green.

### Verification

- ISC-346–355 and ISC-381–382: lifecycle, viewer-context, TopNav, Home, and
  Functions route tests pass. A spoofed browser role cannot grant operator
  presentation; the verified server capability remains presentation-only.
- ISC-356–361 and ISC-378–380: browser geometry proves the route field begins
  below navigation, fills the remaining dynamic viewport, list scrolling ends
  above bottom chrome, and Reading layers stay within the viewport. Independent
  browser QA completed returning, operator, new-user, keyboard-reachable
  Threshold, 390-pixel mobile, and 1440-pixel desktop journeys without errors.
- ISC-362–377 and ISC-383: deterministic, witness, legacy, preview, Folio, and
  transition suites prove that technical serialization is storage/Source-only,
  known structures become typed elements, and unrecognized shapes receive an
  explicit source-only orientation.
- ISC-384–387: `npm run verify:ui-realignment -- http://127.0.0.1:8788`
  passed 681/681 application tests, 106/106 focused tests, 36/36 browser rows,
  zero blocking Axe violations, the complete redacted evidence manifest,
  Functions typecheck, production build, `git diff --check`, and the bundle
  budget at 577,622/578,916 bytes.
- The final read-only adversarial re-audit reports no blocking, high, P0, P1,
  or remaining P2 findings.

### Learn

- Reserving only padding beneath a scroll layer does not prevent intermediate
  rows from moving behind anchored chrome. The scroll viewport itself must end
  at the reserved boundary.
- `min-w-0` is a semantic layout boundary in CSS Grid: without it, an
  intentionally scrollable 36rem reading instrument can force its entire
  canonical document wider than a mobile viewport.
- A visual test that samples an entrance animation can report false computed
  contrast. The matrix now settles every finite surface animation while still
  leaving infinite ambient motion and reduced-motion behavior independently
  testable.
- Persistence fidelity and reader clarity are compatible only when the
  archive/source channel and presentation channel are separated before the
  reading adapter, not repaired after rendering.

## Iteration 12 — Engine Output Design-to-Code Integration Audit (2026-07-27)

### Problem

The engine-output atlas, generated reference boards, graph-first plans, typed
reading renderers, and browser evidence were created across several iterations.
Their completion claims have not yet been reconciled in one current, one-to-one
reference-to-code map that distinguishes design intent, reusable grammar,
engine-specific composition, route consumption, rendered evidence, and open
GitHub/planning work.

### Vision

A maintainer can open one durable audit and see, for every engine and workflow,
the exact visual reference, payload relationship, owning React component,
consumer path, evidence, honest integration state, remaining issue, and next
action. The result makes “implemented” falsifiable and reveals whether the
remaining work is renderer construction, composition, route integration,
visual fidelity, evidence, or issue hygiene.

### Out of Scope

- No application runtime, engine contract, database, or authorization change.
- No redesign or new visual reference generation.
- No GitHub issue, label, project, milestone, or pull-request mutation.
- No claim that a generated board is literal shipped application behavior.
- No private reading values, credentials, or capture payloads in the report.

### Constraints

- The graph remains the primary interface at every depth.
- Reference boards are design contracts; source and browser evidence determine
  shipped integration.
- Shared visual grammars and engine-specific compositions must be scored
  separately.
- Every percentage must publish its denominator and scoring rule.
- GitHub and repository planning state must be captured from the same audit run.

### Goal

Produce and verify a one-to-one Engine output design-to-code integration audit
that quantifies current coverage, identifies every remaining gap, and reconciles
those gaps with open GitHub issues and repository planning without modifying
product code or remote state.

### Criteria

- [x] ISC-388: The audit inventories every canonical Engine output visual reference.
- [x] ISC-389: The audit inventories both generated Engine output reference boards.
- [x] ISC-390: The manifest still declares exactly eighteen engines.
- [x] ISC-391: The manifest still declares exactly six workflows.
- [x] ISC-392: Every engine has exactly one primary audit row.
- [x] ISC-393: Every workflow has exactly one primary audit row.
- [x] ISC-394: Every row names its expected visual composition.
- [x] ISC-395: Every row names its owning implementation component.
- [x] ISC-396: Every row names its consumer route or reading surface.
- [x] ISC-397: Every row names source, test, screenshot, or runtime evidence.
- [x] ISC-398: Every row receives one explicit integration status.
- [x] ISC-399: Shared grammar coverage is separated from engine composition coverage.
- [x] ISC-400: Implemented atlas claims are checked against current source.
- [x] ISC-401: Partial, proposed, and capture-gated claims remain visibly distinct.
- [x] ISC-402: Integration percentage publishes its denominator and weighting.
- [x] ISC-403: The audit captures every currently open GitHub issue.
- [x] ISC-404: The audit captures repository planning artifacts relevant to Engine outputs.
- [x] ISC-405: Remaining gaps are reconciled against issues and plans.
- [x] ISC-406: Untracked implementation gaps are explicitly identified.
- [x] ISC-407: Remaining actions are prioritized by dependency and user impact.
- [x] ISC-408: The report links exact repository paths for every code claim.
- [x] ISC-409: The report contains a component-to-reference concept map.
- [x] ISC-410: Anti: the audit performs no GitHub mutation.
- [x] ISC-411: Anti: the audit performs no product runtime change.
- [x] ISC-412: Antecedent: references, code, and planning are inspected before scoring.

### Test Strategy

| ISC | Type | Check | Threshold | Tool |
| --- | --- | --- | --- | --- |
| 388–389 | references | enumerate canonical docs, images, and provenance | all authoritative files present | filesystem + image inspection |
| 390–393 | inventory | validate manifest counts and one-row coverage | 18 engines, 6 workflows | Node + report parser |
| 394–401 | mapping | cross-check expected composition, symbols, consumers, evidence, status | no unmapped row | CodeGraph + source + tests |
| 402 | metric | recompute published coverage from row scores | exact denominator and result | Node |
| 403–405 | planning | compare open GitHub items with repository plans and audit gaps | every open item classified | `gh` + filesystem |
| 406–409 | synthesis | inspect gap, priority, path links, and concept map sections | all sections present | report read-back |
| 410–411 | anti | inspect remote and worktree diff scope | no remote mutation, docs/ISA only | `gh` read-only + git diff |
| 412 | antecedent | confirm source snapshots precede scoring | evidence ledger present | report read-back |

### Features

| Feature | Satisfies | Depends on | Parallelizable |
| --- | --- | --- | --- |
| Canonical reference inventory | 388–389, 412 | atlas and assets | yes |
| Engine/workflow source mapping | 390–401, 408 | manifest, CodeGraph, source | yes |
| Coverage model | 398–402 | complete mapping | no |
| GitHub and plan reconciliation | 403–407 | current remote and local plans | yes |
| Durable audit and concept map | 405–412 | all evidence lanes | no |

### Decisions

- 2026-07-27: “Integrated” requires reference, contract, renderer, consumer,
  accessible equivalent, and verification evidence; names in a plan alone do
  not count.
- 2026-07-27: Product code and GitHub state remain read-only. Only this ISA and
  the durable audit report may change.
- 2026-07-27: Advisor required a frozen denominator and a four-tier
  reachability rubric: 0 absent, 1 declared only, 2 wired/tested, 3
  runtime-verified. Reference coverage, code presence, and runtime verification
  will be published separately.
- 2026-07-27: `EngineReading` and `WorkflowReading` have no live product caller.
  The current product path is `ReadingTransition` or Folio selection →
  `ReadingFolio` → `ReadingElementField`; atlas-specific shells therefore count
  as declared/tested infrastructure, not live route integration.

### Changelog

- Conjectured: the generated atlas registry and its named Engine/workflow
  shells represented the presentation path shipped to users.
- Refuted by: the caller graph, current route consumers, and browser-evidence
  corpus show that those shells are unmounted and completed visual proof is
  nearly absent.
- Learned: the live product is semantically integrated through
  `ReadingFolio → ReadingElementField`, while exact visual composition and
  runtime proof are separate, much less complete layers.
- Criterion now: future completion reporting must publish reference coverage,
  live semantic reachability, exact composition coverage, and populated
  browser proof as separate denominators.

### Verification

- ISC-388–389 and ISC-412: 20 governing reference/provenance files were
  frozen before scoring; all 15 scoped images were inspected at original
  resolution and all five final generation hashes matched.
- ISC-390–393: a report parser independently reconciled the executable atlas
  to 18 engines, 6 workflows, and 49 component contracts, then found exactly
  18 engine rows, 6 workflow rows, and 49 component rows.
- ISC-394–401 and ISC-408–409: CodeGraph and source inspection traced every
  envelope through `extractReadingElements → ReadingFolio →
  ReadingElementField`, located all live consumers, separated the unmounted
  atlas shell, and recorded exact code ownership plus the concept map.
- ISC-402: the frozen tier reconciliation is T1=11, T2=37, and T3=1. The
  report separately publishes 18/18 live semantic paths, 38/49 wired/tested
  contracts, 0/6 named workflow composites, 1/18 populated browser DOM
  artifacts, and 0/18 completed-output screenshots.
- ISC-403–407: an authenticated read-only GitHub query returned exactly 16
  open issues, all in the Cloudflare milestone, zero Project items, and zero
  open pull requests. All 16 are mapped against local completion evidence,
  current planning gaps, and prioritized actions.
- ISC-410–411: no GitHub mutation or product-code change occurred. Worktree
  scope is `ISA.md` plus the new durable audit report.
- Focused renderer/registry verification passed 60/60 tests; the executable
  atlas suite passed 9/9; the full application suite passed 681/681 across 83
  files; the production build passed with 1,654 transformed modules.
- `git diff --check` passed. Existing parent Astro config and Vite chunk-size
  warnings remain non-blocking and were not caused by this audit.
- ReReadCheck confirmed all five explicit asks: review all scoped design visual
  references; map them one-to-one to codebase components; quantify integration;
  enumerate remaining GitHub issues; and reconcile current planning.

### Learn

- A complete typed renderer grammar can coexist with incomplete product
  composition and almost no screenshot proof; those claims must never share a
  single blended percentage.
- Exact component-name matching is a traceability convenience, not evidence of
  live reachability. Caller paths and populated browser artifacts are the
  stronger completion probes.
- Issue hygiene can conceal current risk: all 16 open tickets describe already
  completed migration work, while the real Engine reachability and evidence
  gaps have no issue coverage.
- The next implementation loop should begin with the live canonical route and
  an 18-engine proof matrix, not with more generated visual boards.

## Iteration 13 — Canonical Engine Composition Pass (2026-07-27)

### Problem

The live `ReadingFolio → ReadingElementField` path renders all known semantic
elements, but it treats them as an undifferentiated auto-fit card grid. The
executable Engine registry, six workflow composition contracts, family
hierarchy, primary/secondary relationships, status, and provenance are still
absent from the product path. Flat Engine readings also spend the first
viewport on an “Unstructured source” atlas, leaving the actual output below
the fold.

### Vision

Every returned Engine or workflow opens as a source-honest instrument with a
clear composition hierarchy: the primary relationship leads, secondary
evidence supports it, unresolved states remain named, and the exact source is
still available in the collapsed Source layer. All eighteen Engines and six
workflows share one canonical compositor. The resulting desktop and mobile
screenshots are ready for the principal’s visual review without claiming that
human visual acceptance has already occurred.

### Out of Scope

- No new Engine fields, inferred relationships, computed values, or synthetic
  telemetry.
- No database, Folio persistence, authorization, Selemene, capture, or API
  contract change.
- No new design reference, motion library, animation system, or generated
  asset.
- No claim that the composition passes human visual review in this iteration.
- No implementation of source layers that the audit classified as genuinely
  missing, such as Bodygraph activations or Gene Keys frequency records.

### Constraints

- The graph remains the primary doorway at every depth.
- `ReadingFolio → ReadingElementField` remains the only product presentation
  path for Engine and workflow output.
- Geometry may encode only explicit membership, order, source slots, or state.
- Reading, Evidence, and collapsed privacy-filtered Source remain distinct.
- Every visual grouping retains semantic headings and a non-visual equivalent.
- Existing responsive, reduced-motion, authorization, and privacy contracts
  must remain intact.

### Goal

Implement and verify an Engine-aware and workflow-aware composition layer
inside the canonical Reading path, covering all eighteen Engine contracts and
all six workflow compositions while preserving source order, privacy,
accessibility, and responsive containment. Produce deterministic desktop and
mobile screenshots for the user’s visual review.

### Criteria

- [x] ISC-413: The live `ReadingElementField` mounts the compositor that consumes the executable Engine registry.
- [x] ISC-414: The live `ReadingElementField` mounts the compositor that consumes the executable workflow registry.
- [x] ISC-415: All eighteen registered Engine IDs render an Engine composition wrapper.
- [x] ISC-416: Each Engine wrapper publishes its registered family.
- [x] ISC-417: Each Engine wrapper publishes its registered status.
- [x] ISC-418: Each Engine wrapper publishes its registered provenance.
- [x] ISC-419: Each Engine wrapper names its primary atlas component.
- [x] ISC-419.1: Every composed wrapper is a labelled semantic region.
- [x] ISC-420: Matching primary-kind elements occupy the primary composition slot.
- [x] ISC-421: Remaining Engine elements occupy a source-ordered supporting slot.
- [x] ISC-422: Unknown source systems retain the generic semantic-element fallback.
- [x] ISC-423: Raw elements retain privacy-filtered rendering outside composed Engine slots.
- [x] ISC-424: All six registered workflow IDs render a named workflow composition wrapper.
- [x] ISC-425: The Birth Blueprint wrapper identifies `CompositeIdentityMap`.
- [x] ISC-426: The Creative Expression wrapper identifies `CreativeArtifactShelf`.
- [x] ISC-427: The Daily Practice wrapper identifies `TemporalPracticeSequence`.
- [x] ISC-428: The Decision Support wrapper identifies `PerspectiveComparison`.
- [x] ISC-429: The Full Spectrum wrapper identifies `FullSpectrumConstellation`.
- [x] ISC-430: The Self-Inquiry wrapper identifies `InquiryLayerStack`.
- [x] ISC-431: Workflow Engine groups preserve their declared registry order.
- [x] ISC-432: Every input element receives exactly one composition owner.
- [x] ISC-432.1: Returned undeclared workflow Engines remain visible after declared groups.
- [x] ISC-433: Flat known-Engine Folios omit the misleading unstructured-source atlas.
- [x] ISC-434: Native section Folios retain the source-supplied Reading atlas.
- [x] ISC-435: The unmounted `EngineReading` and `WorkflowReading` shells gain no product caller.
- [x] ISC-436: Anti: no composed surface exposes raw JSON in the Reading layer.
- [x] ISC-437: Anti: the composition pass invents no cross-Engine causal relationship.
- [x] ISC-438: Anti: no API, database, authorization, or persistence file changes.
- [x] ISC-439: Anti: no animation dependency or layout-animating behavior is added.
- [x] ISC-440: Focused composition and Folio tests pass.
- [x] ISC-441: The complete application test suite passes.
- [x] ISC-442: The production TypeScript/Vite build passes.
- [x] ISC-443: Desktop and mobile browser probes show composed output without viewport overflow.
- [x] ISC-444: Antecedent: deterministic screenshots expose the completed composition for human visual review.

### Test Strategy

| ISC | Type | Check | Threshold | Tool |
| --- | --- | --- | --- | --- |
| 413–414 | source | canonical field mounts the registry-aware compositor | exact live call path present | source read |
| 415–423 | component | render all Engine, unknown, and raw groups | every wrapper/slot/fallback asserted | Vitest SSR |
| 424–432.1 | workflow | render six named workflow variants, ownership, and order | six wrappers; stable order; no duplicate output | Vitest SSR |
| 433–434 | Folio | compare flat Engine and native section output | conditional atlas behavior exact | Vitest SSR |
| 435 | architecture | inspect callers after implementation | no new product caller | CodeGraph/source |
| 436–439 | anti | inspect rendered markup, diff scope, dependencies | zero prohibited drift | tests + git diff |
| 440 | focused | composition/Folio suite | all pass | Vitest |
| 441 | regression | application suite | all pass | `npm test` |
| 442 | build | production compile and bundle | exit zero | `npm run build` |
| 443 | browser | desktop/mobile layout and Axe | no root overflow; zero serious/critical | Playwright |
| 444 | review artifact | read back deterministic PNG paths | desktop and mobile images exist | filesystem + image inspection |

### Features

| Feature | Description | Satisfies | Depends on | Parallelizable |
| --- | --- | --- | --- | --- |
| Engine compositor | Registry-aware primary/supporting layout for eighteen Engines | 413–423 | existing registry and element renderers | no |
| Workflow compositor | Six named layouts using explicit membership and source order | 414, 424–432 | Engine compositor | no |
| Folio hierarchy | Put known output before misleading flat-source atlas | 433–434 | compositors | no |
| Composition verification | SSR, full-suite, build, browser, and screenshots | 435–444 | all implementation | no |

### Decisions

- 2026-07-27: The composition pass extends the canonical live path instead of
  mounting the parallel `EngineReading` / `WorkflowReading` architecture.
- 2026-07-27: Registry primary/secondary metadata controls hierarchy, while the
  existing element renderers remain the only value projection layer.
- 2026-07-27: Workflow compositions may vary layout and grouping only; they
  cannot manufacture relationships between returned Engines.
- 2026-07-27: Human visual acceptance is explicitly reserved for the user.
  This iteration ends at deterministic review-ready screenshots.
- 2026-07-27: The E3 delegation floor is intentionally relaxed. The component,
  Folio, and verification edits share one sequential presentation path; two
  write agents would overlap the same files and create merge risk.
- 2026-07-27: FirstPrinciples/Deconstruct reduced the composition to four
  irreducible inputs: explicit element kind, explicit source system, registry
  contract, and stable source order. No new payload model is required.
- 2026-07-27: SystemsThinking/FindLeverage selected the live registry
  information flow as the highest feasible intervention. The compositor will
  make registry intent visible where the user already reads output, rather
  than changing routes or mounting another shell.
- 2026-07-27: IterativeDepth applied literal, stakeholder, failure, and
  experiential lenses. It added review screenshots, unknown/raw preservation,
  anti-causality, mobile containment, and explicit human-review boundaries to
  the test surface.
- 2026-07-27: Premortem risks are nested-card density, mobile overflow,
  workflow order drift, swallowed unknown/raw elements, and accidental
  creation of a third presentation path. Each has a named SSR or browser
  probe in ISC-420–444.
- 2026-07-27: Advisor required explicit single ownership and accessible DOM
  order. Workflow composition owns its ledger and recognized Engine groups;
  each Engine group owns its source-ordered elements; unknown/raw groups remain
  separate fallbacks. Primary/supporting is a stable partition by original
  array index, and tests assert one rendered element per input.
- 2026-07-27: Direct screenshot inspection found unreadable inherited dark ink
  inside `DoshaClock` console cards. The card now uses parchment/metadata
  tokens, and the repaired desktop artifact was recaptured before handoff.
- 2026-07-27: The post-deliverable Advisor returned a conditional pass after
  receiving the concrete diff, inventory, test counts, route evidence,
  screenshot paths, and known gaps. Its required fixes produced an 18-way
  missing-specialization runtime probe, an explicit bounded completion
  definition, and a final test/build run after fixture deletion.

### Changelog

- Conjectured: `ReadingElementField` should directly import both registries to
  prove canonical-path consumption.
  Refuted by: the dispatcher would then mix composition policy with atomic
  element rendering and duplicate registry ownership.
  Learned: the canonical field can mount one registry-aware compositor while
  keeping the atomic dispatcher exhaustive and reusable.
  Criterion now: ISC-413 and ISC-414 require the live field to mount the
  compositor that consumes both registries.

### Verification

- ISC-413: source read — `ReadingElementField` renders `ReadingComposition`,
  whose source imports `ENGINE_VISUAL_REGISTRY`.
- ISC-414: source read — the same canonical compositor imports and consumes
  `WORKFLOW_VISUAL_REGISTRY`.
- ISC-415: Vitest SSR — all 18 registry entries emit one
  `data-engine-composition` wrapper.
- ISC-416: Vitest SSR — every wrapper publishes its exact
  `data-engine-family`.
- ISC-417: Vitest SSR — every wrapper publishes its exact
  `data-engine-status`.
- ISC-418: Vitest SSR — every wrapper publishes its exact
  `data-engine-provenance`.
- ISC-419: Vitest SSR — every wrapper publishes the registered primary atlas
  component.
- ISC-419.1: DOM snapshot + SSR — all Engine/workflow wrappers are labelled
  semantic regions.
- ISC-420: Vitest SSR — the registry-matching element occupies the primary
  composition slot.
- ISC-421: Vitest SSR — supporting items retain original relative order.
- ISC-422: Vitest SSR — unknown source systems render once in the unclassified
  fallback.
- ISC-423: Vitest SSR — raw output renders once through the privacy-filtered
  technical-source fallback.
- ISC-424: Vitest SSR — all six workflow IDs emit one named composition.
- ISC-425: Vitest SSR — Birth Blueprint publishes `CompositeIdentityMap`.
- ISC-426: Vitest SSR — Creative Expression publishes
  `CreativeArtifactShelf`.
- ISC-427: Vitest SSR + browser — Daily Practice publishes
  `TemporalPracticeSequence`.
- ISC-428: Vitest SSR — Decision Support publishes `PerspectiveComparison`.
- ISC-429: Vitest SSR — Full Spectrum publishes
  `FullSpectrumConstellation`.
- ISC-430: Vitest SSR — Self-Inquiry publishes `InquiryLayerStack`.
- ISC-431: Vitest SSR + browser DOM — declared Engine order is stable;
  populated Daily Practice rendered `panchanga → vedic-clock → biorhythm`.
- ISC-432: Vitest SSR — rendered element count equals input element count.
- ISC-432.1: Vitest SSR — undeclared recognized Engines follow declared
  groups and remain visible.
- ISC-433: Folio SSR — flat known Engine output omits `Unstructured Source`.
- ISC-434: Folio SSR — native section documents retain their supplied atlas.
- ISC-435: CodeGraph/source — legacy `WorkflowReading` has no caller and
  `EngineReading` remains called only by that legacy shell.
- ISC-436: SSR + browser DOM — composed Reading markup exposes no open raw JSON;
  technical source remains privacy-filtered and progressively disclosed.
- ISC-437: source read — layouts encode membership/order only and contain no
  cross-Engine edge or causal vocabulary.
- ISC-438: `git diff --check` + scope inspection — no API, database,
  authorization, or persistence source file changed.
- ISC-439: dependency/source inspection — no package or motion dependency
  changed and no layout animation was added.
- ISC-440: focused Vitest — compositor/Folio suite passed 29/29; the
  post-contrast artifact/compositor suite passed 23/23.
- ISC-441: final regression after fixture deletion — 84/84 test files and
  688/688 tests passed.
- ISC-442: final build after fixture deletion — TypeScript/Vite passed with
  1,657 modules transformed.
- ISC-443: browser probes — 1440×1000 and 390×844 composed routes both reported
  zero root overflow; the 36-row matrix passed Axe and reflow assertions.
- ISC-444: image inspection — deterministic review artifacts exist in
  `docs/ui/evidence/composition-pass/`, including Engine, workflow, Vedic Clock,
  Biorhythm, and mobile detail frames.

### Verification Summary

- Coverage: 34/34 passed (34 tool-verified, 0 deferred).
- CheckCompleteness: PASS at the E3 project minimum; all required sections are
  present, the 34-criterion floor is met, and anti/antecedent probes exist.
- Capability invocation: ISA, FirstPrinciples, SystemsThinking,
  IterativeDepth, Advisor, and ReReadCheck all fired.
- Thinking floor: E3 hard floor met with five closed-enumeration capabilities.
- Delegation floor: intentionally relaxed with the overlap calculation recorded
  above.
- Doctrine: live UI probes, pre- and post-deliverable Advisor calls, complete
  regression/build gates, and direct file/image read-backs all fired.

### Deliverable Compliance

- D1 — Implement requested Engine/workflow composition pass: PASS. The
  canonical Reading path consumes all 18 Engine and six workflow contracts.
- D2 — Produce deterministic screenshots for user visual review: PASS. Desktop
  and mobile composed-output frames are present and inspected.

### Re-read Check

- “lets do the composition pass”: addressed through the canonical
  `ReadingComposition` implementation, Folio hierarchy correction, stable
  ownership/order, and 18/18 plus 6/6 contract tests.
- “ill do the visual review”: respected. The workflow registry remains
  `proposed`, no visual acceptance is claimed, and the review frames are
  explicitly handed to the user.

### Learning

- I should have framed the browser directly on the composed regions before
  trusting full-page screenshots; the Folio owns an inner scroll surface, so
  above-fold captures can conceal the actual artifact.
- A smarter pass would have included a populated Vedic Clock contrast probe in
  the first screenshot checklist. Direct visual inspection caught a defect
  that semantic DOM, Axe, and tests did not.
- The preflight gates were useful: registry ownership prevented duplicate
  rendering, and the post-deliverable Advisor forced a sharper bounded
  completion claim plus an 18-way missing-source runtime probe.
- Verification Doctrine materially improved the result by separating
  all-contract runtime safety from the much smaller populated visual-proof
  set.

## Iteration 14 — Capability entry and imported archive visibility

### Problem

Urania currently sends every runnable constellation child through the narrator
chat sheet even when the child explicitly names a deterministic Engine,
workflow, or daily instrument. Separately, the consented 723 pilot tooling
prepares a Selemene PostgreSQL living-archive transaction, but the production
user cannot currently see that archive: the migration, protected API, admin
navigation, and imported record are not one verified deployed path. A successful
compute or prepared SQL file is being mistaken for a visible reading.

### Vision

Each node opens through the interface native to its capability: witness modes
retain the narrator threshold, deterministic Engines and workflows open their
instrument intake directly, daily readings open their location-aware surface,
and informational or archive nodes retain their existing destinations. The
admin operator can then open Selemene's Living Archive and see the one
consented, checksum-locked 723 pilot with owner, subject, source, artifact, and
editorial provenance kept distinct.

### Out of Scope

- Bulk-importing the full 723 corpus without alias, consent, and editorial review.
- Relabeling the authenticated owner as the subject of every imported reading.
- Copying Selemene PostgreSQL archive rows into Urania's flat D1 Folio table.
- Replacing witness narration where the selected capability is genuinely narrative.
- Redesigning either application's visual language during this repair.
- Publishing or approving historical reading copy during import.

### Constraints

- Preserve all pre-existing composition-pass edits in the Urania worktree.
- Preserve all unrelated and pre-existing changes in the Selemene worktree.
- Keep existing Selemene Engine/workflow request and Folio-save hooks.
- Apply database changes additively and prove them with read-after-write queries.
- Keep living-archive endpoints behind `admin:analytics:read`.
- Treat one verified solo pilot as the maximum authorized import scope.
- Do not expose private reading bodies, birth data, or secrets in logs.
- Execute sequentially because overlapping dirty worktrees make write delegation unsafe.

### Goal

Restore capability-appropriate node entry in Urania and complete the protected,
reversible path that makes the consented 723 pilot visible in Selemene's admin
Living Archive.

### Criteria

- [x] ISC-445: Engine children resolve to the native deterministic entry mode.
- [x] ISC-446: Workflow children resolve to the native deterministic entry mode.
- [x] ISC-447: Daily children resolve to the native daily entry mode.
- [x] ISC-448: Witness children resolve to the narrative chat entry mode.
- [x] ISC-449: Informational children retain the information-dialog entry mode.
- [x] ISC-450: Folio action children retain direct canonical Folio navigation.
- [x] ISC-451: Deep-linked children use the same capability entry classifier.
- [x] ISC-452: Selecting a native Engine creates no chat session request.
- [x] ISC-453: Native deterministic entry reuses the existing birth intake form.
- [x] ISC-454: Native deterministic submission reuses the existing execution hook.
- [x] ISC-455: Native deterministic results retain canonical composed reading output.
- [x] ISC-456: Native deterministic completion retains Folio persistence.
- [x] ISC-457: Witness submission retains in-thread narrative reading output.
- [x] ISC-458: Closing one entry clears selection and stale result state.
- [x] ISC-459: Entry classification is a pure exhaustively tested function.
- [x] ISC-460: A regression test fails against the every-run-child chat rule.
- [x] ISC-461: Browser evidence shows Numerology without the narrator sheet.
- [x] ISC-462: Anti: entry behavior does not depend on a rollback environment flag.
- [x] ISC-463: Selemene exposes a protected living-readings list endpoint.
- [x] ISC-464: Selemene exposes a protected living-reading detail endpoint.
- [x] ISC-465: The list endpoint requires `admin:analytics:read`.
- [x] ISC-466: The detail endpoint requires `admin:analytics:read`.
- [x] ISC-467: A basic viewer receives forbidden from the list endpoint.
- [x] ISC-468: A basic viewer receives forbidden from the detail endpoint.
- [x] ISC-469: Admin navigation exposes the Living Archive destination.
- [x] ISC-470: The Living Archive renders active imported reading rows.
- [x] ISC-471: Reading detail renders owner and subject as separate relations.
- [x] ISC-472: Reading detail renders source and import-run provenance.
- [x] ISC-473: Reading detail renders artifact metadata and editorial history.
- [x] ISC-474: PostgreSQL migration 036 applies to the target archive database.
- [x] ISC-475: The consented Shesh pilot import reaches completed state.
- [x] ISC-476: A post-import SELECT returns exactly one active pilot reading.
- [x] ISC-477: The active pilot reading belongs to the configured owner email.
- [x] ISC-478: The pilot subject remains its independently verified corpus subject.
- [x] ISC-479: Re-running the pilot import creates no duplicate reading.
- [x] ISC-480: Pilot artifact checksums match their frozen source files.
- [x] ISC-481: Deleted archive records remain excluded from the active list.
- [x] ISC-482: Anti: no private artifact body appears in command output.
- [x] ISC-483: Anti: no archive row is copied into Urania's flat D1 Folio.
- [x] ISC-484: Anti: no unreviewed 723 subject or relationship is bulk-imported.
- [x] ISC-485: Focused Urania node-entry tests pass.
- [x] ISC-486: Complete Urania tests and production build pass.
- [x] ISC-487: Focused Selemene living-archive tests pass.
- [x] ISC-488: Selemene API and admin-web compile checks pass.
- [x] ISC-489: Live or local authenticated probe returns the imported pilot row.
- [DEFERRED-VERIFY] ISC-490: Antecedent: operator browser evidence shows the pilot archive entry.

### Features

| Feature | Description | Satisfies | Depends on | Parallelizable |
| --- | --- | --- | --- | --- |
| Capability entry classifier | Route each child to chat, deterministic, daily, info, or navigation from its declared capability | 445–462 | existing `SelemeneChild.run` union | no |
| Selemene archive visibility | Finish protected list/detail API and Living Archive admin surface | 463–473 | migration 036 and existing dirty work | no |
| Consented pilot completion | Apply one checksum-locked solo pilot idempotently and verify ownership | 474–484 | archive schema and object storage | no |
| Repair verification | Tests, builds, database selects, and browser evidence | 485–490 | all implementation | no |

### Test Strategy

| ISC | Type | Check | Threshold | Tool |
| --- | --- | --- | --- | --- |
| 445–451, 459–460 | unit | classify representative child run kinds | exact five-way mapping | Vitest |
| 452–458, 461 | browser/integration | open Numerology and witness children | native has no chat; witness retains chat | Browser + network |
| 463–468 | API/auth | list/detail route and viewer denial | 200 for admin fixture; 403 for viewer | Rust tests |
| 469–473 | frontend | navigation, table, and detail contract | every provenance layer rendered | admin-web tests/typecheck |
| 474–480 | migration/data | apply, import, rerun, and SELECT | one active reading; zero duplicates | PostgreSQL + checksums |
| 481–484 | anti | inspect query and mutation scope | zero deleted, private-body, D1, or bulk drift | tests + diff + SELECT |
| 485–488 | regression | focused/full suites and builds | all commands exit zero | Vitest/Cargo/Next/Vite |
| 489–490 | live proof | authenticated API and browser row | exact pilot ID visible | curl/Browser |

### Decisions

- 2026-07-27: RootCauseAnalysis/KepnerTregoe separated two failures that share
  one mental model but have different mechanisms: an over-broad UI routing rule
  and an incomplete archive delivery boundary.
- 2026-07-27: SystemsThinking/Iceberg identified the structural generator as
  treating every computed output as both conversational and already archived.
- 2026-07-27: The first safe import remains the already consented, verified
  Shesh solo pilot. The full 723 corpus requires later alias and editorial work.
- 2026-07-27: Urania D1 remains the live self-service Folio; historical archive
  truth remains in Selemene PostgreSQL rather than being duplicated.
- 2026-07-27: The E3 delegation floor is relaxed because the developer
  instruction prohibits subagents and both target worktrees already contain
  overlapping uncommitted changes.
- 2026-07-27: Advisor's first review assumed mixed-capability children and a
  backfill. Direct union and database evidence refuted both assumptions; the
  retained gates were exhaustive classification, uniqueness, consent,
  migration ordering, and authorization.
- 2026-07-27: Post-deliverable Advisor returned an in-scope pass after explicit
  negative authorization, consent, production-schema, UI-consumer, rollback,
  and commit-to-deployment lineage evidence.

### Verification

- ISC-445–462: `src/lib/nodeEntry.test.ts` passes all six capability-classifier
  cases. The complete Urania Vitest suite passes 694/694, and `npm run build`
  transforms 1,658 modules successfully. Browser evidence in
  `docs/ui/evidence/node-entry-import-visibility/` shows Numerology opening the
  native instrument while Integrated Reading retains the witness threshold.
  Cloudflare Pages production deployment
  `2cf55770-bbba-4c27-9e3c-23ec023eae5e` records source `c2c7673` on branch
  `main`; `git diff` confirms the tested node-entry files match that deployed
  commit exactly, and the custom domain continues to enforce its Access
  boundary.
- ISC-463–473, 487–489: the isolated Selemene delivery branch
  `codex/selemene-living-archive-visibility` passes three repository/schema
  tests, two API authorization tests, three admin source-contract tests,
  admin TypeScript, Next production build, and Rust API compilation. Railway
  deployment `13c373a9-485f-46f9-adde-8fbc79f8d641` reports `SUCCESS`; its live
  health endpoint reports version 3.3.1 with 18 Engines and 6 workflows.
  Vercel production deployment `68GfTvYQ6ZMiYCC6ghmVFgGas6Z7` is aliased to
  `https://144.tryambakam.space`. Both were uploaded from a clean detached
  worktree at `e1ab659beab1a452776d832ea9c67c3b65d14a74`.
- ISC-474–484: production PostgreSQL contains migration 036 and exactly one
  active completed pilot,
  `sheshnarayan-cumbipuram-nateshan-l0-2026-07-09`, with two artifacts, one
  evidence row, independently related owner and subject, and `owner_only`
  editorial visibility. Live metadata records consent basis
  `principal-requested-one-reading-pilot` and the expected pilot identifier.
  The importer passes 8/8 tests including explicit consent rejection, checksum
  lock, rerun idempotency, compensation, and deletion audit boundaries.
  Production schema fingerprints match migration 036, and the ledger-less
  manual apply/rollback round trip removes all eleven archive tables. Remote
  Urania D1 returns zero matching pilot rows.
- ISC-490: `[DEFERRED-VERIFY]` follow-up
  `owner-visual-review-living-archive-2026-07-27`. The user explicitly retained
  the visual-review pass; the automated browser proved the Access gate remains
  active, and no authentication control was bypassed.
- ISA CheckCompleteness at project tier E3: `pass`. Iteration 14 has 46
  sequential criteria (45 verified, 1 owner-deferred), four anti-criteria, one
  experiential antecedent, no duplicate IDs, and no sequence gaps.

### Learning Inventory

- Inner scroll surfaces require targeted composition screenshots | TYPE:
  project verification | KEEP: yes — recorded in this ISA and audit.
- Dark instrument cards need explicit contrast tokens | TYPE: implementation
  pattern | KEEP: yes — encoded in `DoshaClock` and its regression test.
- Semantic completeness must remain separate from visual proof | TYPE:
  reporting doctrine | KEEP: yes — encoded in the audit scoring model.

## Iteration 15 — Selemene control plane and client feedback loop

### Problem

An authenticated visit to `144.tryambakam.space` showed Vercel's platform-level
`404: NOT_FOUND`, even though that hostname is intended to be the protected
Selemene administration surface. At the same time Urania, Sankalpa, and Raycast
Noesis all execute Selemene capabilities, but they do not consistently identify
themselves when they call the Engine. Their successful Engine and workflow
outputs are persisted centrally without client provenance, while each client
also maintains a local cache whose role is not explicitly subordinate to the
Selemene record. The result is a weak feedback loop: Selemene performs the work
but its admin surface cannot reliably say which extension produced it.

### Vision

`144.tryambakam.space` is a protected operator control plane and nothing else.
Its root always resolves to the Selemene admin shell after Cloudflare Access;
no consumer interface is hosted there. Urania, Sankalpa, and Raycast Noesis are
thin, purpose-specific Selemene clients: they use Selemene authentication,
Engine/workflow contracts, persistence, history, and observability, then add
their own interaction and presentation layers. Every persisted result carries
bounded client provenance so the admin readings view closes the loop from
client action to Engine output.

### Out of Scope

- Moving Urania, Sankalpa, or Raycast UI code into the Selemene repository.
- Removing local/offline caches that preserve responsive or offline client UX.
- Exposing any Selemene admin endpoint through the three client applications.
- Replacing Cloudflare Access or weakening the existing owner-only policy.
- Migrating historical rows whose source client cannot be proven.
- Turning client provenance into an authentication or authorization signal.
- Rebuilding the retired `48.tryambakam.space` witness service.
- Claiming the user's visual acceptance of any client or admin composition.

### Principles

- Selemene owns canonical compute, workflow orchestration, persisted readings,
  history synchronization, usage telemetry, and admin observability.
- Client applications own interaction, presentation, and bounded offline
  continuity; their caches are replicas or fallbacks, never system authority.
- `144.tryambakam.space` is an operator surface, not a fourth consumer client.
- Client provenance is descriptive and untrusted; authentication remains the
  sole authority for user identity, permissions, and billing.
- Existing request bodies remain backward compatible when client context is
  absent.
- No secret, birth datum, reading body, or personally identifying value belongs
  in the client-provenance envelope.

### Constraints

- Preserve the dirty original Selemene, Sankalpa, and Raycast worktrees.
- Build Selemene changes from the already deployed living-archive feature head.
- Keep Urania's server-side API-key proxy; no Engine secret enters the browser.
- Keep Sankalpa's renderer-to-main-process trust boundary and explicit consent.
- Keep Raycast credentials in Raycast's secure password preference.
- Apply schema changes additively and tolerate old requests without provenance.
- Keep the current `/admin` Next.js base path and root redirect contract.
- Do not infer authenticated custom-domain success from an unauthenticated curl.

### Goal

Reassert a healthy admin-only production root at `144.tryambakam.space`, define
and implement one bounded Selemene client-context contract for Engine and
workflow calls, attach it from Urania, Sankalpa, and Raycast Noesis, persist and
display the source client in Selemene admin readings, and verify every touched
repository plus the live deployment boundaries.

### Root Cause Analysis — Kepner-Tregoe

| Dimension | IS | IS NOT | Distinction |
| --- | --- | --- | --- |
| 144 access | Cloudflare returns the expected Access login challenge before authentication | An unprotected public admin shell | Access policy and DNS proxy are active |
| production artifact | Direct deployment `/` returns `307 /admin/login`; `/admin/dashboard` returns `200` | Missing Next root route or failed Vercel build | The deployed application is healthy |
| screenshot failure | Vercel platform `NOT_FOUND` on the custom hostname after authentication | Application-styled Next 404 | The custom hostname lacked a usable deployment match at that observed moment |
| client compute | All three clients call Selemene Engine contracts | Three independent Engine implementations | Compute ownership is already mostly central |
| client feedback | Selemene auto-persists successful outputs | Provenance-complete history | Persistence discards the existing client/device context fields |
| admin observability | Admin readings expose user, Engine, workflow, and result | Source application identification | The feedback loop stops before client attribution |

The most probable 144 cause is transient/stale custom-domain attachment during
the preceding production rollout, not missing application code. Reasserting the
alias and adding a production root probe prevents recurrence. The separate
architectural cause is concrete: `calculate_handler` and
`execute_workflow_by_id` construct `NewReading` with all client/device fields
set to `None`, while clients send no common context.

### SystemsThinking — Iceberg

1. **Event:** an operator sees a Vercel 404 and cannot inspect imported or live
   Selemene state.
2. **Pattern:** client features reach the same Engine through different
   adapters, then cache locally while central rows lose their source.
3. **Structure:** request contracts have no shared client-context envelope,
   persistence hard-codes provenance to `None`, and deployment checks validate
   a direct URL more often than the protected custom hostname.
4. **Mental model:** each surface has been treated as a small standalone product
   integrating with Selemene, rather than as an extension of Selemene.

### SystemsThinking — Causal Loop

**Question:** Why does Selemene lose authority even when clients call it?

- Shared client contract →(+) attributable persisted outputs.
- Attributable outputs →(+) admin observability.
- Admin observability →(+) confidence in Selemene as system authority.
- Confidence in Selemene →(−) duplicated client-local authority.
- Duplicated client-local authority →(−) shared contract adoption.
- Local-first resilience →(+) client usefulness.
- Central-only dependence →(−) local-first resilience.

R1 “Authority compounds” is reinforcing: shared contracts make outputs visible,
which encourages further centralization. B1 “Offline resilience” prevents
removing local caches. The intervention is therefore not to delete caches, but
to make Selemene canonical and label caches explicitly as replicas/fallbacks.

### FirstPrinciples — Deconstruct, Challenge, Reconstruct

**Irreducible requirements:** admin actions require protected operator access;
Engine/workflow execution must be authenticated; successful results need one
durable canonical record; client UX may remain local-first; provenance must not
grant authority or expose private data.

**Soft constraints challenged:** `/admin` does not need to be typed manually;
the retired Witness gateway does not need to remain Raycast's default Engine
route; a local cache does not need to be the authoritative archive; client
source does not require a new analytics service when the readings pipeline
already persists every successful execution.

**Reconstruction:** keep one Selemene control/data plane, add a small optional
client context to existing execution requests, store that context with the
reading, expose it only through existing user/admin history contracts, and let
each client retain its own UI and bounded cache.

### Criteria

- [x] ISC-491: Unauthenticated 144 root returns the Cloudflare Access challenge.
- [x] ISC-492: Current direct production root redirects into the admin base path.
- [x] ISC-493: Current production deployment owns the 144 custom-domain alias.
- [x] ISC-494: A release probe fails if the direct production root returns 404.
- [x] ISC-495: The 144 hostname exposes no unprotected Selemene data-plane route.
- [x] ISC-496: Selemene defines one optional bounded client-context request contract.
- [x] ISC-497: Engine calculation requests accept that client-context contract.
- [x] ISC-498: Workflow execution requests accept that client-context contract.
- [x] ISC-499: Invalid or oversized client-context values fail validation.
- [x] ISC-500: Successful Engine readings persist their source client.
- [x] ISC-501: Successful workflow readings persist their source client.
- [x] ISC-502: Existing event, device, platform, and version fields are populated.
- [x] ISC-503: Requests without client context preserve their existing behavior.
- [x] ISC-504: Client provenance cannot alter authentication or authorization.
- [x] ISC-505: Admin readings responses expose source-client provenance.
- [x] ISC-506: Admin readings accept an optional source-client filter.
- [x] ISC-507: The admin readings table displays source client.
- [x] ISC-508: The admin reading detail displays bounded client provenance.
- [x] ISC-509: Urania Engine calls attach source `urania`.
- [x] ISC-510: Urania continues using its server-side Selemene credential proxy.
- [x] ISC-511: Sankalpa Engine calls attach source `sankalpa`.
- [x] ISC-512: Sankalpa keeps Engine calls in the Electron main process.
- [x] ISC-513: Raycast Engine calls attach source `raycast-noesis`.
- [x] ISC-514: Raycast workflow calls attach source `raycast-noesis`.
- [x] ISC-515: Raycast defaults Engine execution to canonical Selemene.
- [x] ISC-516: Local Urania, Sankalpa, and Raycast caches remain non-authoritative.
- [x] ISC-517: Anti: no client exposes or proxies Selemene admin endpoints.
- [x] ISC-518: Anti: no client provenance contains secrets or personal reading data.
- [x] ISC-519: Anti: source-client labels cannot grant roles, quota, or ownership.
- [x] ISC-520: Selemene focused provenance tests pass.
- [x] ISC-521: Selemene API, data layer, SDK, and admin builds pass.
- [x] ISC-522: Urania focused tests and production build pass.
- [x] ISC-523: Sankalpa gateway tests, typecheck, and build pass.
- [x] ISC-524: Raycast API tests, lint, and build pass.
- [x] ISC-525: Migration applies and reads source-client values back correctly.
- [x] ISC-526: Production Selemene health remains green after deployment.
- [x] ISC-527: Production Vercel deployment root passes the redirect probe.
- [ ] ISC-528 [DEFERRED-VERIFY: #908]: Authenticated 144 root reaches the Selemene admin shell.
- [x] ISC-529: Architecture and remaining GitHub planning are reconciled explicitly.

### Features

| Feature | Description | Satisfies | Depends on |
| --- | --- | --- | --- |
| Admin root release gate | Reassert the 144 alias and verify root/base-path behavior | 491–495, 527–528 | Vercel + Cloudflare Access |
| Selemene client context | Optional validated provenance on Engine/workflow requests | 496–504 | existing execution contracts |
| Persisted source attribution | Store source and existing device fields with each reading | 500–506, 519–521, 525 | migration 037 + readings repository |
| Admin feedback view | Filter and render reading source in the protected admin UI | 505–508 | admin readings API |
| Three client adapters | Attach the same source contract from Urania, Sankalpa, Raycast | 509–518, 522–524 | each existing Selemene adapter |
| Architecture reconciliation | Record the control-plane boundary and map open planning | 529 | code and GitHub read-back |

### Test Strategy

| ISC | Type | Check | Threshold |
| --- | --- | --- | --- |
| 491–495 | live/config | Access challenge, Vercel inspect/curl, route inventory | no public admin bypass; no root 404 |
| 496–504 | Rust unit/API | deserialize, normalize, validate, persist | exact bounded mapping; backward compatible |
| 505–508 | Rust/TypeScript | response/filter contracts and rendered table/detail | source visible and filterable |
| 509–518 | TypeScript unit/source | inspect outgoing Engine/workflow bodies and boundaries | exact three source labels; no admin routes |
| 520–525 | repository suites | focused + compile/build/migration round trip | all exit zero |
| 526–528 | production | health, deployment root, authenticated admin | healthy, 307/200, admin shell |
| 529 | planning audit | compare implementation with open epics/issues | no duplicate or falsely closed work |

### Decisions

- Preserve the `/admin` base path because the direct production root already
  redirects correctly; deleting it would create broad link and asset churn
  without addressing the observed custom-domain mismatch.
- Treat the screenshot as valid historical evidence but not current-state proof:
  Vercel now reports a ready production deployment with the 144 alias, and its
  protected-curl bypass proves the root redirect and dashboard artifact.
- Use an optional request body envelope, not authority-bearing headers, so
  Urania's secure streaming proxy can forward it unchanged and clients cannot
  confuse provenance with authentication.
- Store and display the value as `claimed_source_client`: the public data-plane
  caller self-asserts it, so even an allowlisted value is never authoritative.
- Protect the entire `144.tryambakam.space` hostname with Cloudflare Access.
  The Selemene data plane remains independently reachable at
  `selemene.tryambakam.space`; no path exception weakens the admin host.
- Keep Witness as an explicit Raycast compatibility route without silently
  selecting it when Selemene credentials are absent.
- Reuse the existing readings/history-sync pipeline rather than create a second
  telemetry store. Source attribution belongs beside the durable output.
- Keep local caches for offline continuity while documenting Selemene as the
  canonical record.
- Execute repository writes sequentially. The original Selemene, Sankalpa, and
  Raycast worktrees contain unrelated user changes, so shared-write delegation
  would create unsafe overlap.

### Verification

- ISC-491–495 and ISC-527: live probes — `144.tryambakam.space/` and a fake
  `/api/v1/engines` path both return the Cloudflare Access 302; Vercel
  deployment `dpl_25HUCZpMNhLeTVwNzu8rrDVvBMWC` is Ready, owns the custom
  alias, and its credentialed release probe returns
  `307 location: /admin/login`. Uncredentialed requests to the raw Vercel
  origin return the Vercel SSO 302 for root, readings, and dashboard, so the
  protected artifact probes cannot be used as an origin bypass.
- ISC-496–504 and ISC-520: Rust contract tests — 14 focused API tests pass,
  including known-source acceptance, unknown-source rejection, length bounds,
  legacy payload compatibility, and proof that client context never enters
  Engine options.
- ISC-500–506 and ISC-525: production migration/read-back — migration 037
  created a nullable indexed `claimed_source_client`; a production transaction
  inserted and selected `raycast-noesis`, then rolled back. A disposable
  authenticated Urania request subsequently returned 200 and persisted
  `claimed_source_client=urania`; a forged source returned 422, an invalid API
  key returned 401, and production filter counts proved all/legacy/Urania as
  2/1/1 before cleanup returned both probe-user and probe-reading counts to zero.
  A second live matrix returned 200 and exact persisted attribution for
  Urania, Sankalpa, and Raycast Noesis, rejected an invalid source variant for
  each with 422, proved source counts 1/1/1, and again cleaned both tables to
  zero probe rows.
- ISC-505–508 and ISC-521: admin/backend builds — `cargo check` passes for
  noesis-api/noesis-data; the Engine SDK passes 34 tests, typecheck, and build;
  admin-web passes typecheck and production Next build. Its focused contract
  test confirms both source displays remain escaped React text nodes, retain
  the `Legacy / unknown` fallback, and forward the admin filter.
- ISC-509–510 and ISC-522: Urania test/build — both client-context tests pass
  and the production Vite bundle builds; the same-origin secret-hiding proxy
  remains the sole transport.
- ISC-511–512 and ISC-523: Sankalpa test/build — 9 gateway tests, renderer and
  Electron typechecks, and the full production build pass.
- ISC-513–515 and ISC-524: Raycast test/build — the full 76-test suite,
  targeted routing tests, Raycast lint, and extension build pass.
- ISC-517–519: source audit — client metadata contains only fixed source,
  platform, and bounded version hints; no client gained admin routes and no
  authorization path reads the claimed source. A disposable authenticated
  non-admin identity returned 403 from both admin readings and admin system
  health through the Railway origin, while its session reported
  `has_admin_access=false`; cleanup left zero probe users.
- ISC-526: live release — Railway deployment
  `2c382871-d846-4182-aca8-f4319248ee13` is SUCCESS; `/health/live` returns
  version 3.3.1 with 18 engines and 6 workflows.
- ISC-528: deferred to the user's authenticated functional smoke in rollout
  issue #908 because the Chrome control connection was unavailable; sign-in
  must prove the 144 root reaches the admin shell before the separate
  user-owned visual review. This is the remaining end-to-end production
  auth-gate verification, not a cosmetic check: direct protected artifact
  probes confirm `/admin/readings` and `/admin/dashboard` each return 200, but
  they do not substitute for the authenticated Cloudflare session.
- ISC-529: GitHub reconciliation — draft PRs Selemene #907, Sankalpa #13, and
  Urania #174 link the implementation; #893 and #895 now carry current-state
  notes; #908 owns client releases, live source verification, telemetry, and
  eventual Witness retirement.
- E4 CheckCompleteness: pass — all twelve required sections are populated; the
  529 stable criteria exceed the 128 floor; anti-criteria and experiential
  antecedents are present; Iteration 15 has zero untracked hard failures.
- Rule 2a audit: pass with zero critical findings and no implementation
  blockers. The registered `Cato` agent type was attempted twice but rejected
  by the collaboration runtime as unknown, so an independent read-only audit
  ran through the available fallback and explicitly accepted ISC-528 as the
  single tracked user-session verification.
- ReReadCheck: the final evidence was compared against the user's exact request:
  144 is reserved for protected admin actions, while Urania, Sankalpa, and
  Raycast Noesis execute through Selemene and feed canonical reading provenance
  back into its infrastructure.

### Changelog

- Conjectured: the screenshot meant the admin application route itself was
  missing or its `/admin` base path was incorrect.
- Refuted by: Vercel project inspection and protected direct curl showed the
  current artifact already redirected root into `/admin/login`; the observed
  page was a historical custom-alias deployment miss.
- Learned: the reliable repair is to reassert the alias and make the redirect
  an executable release gate, while keeping the admin host and Selemene data
  plane as separate security boundaries.
- Criterion now: a release is incomplete if the direct root is not a 307 to
  `/admin/login`, if `144` lacks the Access challenge, or if Selemene health
  does not remain green after the matching backend deployment.

## Iteration 16 — Light composition and responsive evidence surfaces

### Problem

The Folio Parchment layer owns the right components and source-shaped engine
elements, but a prose-width constraint is applied to the complete structured
composition. Viewport breakpoints then create three-column grids inside that
narrow parent. The Live Status dialog has the same containment error: desktop
viewport breakpoints create four columns inside a small modal, while invalid
reading-surface token utilities expose the gold grid background as a solid
mustard block. The result is structurally complete but visually compressed,
low-contrast, and difficult to read.

### Vision

Parchment behaves as a generous reading material: prose keeps a calm 70ch
measure while structured engine output expands to the available reading track.
Dark instrument cards sit within that sheet with deliberate spacing and no
collisions. The provenance rail reads as a vertical ledger. Live Status becomes
a compact, high-contrast operational instrument whose cells wrap naturally at
every supported viewport without hiding evidence.

### Out of Scope

- No new engine, workflow, report, or fabricated reading data.
- No global rebrand or replacement of the dark Noesis shell.
- No change to Folio persistence, consent, redaction, or source semantics.
- No deployment to production before the user's separate visual review.
- No replacement of the existing dialog accessibility primitives.

### Principles

- Parchment is a material boundary, not a global width constraint.
- Prose measure and structured-composition measure are separate concerns.
- Responsive rules answer the available parent width, not only viewport width.
- Content must wrap or reflow; important evidence must never be clipped.
- Light sheets and dark instruments retain explicit, accessible contrast.
- Fix shared layout causes before tuning individual cards.

### Constraints

- Preserve the React, Vite, Tailwind, Vitest, and Playwright stack.
- Preserve all source-shaped reading elements and the 18-engine roster.
- Retain the 70ch prose token for narrative reading.
- Retain existing Folio Reading, Evidence, and Source layer semantics.
- Preserve keyboard dialog behavior, focus management, and body-scroll lock.
- Use only existing design tokens or valid scoped additions.

### Goal

Deliver a composition pass that makes the selected Folio reading and Live
Status evidence panel readable, contained, and intentional from 320px through
1440px, with focused unit contracts, responsive browser evidence, and a clear
handoff for the user's final visual review.

### Criteria

- [x] ISC-530: The Folio reading canvas fills its available main-column width.
- [x] ISC-531: Narrative prose remains limited to the existing 70ch measure.
- [x] ISC-532: Full Spectrum engine output renders at no more than two columns.
- [x] ISC-533: Creative Expression engine output renders at no more than two columns.
- [x] ISC-534: Engine cards retain a comfortable readable width at desktop.
- [x] ISC-535: No three-column viewport breakpoint compresses a narrow Folio parent.
- [x] ISC-536: Structured composition shrink boundaries use `min-width: 0`.
- [x] ISC-537: The selected Folio route has no horizontal overflow at 320px.
- [x] ISC-538: The selected Folio route has no horizontal overflow at 768px.
- [x] ISC-539: The selected Folio route has no horizontal overflow at 1024px.
- [x] ISC-540: The selected Folio route has no horizontal overflow at 1440px.
- [x] ISC-541: Long Folio identifiers wrap within the provenance rail.
- [x] ISC-542: Long checksums wrap within the provenance rail.
- [x] ISC-543: Long account identities wrap within the provenance rail.
- [x] ISC-544: Provenance labels remain legible without three-line compression.
- [x] ISC-545: The canonical reading action remains fully visible.
- [x] ISC-546: Canonical record identity remains readable rather than truncated.
- [x] ISC-547: Live Status health cells use a valid reading-surface token.
- [x] ISC-548: Live Status never exposes a solid mustard grid background.
- [x] ISC-549: Operator evidence titles meet dark-surface contrast requirements.
- [x] ISC-550: The Live Status health summary renders at no more than two columns.
- [x] ISC-551: Infrastructure evidence renders at no more than two columns.
- [x] ISC-552: Infrastructure names and states never collide.
- [x] ISC-553: The loaded-engine value wraps without overlapping adjacent metrics.
- [x] ISC-554: Roster rows contain every engine label and status.
- [x] ISC-555: The modal body scrolls vertically when content exceeds its height.
- [x] ISC-556: Live Status uses enough desktop width for operational evidence.
- [x] ISC-557: Parchment body text meets WCAG AA contrast.
- [x] ISC-558: Dark instrument text meets WCAG AA contrast.
- [x] ISC-559: Responsive metadata remains readable without 8px labels.
- [x] ISC-560: Parchment-to-instrument transitions use deliberate spacing and rules.
- [x] ISC-561: Existing focus-visible states remain intact.
- [x] ISC-562: Escape, focus trap, and focus restoration remain intact.
- [x] ISC-563: Reading/Evidence/Source semantic ownership remains unchanged.
- [x] ISC-564: Every declared engine remains represented.
- [x] ISC-565: Every existing workflow visual mapping remains represented.
- [x] ISC-566: The privacy-filtered Source layer remains collapsed by default.
- [x] ISC-567 [ANTI]: No reading or engine content is fabricated.
- [x] ISC-568 [ANTI]: No returned engine is hidden to simplify the layout.
- [x] ISC-569 [ANTI]: No important evidence is clipped with overflow hiding.
- [x] ISC-570 [ANTI]: No global recolor or brand-system replacement is introduced.
- [x] ISC-571: Focused component and contract tests pass.
- [x] ISC-572: TypeScript typechecking passes.
- [x] ISC-573: The complete unit suite passes.
- [x] ISC-574: The production build passes.
- [x] ISC-575: Browser evidence covers the Folio route at 1440px.
- [x] ISC-576: Browser evidence covers the Folio route at mobile width.
- [x] ISC-577: Browser evidence covers Live Status at 1440px.
- [x] ISC-578: Browser evidence covers Live Status at mobile width.
- [x] ISC-579: Browser verification reports no serious console or Axe failures.
- [ ] ISC-580: The result is handed to the user for independent visual review.

### Features

| Feature | Description | Satisfies | Depends on |
| --- | --- | --- | --- |
| Fluid Parchment composition | Full reading track with prose-only measure | 530–540, 557, 560 | ReadingCanvas + composition grids |
| Vertical provenance ledger | Parent-width-safe facts and canonical action | 541–546, 563, 566 | TrustPanel + reference card |
| Responsive Live Status | Valid surface tokens and two-column evidence | 547–556, 561–562 | EngineStatusPanel + OperatorField |
| Responsive exit gate | Static contracts and four-width browser checks | 571–579 | Vitest + visual matrix |

### Test Strategy

| ISC | Type | Check | Threshold |
| --- | --- | --- | --- |
| 530–536 | source/render | canvas and workflow grid contracts | full track; prose 70ch; max two columns |
| 537–546 | browser/render | root, layer, rail, values, action containment | `scrollWidth <= clientWidth + 1` |
| 547–560 | unit/browser | computed surfaces, contrast, wrapping, modal bounds | no collisions; ≥4.5:1 text contrast |
| 561–566 | interaction/SSR | keyboard lifecycle and Folio layer semantics | unchanged accessible behavior |
| 567–570 | source audit | data, visibility, overflow, and token diff review | zero anti-criterion violations |
| 571–574 | repository gates | focused tests, typecheck, suite, build | all exit zero |
| 575–579 | Playwright | 320/768/1024/1440 evidence and Axe | contained, clean, usable |
| 580 | handoff | user reviews generated screenshots | explicit visual-review boundary |

### Decisions

- Keep 70ch as the prose measure but remove it as the width of the complete
  `ReadingCanvas`; this separates reading rhythm from structured data layout.
- Cap dense workflow compositions at two columns because a three-column grid
  cannot meet readable card widths alongside the 22rem trust rail.
- Stack trust facts vertically inside the rail; viewport `sm` breakpoints cannot
  reliably describe a narrow nested parent.
- Correct `bg-reading-paper` to the defined `bg-reading-surface` token instead
  of masking the resulting gold grid with ad-hoc colors.
- Keep dark engine instruments inside Parchment; the pass repairs hierarchy,
  measure, and containment without flattening the established semantic contrast.
- Extend responsive evidence at exact requested widths rather than treating
  screenshots as unasserted documentation.

### Verification

- Folio composition: named CSS container keeps narrative prose at 70ch while
  Full Spectrum uses one column below 48rem and exactly two above it; nested
  supporting elements stay one column and fill their Engine track.
- Provenance: facts stack vertically with `overflow-wrap:anywhere`; the rail
  stacks below Reading through 1440px and becomes a sticky 22rem ledger on the
  1920px evidence row.
- Live Status: engine-only dialog sizing reaches 48rem, the body owns vertical
  scrolling, health/infrastructure/roster grids respond to the operator
  container, all 18 canonical engines remain present, and all status copy uses
  dark-surface contrast tokens. Deep-link dismissal removes the child hash and
  restores focus to Live Status in both graph and compact list lenses; browser
  Back also clears modal state while preserving the active Graph Lens. The
  return-focus contract resolves the equivalent destination when a responsive
  list-to-graph transition replaces the original control.
- Typography/contrast: affected Reading metadata now has a 12px floor; the
  rich browser payload surfaced and repaired dark artifact token misuse plus
  a computed 3.8:1 fact-label failure. Twenty-two static contrast contracts
  cover the dark instrument set, with Axe retaining the runtime numeric gate.
- Repository: 87 Vitest files and 709 tests pass; application and function
  TypeScript gates pass; production Vite build passes; UI contract, privacy
  evidence, and home contracts pass.
- Browser: 48 deterministic Playwright rows pass, including 320, 768, 1024,
  1440, and 1920 Reading composition evidence plus compact/tablet/landscape/
  desktop Live Status evidence. Seven representative rich engine artifacts,
  the 18-engine roster, root/layer/cell overflow, modal reachability, deep-link
  focus restoration, responsive lens replacement, browser-history return, body
  scroll lock, unexpected console/HTTP failures, and serious/critical Axe
  findings are asserted in-browser.
- ISC-580 remains intentionally open for the user's independent visual review.

### Changelog

- Conjectured: the light version primarily needed color and typography tuning.
- Refuted by: source tracing matched the screenshots to a full-canvas 70ch cap,
  viewport-driven nested grids, invalid surface tokens, and fixed rail columns.
- Learned: the visual degradation is a shared composition-system failure, not
  a collection of isolated card defects.
- Criterion now: structured reading and operator evidence must prove parent-safe
  containment at 320, 768, 1024, and 1440 before visual review.

## Iteration 17 — Archive invitation and conversation continuity

### Problem

The `/723` corpus contains hundreds of completed Solo and Synastry artifacts,
but the protected operator journey is not complete. Selemene has an
uncommitted metadata-only Living Archive list/detail surface, Urania's Folio is
correctly owner-scoped to its own D1 rows, and neither system has a
completed-reading invitation grant. The narrator UI exists in Urania, but it is
only revealed after selecting a low-level witness doorway; the visible
“Begin in chat” affordance instead lands on a parent constellation. The pieces
exist, but the operator and recipient cannot experience one continuous reading
journey.

### Vision

An authorized operator opens Living Archive and immediately understands which
readings are complete, who or what each reading concerns, and whether a
recipient link is ready. Selecting a reading preserves its canonical identity
while revealing the readable artifact, provenance, and one primary “Invite
recipient” action. The recipient opens a bounded, revocable link into Urania,
encounters the completed reading first, and can continue with the narrator in
the same reading context. At every depth the graph remains the interface:
reading, invite, evidence, and conversation are visible relationship nodes,
not features hidden in menus.

### Out of Scope

- No copy of the `/723` archive into Urania's flat D1 Folio.
- No client-side proxy of protected Selemene administrator endpoints.
- No public exposure of filesystem locators, artifact checksums, owner UUIDs,
  or administrative provenance.
- No bulk email campaign, mailing-list feature, or contact management.
- No fabricated reading body when a publishable artifact is unavailable.
- No replacement of Urania's graph, Folio, narrator, or reading grammar.

### Constraints

- Selemene remains authoritative for imported archive metadata, artifacts,
  invitation issuance, revocation, and audit.
- Urania remains the recipient reading and conversation surface.
- Operator presentation is not authorization; every archive mutation is
  server-authorized.
- Invitation tokens are opaque capabilities, stored only as digests, scoped to
  one reading, expiring, revocable, and never logged in plaintext.
- A recipient payload is privacy-filtered and excludes administrator-only
  provenance even when the operator detail includes it.
- Existing user-owned Folio and relationship consent contracts remain intact.
- All changes preserve keyboard reachability and mobile containment.

### Goal

Ship a coherent protected-admin-to-recipient flow in which authorized
operators can browse the completed `/723` archive, open a canonical reading,
issue and revoke an expiring recipient link for that already-completed
reading, and hand the recipient into a first-class Urania reading and chat
journey without copying archive rows or weakening authority boundaries.

### RootCauseAnalysis — Kepner-Tregoe

| Dimension | IS | IS NOT | Distinction | Change |
| --- | --- | --- | --- | --- |
| What | Imported `/723` reading | Urania owner Folio row | Archive metadata and artifact body live outside Urania | Archive ingestion stopped at protected provenance |
| Where | Living Archive and low-level node doorway | Folio detail and home map | Operator, recipient, and narrator surfaces own different routes | Navigation evolved independently per capability |
| When | Returning to completed work | Creating a fresh witness reading | No grant is created at completion or selection | Completion persisted identity but not distribution |
| Extent | Hundreds of local artifacts, one visible Urania Folio row | Newly generated self-service rows | Corpus breadth is invisible to owner-scoped Folio by design | Correct authorization was mistaken for a complete journey |

Surviving contributing factors are: the archive stopped at metadata-only
operator review; completed-reading distribution has no domain object; and chat
is mounted from doorway selection rather than represented as a stable product
route. Fixing only table styling, a copy button, or the chat modal cannot
explain all three distinctions.

### SystemsThinking — Iceberg

- **Event:** the operator cannot see the `/723` body, invite its recipient, or
  find chat from the visible reading journey.
- **Pattern:** each correct subsystem exposes its own doorway, so new
  capabilities become isolated surfaces rather than relations around one
  reading identity.
- **Structure:** Selemene owns archive authority, Urania owns recipient
  experience, and no capability grant connects them; hash routes represent
  graph nodes and Folio but not conversation.
- **Mental model:** “a feature exists if a component or endpoint exists.” The
  product requires the stronger model: a capability exists only when the right
  actor can discover, enter, complete, and recover it.
- **Structural intervention:** make the canonical reading ID the shared spine;
  attach operator invite issuance, recipient redemption, and conversation as
  explicit bounded transitions.

### FirstPrinciples — Deconstruct and Reconstruct

The irreducible jobs are: enumerate completed readings, select one immutable
reading identity, grant bounded recipient access, render its real body, and
continue a conversation without changing that identity. An operator dashboard,
copy button, modal chat, and filesystem are implementation forms, not
requirements. The reconstructed flow keeps only two hard authority surfaces:
Selemene issues a privacy-filtered reading capability; Urania consumes that
capability and owns the recipient encounter. Administrative provenance never
crosses the boundary.

### Criteria

- [x] ISC-581: Authorized operators can reach Living Archive from protected navigation.
- [x] ISC-582: Living Archive returns the complete paginated `/723` archive total.
- [x] ISC-583: Archive search matches reading title.
- [x] ISC-584: Archive search matches subject name.
- [x] ISC-585: Archive search matches owner email.
- [x] ISC-586: Archive filters distinguish Solo and Synastry reading types.
- [x] ISC-587: Archive summary shows total completed readings.
- [x] ISC-588: Each archive row shows title, subject, type, state, and captured date.
- [x] ISC-589: Selecting a row produces a stable reading-specific URL.
- [x] ISC-590: Browser history reopens and closes the selected reading predictably.
- [x] ISC-591: Detail renders the real readable artifact when available.
- [x] ISC-592: Detail reports an explicit unavailable state instead of fabricating content.
- [x] ISC-593: Detail preserves owner, subject, source, and producer as separate facts.
- [x] ISC-594: One primary Invite recipient action is visible on completed reading detail.
- [x] ISC-595: Invite creation requires a server-authorized operator permission.
- [x] ISC-596: Invite creation accepts an expiry from a bounded allowlist.
- [x] ISC-597: Invite creation is scoped to exactly one canonical reading.
- [x] ISC-598: Invite tokens contain at least 256 bits of randomness.
- [x] ISC-599: Only an invite-token digest is persisted.
- [x] ISC-600: Invite plaintext is returned only in the creation response.
- [x] ISC-601: Invite access fails after expiry.
- [x] ISC-602: Invite access fails after revocation.
- [x] ISC-603: Invite creation and revocation append auditable events.
- [x] ISC-604: Admin detail lists active, expired, and revoked invite states.
- [x] ISC-605: Operator can copy the complete recipient URL.
- [x] ISC-606: Clipboard failure exposes a selectable fallback URL.
- [x] ISC-607: Recipient URL resolves without protected admin authority.
- [x] ISC-608: Recipient payload contains the canonical reading identity.
- [x] ISC-609: Recipient payload contains the real privacy-filtered reading body.
- [x] ISC-610: Recipient payload excludes owner UUID and email.
- [x] ISC-611: Recipient payload excludes filesystem and object-storage locators.
- [x] ISC-612: Recipient payload excludes administrative checksums and import metadata.
- [x] ISC-613: The system exposes a stable public reading-invite route outside protected admin.
- [x] ISC-614: The invite route renders the shared reading before asking for conversation input.
- [x] ISC-615: The invite route exposes a visible Continue in conversation relation.
- [x] ISC-616: “Begin in chat” opens a real conversational surface.
- [x] ISC-617: Conversation has a stable route independent of a transient modal.
- [x] ISC-618: Conversation resumed from a reading retains that canonical reading ID.
- [x] ISC-619: Fresh conversation still requires an explicit Selemene doorway.
- [x] ISC-620: Closing conversation returns to the reading or graph origin.
- [x] ISC-621: Completion continues to link one canonical Folio reading.
- [x] ISC-622: Antecedent: reading, invite, evidence, and conversation are visible relations around the selected reading.
- [x] ISC-623: Anti: operator presentation never grants cross-user API authority.
- [x] ISC-624: Anti: no protected Selemene administrator endpoint is proxied through Urania.
- [x] ISC-625: Anti: no `/723` archive row is copied into Urania D1.
- [x] ISC-626: Anti: no invitation grants access to a different reading ID.

### Features

| Feature | Description | Satisfies | Depends on | Parallelizable |
| --- | --- | --- | --- | --- |
| Archive operator flow | Searchable, typed, deep-linkable completed-reading browse/detail | 581–593 | existing Living Archive query/detail | yes |
| Completed-reading invitation | Expiring digest-only grants with copy, audit, list, and revoke | 594–606, 623, 626 | archive identity + authorization | yes |
| Recipient reading contract | Privacy-filtered capability resolution and real artifact body | 607–612, 624–625 | publishable artifact resolver | no |
| First-class conversation | Stable routes and reading-context handoff in Urania | 613–622 | recipient contract + ChatSheet | yes |

### Test Strategy

| ISC | Type | Check | Threshold | Tool |
| --- | --- | --- | --- | --- |
| 581–593 | admin UI/API | list, search, filters, deep link, readable detail | all named fields and states | Vitest + browser |
| 594–606 | API/security | create, digest storage, expiry, revoke, audit, copy | zero plaintext persistence | Rust integration + UI contract |
| 607–612 | capability boundary | redeem valid/expired/revoked token; inspect payload | only bounded reading fields | Rust integration + curl |
| 613–622 | Urania route/UI | invite, chat, context, close/back, canonical handoff | stable route and identity | Vitest + browser |
| 623–626 | anti-regression | authorization, proxy, D1, cross-reading probes | zero violations | source audit + negative tests |

### Decisions

- 2026-07-28: The `/723` archive remains in Selemene; Urania will not gain an
  administrator list or proxy because operator presentation is not authority.
- 2026-07-28: A completed-reading invitation is a new bounded capability, not
  a relationship-consent invitation and not a public artifact URL.
- 2026-07-28: The recipient URL must fail closed when a real readable artifact
  cannot be resolved. Metadata-only success would misrepresent delivery.
- 2026-07-28: Chat becomes a stable product route. Modal presentation may
  remain as responsive rendering, but route and reading context own recovery.
- 2026-07-28: Refero flow lookup was attempted but the connected subscription
  was inactive; existing Urania/Selemene interface grammars remain the visual
  reference rather than inventing a third aesthetic.

### Verification

- ISC-581–593: migration 001–037 applied to disposable PostgreSQL 16; the
  v2 importer rolled back an injected pre-COMMIT failure to 0/0, converged to
  53 readings, 55 unique subject links, 2 relationships, and 4 relationship
  members, rejected stored-row drift, and reran idempotently. Real API and
  Chromium proved 53/53 complete, title/subject/owner search, 51 Solo/2
  Synastry filtering, stable UUID detail, full responsive containment, and
  the two visible Synastry participant/relationship contracts.
- ISC-594–606: real API creation returned 201 with a 43-character URL-safe
  256-bit token; PostgreSQL retained only its 64-character SHA-256 digest.
  Bounded expiry rejected 0/721 hours, invitation history showed active,
  expired, and revoked states, and responsive Chromium proved create/copy,
  selectable fallback, long-link containment, and exact revoke.
- ISC-607–612: unauthenticated active redemption returned 200 and
  `Cache-Control: no-store`; concurrent reusable redemption returned 200/200,
  then the same token returned 404 after revocation. Expired, revoked,
  wrong-reading, and malformed tokens returned the same unavailable envelope.
  The real privacy-filtered payload contained the checksum-matching artifact
  body and omitted owner, locator, checksum, import, and token fields.
- ISC-613–622: Urania passed 715 tests, production build, 17 UI contracts, and
  five real Chromium desktop/mobile stories for direct `#/chat`, doorway
  chooser, canonical reading identity, bounded Folio return, malformed
  doorway recovery, and close/back behavior with no unexpected console or
  network errors. Multi-turn, invalid-turn, retry, save-failure, and expired
  binding behavior remain covered by the state-machine and transition suites.
- ISC-623–626: protected archive list/detail returned 401 without credentials
  and 403 to a valid basic-only JWT; valid admin access passed. No protected
  endpoint was proxied through Urania, no archive row entered D1, and
  cross-reading token reuse failed with the same 404 body.
- Coverage: 46/46 passed; all 46 have tool-verified live or executable-test
  evidence.

### Changelog

- 2026-07-28 | conjectured: correct Synastry typing and two returned rows were
  sufficient proof that relationship readings were modeled completely.
  refuted by: advisor review and the real API showed each Synastry row carried
  one combined group subject and no relationship label.
  learned: relationship readings require distinct candidate identities,
  explicit membership roles, and a visible relationship on both list and
  stable detail; type alone is not a relationship model.
  criterion now: ISC-588 and ISC-593 require two subject links plus the
  relationship label/kind for every bounded Synastry row, proven in the real
  API and browser.

## Iteration 18 — AgentScope Context Orchestration Plan (2026-07-28)

### Problem

Urania and Selemene already contain engine execution, the Witness Dyad, a
multi-pass report pipeline, provenance-oriented reading agents, Folio storage,
relationship modeling, provider routing, and substantial planning. The missing
capability is not “agents” in the abstract: calculated engine results, selected
personal context, interpretation, and reading-aware conversation still move
through separate contracts. Introducing AgentScope without a strict fit analysis
could duplicate this infrastructure, create a second memory authority, or place
a Python orchestration runtime inside Cloudflare-facing paths where it does not
belong.

### Vision

AgentScope is used only where its abstractions measurably improve the existing
Dyad orchestration: observable multi-agent turns, explicit state transitions,
tool and model adapters, structured message flow, evaluation, and replay. The
canonical reading identity, deterministic engine results, context provenance,
Folio authority, and graph-first Urania experience remain native Noesis
contracts. A future reader can see exactly which AgentScope ideas are adopted,
which are adapted behind a boundary, and which are rejected as duplicate
infrastructure.

### Out of Scope

- No AgentScope dependency or runtime is added during this planning iteration.
- No existing Dyad, Witness pipeline, agent kernel, Folio, or provider router is replaced.
- No deterministic or stochastic engine result is regenerated by an agent.
- No NotebookLM premium-asset path is moved online.
- No Python service is placed inside Urania’s Cloudflare Pages runtime.
- No framework-owned memory becomes the canonical source of user reading history.

### Principles

- Framework adoption follows capability gaps, never repository popularity.
- Calculations complete before agent interpretation begins.
- Provenance is a first-class data contract, not prompt prose.
- AgentScope may orchestrate agents; Noesis continues to own reading truth.
- The graph remains the interface at every depth, including orchestration state.
- Every new runtime boundary must fail closed without degrading stored readings.

### Constraints

- Urania remains React/Vite/Cloudflare Pages with D1-backed product state.
- Selemene remains the authoritative Rust engine and operational API surface.
- Existing TypeScript Witness and narrow interpretation agents remain reusable.
- A Python AgentScope runtime, if adopted, must be isolated behind an authenticated service boundary.
- Context selection must be bounded by reading identity, owner, subject, relationship, and explicit level.
- Agent transcripts and model output never overwrite source engine envelopes.

### Goal

Produce a source-evidenced, implementation-ready plan that maps AgentScope’s
current capabilities onto the existing Urania/Selemene/Dyad architecture,
selects the smallest valuable integration boundary, preserves calculation and
context provenance, and decomposes adoption into reversible TDD phases with
exact ownership and verification.

### Criteria

- [x] ISC-627: The official AgentScope repository and current documentation are inspected.
- [x] ISC-628: AgentScope language, package, release, and runtime requirements are recorded.
- [x] ISC-629: AgentScope agent abstractions are mapped from official source.
- [x] ISC-630: AgentScope tool execution abstractions are mapped from official source.
- [x] ISC-631: AgentScope message, memory, and hook abstractions are mapped from official source.
- [x] ISC-632: AgentScope multi-agent workflow abstractions are mapped from official source.
- [x] ISC-633: AgentScope state, session, or persistence abstractions are mapped from official source.
- [x] ISC-634: AgentScope tracing, evaluation, or observability abstractions are mapped from official source.
- [x] ISC-635: Python-runtime compatibility with Urania and Selemene boundaries is determined.
- [x] ISC-636: Existing Selemene Witness Dyad orchestration is traced.
- [x] ISC-637: Existing Urania grounded interpretation-agent orchestration is traced.
- [x] ISC-638: Existing Witness multi-pass asset orchestration is traced.
- [x] ISC-639: Existing Folio and reading-context authority is traced.
- [x] ISC-640: Existing provenance and source-immutability invariants are inventoried.
- [x] ISC-641: AgentScope capability gaps and infrastructure overlaps are classified.
- [x] ISC-642: Three integration approaches are compared with explicit trade-offs.
- [x] ISC-643: One minimum viable integration approach is recommended.
- [x] ISC-644: Rejected AgentScope adoption surfaces are named with rationale.
- [x] ISC-645: The target calculation-to-conversation architecture is diagrammed.
- [x] ISC-646: A versioned context packet contract is specified.
- [x] ISC-647: A versioned provenance envelope contract is specified.
- [x] ISC-648: AgentScope adapter ownership boundaries are specified.
- [x] ISC-649: Timeout, retry, fallback, and degradation behavior is specified.
- [x] ISC-650: Model-provider routing ownership is specified without duplication.
- [x] ISC-651: Session and transcript persistence ownership is specified.
- [x] ISC-652: Graph-first orchestration status and recovery surfaces are specified.
- [x] ISC-653: Privacy and context-selection boundaries are specified.
- [x] ISC-654: Adoption is decomposed into reversible migration phases.
- [x] ISC-655: Every migration task names exact files or new module locations.
- [x] ISC-656: Every migration task uses failing-test-first sequencing.
- [x] ISC-657: Every phase names executable verification commands and expected evidence.
- [x] ISC-658: Anti: AgentScope cannot overwrite canonical engine results or Folio identity.

### Features

| Feature | Description | Satisfies | Depends on | Parallelizable |
| --- | --- | --- | --- | --- |
| AgentScope capability study | Official-source abstraction, runtime, and operational analysis | 627–634 | none | yes |
| Existing orchestration map | Trace Dyad, agents, Witness, Folio, and provenance contracts | 635–640 | none | yes |
| Integration decision | Compare approaches, overlaps, rejected surfaces, and recommendation | 641–644 | capability study + orchestration map | no |
| Target contracts | Architecture, context packet, provenance, ownership, failure semantics | 645–653 | integration decision | no |
| Executable migration plan | Reversible phases with exact files, TDD, and verification | 654–658 | target contracts | no |

### Test Strategy

| ISC | Type | Check | Threshold | Tool |
| --- | --- | --- | --- | --- |
| 627–634 | external-source audit | AgentScope claims cite official repository or documentation | every claim source-backed | web + temporary clone |
| 635–640 | local architecture audit | each current capability has a real definition and caller edge | no label-only inference | CodeGraph + source inspection |
| 641–644 | decision audit | options distinguish adoption, adapter, and rejection | three alternatives, one recommendation | evidence matrix |
| 645–653 | contract review | every data and ownership edge is explicit | zero dual authorities | schema and sequence review |
| 654–658 | plan lint | exact paths, TDD order, commands, rollback, anti-criteria | all tasks executable | writing-plans checklist |

### Decisions

- 2026-07-28: This iteration is research and planning only. Existing dirty
  worktrees remain untouched except for the project ISA and the new plan
  document.
- 2026-07-28: The writing-plans skill normally prefers a dedicated worktree.
  Creating one would hide a review-only document from the active shared state;
  this iteration keeps documentation in the current worktree and performs no
  implementation.
- 2026-07-28 16:13: AgentScope 2.0 will first inform executor-neutral lifecycle
  and replay contracts, then pilot as an optional remote TaskExecutor behind
  the existing AtomicTask, FactLock, grounding, repair, and service interfaces.
- 2026-07-28 16:13: The host revalidates the immutable FactLock hash and every
  claim/source reference after remote execution; an incomplete terminal event
  sequence or provenance projection fails closed to the in-process executor.
- 2026-07-28 16:13: AgentScope Agent Service, storage, teams, workspaces, and
  Studio are confined to a credential-isolated evaluation lab until measured
  scale or quality evidence justifies a separately approved expansion.

### Changelog

- 2026-07-28 | conjectured: AgentScope should become the new orchestration
  layer around the existing Dyad and contextual reading flow.
  refuted by: CodeGraph and source inspection found the extracted
  `@witness/orchestration` package already owns AtomicTask DAGs, FactLock
  injection, GroundingProvider, sparse contradiction repair, metrics,
  observers, and a swappable TaskExecutor/service boundary.
  learned: AgentScope's minimum valuable seam is executor and lifecycle
  instrumentation, while the existing Noesis orchestration contract remains
  the authority and comparison baseline.
  criterion now: ISC-643 and ISC-648 require the recommended adapter boundary,
  return-side invariants, and explicit rejection of full-service replacement.

### Verification

- ISC-627: Official repository, stable release, and documentation pages were inspected.
- ISC-628: The plan records AgentScope 2.0.5, Python 3.11+, and an exact frozen lock.
- ISC-629: `Agent`, `reply_stream`, structured output, and custom model boundaries are mapped.
- ISC-630: Tool execution is constrained by default-deny permissions and explicit allowlists.
- ISC-631: Messages, events, middleware, ephemeral state, and redacted replay are mapped.
- ISC-632: Agent Teams and Agent Service are compared against the fixed native Dyad DAG.
- ISC-633: AgentScope state remains ephemeral; Urania Folio remains persistent authority.
- ISC-634: Lifecycle events are adopted while Noesis conformance/evaluation remains authoritative.
- ISC-635: The Python runtime is isolated behind an authenticated internal service boundary.
- ISC-636: Selemene calculation, Rust Witness, persistence, and provider fallback were traced.
- ISC-637: Urania's grounded `/api/chat/interpret` flow and claim validator were traced.
- ISC-638: `@witness/orchestration`, inference adapters, and three-pass graphs were traced.
- ISC-639: D1 Folio, canonical reading recovery, evidence, sources, and conversation were traced.
- ISC-640: FactLock, result hashes, source IDs, claims, and immutable reading rows are inventoried.
- ISC-641: The plan distinguishes useful executor capabilities from duplicated infrastructure.
- ISC-642: Full service, executor adapter, and concept/event-only approaches are compared.
- ISC-643: Concept/event contracts first, optional remote `TaskExecutor` second, is recommended.
- ISC-644: Agent Service ownership, dynamic fixed-Dyad teams, memory, and Studio are rejected.
- ISC-645: Mermaid diagrams calculation-to-conversation and lifecycle/recovery flow.
- ISC-646: `ContextPacketV1` specifies bounded, owner-scoped, additive L0–L5 context.
- ISC-647: `ProvenanceEnvelopeV1` specifies lineage, hashes, events, claims, and terminal state.
- ISC-648: The authority constitution assigns exactly one owner to every material concern.
- ISC-649: The failure matrix covers timeout, retry ownership, cancellation, fallback, and stale data.
- ISC-650: The existing Witness provider gateway remains the sole provider/model policy owner.
- ISC-651: AgentScope sessions are ephemeral; Noesis stores executor-neutral provenance and Folio state.
- ISC-652: Domain graph nodes expose execution status, failure, fallback, and recovery.
- ISC-653: Context is server-selected, authorization-bounded, redacted, capped, and hash-addressed.
- ISC-654: Thirteen tasks stage native contracts, optional worker, shadow, canary, and convergence.
- ISC-655: Every task names verified existing paths or explicit new module locations.
- ISC-656: Every task section contains failing-first evidence before implementation or promotion.
- ISC-657: Every implementation phase includes executable commands and expected evidence.
- ISC-658: The “must not own” constitution forbids source-result or Folio-identity overwrite.

## Iteration 19 — AgentScope Context Orchestration Execution (2026-07-28)

### Problem

The approved AgentScope plan is implementation-ready, but its thirteen tasks
span three repositories whose live worktrees already contain substantial,
uncommitted work. Ordinary isolated worktrees would omit those required
changes, while parallel writes into the same live repository could corrupt
someone else's work. The integration also crosses TypeScript, Cloudflare/D1,
Python/AgentScope, and Rust boundaries, so a locally green feature can still
create a second truth authority or weaken provenance at the return boundary.

### Vision

Calculated readings become the immutable center of a contextual journey:
authorized L0–L5 context is assembled server-side, the existing Dyad interprets
it through a replaceable executor, every claim retains source lineage, the
Folio stores linked interpretations, and the chat/graph surfaces make the run
recoverable. AgentScope adds structured execution and replay without becoming
the calculation, provider, memory, orchestration, or persistence authority.

### Out of Scope

- No production deployment or live canary activation in this iteration.
- No migration of premium NotebookLM asset generation.
- No synchronous autoresearch inside ordinary reading requests.
- No AgentScope Agent Service, Studio, workspace, or long-term memory adoption.
- No replacement of Selemene calculations or the native Witness executor.
- No Codex coding or audit subagents; the user required OmniRoute external rails.
- No commits of unrelated pre-existing worktree changes.

### Principles

- Calculation truth is immutable before interpretation begins.
- Provenance crosses every process boundary as data, never prompt implication.
- One concern has one authority even when execution is distributed.
- Native behavior stays continuously testable throughout migration.
- Context depth expands evidence, while consciousness level changes register.
- Graph-visible lifecycle state describes domain events, not framework brands.
- Failure closes toward the native path and never toward silent acceptance.

### Constraints

- Selemene remains the engine and Rust persistence authority.
- Urania remains reading identity, Folio, authorization, chat, and UI authority.
- `@witness/orchestration` remains FactLock, DAG, grounding, repair, and validation authority.
- AgentScope is pinned exactly to 2.0.5 in an isolated Python 3.11+ service.
- The browser may send IDs, question, and selected depth; it may not send trusted source payloads.
- All coding patches originate through Temperance/OmniRoute `command-code`.
- Live-repository write waves are serialized whenever their target files overlap.
- Existing dirty changes are preserved and incorporated rather than reverted.

### Risks

- A remote executor can return plausible prose carrying a changed FactLock unless
  the host performs return-side validation before contradiction repair.
- An isolated HEAD-based worktree can silently erase the semantic dependencies
  currently present only in uncommitted files.
- AgentScope 2.0.5 may not support the workstation's Python 3.14 even though its
  declared floor is 3.11; the worker must therefore use a locked 3.11 runtime.
- Provider fallback can duplicate model calls if retry ownership exists in both
  the gateway and AgentScope.
- A D1 interpretation write can corrupt reading identity if it updates rather
  than references the immutable source row.
- Shadow evaluation can produce false confidence if it checks prose quality but
  omits FactLock, terminal-event, and claim-source coverage.

### Goal

Implement and locally verify Tasks 1–12 of the approved AgentScope integration
plan, then implement Task 13's disabled Rust shadow seam only if all preceding
gates pass. The resulting system must preserve immutable calculation and Folio
truth, expose versioned context/execution/provenance contracts, maintain native
fallback, and demonstrate that accepted code came from OmniRoute rather than
Codex coding rails.

### Criteria

#### Execution governance

- [ ] ISC-659: Every accepted coding patch has an external OmniRoute run or session identifier.
- [ ] ISC-659.1: Every coding task prompt records the plan path and wave identifier.
- [x] ISC-660: Every accepted coding batch uses an external OmniRoute rail, never a Codex coding rail.
- [x] ISC-661: Unrelated pre-existing worktree changes remain byte-identical after integration.
- [x] ISC-661.1: Pre-build tracked patches and untracked manifests have recovery copies.
- [x] ISC-662: The orchestration baseline passes 29 Node tests before implementation.
- [x] ISC-663: The Urania agent-kernel baseline passes 11 Vitest assertions before implementation.
- [x] ISC-664: The Selemene Witness contract baseline passes before implementation.
- [x] ISC-665: The default executor mode remains `native`.
- [x] ISC-665.1: Native authority assertions pass after every coding wave.
- [x] ISC-666: Anti: no production deployment command executes during this iteration.

#### Task 1 — executor-neutral contracts

- [x] ISC-667: `ContextPacketV1` is exported from `@witness/orchestration`.
- [x] ISC-668: `ExecutionEnvelopeV1` is exported from `@witness/orchestration`.
- [x] ISC-669: `ProvenanceEnvelopeV1` is exported from `@witness/orchestration`.
- [x] ISC-670: Canonical context hashes are byte-stable in tests.
- [x] ISC-670.1: Canonical FactLock hashes are byte-stable in tests.

#### Task 2 — return-side validation

- [x] ISC-671: A fully valid executor candidate passes host validation.
- [x] ISC-672: A candidate carrying a changed FactLock hash is rejected.
- [x] ISC-673: A candidate missing terminal provenance is rejected.
- [x] ISC-674: The legacy `TaskExecutor` passes the shared conformance suite.

#### Task 3 — replayable lifecycle

- [x] ISC-675: `NoesisAgentEventV1` represents start, delta, end, interruption, and error states.
- [x] ISC-676: Replaying a valid event stream reconstructs one final `TaskResult`.
- [x] ISC-677: Retry attempts remain distinct during event replay.
- [x] ISC-678: Anti: persisted lifecycle events contain no thinking blocks.

#### Task 4 — additive context

- [x] ISC-679: L0 returns source rendering without invoking an LLM.
- [x] ISC-680: Each higher interpretation depth includes the preceding permitted layers.
- [x] ISC-681: Relationship context fails closed without an active grant.
- [x] ISC-682: `interpretationDepth` never derives from `consciousnessLevel`.

#### Task 5 — linked Folio interpretations

- [x] ISC-683: Migration `0008` creates a reading-linked interpretation table.
- [x] ISC-684: Saving an interpretation leaves its source reading row unchanged.
- [x] ISC-685: The readings repository retrieves interpretations by canonical reading ID.
- [x] ISC-686: Repeating one idempotency key creates one interpretation row.

#### Task 6 — contextual interpretation endpoint

- [x] ISC-687: The contextual interpretation endpoint validates its public request schema.
- [x] ISC-688: The endpoint loads trusted source payloads by reading ID server-side.
- [x] ISC-689: Every returned claim references an allowed source ID.
- [x] ISC-690: L0 endpoint responses bypass model-provider calls.

#### Task 7 — reading-aware conversation

- [x] ISC-691: `ConversationPage` renders the canonical reading beside its chat surface.
- [x] ISC-692: Chat interpretation requests carry the canonical reading ID.
- [x] ISC-693: Selected prior-reading context respects the configured history cap.
- [x] ISC-694: Anti: conversation rendering never falls back to mock reading prose.

#### Task 8 — isolated AgentScope worker

- [x] ISC-695: The worker dependency specification pins `agentscope==2.0.5`.
- [x] ISC-696: `uv sync --frozen` succeeds from the committed lockfile.
- [x] ISC-697: The worker health test passes.
- [x] ISC-697.1: The worker execute test passes.
- [x] ISC-697.2: The worker cancellation test passes.
- [x] ISC-698: Anti: the worker exposes no persistent memory or write tools.

#### Task 9 — provider gateway

- [x] ISC-699: The internal model gateway rejects requests without internal authentication.
- [x] ISC-700: Provider selection remains inside the existing Witness routing factory.
- [x] ISC-701: AgentScope receives no provider credential material.
- [x] ISC-702: AgentScope performs zero independent model retries.

#### Task 10 — remote executor

- [x] ISC-703: Executor routing supports native, shadow, and canary modes.
- [x] ISC-704: Canary output reaches callers only after host validation.
- [x] ISC-705: Timeout or invalid output returns the native executor result.
- [x] ISC-706: Unknown AgentScope event fields survive under namespaced extensions.

#### Task 11 — provenance-first shadow evaluation

- [x] ISC-707: The shadow corpus covers L0–L5, Panchanga, Tarot, I Ching, history, and research.
- [x] ISC-708: Shadow evaluation reports zero FactLock mutations.
- [x] ISC-709: Shadow evaluation reports complete terminal-event coverage.
- [x] ISC-709.1: Shadow evaluation reports complete claim-source coverage.
- [x] ISC-710: Shadow evaluation records latency and cost budgets without auto-promotion.
- [x] ISC-710.1: A native shadow baseline is recorded before provider-gateway changes.

#### Task 12 — canary recovery

- [x] ISC-711: Canary routing produces deterministic decisions from its configured inputs.
- [ ] ISC-712: Every routing decision is recorded in executor-neutral provenance.
- [x] ISC-713: Recovery UI exposes an explicit retry action.
- [x] ISC-713.1: Recovery UI exposes native fallback without AgentScope branding.
- [x] ISC-714: Native rollback succeeds without schema or source-reading restoration.

#### Task 13 — disabled Rust convergence seam

- [ ] ISC-715: The Rust Witness client starts in shadow-only mode.
- [ ] ISC-715.1: The disabled Rust seam passes a no-side-effect compatibility test.
- [ ] ISC-716: The existing Witness response contract remains byte-shape compatible.
- [ ] ISC-717: A remote-client failure preserves the local Rust Witness response.
- [x] ISC-718: Anti: assets, premium generation, autoresearch, and calculation routes remain unchanged.

### Test Strategy

| ISC range | Probe type | Threshold | Tool |
| --- | --- | --- | --- |
| 659–666 | execution provenance | command-code runs only; baselines retained; no deploy | Temperance indexes, git diff, test logs |
| 667–678 | package contract | schemas, validation, and replay all pass | orchestration Node tests + TypeScript |
| 679–694 | product integration | context, D1, endpoint, and chat behavior pass | Vitest + migration probe + browser test |
| 695–706 | runtime boundary | pinned worker, gateway, adapter, fallback pass | uv/pytest + Node conformance tests |
| 707–714 | promotion safety | corpus thresholds and rollback evidence pass | shadow evaluator + browser recovery story |
| 715–718 | Rust compatibility | disabled shadow seam preserves native response | Cargo contract tests + source diff audit |

### Features

| Feature | Description | Satisfies | Depends on | Parallelizable |
| --- | --- | --- | --- | --- |
| Execution governance | Preserve shared dirty state and prove OmniRoute authorship | 659–666 | none | no |
| Executor contracts | Context, execution, provenance, return validation, replay | 667–678 | governance | no |
| Urania context | Additive context assembly and linked interpretations | 679–690 | executor contracts | partially |
| Conversation flow | Canonical reading-aware chat and visible context selection | 691–694 | Urania context | no |
| AgentScope lab | Exact worker, provider gateway, and remote executor | 695–706 | executor contracts | partially |
| Shadow promotion | Corpus, canary routing, recovery, and rollback proof | 707–714 | all preceding features | no |
| Rust convergence | Disabled compatibility-preserving shadow client | 715–718 | shadow promotion | no |

### Decisions

- 2026-07-28 16:32: The user's explicit “not the codex rails” instruction
  overrides the Algorithm's normal Forge/Cato producer-auditor bindings.
  `command-code` supplies implementation; a separate OmniRoute vendor supplies
  the final cross-vendor audit.
- 2026-07-28 16:34: Parallel git worktrees were rejected for initial coding
  because the three live repositories contain uncommitted dependencies that
  isolated HEAD-based worktrees would omit. External write waves target the
  live repositories and are serialized per overlapping file set.
- 2026-07-28 16:36: External workers may not commit. The primary session
  integrates, audits, and verifies the combined diff while preserving unrelated
  changes.
- 2026-07-28 16:38: Task 13 may be implemented only after Tasks 1–12 pass their
  local promotion gate. It remains disabled and is not deployed.
- 2026-07-28 16:46: SystemsThinking identified rules and information flow as the
  highest feasible leverage points: the authority constitution, versioned
  envelopes, host validation, and replay arrive before the Python runtime.
- 2026-07-28 16:47: FirstPrinciples classified AgentScope itself as a soft
  implementation choice. Immutable calculation truth, owner-scoped context,
  cross-process serialization, and native fallback are the hard constraints.
- 2026-07-28 16:48: The provenance fault tree exposes four single-event cut
  sets—browser-supplied truth, unvalidated remote return, source-row overwrite,
  and overlapping dirty-tree edits. Tasks 1–6 plus serialized write waves must
  eliminate each before canary work begins.
- 2026-07-28 16:53: Advisor blocked BUILD until dirty-tree recovery,
  implementation provenance, native-authority assertions, additive contract
  staging, pre-gateway baseline capture, and per-wave rollback evidence exist.
  These are now explicit ISCs 659.1, 661.1, 665.1, 710.1, and 715.1.
- 2026-07-28 16:54: refined: execution waves are reordered to A0 recovery and
  authority baseline; A1 additive contracts/validation/replay; A2 Urania
  consumers plus isolated Python lab; B0 native corpus baseline; B1 provider
  gateway and conversation; C remote executor/evaluation/canary; D disabled
  Rust seam with an inertness test.
- 2026-07-28 17:02: Root-cause-at-ingestion: the divergent state begins after a
  calculation, before a server-authoritative context packet exists. Fixing that
  boundary once applies to Panchanga, Tarot, I Ching, prior readings, and chat;
  execution traces data authority upward from storage rather than patching UI
  output downward.
- 2026-07-28 17:12: The OmniRoute analogical/meta review confirmed
  `TaskExecutor` as the ports-and-adapters boundary and refined shadow execution
  to dual-write/single-read: persist native and AgentScope provenance, serve
  only native output, and never let shadow failure degrade the native record.
- 2026-07-28 17:19: Laguna reached its turn cap on the broad Wave A1 task and
  then failed at the provider rail on the narrowed contract task. The coding
  rail remains OmniRoute `command-code`; subsequent accepted patches may use
  Kimi Code as the recorded external-model fallback, never a Codex rail.
- 2026-07-28 17:27: The authenticated `command-code` account exhausted its
  credits after partial Task 1 implementation. Execution stayed off Codex:
  OmniRoute's GitHub-hosted Claude Sonnet 5 route completed the bounded patch,
  with external session IDs retained as implementation provenance.
- 2026-07-28 21:18: OmniRoute Spark 5.3 and Claude completed the bounded
  implementation and audit lanes. GitHub DNS, inactive Augment, and offline
  route failures required small primary-session integration corrections; no
  Codex coding or audit subagent rail was introduced.
- 2026-07-28 21:18: Task 13 remains deliberately unimplemented because the
  shadow report sets `promotionAllowed=false`, requires human review, and has
  no recorded operations approval. A scoped Selemene search found no
  AgentScope or executor-mode references, so the disabled gate has no dangling
  convergence seam.
- 2026-07-28 21:18: ISC-712 remains open until the request execution seam
  persists every safe routing decision inside executor-neutral provenance.
  Safe startup and API routing metadata are implemented, but they are not
  represented as proof of per-request persistence.
- 2026-07-28 21:18: The independent OmniRoute audit reported no P0/P1
  findings. Production promotion remains an operator-owned process requiring
  shadow review, security and operations sign-off, rollback rehearsal, and
  explicit canary approval.
- 2026-07-28 21:18: Premium NotebookLM assets, synchronous autoresearch, and
  all calculation engines remain outside this execution slice and unchanged.
  The remaining seven open ISCs are explicit provenance completeness or
  future human-gated Rust convergence work, not hidden implementation claims.

### Changelog

- 2026-07-28 | conjectured: isolated worktrees are always the safest place for parallel implementation
  refuted by: all three repositories contain required uncommitted changes that would be absent from HEAD-based worktrees
  learned: dirty shared-state integrations require serialized live-repository waves plus explicit ownership and before/after audits
  criterion now: ISC-661 requires unrelated pre-existing changes to remain byte-identical
- 2026-07-28 | conjectured: a passing shadow corpus is sufficient authorization to add the Rust convergence seam
  refuted by: the evaluator explicitly reports `promotionAllowed=false` and requires human review plus operations approval
  learned: promotion evidence and promotion authority are separate concerns; correct execution stops at the gate
  criterion now: ISC-715–717 remain open until the recorded human promotion precondition is satisfied

### Verification

- ISC-662: Node baseline — `@witness/orchestration` reports 29 tests passed, 0 failed after `npm ci`.
- ISC-663: Vitest baseline — `agent-kernel.test.ts` reports 11 tests passed, 0 failed.
- ISC-664: Cargo baseline — existing `witness_interpret_contract_unchanged` and Witness prompt tests pass.
- ISC-661.1: Recovery probe — `/tmp/noesis-agentscope-recovery.Y2iRMD/README.md`
  records three HEADs plus SHA-256-verified binary patches and the overlapping
  Urania untracked archive. Tracked patches and overlapping untracked files were
  restored into disposable clones/directories and compared byte-for-byte; the
  Wave A1 target collision audit found only the recovered dirty `types.ts`.
- ISC-667–670.1: OmniRoute sessions
  `34cc1166-6d68-4ae6-9e50-dc73b36ef524` and
  `fdb6d01b-f5e7-4557-a324-3d78c99c9491` completed Task 1. Independent
  verification reports 58/58 orchestration tests passing and clean TypeScript;
  the contract suite covers exported schemas, canonical context hashing, and
  canonical FactLock hashing.
- ISC-671–674: OmniRoute session
  `f3bd0913-c18e-46f7-9e40-0c935c257c09` completed the Task 2 validator and
  legacy adapter. Independent verification reports 20/20 focused conformance
  tests, 78/78 complete orchestration tests, and clean TypeScript. The suite
  rejects changed FactLock hashes and missing terminal provenance before
  assembly, while the valid legacy executor completes through the same gate.
- ISC-675–678: OmniRoute session
  `e2e2b154-2717-4d8d-8557-f0681c5e5493` completed the Task 3 replay
  lifecycle. Independent verification reports 29/29 focused replay tests,
  107/107 complete orchestration tests, clean TypeScript, and a clean targeted
  diff check. Replay distinguishes attempts, fails closed on malformed event
  sequences, yields a `TaskResult` only for complete streams, and recursively
  rejects thinking or credential-bearing event payload keys.
- ISC-687–690: OmniRoute session
  `6aaab2c4-9da1-45c8-b284-7eeb8d8dfa9b` completed the Task 6 native API
  seam. Independent verification reports 24/24 focused endpoint tests,
  131/131 complete orchestration tests, clean TypeScript, and a clean targeted
  diff check. The endpoint rejects browser-supplied facts, performs
  owner-scoped server lookup, validates claim sources, and makes zero executor
  calls for L0.
- ISC-679–686: OmniRoute session
  `a177bef8-35d6-4a1b-ae4d-4947fe4205ed` completed the Task 4–5 Urania
  context and linked-interpretation slice. Independent verification reports
  30/30 focused tests, clean function and root TypeScript checks, a successful
  production build, and a clean targeted diff check. All migrations applied in
  a disposable SQLite database; a repeated owner/idempotency pair yielded one
  interpretation row while the source reading title and content remained
  byte-for-byte unchanged.
- ISC-695–698: OmniRoute sessions
  `99d21460-4d09-4e2d-bda2-f828c95551eb`,
  `485d3d39-58fc-40cb-8792-a2e046b9379d`, and
  `a9df5f9f-d345-430c-aa72-4a008542223f` completed and hardened the isolated
  Task 8 AgentScope lab. Independent verification proves frozen dependency
  installation, `agentscope.__version__ == 2.0.5`, and 13/13 Python tests for
  health, bounded execution, timeout, cancellation, inert authority
  references, and empty tools/offloader state. Generated environments,
  caches, bytecode, coverage, and local secret files are ignored while source
  and the lockfile remain visible.
- ISC-691–694: Urania's complete Vitest suite reports 92 files and 761 tests
  passing; its production build and function typecheck pass. Browser validation
  against the local Cloudflare runtime opened canonical reading
  `2ceacf42-527e-41c4-934c-4bf0132bd76a` from the Folio, continued it into
  conversation, preserved reading identity and context fields, and showed no
  mock prose on desktop or mobile.
- ISC-699–706: Witness TypeScript compilation passes. Focused routing and
  remote-executor suites report 42/42 tests passing, including internal
  authentication, credential isolation, no executor-owned provider retry,
  deterministic modes, host validation, native fallback, circuit breaking,
  FactLock/context/provenance echo checks, and namespaced extensions.
- ISC-708–710: The pinned AgentScope 2.0.5 lab reports 20/20 Python tests
  passing. Shadow evaluation reports 69/69 checks, all ten hard gates green,
  zero FactLock mutations, complete terminal and claim-source coverage, twenty
  corpus cases, 3420 ms p95 latency, approximately 0.09 cost, and
  `promotionAllowed=false`.
- ISC-711, ISC-713–714: Routing tests prove absent or invalid configuration
  fails closed to native, zero-percent canary is the default, and the SHA-256
  bucket is stable. Browser recovery injected a secret-bearing 503 followed by
  success: reader-safe retry and native continuation retained prior turns,
  emitted four unique idempotency keys across four requests, preserved semantic
  fields, leaked no internal terms, and produced no page errors.
- ISC-718 and Task 13 gate: Scoped Selemene search found no AgentScope,
  `WITNESS_EXECUTOR_MODE`, or `witness_orchestration` references. Existing
  living-reading invitation tests report 3/3 Node and 2/2 Rust assertions
  passing, and the admin web TypeScript check passes without any Task 13 edits.
- Final audit: OmniRoute Claude session `53035` reviewed routing, remote
  execution, event projection, API exposure, startup configuration, recovery
  UI, tests, and runbook and reported no P0/P1 findings. It independently
  confirmed native defaults, secret isolation, provenance integrity,
  concurrency guards, reader-safe errors, and manual promotion gates.
- Regression note: Witness's complete suite reports 768/770 passing. The two
  failures are the unchanged, pre-existing batch-output-quality vocabulary and
  sentence-ending checks in untracked files last modified on 2026-07-02 and
  2026-06-25; no accepted patch touches those files. All targeted task suites,
  TypeScript builds, and diff checks pass.

## Iteration 20 — Contextual Readings Release Cut (2026-07-29)

### Problem

The contextual reading, Folio, invitation, and recovery work was verified only
inside dirty local worktrees. The active Urania branch still pointed at its
remote commit, while the release files remained uncommitted; consequently no
tag or Cloudflare production deployment could contain the new UI.

### Vision

One release identifier names the same immutable source across GitHub, the
package version, the production D1 schema, and Cloudflare Pages. An authorized
reader opening Urania immediately encounters the released Folio-to-conversation
flow instead of the previous production surface.

### Out of Scope

- No AgentScope canary or Rust convergence activation.
- No premium NotebookLM asset generation or archive-content publication.
- No unrelated generated project-status snapshot in release history.

### Constraints

- Production remains the `urania-137` Cloudflare Pages project on branch `main`.
- Migration `0008_reading_interpretations.sql` must precede code that writes interpretations.
- Existing dirty work must be staged by explicit path, never broad inclusion.
- The release must fast-forward from the current `origin/main` ancestry.
- Cloudflare Access remains enabled on the custom domain.

### Goal

Publish Urania 137 v0.6.0 from an auditable Git commit, migrate production D1,
deploy that exact source to Cloudflare Pages, and prove the released reading
flow at the live URL.

### Criteria

- [x] ISC-719: A browser screenshot captures the pre-release production surface.
- [x] ISC-720: One feature commit contains the contextual-reading release files.
- [x] ISC-721: Package and lockfile both declare version `0.6.0`.
- [x] ISC-722: The complete Urania Vitest suite exits successfully.
- [x] ISC-723: The production Vite build exits successfully.
- [x] ISC-724: The Cloudflare Functions TypeScript check exits successfully.
- [x] ISC-725: Production D1 reports migration `0008` applied.
- [x] ISC-726: The feature branch remote points at the release commit.
- [x] ISC-727: Remote `main` fast-forwards to the release commit.
- [x] ISC-728: Annotated tag `v0.6.0` resolves to the release commit.
- [x] ISC-729: GitHub exposes a published `v0.6.0` release.
- [x] ISC-730: Cloudflare production reports the release commit as source.
- [x] ISC-731: Live HTML references the newly deployed hashed assets.
- [x] ISC-732: Browser evidence shows the released Folio and conversation flow.
- [x] ISC-733: Anti: AgentScope canary and premium assets remain inactive.
- [x] ISC-734: Anti: `_PROJECT-STATUS.md` is absent from the release commit.

### Test Strategy

| ISC range | Probe type | Threshold | Tool |
| --- | --- | --- | --- |
| 719 | browser baseline | screenshot captured before release | Playwright |
| 720–721 | source/version | commit and two version fields agree | Git + Node |
| 722–724 | build quality | zero failed tests or type errors | Vitest + TypeScript + Vite |
| 725 | data migration | no pending `0008` migration | Wrangler D1 |
| 726–729 | release provenance | branch, main, tag, and release agree | Git + GitHub CLI |
| 730–732 | production proof | source commit, assets, and flow visible | Wrangler + curl + Playwright |
| 733–734 | regression boundary | gated configuration and local snapshot excluded | Git + environment audit |

### Features

| Feature | Description | Satisfies | Depends on | Parallelizable |
| --- | --- | --- | --- | --- |
| Release source | Commit the bounded contextual-reading implementation | 720–721, 734 | none | no |
| Quality gate | Re-run tests, builds, and function checks | 722–724, 733 | release source | partially |
| Data upgrade | Apply the additive interpretation migration | 725 | quality gate | no |
| Release provenance | Push branch/main, tag, and GitHub release | 726–729 | quality gate | no |
| Production promotion | Deploy and visibly verify exact release | 730–732 | data upgrade, release provenance | no |

### Decisions

- 2026-07-29 11:50: The unchanged UI is not a rendering regression. Git proves
  the active branch equals its remote while forty intended release paths remain
  dirty; Cloudflare production therefore cannot contain the implementation.
- 2026-07-29 11:50: Release v0.6.0 is a minor upgrade because it adds Folio
  interpretations, canonical reading-aware conversation, and recovery actions
  without intentionally breaking existing public request contracts.
- 2026-07-29 11:50: Delegation is omitted because commit, migration, tag, and
  production promotion form one ordered mutation chain. Parallel actors cannot
  safely advance the same branch or deployment target.
- 2026-07-29 12:00: Advisor review blocked the initial order because it tested
  a dirty tree and would have deployed a non-release build artifact. The
  corrected order is explicit staging and commit; isolated clean-checkout
  install/test/build/typecheck; remote D1 backup and migration; branch and
  fast-forward main push; deployment of that clean artifact; live verification;
  then annotated tag and GitHub release publication.
- 2026-07-29 12:00: Cloudflare reports `Git Provider: No`, confirming the Pages
  project is direct-upload only and cannot race the explicit deployment after
  the main push.
- 2026-07-29 12:40: Rollback is Pages-only. Migration 0008 contains only one
  new table and two new indexes; the previous production app does not reference
  them. The retained rollback target is deployment
  `2cf55770-bbba-4c27-9e3c-23ec023eae5e` at commit `c2c7673`; rebuilding and
  direct-uploading that commit to branch `main` restores the previous app
  without restoring D1, while any v0.6.0 interpretation rows remain preserved.
- 2026-07-29 12:40: Post-release Advisor review found no P0. Its remaining P1
  is that no synthetic production interpretation was written because that
  would persist test content in the owner's Folio and consume a live provider
  call. Direct production SQL proves the table and indexes exist with zero
  rows; clean tests prove write/read/idempotency behavior. A real user-authored
  first interpretation is the non-synthetic operational confirmation.

### Changelog

- 2026-07-29 | conjectured: local implementation completion implied the visible UI had advanced
  refuted by: Git showed no new commit and Cloudflare production still referenced an earlier source
  learned: implementation and production release require one shared, tool-proven done condition
  criterion now: ISC-720–732 bind source, schema, release, deployment, and visual proof

### Verification

- ISC-719: browser screenshot — `/tmp/urania-live-before-release.png` captures
  the custom production hostname resolving to its existing Cloudflare Access
  boundary before the v0.6.0 release.
- ISC-720: Git commit — `a988fcd5f3c5915ff0fe84a7cae7f8678ccb674e`
  contains exactly forty explicitly staged release paths; `_PROJECT-STATUS.md`
  remains untracked and absent.
- ISC-721: version read-back — `package.json` and the root package entries in
  `package-lock.json` report `0.6.0`.
- ISC-722: clean-checkout test — detached worktree at `a988fcd` reports
  `92 passed` test files and `761 passed` assertions.
- ISC-723: clean-checkout build — Vite transformed 1660 modules and wrote
  `index-CpEZfJz8.js` plus `index-j1CNTCU6.css` successfully.
- ISC-724: clean-checkout TypeScript — `npm run typecheck:functions` exits zero
  from the detached release worktree.
- ISC-725: remote D1 migration — a mode-0600, SHA-256-recorded pre-release
  export was captured; Wrangler then applied `0008_reading_interpretations.sql`
  and reports `No migrations to apply`.
- ISC-726–727: remote Git — both
  `refs/heads/codex/urania-role-aware-flow-repair` and `refs/heads/main`
  resolve to `a988fcd5f3c5915ff0fe84a7cae7f8678ccb674e`; PR 174 is merged and all
  three fresh CI runs pass.
- ISC-730: Cloudflare Pages — production deployment
  `e6ba661a-73b3-4a3c-be8f-8b3ce688d70c` reports branch `main` and source
  `a988fcd`.
- ISC-731: live asset probe — deployment HTML references
  `assets/index-CpEZfJz8.js` and `assets/index-j1CNTCU6.css`; both return 200
  with the exact clean-build byte sizes.
- ISC-732: authenticated browser — the custom production hostname visibly
  reports `v0.6.0 · a988fcd`, lists twelve canonical Folio readings, opens the
  Panchanga reading with evidence and checksum, then continues its canonical
  ID into the Witness chat exposing Pattern/Embodied/Synthesis/Navigate and
  interpretation depth L0–L5.
- ISC-733: runtime audit — release paths contain no premium or NotebookLM asset
  pack and no AgentScope runtime environment variables; the only AgentScope
  path is the inert integration plan, while canary remains unactivated.
- ISC-734: Git object probe — `_PROJECT-STATUS.md` is absent from commit
  `a988fcd` and remains the sole untracked local path.
- ISC-728: remote tag object — GitHub tag object
  `55aa4711bd915095ec854f3f7a79523439260d48` peels to commit
  `a988fcd5f3c5915ff0fe84a7cae7f8678ccb674e` and records Cloudflare deployment
  `e6ba661a-73b3-4a3c-be8f-8b3ce688d70c`.
- ISC-729: GitHub release — `v0.6.0 — Contextual Readings` is published,
  non-draft, non-prerelease, and records the production and rollback
  deployments.
- Operational schema probe: production D1 `sqlite_master` returns
  `reading_interpretations` plus both indexes from APAC primary, with
  `changes: 0`; the table currently contains zero rows.
- Operational cache/binding probe: HTML, JS, and CSS all serve
  `max-age=0, must-revalidate`; no service worker or Workbox registration
  exists. Production exposes encrypted `CHAT_PROXY_TOKEN` and
  `SELEMENE_API_KEY`, while the authenticated Folio proves Access and D1
  bindings. A scoped error tail observed no runtime errors during the API
  smoke window; the longer soak remains an owned operational follow-up.

## Iteration 21 — Public Landing and Protected Application Cutover (2026-08-01)

### Problem

The production custom domain challenges anonymous visitors with Cloudflare
Access before Urania can introduce itself. The preceding v0.6.1 release proved
artifact integrity but incorrectly treated that challenge as a successful
boundary, even though the approved production-readiness design and the user's
explicit expectation require the landing experience first and authentication
only after its entry action. An earlier same-SPA landing prototype was reverted
because it returned before later React hooks and because hash navigation cannot
cross a hostname-level Access boundary.

### Vision

An anonymous visitor opens `https://urania.tryambakam.space` and immediately
encounters the authored Urania landing journey. “Enter the Field” performs a
full-document transition to `https://app.urania.tryambakam.space`, where—and
only where—Cloudflare Access asks the visitor to authenticate. After the
threshold, the existing graph-first console, D1-backed Folio, and authenticated
API behave unchanged.

### Out of Scope

- No path-scoped Access bypass over the protected SPA.
- No weakening of Worker JWT verification for `/api/*`.
- No location/timezone, relationship-consent, or privacy-workflow expansion.
- No wholesale restoration of the rejected checkpoint architecture.
- No claim that the remaining production-readiness program is complete.

### Principles

- Invitation precedes identity: the product explains itself before requesting authentication.
- Authentication is a threshold, not the first screen.
- Host separation expresses the trust boundary more reliably than client routing.
- Public presentation contains no private bootstrap, data binding, or API authority.
- The graph remains the primary interface after the protected threshold.
- Production claims are made from anonymous live-browser evidence, not configuration intent.

### Constraints

- The public landing and protected console are separate build artifacts and Pages projects.
- `urania.tryambakam.space` is public landing; `app.urania.tryambakam.space` is protected console.
- The landing CTA is an absolute HTTPS link validated against an allowlist at build time.
- The landing artifact contains no Pages Functions, D1 binding, Access AUD, or app bootstrap.
- Every protected `/api/*` request still authenticates in `functions/api/[[path]].ts`.
- Existing production D1 data and migrations remain untouched.
- Cutover is staged and reversible; the apex Access selector is removed last.
- Existing unrelated `ISA.md` and `docs/architecture/` work remains preserved and unstaged.

### Goal

Ship and verify a split-host production entrance in which the public apex serves
only the Urania landing artifact, the CTA crosses to the Access-protected app
subdomain, anonymous API access remains denied, and every external mutation has
a recorded rollback target.

### Root Cause Analysis — Five Whys

1. The landing is invisible because Access challenges the apex document.
2. Access challenges the apex because the protected SPA and acquisition surface share one hostname.
3. They share one hostname because the landing extraction in Tasks 11–12 was not implemented before the release was explicitly cut.
4. The release was still declared successful because verification optimized for exact bytes and security boundary presence, not the intended first-visit journey.
5. The journey was missed because the release done-condition separated broader readiness but did not retain “landing before auth” as a release-blocking user-facing criterion.

Root cause: the deployment gate verified infrastructure identity while omitting
the anonymous encounter that defines the product entrance.

### SystemsThinking — Find Leverage

The high-leverage intervention is the system rule and topology: bind public and
protected purposes to different hostnames and artifacts. Adding a same-host
Bypass policy is a low-quality parameter change that creates an alternate
exposure path and leaves hash routing invisible to Access. The split makes the
desired behavior the default output of the system rather than a fragile policy
exception.

### FirstPrinciples — Reconstruct

Hard truths: anonymous visitors must receive public bytes; authenticated data
must remain behind server verification; URL fragments never reach the edge;
and one hostname-level document cannot be simultaneously challenged and public
for the same path. Therefore the minimal correct design is a public static
origin plus a separately protected application origin connected by one
absolute navigation.

### Criteria

- [x] ISC-735: `npm run build:landing` exits zero from a clean checkout.
- [x] ISC-736: `npm run build:app` exits zero from the same checkout.
- [x] ISC-737: The combined build writes distinct `dist/landing` and `dist/app` trees.
- [x] ISC-738: The landing build contains exactly one application-entry CTA origin.
- [x] ISC-739: The CTA origin is `https://app.urania.tryambakam.space` in production.
- [x] ISC-740: Invalid protected origins fail the landing build or configuration test.
- [x] ISC-741: The CTA is a declarative absolute anchor, not hash navigation.
- [x] ISC-742: The protected hash router still maps `#/` to the console home.
- [x] ISC-743: The protected `App` calls all hooks unconditionally.
- [x] ISC-744: The landing bundle contains no `/api/me` string.
- [x] ISC-745: The landing bundle contains no Access AUD or D1 database identifier.
- [x] ISC-746: The landing deployment directory contains no `functions/` tree.
- [x] ISC-747: The landing deployment configuration declares no D1 binding.
- [x] ISC-748: The landing document has exactly one `h1`.
- [x] ISC-749: The landing CTA is keyboard reachable with visible focus.
- [x] ISC-750: Reduced-motion visitors receive a stable, non-scrubbed composition.
- [x] ISC-751: Missing or rejected video playback leaves readable landing content.
- [x] ISC-752: Landing media avoids unconditional `preload="auto"`.
- [x] ISC-753: The landing makes zero application API requests before CTA activation.
- [x] ISC-754: The landing project hostname returns HTTP 200 anonymously.
- [x] ISC-755: The landing project `/api/me` returns 404, never app JSON.
- [x] ISC-756: The protected app custom hostname challenges anonymous HTML requests.
- [x] ISC-757: The protected app custom hostname challenges anonymous API requests.
- [x] ISC-758: The production apex returns landing HTML without an Access redirect.
- [x] ISC-759: The production apex `/api/me` returns 404, never landing HTML or app JSON.
- [x] ISC-760: A fresh browser renders the landing before any authentication page.
- [x] ISC-761: Activating “Enter the Field” navigates to the protected app hostname.
- [x] ISC-762: Cloudflare Access appears only after the landing CTA navigation.
- [x] ISC-763: The protected application retains the expected production D1 binding.
- [x] ISC-764: The deployed landing and app record the same exact source SHA.
- [x] ISC-765: A rollback receipt names prior Pages domains, projects, and deployments.
- [x] ISC-766: Anti: no same-host public Bypass exposes the protected SPA shell.
- [x] ISC-767: Anti: existing D1 rows, migrations, and secrets remain unmodified.
- [x] ISC-768: The existing Access application adds the app hostname without changing AUD.
- [x] ISC-769: The app custom hostname presents a valid TLS certificate covering its exact name.
- [x] ISC-770: A redacted export records the pre-cutover Access application and policies.
- [x] ISC-771: An Access-scoped credential completes authenticated readback before apex transfer.
- [x] ISC-772: A rollback receipt records apex and app DNS/custom-domain before state.
- [x] ISC-773: The application contains no cookie-domain, callback, or CORS dependency on the apex.

### Test Strategy

| ISC range | Probe type | Threshold | Tool |
| --- | --- | --- | --- |
| 735–743 | build and routing | both artifacts build; protected hooks/routes unchanged | npm, Vitest, TypeScript |
| 744–747 | artifact boundary | zero app/API/auth/data authority in landing output | Node boundary tests + filesystem scan |
| 748–753 | experience/accessibility | semantic, keyboard, reduced-motion, fallback, zero API calls | Vitest + browser network capture |
| 754–759 | live HTTP boundary | public landing 200/404; protected app/API challenged | curl + Cloudflare API readback |
| 760–762 | first-visit journey | landing visible before Access; CTA causes host transition | fresh browser profile + screenshots |
| 763–765 | deployment integrity | binding/SHA/rollback receipt agree | Cloudflare API + Git |
| 766–767 | anti-probe | no bypass and no D1/secret mutation | Access policy readback + D1 counts/config diff |
| 768–773 | cutover prerequisites | unchanged AUD, valid TLS, Access/DNS exports, origin portability | Access/Pages API + openssl + source scan |

### Features

| Feature | Description | Satisfies | Depends on | Parallelizable |
| --- | --- | --- | --- | --- |
| Landing artifact | Extract and harden the authored public presentation | 735, 737–753 | rejected checkpoint as read-only source | yes |
| Protected origin contract | Validate CTA and preserve protected SPA routing/auth | 736, 739–743 | landing artifact | partially |
| Landing deployment guard | Upload only static landing bytes to a separate project | 746–747, 754–755, 764 | landing artifact | no |
| Split-host cutover | Attach app subdomain, transfer apex, change Access selector last | 756–765 | both deployments | no |
| Boundary audit | Prove no bypass, D1 mutation, or secret drift | 763, 766–767 | cutover | no |

### Decisions

- 2026-08-01 15:50: refined: “Cloudflare Access is present” is no longer a
  sufficient launch probe. The first anonymous encounter and CTA-triggered
  threshold are now explicit release-blocking criteria ISC-758–762.
- 2026-08-01 15:50: ❌ DEAD END: The checkpoint `5972ac6` placed landing at
  `#/` and console at `#/console`; it broke the protected router contract,
  returned before later hooks, and could not cross Access because fragments
  are invisible to the edge. Salvage visual/copy source only; never restore its
  routing or `App.tsx` changes.
- 2026-08-01 15:50: Use public apex plus protected `app.` subdomain. Removing
  the apex Access selector before landing origin transfer is prohibited because
  it would briefly expose the full SPA shell.
- 2026-08-01 15:50: The original worktree contains pre-existing ISA and
  architecture changes. Implementation occurs in clean worktree branch
  `codex/urania-public-landing-hotfix`; this master ISA is appended in place but
  remains outside that branch's staged code set.
- 2026-08-01 15:50: Wrangler OAuth is valid for Pages, D1, Workers, and zone
  read, but its grant lacks Access application/policy scope. Pages work proceeds
  through CLI/API; final Access mutation requires an Access-scoped token or
  authenticated dashboard session.
- 2026-08-01 15:56: Pre-build Advisor review rejected creating a second Access
  application because a new audience would make the Worker reject every valid
  session. The cutover will extend the existing Access application with the
  app hostname, preserving AUD `df8a00b1d19f2e8034ed262544912656ca969fcdadf0e2599b61d4d2f687b6b4`,
  and remove only the apex hostname after the landing transfer is proven.
- 2026-08-01 15:56: Apex transfer is treated as delete-then-add, not atomic.
  Exact Pages custom-domain and DNS before-state, Access policy export, app-host
  TLS SAN, and a working Access-scoped credential are hard prerequisites.
- 2026-08-01 16:29: PRs #176 and #177 merged the static landing and its
  deployment correction to `main` at
  `c34a70f0ee1d0a848abebdcff2a271860f790324`; all ten GitHub checks passed.
- 2026-08-01 16:29: The exact merged landing is deployed to the separate
  production Pages project `urania-137-landing` as deployment
  `91e8df5a-f63b-4ae8-a37f-7b52cac52643`, with artifact SHA-256
  `3c156d7a250bb35b4e4295aebd4092b4dfe75018507ce1177033e3fbe18d7154`.
- 2026-08-01 16:29: ❌ DEAD END: Passing `--config` to `wrangler pages deploy`
  is parsed by help but rejected by Pages. The first attempt published no
  assets; PR #177 removed the flag and relies on the isolated staging root's
  sole `wrangler.toml`.
- 2026-08-01 16:29: The apex remains unchanged until an Access-scoped
  credential can export and update the existing Access application. Package
  version `0.6.2` is merged, but the tag/release is intentionally not cut
  before the public-apex journey is proven.
- 2026-08-01 16:50: The authenticated Cloudflare dashboard session exported
  the existing Access application before mutation. The app kept ID
  `03e2e059-ca4b-405c-8188-39415a22cf84`, policy
  `468e6887-7619-46e4-8e39-6b7e6b96c9ee`, and AUD
  `df8a00b1d19f2e8034ed262544912656ca969fcdadf0e2599b61d4d2f687b6b4` while
  replacing only the apex destination with `app.urania.tryambakam.space`.
- 2026-08-01 17:02: ❌ DEAD END: Adding the Access destination before Pages
  certificate validation left the custom domain in `Verifying`; Access
  intercepted Cloudflare's HTTP DCV path. Following Cloudflare's Pages
  debugging guidance, the new destination alone was temporarily removed and
  its CNAME temporarily gray-clouded. Pages immediately became Active with
  SSL, after which the CNAME was re-proxied and the same Access destination was
  restored; Access 302 propagation completed in nine seconds.
- 2026-08-01 17:15: Fresh production QA exposed zone-level Web Analytics
  injection as a CSP-blocked cross-origin request on the landing. Configuration
  rule `76844f8ce9714e64806781cf37b9b280` now sets `disable_rum=true` only when
  `(http.host eq "urania.tryambakam.space")`, preserving analytics elsewhere
  and restoring a zero-error, zero-cross-origin pre-CTA boundary.
- 2026-08-01 17:20: Release `v0.6.2` was published at exact main commit
  `c34a70f0ee1d0a848abebdcff2a271860f790324` only after final production Gate
  4 passed 5/5 and both Pages projects reported the same source SHA.

### Changelog

- 2026-08-01 | conjectured: an exact-SHA deployment behind Access completed the authorized production goal
  refuted by: the user's fresh-browser screenshot showed Access before the authored landing experience
  learned: release integrity is necessary but cannot replace verification of the intended first encounter
  criterion now: ISC-758–762 require public landing, CTA host transition, and delayed Access challenge

### Verification

- ISC-758 passed final probe: `https://urania.tryambakam.space/` returns HTTP
  200 with the authored landing and no Access redirect.
- ISC-759 passed final probe: `https://urania.tryambakam.space/api/me`
  returns static HTTP 404, never application JSON or landing HTML.
- ISC-760–762 passed final fresh-browser Gate 4: the landing renders first with
  exactly one `h1` and one `main`; all three CTAs target
  `https://app.urania.tryambakam.space/`; activation produces app HTTP 302 and
  then the Cloudflare Access email challenge. Before activation there are zero
  console/page errors, failed requests, `/api/*` calls, or cross-origin calls.
  Final captures: `/tmp/urania-production-final-landing.png` and
  `/tmp/urania-production-final-access.png`.
- ISC-735–753 passed on merged version `0.6.2`: the final canonical
  `npm run verify:ci` completed with 94 Vitest files / 781 tests, 61 Node tests
  passed with 11 corpus-dependent skips, both TypeScript builds, D1 schema
  verification, bundle budgets, and zero audited vulnerabilities.
- ISC-748–753 passed browser Gate 4 locally and on the deployed Pages hostname:
  one `h1`, exact absolute CTA anchors, visible keyboard focus, stable reduced
  motion, zero root console/page errors, zero application API requests, and
  zero cross-origin requests. Live screenshot: `/tmp/urania-production-preview.png`.
- ISC-754 passed: `https://urania-137-landing.pages.dev/` returns HTTP 200
  anonymously with the Urania landing title plus CSP, HSTS, COOP/CORP,
  no-sniff, frame, referrer, and permissions headers.
- ISC-755 passed: `https://urania-137-landing.pages.dev/api/me` returns HTTP 404
  with the static “Not found — Urania 137” page, never app JSON or landing HTML.
- ISC-763, ISC-766, ISC-767, and ISC-773 passed read-only audit: the protected
  project remains `urania-137` with D1
  `d57550ea-c8d3-48fc-a2ee-c6b3fc41948e`; no Bypass, D1, migration, secret,
  cookie-domain, callback, or CORS mutation was made.
- ISC-765 rollback receipt: before cutover, protected Pages project
  `urania-137` owns `urania.tryambakam.space` and `urania-137.pages.dev`;
  production deployment `ac4488b3-cbd5-42d9-9856-832ad9cb48d4` records source
  `c9771542980038fd975bdad8c119f6baefab8d3e`. The new landing project has no
  custom domain yet, so rollback requires no mutation at this checkpoint.
- ISC-756–757 passed: anonymous `app.urania.tryambakam.space/` and `/api/me`
  both return HTTP 302 to the existing Cloudflare Access application; the
  redirect `kid` and decoded audience remain
  `df8a00b1d19f2e8034ed262544912656ca969fcdadf0e2599b61d4d2f687b6b4`.
- ISC-764 passed: landing deployment
  `91e8df5a-f63b-4ae8-a37f-7b52cac52643` and protected app deployment
  `f40f990b-8ae3-4a19-a68e-63e1e91ffcb2` both record source
  `c34a70f0ee1d0a848abebdcff2a271860f790324`.
- ISC-768–769 passed: authenticated Access readback shows the original app ID,
  policy, session duration, settings, and AUD with
  `app.urania.tryambakam.space` as destination five; Pages reports Active / SSL
  enabled and OpenSSL reports subject and SAN exactly
  `app.urania.tryambakam.space` from Google Trust Services WE1.
- ISC-770–772 passed: redacted before/after Access, Pages, DNS, deployment,
  certificate, and remediation receipts live under the ignored `.release/`
  directory in the clean release worktree; no credentials, cookies, or session
  metadata are recorded.
- Release verification passed: GitHub release `v0.6.2` is published, non-draft,
  non-prerelease, and both the tag and remote `main` resolve to
  `c34a70f0ee1d0a848abebdcff2a271860f790324`.

## Iteration 22 — Witness-Prompt Public Landing Realignment (2026-08-01)

### Problem

The newly public Urania landing correctly introduces the protected application,
but its first encounter remains a conventional editorial campaign page. The
supplied Wandor reference identifies a stronger interaction hierarchy: a
full-viewport ambient field, immediate product promise, and one frosted prompt
instrument that lets the visitor understand what to do before crossing the
authentication threshold. A literal travel-app clone would violate Urania's
voice, visual system, privacy boundary, and graph-first protected experience.

### Vision

The anonymous landing feels like the first membrane of the Urania instrument.
An on-brand stellar field occupies the viewport; the headline names the real
question; and a liquid-glass witness prompt makes the product legible in one
encounter. The prompt, upload affordance, and entry action are declarative and
safe on the public artifact. The existing long-form sections remain available
below for visitors who need evidence before entering. Euphoric surprise comes
from recognizing the familiar clarity of the reference flow without finding a
single borrowed travel-app sentence or aesthetic.

### Out of Scope

- No change to the protected React application, hash router, Folio, chat, D1,
  Cloudflare Access, or Selemene execution surfaces.
- No production deployment, DNS change, release cut, or Access policy mutation.
- No third-party travel footage and no externally hosted runtime media.
- No claim that a public prompt is submitted, stored, interpreted, or uploaded.
- No replacement of Urania's canonical typography or palette with Wandor's.

### Principles

- Structure may be borrowed; identity may not.
- The landing explains the instrument before the protected threshold.
- The prompt is an invitation to examine, never a prediction box.
- Sacred geometry stays load-bearing and attributable to the approved visual system.
- Public presentation contains no private application authority or implicit data capture.
- Copy assumes capacity, preserves authorship, and protects productive ambiguity.

### Constraints

- Work starts from `main` at `c34a70f` in an isolated branch/worktree because
  the active tree is on an older release branch with unrelated dirty ISA work.
- The public landing remains statically rendered and non-hydrated.
- Every protected-app CTA remains a declarative allowlisted absolute HTTPS anchor.
- The landing bundle remains free of `/api/*`, D1, Access AUD, and protected app bootstrap.
- The approved Void Black, Sacred Gold, Witness Violet, Flow Indigo, Coherence
  Emerald, Parchment, Panchang/Satoshi/Cinzel visual grammar remains canonical.
- Reduced-motion, keyboard, semantic, and no-eager-media guarantees remain intact.
- External agent work routes through OmniRoute using `codex/gpt-5.3-codex-spark`;
  any unavailable task fails open without consuming GPT-5.6 Sol subagent quota.

### Risks

- OmniRoute may report the explicitly requested Spark model unavailable, as a
  prior 54-task dispatch did; work must fail open without silently changing rails.
- A frosted prompt can imply public submission or storage when none exists.
- The card can become generic glassmorphism and detach from the approved instrument grammar.
- Centered content can clip on 320px screens or obscure the ambient field.
- Editing the older active branch would omit the already-released landing boundary.

### Goal

Rebuild the public landing's first viewport around the supplied ambient-media
and liquid-glass prompt hierarchy while retaining the proven split-origin
security contract, Urania's authored long-form sections, and the complete
Noesis visual and verbal system.

### Criteria

- [x] ISC-774: The implementation branch is based on `main` commit `c34a70f`.
  - Evidence: isolated branch `codex/urania-landing-witness-prompt` reports HEAD `c34a70f0ee1d0a848abebdcff2a271860f790324`.
- [x] ISC-775: The public landing and protected application remain separate build artifacts.
  - Evidence: `npm run verify:ci` rebuilt `dist/app` and `dist/landing`; landing boundary Node tests passed.
- [x] ISC-776: The landing renders exactly one `main` and one `h1`.
  - Evidence: Vitest and Chromium metrics report `mainCount: 1`, `h1Count: 1` across all contexts.
- [x] ISC-777: The header renders the Urania 137 / Noesis wordmark in canonical typography.
  - Evidence: inspected `desktop-hero.png` and `mobile-320-hero.png`; the intact engraved Urania 137 mark is visible.
- [x] ISC-778: The desktop header exposes three in-page evidence anchors.
  - Evidence: rendered header contains Instrument, Principles, and Invitation anchors; desktop screenshot confirms placement.
- [x] ISC-779: The header entry CTA is an absolute allowlisted protected-app anchor.
  - Evidence: header CTA uses `appHref`; browser asserts all three CTA hrefs equal `https://app.urania.tryambakam.space/`.
- [x] ISC-780: The hero occupies at least one small dynamic viewport height.
  - Evidence: CSS uses `min-height: 100svh`; Chromium measured 1000px desktop and 882.8px at a 320×844 viewport.
- [x] ISC-781: Antecedent: the first viewport visibly preserves void, gold geometry, luminous stellar depth, and engraved typography.
  - Evidence: final desktop/mobile screenshots were visually inspected against `.assets` composition references.
- [x] ISC-782: Anti: the supplied travel video URL never appears in source or output.
  - Evidence: final source/output scan returned no Wandor, travel-host, MP4, or WebM reference.
- [x] ISC-783: The hero remains readable when its field poster cannot load.
  - Evidence: `field-poster-fallback.png` was captured with the SVG request aborted; headline and card remained visible without a broken-image glyph.
- [x] ISC-784: A top-to-transparent contrast veil keeps header and hero copy legible.
  - Evidence: `.landing-hero-overlay` supplies the top dark veil; desktop and mobile captures show readable chrome and copy.
- [x] ISC-785: The hero's message and prompt instrument share one centered reading flow.
  - Evidence: `.landing-hero-copy` is a centered grid; final viewport screenshots confirm the single vertical hierarchy.
- [x] ISC-786: The headline names examination or authorship without promising certainty.
  - Evidence: final headline is “See the pattern. Keep the authority.”
- [x] ISC-787: The supporting copy describes Urania without selling AI.
  - Evidence: focused copy assertions pass and rendered prose contains no AI-as-feature language.
- [x] ISC-788: The witness-prompt instrument has a bounded desktop width and generous radius.
  - Evidence: CSS caps the card at 701px with 44px radius; Chromium measured the cap at desktop, 759px, and 761px widths.
- [x] ISC-789: The witness-prompt instrument uses translucent fill, bright border, blur, and soft internal shadow.
  - Evidence: CSS and inspected captures confirm translucent fill, 3px bright border, 20px blur, inset line, and soft shadow.
- [x] ISC-790: The prompt example is specific enough to demonstrate a real decision or pattern inquiry.
  - Evidence: the card asks what pattern repeats and what concrete signal would disconfirm it.
- [x] ISC-791: Anti: reader-facing copy contains none of the critical Noesis avoid vocabulary.
  - Evidence: focused prose-only banned-vocabulary assertion passed; final source/output scan found no prohibited term.
- [x] ISC-792: A hidden file input accepts images and PDF context.
  - Evidence: the static input is visually hidden and declares `accept="image/*,.pdf"`.
- [x] ISC-793: The visible context control declaratively activates the hidden file input.
  - Evidence: the visible `<label>` targets `landing-witness-input`; Playwright observed the native file chooser.
- [x] ISC-794: The context control is keyboard reachable with a visible focus indicator.
  - Evidence: the native input remains focusable and its `:focus-visible` state outlines the adjacent visible label.
- [x] ISC-795: The context control has an accessible name that does not imply upload completion.
  - Evidence: accessible name is “Choose an image or PDF for context”; `aria-describedby` binds the explicit no-send note.
- [x] ISC-796: The prompt-card entry CTA targets the protected application origin.
  - Evidence: browser href probe resolved the prompt CTA exactly to the protected root.
- [x] ISC-797: Every primary interactive target is at least 44 CSS pixels tall.
  - Evidence: Chromium measured primary target heights of 44, 44.8, 53.6, and 53.6 pixels.
- [x] ISC-798: Hover, focus, and active states use restrained tactile transitions.
  - Evidence: CSS defines bounded color, border, translate, and 0.985-scale states with 180ms transitions.
- [x] ISC-799: The center navigation collapses below the compact breakpoint.
  - Evidence: at ≤760px center navigation is hidden while remaining in raw HTML; 759px/761px browser probes verify the seam.
- [x] ISC-800: The prompt instrument fits within the viewport at 320 CSS pixels.
  - Evidence: mobile browser measured a 288px card inside a 320px viewport.
- [x] ISC-801: Prompt copy remains readable without horizontal overflow on mobile.
  - Evidence: mobile document `scrollWidth` equals `viewportWidth` at 320px; inspected copy is unclipped.
- [x] ISC-802: The existing Instrument, Principles, and Invitation evidence sections remain reachable below the hero.
  - Evidence: all three sections are present in DOM and visible in `desktop-full.png`.
- [x] ISC-803: All rewritten sections follow the grounded, direct, respectful-challenging Noesis voice.
  - Evidence: copy was calibrated through the Noesis writer skill and independently audited on the exact Spark rail.
- [x] ISC-804: The public artifact contains no vault or internal-source references.
  - Evidence: final source and `dist/landing` scan found no `/Volumes`, vault, or brand-source path.
- [x] ISC-805: Anti: no AI-as-feature, prediction, diagnosis, or authority-transfer claim is introduced.
  - Evidence: focused copy tests pass; final Principles headline explicitly frames insight without overclaim.
- [x] ISC-806: The landing makes zero application API requests before CTA activation.
  - Evidence: browser verifier rejects any `/api/` request or request outside the local landing origin; all contexts passed.
- [x] ISC-807: The landing bundle imports no protected application bootstrap code.
  - Evidence: landing boundary Node tests and the 764-byte static entry bundle passed the artifact-boundary gate.
- [x] ISC-808: The landing contains no eager video payload or `preload="auto"` media.
  - Evidence: static markup contains no video or image element; local poster is a CSS background and focused tests pass.
- [x] ISC-809: Reduced-motion mode disables all nonessential continuous motion.
  - Evidence: reduced-motion Chromium context measured orbit animation duration `1e-05s` with one iteration.
- [x] ISC-810: Static rendering produces deterministic HTML without client hydration.
  - Evidence: Vite server-renders markup; `main.tsx` does not hydrate; no-JavaScript verification passed.
- [x] ISC-811: Landing unit, origin, boundary, typecheck, and production build gates pass.
  - Evidence: final `npm run verify:ci` exited 0: 94 Vitest files/787 assertions, 62 Node passes, builds, typechecks, budgets, and audit.
- [x] ISC-812: Desktop and mobile browser screenshots show the intended hierarchy without clipping or overlap.
  - Evidence: final desktop/mobile screenshots were inspected; header-bottom/kicker-top and horizontal-overflow assertions pass.
- [x] ISC-813: Anti: the witness prompt is not a modal, scrim, scroll-lock, interstitial, or dismissible gate.
  - Evidence: source test rejects those patterns; browser reports no dialog and body is not scroll-locked.
- [x] ISC-814: Instrument, Principles, and Invitation anchors remain present in raw static HTML.
  - Evidence: static markup assertions and JavaScript-disabled Chromium context found all three anchors/sections.
- [x] ISC-815: Anti: no witness-prompt content is placed in a URL, request, or cross-origin handoff.
  - Evidence: href tests reject prompt/query content; browser allows only local asset requests before direct root navigation.
- [x] ISC-816: The complete public landing remains readable and navigable with JavaScript disabled.
  - Evidence: `javascript-disabled.png` was inspected and its raw evidence heading remained visible.

### Test Strategy

| ISC range | Probe type | Check | Threshold | Tool |
| --- | --- | --- | --- | --- |
| 774–775 | repository | base ref and build trees | exact main base; two artifacts | git, build scripts |
| 776–787 | semantics/copy | static markup and vocabulary | exact structure; zero prohibited phrases | Vitest, Node grep |
| 788–801 | interaction/responsive | prompt-card contract and computed layout | 44px targets; no 320px overflow | Vitest, Playwright |
| 802–810 | architecture/content | retained sections and public boundary | zero private authority or hydration | boundary tests, bundle scan |
| 811 | build | landing-focused and project gates | all selected commands exit 0 | npm, TypeScript, Vite |
| 812 | visual | desktop/mobile encounter | no clipping, overlap, or broken hierarchy | Chromium screenshots |
| 813–816 | static encounter | hero is normal document flow and evidence remains reachable | no gate; raw HTML complete; JS optional | source scan, curl, Chromium |

### Features

| Feature | Description | Satisfies | Depends on | Parallelizable |
| --- | --- | --- | --- | --- |
| First-viewport architecture | Ambient field, contrast veil, centered promise, prompt instrument | 780–790 | approved assets + supplied plan | yes |
| Declarative context control | Accessible file-input affordance without collection claims | 792–795 | static HTML contract | yes |
| Protected entry contract | Retain allowlisted absolute anchors in header, prompt, invitation | 779, 796, 806–810 | existing split-host config | no |
| Responsive visual system | Desktop/mobile prompt geometry, motion, and type | 797–801, 809, 812 | first-viewport architecture | partially |
| Noesis copy transmutation | Rewrite hero and evidence sections through the canonical voice gates | 786–787, 790–791, 803–805 | writer calibration sources | yes |
| Verification hardening | Update tests and run static/browser/build evidence | 774–812 | all implementation features | no |

### Decisions

- 2026-08-01 17:23: refined: “proceed with the whole plan” binds the reference's
  interaction hierarchy, not its Wandor identity. Brand fonts, palette, travel
  footage, AI pitch, and trip copy are explicitly replaced by Urania-native equivalents.
- 2026-08-01 17:23: The public landing artifact on `main` is the target. The
  protected console's graph-first home remains unchanged; applying this prompt
  card inside the console would obscure its primary node interface.
- 2026-08-01 17:23: The static landing will use a declarative `<label>` + file
  input pattern. It may open the browser picker but will not claim that context
  has been uploaded, parsed, or retained before authentication.
- 2026-08-01 17:23: The existing local `.assets/` images remain composition
  contracts. Runtime media stays the purpose-built public field poster so the
  visual boundary test and deployment footprint remain honest.
- 2026-08-01 17:25: FirstPrinciples/Reconstruct selected the retained-evidence
  prompt-overlay design over both a literal Wandor clone and a hero-only
  replacement. SystemsThinking/FindLeverage located the intervention at the
  first viewport's goal: participation before explanation, without changing
  the public/protected topology.
- 2026-08-01 17:28: refined: Advisor approved the first-viewport plus retained-
  evidence decomposition but rejected ambiguous “overlay” language. The prompt
  is the first screen in normal document flow: no scrim, dismiss, focus trap, or
  scroll lock. It demonstrates the protected interaction without transmitting
  public prompt content. ISC-813–816 make the distinction executable.
- 2026-08-01 17:30: Root-Cause-at-Ingestion checkpoint: the unwanted state
  enters in `src/landing/LandingPage.tsx` where the first viewport is composed,
  not in the protected app or downstream evidence sections. Fixing that source
  composition corrects headline hierarchy, interaction legibility, and mobile
  encounter together. The analysis proceeds display-down from the released
  screenshot and source, and no output-side routing patch is warranted.
- 2026-08-01 17:30: The E4 Forge-role implementation is fulfilled by the
  user-mandated OmniRoute `codex/gpt-5.3-codex-spark` coding task in isolated
  worktree `landing-implementation`; no GPT-5.6 Sol subagent is spawned.
- 2026-08-01 18:08: final contract audit exposed the missing header entry CTA.
  The CTA was restored, the 320px auto-placement defect it introduced was fixed,
  and browser geometry now proves header/content separation at every tested width.
- 2026-08-01 18:20: field-poster failure inspection exposed a broken-image glyph.
  Moving the poster into the CSS background stack preserves the intended field
  while making the authored gradient/orbit fallback visually complete.

### Changelog

- 2026-08-01 | conjectured: the supplied Wandor plan should replace the existing landing one-for-one
  refuted by: Urania's public/protected split, static-rendering boundary, canonical visual system, and writer vocabulary make literal replacement structurally incorrect
  learned: the transferable design is the encounter hierarchy—ambient field, contrast veil, prompt instrument, tactile entry—not the travel brand or video
  criterion now: ISC-780–810 preserve the hierarchy while proving Urania identity, static safety, and protected entry
- 2026-08-01 | conjectured: desktop plus 320px screenshots are sufficient responsive evidence
  refuted by: the 701px card cap and 760px navigation collapse create a distinct seam between those endpoints
  learned: explicit near-breakpoint probes catch geometry regressions that endpoint screenshots cannot
  criterion now: ISC-788 and ISC-799 include 700/720/759/761px browser evidence

### Verification

- PASS: exact Spark dispatch completed two read-only planning audits, one implementation
  draft (timed out only after producing its diff), and two final read-only audits.
- PASS: the first final contract audit found one missing header CTA; it was restored,
  covered by exact-href and header-overlap browser assertions, and the later targeted
  Spark recheck timed out without a verdict. The blocker is closed by direct evidence.
- PASS: final `npm run verify:ci` exited 0 after the last implementation change.
- PASS: all 11 skipped Node cases are explicitly corpus/Selemene integration fixtures;
  landing boundary, accessibility-adjacent markup, CTA, build, and browser probes have zero skips.
- PASS: local `main`, branch HEAD, and merge-base all remain exactly `c34a70f`; divergence is `0 0`.
- PASS: final Advisor verdict is APPROVE; its accessibility and 701/760 breakpoint
  hardening suggestions were implemented and reverified.
- PASS: desktop, 320px mobile, reduced-motion, JavaScript-disabled, full-page, and
  field-poster-failure screenshots were captured and visually inspected.
- PASS: `git diff --check` is clean and the implementation changes only four landing files.

## Iteration 23 — Witness-Prompt Landing Production Deployment (2026-08-01)

### Problem

The witness-prompt landing is fully implemented and verified in an isolated
branch, but the public Cloudflare Pages project still serves the prior
`c34a70f` artifact. The user has now explicitly authorized a production push.
Publishing an uncommitted worktree, the wrong Pages project, or a full-stack
release that also mutates the protected app or D1 would create avoidable risk.

### Vision

The four-file landing change becomes an exact reviewed Git commit, passes the
hosted production gate, lands on `main`, and is uploaded through the repository's
static-only deployment guard to `urania-137-landing`. The immutable deployment
URL and the public custom domain both render the new witness-prompt encounter,
while the application origin remains Access-protected and the prior deployment
remains an identified rollback point.

### Out of Scope

- No protected-app deployment, D1 migration, schema/data mutation, DNS change,
  Access policy change, secret rotation, version bump, tag, or GitHub release.
- No direct upload from a dirty or non-provenance-bearing worktree.
- No alteration of the approved landing design during the deployment task.
- No rollback unless the newly deployed landing fails its production probes.

### Principles

- Production state follows a clean, exact, remotely reachable source commit.
- Mutate the smallest surface that can satisfy the requested outcome.
- Capture the rollback target before the first production write.
- Treat an immutable deployment URL and the custom domain as separate probes.
- A successful CLI exit is not a successful release until the visitor journey passes.

### Constraints

- Deployment uses `scripts/deploy/landing.mjs`, never a repository-root Wrangler upload.
- The selected account is `9d9d23b27f32e70ae3afb6a1aa2c0f10` and the only
  mutable project is `urania-137-landing` on branch `main`.
- The deploy helper must stage only `dist/landing` and `wrangler.landing.toml`.
- The prior production deployment is captured before mutation and remains available.
- The unrelated dirty primary worktree and `docs/architecture/` outputs are preserved.
- Production verification is anonymous and read-only after the Pages upload.

### Goal

Publish the verified witness-prompt landing to the dedicated Cloudflare Pages
production project from an exact merged `main` SHA, then prove the immutable
deployment and public custom-domain journey without changing any protected
application, data, DNS, Access, or secret surface.

### Criteria

- [x] ISC-817: The release source remains isolated from the unrelated dirty primary worktree.
- [x] ISC-818: The candidate diff contains only the four reviewed landing files.
- [x] ISC-819: The candidate diff passes `git diff --check`.
- [x] ISC-820: The canonical `verify:ci` gate passes before publication.
- [x] ISC-821: The landing changes are committed as one exact source SHA.
- [x] ISC-822: The candidate branch is pushed to the canonical GitHub remote.
- [x] ISC-823: The pull request diff contains no non-landing implementation change.
- [x] ISC-824: GitHub's `Production gate` succeeds for the exact candidate SHA.
- [x] ISC-825: The candidate is merged to `main` without unrelated content.
- [x] ISC-826: Local deployment `main` exactly matches fetched `origin/main`.
- [x] ISC-827: The deployment worktree is attached to `main` and fully clean.
- [x] ISC-828: `dist/landing` is rebuilt from the exact merged source SHA.
- [x] ISC-829: Landing boundary and deploy-helper contract tests pass at that SHA.
- [x] ISC-830: The built landing artifact receives a deterministic SHA-256 receipt.
- [x] ISC-831: Wrangler authentication resolves the intended Cloudflare account.
- [x] ISC-832: Read-only project discovery resolves `urania-137-landing` exactly once.
- [x] ISC-833: The prior production deployment ID and source SHA are captured.
- [x] ISC-834: The prior public root returns anonymous HTTP 200 before mutation.
- [x] ISC-835: The prior immutable deployment URL is retained as the rollback target.
- [x] ISC-836: The guarded deployment dry-run names only the landing project and artifact.
- [x] ISC-837: Production upload requires the exact `--confirm urania-137-landing` token.
- [x] ISC-838: Anti: repository Functions, D1 config, and app output never enter the upload stage.
- [x] ISC-839: Cloudflare records the exact merged source SHA on the new deployment.
- [x] ISC-840: A local mode-0600 deployment receipt records artifact hash and immutable URL.
- [x] ISC-841: The new deployment is Cloudflare Pages `Production` on branch `main`.
- [x] ISC-842: The new immutable deployment URL returns anonymous HTTP 200.
- [x] ISC-843: `https://urania.tryambakam.space/` returns the new witness-prompt document.
- [x] ISC-844: Live HTML contains the approved title and “See the pattern” headline.
- [x] ISC-845: Anti: the public origin exposes no application API at `/api/me`.
- [x] ISC-846: The live CTA targets the exact Access-protected application root.
- [x] ISC-847: The live response retains the reviewed security and privacy headers.
- [x] ISC-848: Desktop and 320px live browser probes show no error or horizontal overflow.

### Test Strategy

| ISC range | Type | Check | Threshold | Tool |
| --- | --- | --- | --- | --- |
| 817–820 | source preflight | isolation, path set, diff, canonical gate | exact and green | Git, npm |
| 821–829 | publication provenance | commit, remote, PR, hosted CI, merged clean tree | one exact SHA | Git, gh, npm |
| 830–837 | Cloudflare preflight | artifact hash, account/project, before state, dry-run | exact named target | deploy helper, Wrangler |
| 838–841 | mutation boundary | isolated upload, source SHA, receipt, production branch | one Pages mutation | deploy helper, Wrangler |
| 842–847 | edge contract | immutable/custom URLs, copy, API boundary, CTA, headers | expected status/content | curl, source probes |
| 848 | visual | desktop and 320px production journey | no errors/overflow | Chromium |

### Features

| Feature | Description | Satisfies | Depends on | Parallelizable |
| --- | --- | --- | --- | --- |
| Source publication | Commit, push, hosted CI, and merge the reviewed four-file delta | 817–829 | Iteration 22 verification | no |
| Target preflight | Resolve account/project, artifact identity, and prior rollback deployment | 830–837 | clean merged source | no |
| Guarded Pages upload | Upload only the static landing artifact and write a receipt | 838–841 | target preflight | no |
| Production evidence | Probe immutable URL, custom domain, API boundary, CTA, headers, and layout | 842–848 | completed upload | partially |

### Decisions

- 2026-08-01 18:38: The user's production instruction supplies mutation authority
  for the public landing project only. It does not authorize the full release
  workflow's protected-app, D1, DNS, Access, secret, tag, or release mutations.
- 2026-08-01 18:38: FirstPrinciples/Deconstruct reduced the required mutation to
  one commit, one static artifact, one Pages project, one rollback capture, and
  live proof. The existing guarded landing helper is preferred over raw Wrangler.
- 2026-08-01 18:38: The prior v0.6.2 cutover used the same helper and produced a
  clean exact-SHA receipt for deployment `91e8df5a-f63b-4ae8-a37f-7b52cac52643`.
- 2026-08-01 18:38: E3 delegation target is two, but zero subagents are used:
  source publication, shared branch state, and one live production target form
  a serial critical path; the active multi-agent policy also forbids unsolicited
  spawning. Independent evidence comes from hosted GitHub CI and live edge probes.
- 2026-08-01 18:42: Advisor returned a conditional stop until main-trigger behavior,
  post-merge SHA verification, content disclosure, rollback mechanics, build
  cleanliness, cache behavior, and both Access directions were proven. The
  workflow is dispatch-only, the Pages project has no Git provider, the hostile
  content review passed, exact merged-main gates passed, cache-busted/custom and
  immutable HTML matched, and cookie-less public/protected probes passed.
- 2026-08-01 18:43: Cloudflare's current Pages rollback API is the concrete
  compensating action: `POST /accounts/{account_id}/pages/projects/urania-137-landing/deployments/91e8df5a-f63b-4ae8-a37f-7b52cac52643/rollback`.
  The prior clean `c34a70f` artifact and guarded redeploy path remain a second
  recovery route; neither rollback was invoked because every production probe passed.
- 2026-08-01 18:58: Final Advisor required two conflict rounds before approval.
  The first closed plain-root caching, production-host scan, indexability, and
  rollback liveness. The second used Cloudflare deployment detail to prove full
  commit hash and clean-source metadata, then proved each CSS/JS/SVG resource's
  MIME and a deliberate bogus-CSS 404. Final verdict: APPROVE with no required fixes.

### Changelog

- 2026-08-01 | conjectured: the broad `release.yml` is the safest way to publish every production change
  refuted by: it also deploys the protected app and mutates D1, exceeding this landing-only authorization
  learned: production safety is smallest-authorized-surface plus provenance, rollback, and live proof
  criterion now: ISC-838 limits the upload stage and ISC-845–847 prove adjacent boundaries remain intact

### Verification

- PASS ISC-817–820: isolated candidate status listed only the four landing files;
  `git diff --check` was clean and the pre-commit canonical gate passed 94 Vitest
  files / 787 assertions, 62 applicable Node checks, builds, budgets, and audit.
- PASS ISC-821–824: commit `80616c025ec582e6a7d41b3be6c2437fb8c363ee`
  was pushed, PR #178 exposed exactly four files, and both push/PR Production
  gate aggregators passed for that exact candidate.
- PASS ISC-825–829: PR #178 merged as `f13c388467ea4d53ab12026eda206a03809d4a8e`;
  clean local `main` matched `origin/main` at `0 0`, the main-branch hosted gate
  passed, and a fresh post-merge `npm run verify:ci` passed before deployment.
- PASS ISC-830–838: two exact-main landing builds produced artifact SHA-256
  `73bd842f338ef7454947ce790ead0395fd1c5c89259cfde3f538dfd18e84acd7`;
  Wrangler resolved the intended account/project, the prior production deployment
  was `91e8df5a-f63b-4ae8-a37f-7b52cac52643`, and the guarded dry-run named only
  `dist/landing`, the landing config, `main`, and the confirmed project.
- PASS ISC-839–841: Cloudflare created production deployment
  `ac097a29-cb29-42d4-84c0-c8570b00c0d1` on `main` with source `f13c388`;
  `.release/landing-deployment-f13c388.json` is mode 0600 and binds the full
  source SHA, artifact hash, project, command, timestamp, and immutable URL.
- PASS ISC-842–844: the immutable deployment and cache-busted public domain both
  returned HTTP 200 with byte-identical HTML containing the approved title,
  headline, witness prompt, retained sections, and three protected-root CTAs.
- PASS ISC-845–847: anonymous public `/api/me` returned 404 with `no-store` and no
  app JSON; cookie-less protected `/` returned the expected Cloudflare Access 302;
  CSP, HSTS, frame, content-type, referrer, permissions, opener, and resource headers persisted.
- PASS ISC-848: the browser spoke loaded production with four same-origin 200
  requests, zero console/failed-network entries, and visually inspected screenshots.
  Desktop width was 1920/1920; mobile was 320/320 with a 288px card at x=16–304,
  hidden compact nav, and 65px of header-to-kicker clearance.
- PASS artifact identity: local and live index, CSS, JavaScript, poster, and favicon
  SHA-256 values matched byte-for-byte.
- PASS plain-root/cache: two consecutive no-query custom-domain requests returned
  byte-identical current HTML with `max-age=0, must-revalidate`, `CF-Cache-Status: DYNAMIC`,
  and no `Age` header. The custom domain has no `X-Robots-Tag`; managed robots
  declares `search=yes` and `Allow: /`, while AI-training crawlers remain denied.
- PASS deployment detail: Cloudflare API reports deployment
  `ac097a29-cb29-42d4-84c0-c8570b00c0d1`, environment `production`, project
  `urania-137-landing`, alias `https://urania.tryambakam.space`, deploy stage
  `success`, branch `main`, full commit hash `f13c388467ea4d53ab12026eda206a03809d4a8e`,
  and `commit_dirty: false`.
- PASS asset MIME/fallback: root, CSS, JS, favicon, and field poster returned 200
  with `text/html`, `text/css`, `application/javascript`, and `image/svg+xml` as
  appropriate; `/__nope.css` returned 404 `text/html`, ruling out fallback-masked assets.
- PASS positive content: served plain HTML contains the complete approved headline,
  witness prompt label, and the prompt's opening question.
- PASS final Advisor verdict: APPROVE; no objectively missing critical production criterion.
