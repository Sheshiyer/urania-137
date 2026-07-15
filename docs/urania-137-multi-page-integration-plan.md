# Urania 137 Multi-Page Stellar Node Integration Plan

**Initiative:** urania-137-multi-page  
**Repo:** `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/urania-137`  
**Generated references:** `.assets/page-references/*.png`  
**Plan depth:** deeply detailed  
**Delivery mode:** prototype → production-ready frontend  
**Release model:** phased rollout (3 phases, 9 waves)  
**Team topology:** solo lead + multi-agent execution (planner, UI agent, validation agent)  

---

## 1. Discovery Summary

- **Planning depth:** deeply detailed
- **Delivery mode:** prototype hardened to production-ready frontend
- **Release model:** phased rollout (3 phases, 9 waves)
- **Quality bar:** type-safe build, visual regression parity with generated references, functional live API wiring preserved
- **Team/agent topology:**
  - Planner / orchestrator: Temperance Engine (this agent)
  - UI / app implementation: Codex / Claude UI agent
  - Validation: Gemini / adversarial validation agent
- **Constraints:**
  - React 19 + Vite + Tailwind CSS 3, no new runtime dependencies
  - SVG-only graph rendering (no Canvas/WebGL)
  - Public Selemene API remains the sole report source
  - Existing home radial graph must remain unchanged in look and feel
  - Each parent node must have its own URL (`/node/:nodeId`)
- **Key risk:** design drift when 7 parent pages are built by parallel agents without frozen reusable components
- **Mitigation:** this plan freezes a design-system contract and reusable component layer BEFORE any parent page is built

---

## 2. Assumptions and Constraints

### Assumptions
- The generated page references in `.assets/page-references/` are the canonical visual targets.
- The existing `StellarNodeGraph` SVG primitives can be parameterized to render a single-parent local view.
- The Selemene public API contract does not need to change for this UI refactor.
- User interactions remain click-driven; keyboard-only navigation is out of scope for this phase.

### Constraints
- No new UI libraries (D3, Cytoscape, react-flow, etc.).
- No new state libraries beyond React hooks.
- Branch names follow `swarm/urania-137/p{phase}-w{wave}/{concern}/{task-id}-{agent}`.
- Lock zones: `package.json`, `tailwind.config.js`, `tsconfig.json`, `src/App.tsx`, `src/index.css`, `src/types/index.ts`.

---

## 3. Reusable Component Strategy (Primary Anti-Drift Contract)

Before any parent page is implemented, freeze the following reusable primitives. Each page must compose from these; no page may invent its own graph rendering, node styling, or modal shell.

| Component | File | Responsibility | Frozen API | Used By |
|---|---|---|---|---|
| `StellarNodeGraph` | `src/components/StellarNodeGraph.tsx` | Generic radial SVG graph. Renders any center node + children + optional parent. | `centerNode`, `orbitalNodes`, `showParent`, `onNodeSelect`, `onHomeRequest` | Home page, `NodePage` |
| `StellarNode` | `src/components/primitives/StellarNode.tsx` | Single node: circles, glow, label. | `node`, `size`, `selected`, `onClick` | `StellarNodeGraph` |
| `StellarEdge` | `src/components/primitives/StellarEdge.tsx` | Thin luminous edge between two points. | `x1, y1, x2, y2, opacity, width` | `StellarNodeGraph` |
| `StellarSubNode` | `src/components/primitives/StellarSubNode.tsx` | Small satellite node + branch. | `parentX, parentY, angle, radius, label, active` | `StellarNodeGraph` |
| `CoreGlow` | `src/components/primitives/CoreGlow.tsx` | Central hub glow and NOESIS label. | `label`, `size`, `pulsing` | `StellarNodeGraph` |
| `NodePageLayout` | `src/components/layout/NodePageLayout.tsx` | Full-screen parent page wrapper with title, back button, and graph slot. | `title`, `description`, `children`, `onHome` | Every `/node/:nodeId` page |
| `PageHeader` | `src/components/layout/PageHeader.tsx` | Top-left title + back/home breadcrumb. | `title`, `subtitle`, `showBack`, `onBack` | `NodePageLayout`, Home |
| `Modal` | `src/components/Modal.tsx` | Existing modal shell (reused, not rewritten). | `isOpen, title, onClose, children` | Home, `NodePage` |
| `ReportForm` | `src/components/ReportForm.tsx` | Existing report form (reused with node param). | `node, onSubmit` | Modal on deepest sub-node |
| `useNodeGraph` | `src/hooks/useNodeGraph.ts` | Window dimensions, center math, orbit radius. | Returns `{ width, height, centerX, centerY, orbitRadius }` | `StellarNodeGraph`, `NodePage` |
| `DesignTokens` | `src/styles/tokens.ts` | Centralized color + typography constants matching brand docs. | `COLORS`, `TYPOGRAPHY`, `SPACING` | All components |

### Design Tokens Contract
All components must import from `src/styles/tokens.ts`:

```ts
export const COLORS = {
  void: '#070B1D',
  gold: '#C5A017',
  emerald: '#10B5A7',
  indigo: '#0B50FB',
  violet: '#2D0050',
  parchment: '#F0EDE3',
  silver: '#8A9BA8',
}

export const TYPOGRAPHY = {
  display: 'font-display',
  body: 'font-sans',
  nodeLabel: 'uppercase tracking-[0.14em] font-display',
  pageTitle: 'text-4xl font-display tracking-widest text-parchment',
}
```

No hard-coded hex values or Tailwind classes are allowed outside this token file and the component primitives. This is the primary anti-drift lock.

---

## 4. One-to-One Reference Mapping

Each generated page reference maps to a single implementation target. The references are not decorative; they are the acceptance target for visual regression.

| Reference file | Target URL | Center node | Sub-node children (from reference) | Implementation owner |
|---|---|---|---|---|
| `multi-page-architecture-moodboard.png` | Architecture target | — | Shows home + parent + modal | Planner |
| `birth-witness-page.png` | `/node/birth` | Birth Witness | Birth Blueprint, Lineage, Human Design, Gene Keys, Vedic Clock, Panchanga, Timing Windows | UI agent |
| `union-mirror-page.png` | `/node/compat` | Union Mirror | Synastry, Composite, Compatibility, Relationship Dynamics, Family Constellations, Business Partnership | UI agent |
| `sky-weather-page.png` | `/node/transit` | Sky Weather | Daily Transits, Monthly Cycles, Retrogrades, Eclipses, Solar Returns, Lunar Returns, Mundane Astrology | UI agent |
| `noesis-reading-page.png` | `/node/witness` | Noesis Reading | L0 Minimal, L1 Brief, L2 Standard, L3 Detailed, L4 Deep, L5 Comprehensive, Bridge Question, Pattern Extraction | UI agent |
| `engine-status-page.png` | `/node/engine` | Engine Status | 16 Consciousness Engines, Anamnesis, Gene Keys, Enneagram, Human Design, Vedic Clock, Panchanga, I Ching, Astro, Pulse, Health | UI agent |
| `folio-archive-page.png` | `/node/folio` | Folio Archive | Saved Reports, Exports, Search, History, Favorites, Markdown, DOCX, PDF | UI agent |
| `bridge-query-page.png` | `/node/bridge` | Bridge Query | Question-Based Reports, Decision Support, Horary, I Ching, Follow-Up Inquiries | UI agent |

---

## 5. Agent Ownership Model

| Concern | Primary owner | Secondary reviewer | Notes |
|---|---|---|---|
| Planning / orchestration | Temperance Engine | Human lead | Owns issue graph, wave boundaries, contract freeze |
| Reusable component layer | UI agent (Codex) | Temperance Engine | Must be merged before any parent page work |
| Parent page implementation | UI agent (Codex) | Temperance Engine | One page per task; no shared file edits inside a wave |
| Routing / App.tsx integration | UI agent (Codex) | Temperance Engine | Lock zone: serializes `App.tsx` changes |
| Validation / regression | Validation agent (Gemini) | Temperance Engine | Visual regression against references, API smoke tests |
| Documentation / README | Temperance Engine | UI agent | Updates README and project ISA |

---

## 6. Phase Map

### Phase 1 — Contract and foundation setup
- **Goal:** freeze the design-system contract, reusable component API, data model, and routing contract so parallel page work cannot drift.
- **Exit criteria:**
  - `src/styles/tokens.ts` exists and is imported by all graph primitives
  - `StellarNodeGraph` is refactored to accept a generic node list and optional parent
  - `src/types/index.ts` includes `StellarNode.children` and `SelemeneChild` types
  - Route contract `/node/:nodeId` is documented and accepted
- **Waves:** 3 (design contract, data/routing contract, reference mapping)

### Phase 2 — Parallel implementation
- **Goal:** build the reusable component layer and then all 7 parent pages in parallel without design drift.
- **Exit criteria:**
  - All 7 parent pages render at their URLs
  - Each page matches its generated reference in layout, color, node density, and title treatment
  - Clicking a child node opens the existing `Modal` + `ReportForm`
  - Home page remains unchanged
- **Waves:** 4 (reusable layer, parent pages batch A, parent pages batch B, integration)

### Phase 3 — Integration and hardening
- **Goal:** merge, verify, and document.
- **Exit criteria:**
  - `npm run build` passes
  - Playwright screenshots of each parent page match references within tolerance
  - Existing API report flow still works from deepest child node
  - README and ISA updated
- **Waves:** 2 (regression/validation, documentation/merge)

---

## 7. Detailed Phase 1 Wave Layout

### Wave 1 — Design system contract freeze

#### Swarm A — Design tokens and primitives
- **Goal:** extract brand constants into `src/styles/tokens.ts` and create primitive SVG components.
- **Owner:** UI agent (Codex)
- **Inputs:** existing components, brand docs, generated references
- **Outputs:** `src/styles/tokens.ts`, `src/components/primitives/*.tsx`
- **Validation:** every new primitive renders in isolation via a test page; no hard-coded values outside tokens

#### Swarm B — Component inventory and contract doc
- **Goal:** document the reusable component API and freeze it in a `DESIGN_SYSTEM_CONTRACT.md` file.
- **Owner:** Planner / Temperance Engine
- **Inputs:** primitive components from Swarm A
- **Outputs:** `DESIGN_SYSTEM_CONTRACT.md` with props tables and usage rules
- **Validation:** contract reviewed and approved before Phase 2 launch

### Wave 2 — Data model and routing contract

#### Swarm A — Data model extension
- **Goal:** extend `src/types/index.ts` and `src/data/selemeneNodes.ts` to support nested children.
- **Owner:** UI agent (Codex)
- **Inputs:** Selemene API surface, generated references
- **Outputs:** typed `children` arrays, tentative child mapping for all 7 nodes
- **Validation:** TypeScript build passes; home graph still renders with no sub-node leakage

#### Swarm B — Routing contract
- **Goal:** define `/node/:nodeId` route and `NodePage` shell contract.
- **Owner:** UI agent (Codex)
- **Inputs:** data model from Swarm A
- **Outputs:** route definition, `NodePageLayout.tsx` shell
- **Validation:** navigation from home to `/node/birth` works

### Wave 3 — Reference-to-component mapping

#### Swarm A — Page reference review and child taxonomy
- **Goal:** finalize the exact child labels and count per parent node based on the generated references.
- **Owner:** Planner / Temperance Engine
- **Inputs:** `.assets/page-references/*.png`
- **Outputs:** updated `src/data/selemeneNodes.ts` with full child arrays
- **Validation:** labels match reference images; each parent has ≥5 children

#### Swarm B — Acceptance criteria for visual regression
- **Goal:** define per-page screenshot acceptance thresholds and viewport list.
- **Owner:** Validation agent (Gemini)
- **Inputs:** references, design contract
- **Outputs:** `VALIDATION_BRIEF.md`
- **Validation:** criteria are measurable (e.g., title present, 7 radial nodes visible, color within palette)

---

## 8. Detailed Phase 2 Wave Layout

### Wave 1 — Reusable component layer

#### Swarm A — Graph primitives refactor
- **Goal:** split `StellarNodeGraph` into `StellarNode`, `StellarEdge`, `StellarSubNode`, `CoreGlow`, and a generic `StellarNodeGraph` orchestrator.
- **Owner:** UI agent (Codex)
- **Inputs:** design contract, existing `StellarNodeGraph.tsx`
- **Outputs:** refactored components, unchanged home rendering
- **Validation:** home page screenshot identical to before refactor

#### Swarm B — Layout and page shell components
- **Goal:** build `NodePageLayout`, `PageHeader`, and reusable breadcrumb/home button.
- **Owner:** UI agent (Codex)
- **Inputs:** design contract, references
- **Outputs:** layout components, `src/components/layout/*.tsx`
- **Validation:** shell renders a placeholder page with correct title and back button

### Wave 2 — Parent pages batch A (Birth Witness, Union Mirror, Sky Weather)

#### Swarm A — Birth Witness page
- **Goal:** implement `/node/birth` with children matching the reference.
- **Owner:** UI agent (Codex)
- **Inputs:** `birth-witness-page.png`, reusable components
- **Outputs:** `src/pages/BirthWitnessPage.tsx` or route-driven `NodePage`
- **Validation:** screenshot matches reference

#### Swarm B — Union Mirror page
- **Goal:** implement `/node/compat` with children matching the reference.
- **Owner:** UI agent (Codex)
- **Inputs:** `union-mirror-page.png`, reusable components
- **Outputs:** `src/pages/UnionMirrorPage.tsx` or route-driven `NodePage`
- **Validation:** screenshot matches reference

#### Swarm C — Sky Weather page
- **Goal:** implement `/node/transit` with children matching the reference.
- **Owner:** UI agent (Codex)
- **Inputs:** `sky-weather-page.png`, reusable components
- **Outputs:** `src/pages/SkyWeatherPage.tsx` or route-driven `NodePage`
- **Validation:** screenshot matches reference

### Wave 3 — Parent pages batch B (Noesis Reading, Engine Status, Folio Archive, Bridge Query)

#### Swarm A — Noesis Reading + Engine Status pages
- **Goal:** implement `/node/witness` and `/node/engine`.
- **Owner:** UI agent (Codex)
- **Inputs:** `noesis-reading-page.png`, `engine-status-page.png`
- **Outputs:** two page components
- **Validation:** screenshots match references

#### Swarm B — Folio Archive + Bridge Query pages
- **Goal:** implement `/node/folio` and `/node/bridge`.
- **Owner:** UI agent (Codex)
- **Inputs:** `folio-archive-page.png`, `bridge-query-page.png`
- **Outputs:** two page components
- **Validation:** screenshots match references

### Wave 4 — Integration and report wiring

#### Swarm A — App.tsx and router integration
- **Goal:** wire `/node/:nodeId` routes, preserve home route, keep modal flow.
- **Owner:** UI agent (Codex)
- **Inputs:** all page components, routing contract
- **Outputs:** updated `App.tsx`, route map
- **Validation:** every parent URL loads; home unchanged

#### Swarm B — Sub-node to report modal wiring
- **Goal:** clicking a child node opens the existing `Modal` with `ReportForm` for the appropriate mode.
- **Owner:** UI agent (Codex)
- **Inputs:** `ReportForm`, child taxonomy
- **Outputs:** child click handler mapping
- **Validation:** report generation still calls live Selemene API

---

## 9. Detailed Phase 3 Wave Layout

### Wave 1 — Regression and validation

#### Swarm A — Build and type safety
- **Goal:** `npm run build` and `tsc` pass with zero errors.
- **Owner:** Validation agent (Gemini)
- **Validation:** CI green

#### Swarm B — Visual regression
- **Goal:** Playwright screenshots of all 7 pages compared against references.
- **Owner:** Validation agent (Gemini)
- **Validation:** screenshots pass acceptance thresholds

### Wave 2 — Documentation and merge

#### Swarm A — README and ISA update
- **Goal:** document multi-page architecture, reusable components, and references.
- **Owner:** Planner / Temperance Engine
- **Validation:** README accurately describes navigation and component reuse

#### Swarm B — Final merge and wave close
- **Goal:** merge all branches, clean worktrees, close issues.
- **Owner:** Planner / Temperance Engine
- **Validation:** `main` branch green, all tasks closed

---

## 10. Task List

### Phase 1 — Contract and foundation setup

#### Wave 1 — Design system contract freeze

##### Swarm A — Design tokens and primitives
- T-001: Create `src/styles/tokens.ts` with color and typography constants.
- T-002: Refactor `StellarNodeGraph` to accept `centerNode`, `orbitalNodes`, `showParent`, `onNodeSelect`, `onHomeRequest` props.
- T-003: Create `src/components/primitives/StellarNode.tsx` single node primitive.
- T-004: Create `src/components/primitives/StellarEdge.tsx` edge primitive.
- T-005: Create `src/components/primitives/StellarSubNode.tsx` satellite node primitive.
- T-006: Create `src/components/primitives/CoreGlow.tsx` central hub primitive.
- T-007: Create `src/hooks/useNodeGraph.ts` for window dimensions and center math.
- T-008: Update `src/index.css` to ensure token-based Tailwind classes are available.
- T-009: Build a temporary `__design-system-test__` route to render primitives in isolation.
- T-010: Remove the temporary test route and verify no primitive regressions.

##### Swarm B — Component inventory and contract doc
- T-011: Inventory all existing components and identify reusable vs. page-specific parts.
- T-012: Write `DESIGN_SYSTEM_CONTRACT.md` with props tables for each primitive.
- T-013: Define anti-drift rule: no hard-coded colors/classes outside tokens and primitives.
- T-014: Review contract for completeness and freeze it.
- T-015: Open GitHub tracking issue for design-system contract.

#### Wave 2 — Data model and routing contract

##### Swarm A — Data model extension
- T-016: Add `SelemeneChild` and `StellarNode.children` types to `src/types/index.ts`.
- T-017: Extend `SELEMENE_NODES` with `children` arrays for Birth Witness.
- T-018: Extend `SELEMENE_NODES` with `children` arrays for Union Mirror.
- T-019: Extend `SELEMENE_NODES` with `children` arrays for Sky Weather.
- T-020: Extend `SELEMENE_NODES` with `children` arrays for Noesis Reading.
- T-021: Extend `SELEMENE_NODES` with `children` arrays for Engine Status.
- T-022: Extend `SELEMENE_NODES` with `children` arrays for Folio Archive.
- T-023: Extend `SELEMENE_NODES` with `children` arrays for Bridge Query.
- T-024: Verify home graph still renders and ignores `children` at the home level.
- T-025: Add TypeScript tests that `children` type is always present on nodes.

##### Swarm B — Routing contract
- T-026: Choose router strategy (Vite hash router or wouter/react-router) and document.
- T-027: Add router dependency if needed (lock-zone task, serialized).
- T-028: Create `NodePageLayout.tsx` shell with title, description, and graph slot.
- T-029: Create `PageHeader.tsx` with back/home button and title/subtitle.
- T-030: Define `/node/:nodeId` route mapping function.
- T-031: Add route guard for unknown node IDs (404 fallback).

#### Wave 3 — Reference-to-component mapping

##### Swarm A — Page reference review and child taxonomy
- T-032: Review `birth-witness-page.png` and finalize child labels.
- T-033: Review `union-mirror-page.png` and finalize child labels.
- T-034: Review `sky-weather-page.png` and finalize child labels.
- T-035: Review `noesis-reading-page.png` and finalize child labels.
- T-036: Review `engine-status-page.png` and finalize child labels.
- T-037: Review `folio-archive-page.png` and finalize child labels.
- T-038: Review `bridge-query-page.png` and finalize child labels.
- T-039: Update `SELEMENE_NODES` with finalized child labels from all references.
- T-040: Verify each parent has ≥5 children.

##### Swarm B — Acceptance criteria for visual regression
- T-041: Define viewport list for screenshots (desktop 1440x900, tablet, mobile).
- T-042: Define per-page acceptance criteria (title, node count, color palette).
- T-043: Write `VALIDATION_BRIEF.md` with thresholds and comparison method.
- T-044: Set up Playwright screenshot helper script if not already present.
- T-045: Create baseline reference crop set for automated comparison.

### Phase 2 — Parallel implementation

#### Wave 1 — Reusable component layer

##### Swarm A — Graph primitives refactor
- T-046: Refactor `StellarNodeGraph` to use `StellarNode`, `StellarEdge`, `StellarSubNode`, `CoreGlow`.
- T-047: Add `showParent` prop to render the home NOESIS core as a small return node on parent pages.
- T-048: Ensure `StellarNodeGraph` supports variable node counts (7 for home, N for parent pages).
- T-049: Preserve existing animation classes and glow filters.
- T-050: Add `aria-label` and role attributes for accessibility.
- T-051: Verify home page screenshot is pixel-identical to pre-refactor baseline.

##### Swarm B — Layout and page shell components
- T-052: Build `NodePageLayout.tsx` with full-screen SVG area and overlay header.
- T-053: Build `PageHeader.tsx` with title, subtitle, and animated home/back button.
- T-054: Create `HomeButton.tsx` primitive matching the reference's corner ornamentation.
- T-055: Add page transition CSS for home ↔ parent navigation.
- T-056: Create `src/pages/` directory and a placeholder `NodePage.tsx`.
- T-057: Render placeholder page for `/node/birth` with correct layout shell.

#### Wave 2 — Parent pages batch A

##### Swarm A — Birth Witness page
- T-058: Implement `/node/birth` using `NodePageLayout` and `StellarNodeGraph`.
- T-059: Arrange children radially to match `birth-witness-page.png`.
- T-060: Wire child click to modal + `ReportForm` with appropriate mode.
- T-061: Capture screenshot and compare to `birth-witness-page.png`.

##### Swarm B — Union Mirror page
- T-062: Implement `/node/compat` using `NodePageLayout` and `StellarNodeGraph`.
- T-063: Arrange children radially to match `union-mirror-page.png`.
- T-064: Wire child click to modal + `ReportForm` with relationship context.
- T-065: Capture screenshot and compare to `union-mirror-page.png`.

##### Swarm C — Sky Weather page
- T-066: Implement `/node/transit` using `NodePageLayout` and `StellarNodeGraph`.
- T-067: Arrange children radially to match `sky-weather-page.png`.
- T-068: Wire child click to modal + `ReportForm` with transit date.
- T-069: Capture screenshot and compare to `sky-weather-page.png`.

#### Wave 3 — Parent pages batch B

##### Swarm A — Noesis Reading + Engine Status pages
- T-070: Implement `/node/witness` with L0–L5 and witness options children.
- T-071: Capture screenshot and compare to `noesis-reading-page.png`.
- T-072: Implement `/node/engine` with engine status children.
- T-073: Capture screenshot and compare to `engine-status-page.png`.
- T-074: Add engine health info modal for the info-only Engine Status page.

##### Swarm B — Folio Archive + Bridge Query pages
- T-075: Implement `/node/folio` with archive children.
- T-076: Capture screenshot and compare to `folio-archive-page.png`.
- T-077: Implement `/node/bridge` with query children.
- T-078: Capture screenshot and compare to `bridge-query-page.png`.
- T-079: Wire Folio child clicks to existing Folio info modal.

#### Wave 4 — Integration and report wiring

##### Swarm A — App.tsx and router integration
- T-080: Update `App.tsx` to render home at `/` and `NodePage` at `/node/:nodeId`.
- T-081: Ensure home click navigates to `/node/:nodeId` instead of opening modal.
- T-082: Keep home graph unchanged in behavior and appearance.
- T-083: Handle unknown node IDs with a 404-style fallback page.
- T-084: Add URL-aware selected state for direct navigation.

##### Swarm B — Sub-node to report modal wiring
- T-085: Map each child node to its corresponding `SelemeneMode`.
- T-086: Open `Modal` with `ReportForm` when a child is clicked.
- T-087: Ensure `ReportForm` receives the correct mode based on child selection.
- T-088: Verify live API call still fires from child-node report submission.
- T-089: Handle children with no direct report mode (e.g., info-only archive items).

### Phase 3 — Integration and hardening

#### Wave 1 — Regression and validation

##### Swarm A — Build and type safety
- T-090: Run `npm run build` and fix all TypeScript errors.
- T-091: Run `npm run preview` and verify all routes load.
- T-092: Audit `package.json` for accidental dependency additions.
- T-093: Verify no new lock-zone files were edited without review.

##### Swarm B — Visual regression
- T-094: Capture Playwright screenshots of all 7 parent pages.
- T-095: Compare screenshots to generated references using image diff.
- T-096: Capture home page screenshot and verify no regression.
- T-097: Run modal report flow screenshot sequence for one child node.
- T-098: Write visual regression report with pass/fail per page.

#### Wave 2 — Documentation and merge

##### Swarm A — README and ISA update
- T-099: Update README with multi-page navigation and reusable component list.
- T-100: Update project ISA with verification evidence for completed ISCs.
- T-101: Add `.assets/page-references/` usage note to README.

##### Swarm B — Final merge and wave close
- T-102: Merge Phase 1 and Phase 2 branches into integration branch.
- T-103: Final `npm run build` on integration branch.
- T-104: Merge integration branch to `main`.
- T-105: Remove stale worktrees and close tracking issues.
- T-106: Tag release or commit final plan artifact.

---

## 10b. Phase 4 — Motion & Interactivity (reel-flow emulation)

Added 2026-07-15 by user request: make the app live and interactive rather than
static, closely emulating the flow of the source Instagram reel
(`.assets/instagram-download/`) in our own NOESIS branding. Full spec:
`docs/superpowers/specs/2026-07-15-motion-reel-flow-design.md`.

**Locked decisions:** immersive graph scrub (no stacked sections); `gsap` +
`ScrollTrigger` (new dependency, lifts the no-motion-library constraint); scope =
home **and** node pages (retires the "home stays pixel-identical" gate);
`prefers-reduced-motion` renders the static final state.

### The choreography — "compile the second brain"
The reel compiles the graph from the center outward ("what ties it together is the
first node"). Reproduced at every depth:
1. Void → **NOESIS core ignites** (the first node).
2. **7 spokes draw outward** (`strokeDashoffset` stagger).
3. **Parent nodes ignite** as each spoke lands.
4. **Sub-nodes bloom** (dendrite grow-out) + labels fade.
5. Settle into ambient pulse/drift; scroll drives a slow camera zoom + starfield parallax.
6. Entering a node = zoom-in + the **same sequence one depth down** (recursive bloom).

### Wave 1 — Motion foundation
- T-107: Add `gsap` dependency (lock-zone `package.json`, serialized); register `ScrollTrigger`.
- T-108: Create `src/lib/motion.ts` (reduced-motion guard, plugin registration, easing/timing tokens).
- T-109: Create `src/components/motion/MotionStage.tsx` wrapper (scroll spacer, scoped `gsap.context`, cleanup).
- T-110: Add `.cn-*` grouping/classes to `StellarNodeGraph` and `ConstellationGraph` (additive; no static-layout change).

### Wave 2 — Choreography
- T-111: Entrance "compile" timeline (core ignite → spokes draw → nodes ignite → sub-nodes bloom → labels).
- T-112: Immersive scroll scrub (camera zoom + starfield parallax + drift) via ScrollTrigger.
- T-113: Pointer parallax (near/far layers, GSAP `quickTo`, off React render loop) + orb hover states.
- T-114: Enter-node zoom + recursive bloom on route change (`motionKey` re-trigger); inverse on return home.

### Wave 3 — Hardening
- T-115: `prefers-reduced-motion` path renders the static constellation instantly (no spacer, no animation).
- T-116: Verify 60fps (no React re-renders from parallax/scroll), node-clicking + report modal intact.
- T-117: `npm run build` passes; capture home + node compile-flow screenshots/GIF; update README + ISA.

## 11. Dependency Rationale

### What must happen before parallelization
- Design tokens and primitive components must be frozen (Phase 1, Wave 1).
- Data model with `children` arrays must be accepted (Phase 1, Wave 2).
- Routing contract must be accepted (Phase 1, Wave 2).
- `NodePageLayout` and `PageHeader` must be available (Phase 2, Wave 1).

### What can run independently
- The 7 parent pages can be built in parallel once the reusable layer is merged (Phase 2, Waves 2–3).
- Visual regression validation can run in parallel with documentation updates (Phase 3, Wave 1).

### What requires an integration swarm
- `App.tsx` and router wiring (Phase 2, Wave 4, Swarm A) touches the global shell and serializes all page components.
- Sub-node to report modal wiring (Phase 2, Wave 4, Swarm B) depends on all child-to-mode mappings.

### What must remain serialized
- Lock zones: `package.json`, `tailwind.config.js`, `tsconfig.json`, `src/App.tsx`, `src/index.css`, `src/types/index.ts`.
- Design-system contract changes must be re-approved by the planner before any page uses them.

---

## 12. Verification Strategy

### Per-wave proof
- Phase 1: design contract document exists; TypeScript build passes; home graph unchanged.
- Phase 2: each parent page has a screenshot; modal report flow works on one child per page.
- Phase 3: full build green; visual regression report shows all pages within tolerance.

### Contract validation
- Verify every parent page imports `DesignTokens` from `src/styles/tokens.ts`.
- Verify no hard-coded hex values exist outside `tokens.ts`.
- Verify `StellarNodeGraph` props contract is respected by all pages.

### CI gates
- `npm run build` must pass before any wave merge.
- TypeScript strict mode must pass before any wave merge.

### Regression expectations
- Home page screenshot identical to pre-refactor baseline.
- Existing modal report submission still returns 200 or meaningful API response.
- No new runtime dependencies.

### Rollout checks
- All `/node/:nodeId` URLs load directly.
- Back/home navigation works from every parent page.
- 404 fallback for unknown node IDs.

---

## 13. GitHub Sync Strategy

### Issue creation
- Create one GitHub issue per task (T-001 to T-106) when execution tracking is requested.
- Label issues by phase: `phase-1-contract`, `phase-2-build`, `phase-3-hardening`.
- Label issues by swarm: `swarm-ui`, `swarm-validation`, `swarm-planning`.
- Label lock-zone tasks: `lock-zone`.

### Dependency representation
- Use GitHub issue checklists to list upstream dependencies in each issue body.
- Use milestone `urania-137-multi-page` to group all issues.

### Wave status protocol
- Post a wave summary comment to the milestone when each wave closes.
- Include validation evidence (screenshots, build status, PR links).

### PR linkage
- Each task PR title: `[urania-137][T-XXX] brief description`.
- PR body must include: task ID, phase/wave/swarm, owner, upstream dependencies, validation evidence, lock-zone files touched.

---

## 14. Risks and Fallback Plan

| Risk | Trigger | Fallback |
|---|---|---|
| Generated references cannot be exactly replicated in SVG (e.g., corner ornamentation) | Screenshot diff fails on ornamental details | Accept ornamental details as optional; gate only on layout, color, and node structure |
| `StellarNodeGraph` refactor breaks home page | Home screenshot differs from baseline | Revert refactor and split into new `ParentGraph` component instead of changing `StellarNodeGraph` |
| Selemene API changes during UI refactor | API errors after wiring | Pause UI work, update contract, then resume |
| Design drift despite component contract | Screenshot reveals off-palette colors or custom graph code in a page | Block the page PR, enforce token audit, require re-implementation against primitives |
| Routing library adds too much bundle size | Build output exceeds 300KB | Switch to lightweight hash-based routing or manual URL parsing |

---

## 15. Plan Artifact Location

This plan lives at:  
`/Users/sheshnarayaniyer/.craft-agent/workspaces/my-workspace/skills/swarm-architect/plans/urania-137-multi-page-integration-plan.md`

When execution begins, copy this plan into the Urania 137 repo as `docs/urania-137-multi-page-integration-plan.md` and update it at every wave close.
