# Urania 137 — Motion & Interactivity Spec ("Compile the Second Brain")

**Date:** 2026-07-15
**Status:** design — awaiting review before implementation
**Related:** `docs/urania-137-multi-page-integration-plan.md` (adds Phase 4), `ISA.md`

## 1. Intent

Turn Urania 137 from a static full-screen graph into a living, interactive
constellation whose motion **closely emulates the flow of the source Instagram
reel** (`.assets/instagram-download/`) — rendered in our own NOESIS branding.

The reel's narrative (from its caption): *"Everyone wants a second brain… 137
jobs across 7 departments… what ties it together is **the first node**."* The
reel visibly **compiles the graph from the center outward**: the first node
ignites, seven department spokes draw out, and each department blooms a dense
cluster of sub-nodes until the full "second brain" glows, with a slow drifting
POV camera.

We reproduce that beat-for-beat at every depth of our taxonomy.

## 2. Locked decisions

- **Scroll model:** immersive graph scrub (scroll drives a camera zoom/orbit + parallax; no stacked below-the-fold sections). Honors ISA "the graph is the interface at every depth."
- **Tech:** `gsap` core + `ScrollTrigger` (new dependency; lifts the prior "no motion library" constraint by explicit user decision). ~+35 KB gzip.
- **Scope:** home **and** `/node/:id` pages. The prior "home stays pixel-identical" regression gate is retired in favor of a motion baseline.
- **Accessibility:** everything gated by `prefers-reduced-motion` → render the final static constellation instantly, no scrub spacer, no animation.

## 3. The choreography — scroll-driven camera journey (CORRECTED 2026-07-15)

> Correction: the first build added an entrance animation on the same fixed
> placement and made scroll a subtle zoom. The intended flow is a **camera
> journey**: the central overview first, then **each scroll dives into the next
> cluster** (that parent re-centers and its sub-nodes appear), **resurfaces** to
> the overview, and dives into the next — through all seven. Locked decisions:
> **dive-and-resurface** camera path; **click jumps the journey** (single
> unified scroll page; `#/node/:id` syncs as you pass each cluster).

### A. The journey (one scrollytelling page)
- **progress 0 → overview:** NOESIS core + the 7 parent nodes (the galactic view).
- **scroll into segment k → dive:** the overview zooms toward parent *k* and fades; parent *k*'s cluster (it re-centered, with its children/sub-nodes) zooms in and appears — "showing the thing."
- **mid-segment → hold:** cluster *k* fully shown; its child orbs are clickable (→ report modal).
- **scroll on → resurface:** cluster *k* fades/zooms back out, the overview returns.
- **next segment → dive into parent k+1**, and so on for all 7.
- **Camera model:** a `sin(segT·π)` dive curve per segment (0 → 1 → 0) drives a cross-fade/zoom between an **overview layer** (zooms toward the target parent) and an **active-cluster layer** (`ConstellationGraph` for parent *k*).

### B. Click ↔ scroll ↔ URL
- Clicking a parent in the overview **smooth-scrolls** to that cluster's dive beat (native smooth scroll; no plugin).
- As each cluster becomes the focus, the URL updates to `#/node/:id` via `history.replaceState` (no hashchange loop).
- Deep-linking to `#/node/:id` scrolls straight to that cluster's beat on load.
- The graph stays the interface (ISA): every node is clickable at every beat.

### C. Reduced motion
- No scroll spacer, no journey: render the overview; clicking a parent shows its cluster statically (overview hidden, cluster shown), a back gesture returns. Navigation preserved without animation.

### D. Live interactivity
- **Pointer parallax:** mouse-move shifts near (mandala) and far (starfield) layers in opposite small amounts for 3D depth. Implemented with GSAP `quickTo` (off the React render loop) for 60fps.
- **Orb hover:** child orbs scale slightly + brighten their ring/glow on hover (CSS transform/opacity).

## 4. Architecture

### `MotionStage` (new) — `src/components/motion/MotionStage.tsx`
Wraps a graph and owns all motion so graph components stay pure-render.
- Renders the fixed graph plus a scroll-length spacer (skipped under reduced motion).
- Runs a scoped `gsap.context(() => {…}, rootRef)` with strict cleanup.
- Builds the entrance timeline, the ScrollTrigger scrub, and the pointer-parallax `quickTo` handlers.
- Props: `{ children, depth: 'home' | 'node', motionKey }` — `motionKey` (route id) re-triggers the entrance on navigation.

### Motion hooks/util — `src/lib/motion.ts`
- `prefersReducedMotion()` guard.
- `registerGsap()` — idempotent `gsap.registerPlugin(ScrollTrigger)`.
- Shared easing/timing tokens (so home and node pages feel identical).

### Graph grouping (additive, no static-layout change)
Both `StellarNodeGraph` and `ConstellationGraph` wrap their layers so GSAP can target them:
- `<g class="cn-stars">` — starfield (far-parallax layer)
- `<g class="cn-mandala">` — rings, spokes, nodes, hub (near-parallax layer)
- element tags: `.cn-spoke` (draw), `.cn-node` / `.cn-orb` (ignite/bloom), `.cn-hub` (first-node ignite), `.cn-label` (fade), `.cn-sat` (dendrite bloom)

Selectors are scoped to the MotionStage root, so home and node graphs animate independently and cleanly unmount.

## 5. Non-goals / guardrails

- No stacked "landing page" sections, no menus — the graph remains the sole navigation surface (ISA).
- No continuous JS rAF loops driving React state (perf); continuous motion is CSS or GSAP-on-elements only, isolated from React re-renders.
- Motion is purposeful (transform/opacity only, hardware-accelerated) — no animating layout properties.
- The report modal + live Selemene API flow is untouched by the motion layer.

## 6. Verification

- Home and each `/node/:id` play the compile sequence on load; screenshots/GIF captured.
- With `prefers-reduced-motion: reduce`, the final constellation renders instantly (no motion) — verified via the browser emulation.
- `npm run build` passes; bundle noted with GSAP added.
- Node-clicking, back/home, core-return, and the report modal all still work during and after motion.
- 60fps target: pointer parallax and scroll scrub do not trigger React re-renders (verified via profiler / no state churn).

## 7. Plan integration

Adds **Phase 4 — Motion & Interactivity (reel-flow emulation)** to
`docs/urania-137-multi-page-integration-plan.md`, and a corresponding ISA
criterion for "the home + node pages emulate the source reel's compile flow."
