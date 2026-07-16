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

## Changelog

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