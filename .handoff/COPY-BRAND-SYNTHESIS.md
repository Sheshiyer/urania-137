# Urania 137 — Copy and Brand Synthesis Handoff

**Purpose**: Non-destructive reference for rebuilding the public landing and protected app from scratch. Every decision, string, color, and constraint is captured here. The code stays the source of truth; this document captures the *why* behind the code.

**Date**: 2026-09-21  
**Source commit**: `e7bafa9` (M3 Wave 1 deployed)  
**Live landing**: `urania.tryambakam.space`  
**Protected app**: `app.urania.tryambakam.space`

---

## 1. Architecture: Split-Host

| Surface | Host | Stack | Auth |
|---------|------|-------|------|
| Public landing | `urania.tryambakam.space` | Static Vite build (`vite.landing.config.ts`), Cloudflare Pages project `urania-137-landing` | None |
| Protected app | `app.urania.tryambakam.space` | React 19 + Vite SPA, CF Pages project `urania-137`, CF Pages Functions, D1 | Cloudflare Access email OTP |

The landing is a **Motionskin** — Golden Portal (Motionsites) provides structure and motion; Urania provides type, palette, copy, and the Access CTA. The landing never touches the Selemene API. The app uses a hash router (`#/node/birth`, `#/readings`, etc.).

### Deploy topology

```
src/landing/     → vite.landing.config.ts → dist/landing/ → CF Pages (urania-137-landing)
src/ (app)       → vite.config.ts         → dist/app/     → CF Pages (urania-137) + functions/
```

The landing deploy script (`scripts/deploy/landing.mjs`) stages only `dist/landing` and `wrangler.landing.toml` into a disposable directory so repository functions/bindings can never leak into the static landing.

---

## 2. ICP and Brand Voice

### Ideal Customer Profile

**Seeker-Simon**: Founders, engineers, creative directors. Age 28-42. They've exhausted linear introspection and want a structured witness — not a prediction. They already know something is active; they want pattern recognition with attributable sources.

### Brand Persona

**"The Anatomist Who Sees Fractals"** — clinical precision at visionary scale.

### Sentence Rhythm

Alternate between:
- **3-8 word declarations** (structure, certainty)
- **25-45 word technical traverses** (depth, specificity)

Example: "One field. 7 rooms." then "Each room opens a lens — a bounded surface over the Selemene engine pool. The graph is the interface at every depth."

### Signature Lexicon

| Use | Instead of |
|-----|-----------|
| field | platform, app |
| room | page, section, tab |
| witness | prediction, reading (alone) |
| Folio | archive, library, history |
| threshold | onboarding, signup |
| instrument | dashboard, console |
| posture | philosophy, approach |
| engine | model, algorithm |
| the question is active | you're ready, get started |

### Banned Vocabulary (enforced by test)

These words are regex-tested across all landing routes:

| Word/Phrase | Why |
|-------------|-----|
| `journey` | spiritual cliche |
| `\bpath\b` (whole word) | spiritual cliche |
| `healing` | overclaim — witness, not healer |
| `manifesting` | overclaim — witness, not manifestor |
| `AI as a feature` | the instrument is not an AI product |
| `artificial intelligence` | same |
| `Archive` (in app UI) | only "Folio" |
| `Library` (in app UI) | only "Folio" |

Additional UI_COPY bans enforced in `src/content/uiCopy.test.ts`.

### Core Posture Statements

These are load-bearing copy — they appear verbatim in multiple contexts:

1. **"See the pattern. Keep the authority."** — the h1, the brand line
2. **"Source before model. Consent before relation. Privacy before convenience."** — the posture triad, appears in quote section and footer
3. **"Insight without overclaim."** — the posture emphasis
4. **"Enter when the question is active."** — the threshold invitation
5. **"The system succeeds when you no longer need it."** — the witness position

### Witness Prompt (the qualifying question)

> "What pattern keeps returning, and what concrete signal would show that it no longer applies?"

This appears on the enter page and the invitation section. It's the literal threshold question.

---

## 3. Data Architecture: Code as Source of Truth

### The Chain

```
selemeneNodes.ts (7 rooms, all children)
    ↓
landingData.ts (derives counts, descriptions, details)
    ↓
landingCopy.ts (composes all strings with template literals)
    ↓
Pages (render the copy exports)
```

When an engine is added to `selemeneNodes.ts`, the landing count updates automatically. No copy file needs editing for numeric changes.

### Current Counts (derived)

| Metric | Value | Source |
|--------|-------|--------|
| Rooms | 7 | `SELEMENE_NODES.length` |
| Unique engines | 13 | Deduplicated `engineId` across all rooms |
| Unique workflows | 6 | Deduplicated `workflowId` across all rooms |
| Witness modes | 3 | Deduplicated `mode` across all rooms |
| Total capabilities | 22 | engines + workflows + witnesses |
| Rust engines | 7 | numerology, human-design, gene-keys, vimshottari, panchanga, vedic-clock, transits |
| TypeScript engines | 6 | biorhythm, i-ching, tarot, enneagram, sacred-geometry, sigil-forge |

### The Seven Rooms

| ID | Label | Epithet | Color | Engines | Workflows | Witnesses |
|----|-------|---------|-------|---------|-----------|-----------|
| birth | Birth Witness | The Arrival | gold | 6 | 1 | 0 |
| compat | Union Mirror | The Union | violet | 0 | 0 | 2 |
| transit | Sky Weather | The Passage | cyan | 4 | 1 | 0 |
| witness | Noesis Reading | The Reading | amber | 0 | 2 | 2 |
| engine | Engine Status | The Machine | cyan | 10 | 0 | 0 |
| folio | Folio Archive | The Record | gold | 0 | 0 | 0 |
| bridge | Bridge Query | The Inquiry | violet | 4 | 2 | 0 |

### The 13 Engines

| ID | Name | Substrate | Description |
|----|------|-----------|-------------|
| numerology | Numerology | Rust | Pythagorean and Chaldean reduction, lifepath number derivation, name-number analysis |
| human-design | Human Design | Rust | Bodygraph computation from planetary gate positions: type, strategy, authority, profile, channels |
| gene-keys | Gene Keys | Rust | Shadow-Gift-Siddhi spectrum for each gate; contemplation pathways and prime gift sequence |
| vimshottari | Vimshottari Dasha | Rust | Full 120-year dasha timeline with maha, antar, and pratyantar periods from lunar nakshatra |
| panchanga | Panchanga | Rust | Five limbs of the Vedic day: Tithi, Vara, Nakshatra, Yoga, and Karana, with quality assessment |
| vedic-clock | Vedic Clock | Rust | Hora, Ghati, and Muhurta resolution — the day divided into consciousness-relevant intervals |
| transits | Transits | Rust | Current planetary positions against natal placements, with orb-based aspect detection |
| biorhythm | Biorhythm | TypeScript | Physical, emotional, and intellectual cycles from birth date with composite overlays |
| i-ching | I Ching | TypeScript | Hexagram generation, changing lines, nuclear hexagram, and interpretive text selection |
| tarot | Tarot | TypeScript | Spread-based draw with positional meaning, elemental dignity, and reversals |
| enneagram | Enneagram | TypeScript | Type determination, wing balance, instinctual variant, and growth/stress arrows |
| sacred-geometry | Sacred Geometry | TypeScript | Geometric pattern generation from natal coordinates — seed of life, metatron, sri yantra |
| sigil-forge | Sigil Forge | TypeScript | Intention-bearing sigil generation from semantic encoding. Requires an explicit intention statement |

### The 6 Workflows

| ID | Name | Description |
|----|------|-------------|
| birth-blueprint | Birth Blueprint | Orchestrates all natal engines into one attributable document |
| daily-practice | Daily Practice | Personal transit overlay on the daily Panchanga |
| full-spectrum | Full Spectrum | Multi-engine integrated reading with intention-bearing sigil |
| creative-expression | Creative Expression | Intention-to-reading workflow — creative act as computational protocol |
| decision-support | Decision Support | Structured inquiry for active decisions — engines selected by question topology |
| self-inquiry | Self-Inquiry | Open-ended reflective protocol — question shapes engine selection |

---

## 4. Design System

### Color Palette

| Name | Hex | Role |
|------|-----|------|
| Void Black | `#070B1D` | Primary background (the field) |
| Surface | `#0E1428` | Elevated cards, panels |
| Parchment | `#F0EDE3` | Primary text, reading material |
| Sacred Gold | `#C5A017` | Structure accent (never fill, always line/type/glow) |
| Gold Warm | `#E6B84D` | Warmer gold for glows/blooms |
| Silver | `#8A9BA8` | Metadata, secondary text |
| Witness Violet | `#2D0050` | Room accent, witness surfaces |
| Flow Indigo | `#0B50FB` | Interaction flow, links |
| Coherence Emerald | `#10B5A7` | Computed evidence, cyan room accent |
| Terracotta | `#C65D3B` | Unresolved evidence |

**No light mode.** The void is the instrument field. Reading material (Folio) uses dark ink on parchment within the content area only.

### Room Colors (for graph accents)

```
gold   → #C5A017 (Birth Witness, Folio Archive)
violet → #2D0050 (Union Mirror, Bridge Query)
cyan   → #10B5A7 (Sky Weather, Engine Status)
amber  → #C5A017 (Noesis Reading — resolves to gold)
```

### Typography

| Role | Family | Min Size | Weight | Use |
|------|--------|----------|--------|-----|
| Display | Panchang | 18px | 500 | Headlines, labels, eyebrows |
| Engraving | Cinzel | 16px | 500 | Page titles, wordmark, serif display |
| Prose | Satoshi | 16px | 400 | Body copy, descriptions |
| UI | Satoshi | 14px | 500 | Buttons, navigation, controls |
| Metadata | Satoshi | 12px | 500 | Timestamps, counts, secondary info |
| Data | SF Mono | 12px | 400 | Code, checksums, technical values |

**Landing fonts**: Cinzel (serif display), Satoshi (sans body). Golden ratio rhythm.

**App fonts**: Panchang (display/headings), Cinzel (engraving/titles), Satoshi (body/UI), SF Mono (data).

### Type Scale (seven stops)

```
meta:  0.75rem
small: 0.875rem
body:  1.0625rem
sub:   1.1875rem
h2:    1.5rem
h1:    2.25rem
hero:  3.25rem
```

### Radius

```
tile: 0.75rem  (readings, doorways)
card: 1rem     (panels, cards, popovers)
pill: 9999px   (buttons, chips, inputs, tabs)
```

### Motion

```
easing:  cubic-bezier(0.19, 1, 0.22, 1)  — out-expo, one curve for everything
reveal:  1000ms
snap:    300ms
```

### Shadows (tinted, directional, from the void)

```
capsule:  0 4px 18px -8px rgb(7 11 29 / 0.9)
popover:  0 12px 32px -16px rgb(7 11 29 / 0.95)
dialog:   0 30px 60px -20px rgb(7 11 29 / 0.95)
dock:     0 8px 30px -12px rgb(7 11 29 / 0.9)
```

### Anti-Drift Contract

No hard-coded hex values or ad-hoc Tailwind color classes outside `tokens.ts` and `tailwind.config.js`. Every component imports from tokens. The `semanticTokens.test.ts` file enforces this.

---

## 5. Landing Page Copy (Verbatim)

### Hero

```
kicker:     "Tryambakam Noesis"
subkicker:  "Witness"
h1:         "SEE THE PATTERN"  (serif + sans split)
brand line: "See the pattern. Keep the authority."
lede:       "22+ capabilities across 7 rooms. A graph-first reading field:
             conversation as threshold, Selemene as computation, Folio as the
             attributable record. Keep the authority."
cta:        "Enter the field"
```

### Showcase (The Instrument)

```
title: "The instrument"
lines:
  - "One field. 7 rooms."
  - "13+ deterministic engines."
  - "6 orchestrated workflows."
  - "Every reading traceable. Every source distinct."
cta:   "Inspect the field"
```

### Rooms Overview

```
title: "7 rooms. One graph."
lede:  "Each room opens a lens — a bounded surface over the Selemene engine
        pool. The graph is the interface at every depth."
```

Each room card shows: label, epithet, tagline, engine/workflow/witness count pills.

### Engine Roster

```
title: "13+ engines. Named and deterministic."
lede:  "Each engine is a bounded computation — same input, same output,
        attributable at every layer. The substrate splits between Rust
        (astronomical precision, sub-millisecond) and TypeScript
        (interpretive, compositional)."
```

### Workflow Roster

```
title: "6 workflows. Orchestrated."
lede:  "A workflow composes multiple engines into one reading. Engine
        selection follows the question topology — not user preference."
```

### Infrastructure

```
title: "Architecture. Not abstraction."

Selemene Engine:
  "13 deterministic engines split across Rust and TypeScript runtimes.
   Axum API on port 8080; TypeScript bridge on port 3001. Every engine
   call logged, every response attributable."

Witness Pipeline:
  "Multi-pass orchestrator producing narrative reports with rubric-audited
   sections. Source, inference, and interpretation remain separate layers —
   never collapsed into one claim."

Folio System:
  "The attributable record. Same document reopens with system stack and
   evidence ledger. Trust panel shows which engine produced each section,
   at what confidence."

Consent Architecture:
  "Threshold collects only what the capability needs — one fact at a time.
   Relation requires explicit participation. Revocation is always available.
   Owner is not subject."

Privacy Boundary:
  "This is a static public site. Nothing leaves this page. The private
   console activates only after Cloudflare Access email OTP on the
   protected host."
```

### Q&A (6 questions)

```
Left column:
  Q: "What is Urania 137?"
  A: "A private stellar console. 7 rooms, 13+ engines, 6 workflows —
      the graph is the interface at every depth."

  Q: "How does a reading stay honest?"
  A: "Source, inference, and conclusion stay separate — never collapsed
      into one claim. The Folio trust panel names which engine produced
      each section."

  Q: "What is the Folio?"
  A: "The attributable record. Same document, same stack, same evidence
      ledger on reopen. Every reading generates one."

Right column:
  Q: "What are the 7 rooms?"
  A: "Birth Witness, Union Mirror, Sky Weather, Noesis Reading, Engine
      Status, Folio Archive, Bridge Query."

  Q: "What are the engines?"
  A: "13 deterministic compute units — 7 Rust (astronomical precision)
      and 6 TypeScript (interpretive composition). Same input, same output."

  Q: "How do I enter?"
  A: "Cloudflare Access email OTP. One boundary, then the private console."
```

### Quote

```
text:     "Source before model. Consent before relation. Privacy before convenience."
emphasis: "Insight without overclaim."
```

### Invitation (Threshold)

```
kicker: "The threshold"
title:  "Enter when the question is active."
lede:   "What pattern keeps returning, and what concrete signal would show
         that it no longer applies?"
note:   "Cloudflare Access email OTP is required before the private
         environment opens."
cta:    "Open Urania 137"
```

### Footer

```
mark:    "Urania 137"
line:    "22+ capabilities · attributable sources · protected by design"
posture: "Source before model. Consent before relation. Privacy before convenience."
```

---

## 6. Instrument Page Copy

```
badge: "The instrument"
title: "One field. 7 rooms. 13+ engines. Every reading traceable."

Row 1: "Threshold collects only what the capability needs."
  body: "Conversation is the intake. One fact at a time. Owner is not
         subject. Nothing extra is stored on this public site."

Row 2: "13 engines. Named and separate."
  body: "Deterministic compute split across Rust and TypeScript runtimes —
         7 astronomical engines, 6 interpretive. Inference does not
         overwrite source. The console never collapses a reading into a
         single claim."

Row 3: "Folio is the attributable record."
  body: "The same document reopens with system stack and evidence ledger.
         Trust panel names which engine produced each section, at what
         confidence. What you keep stays yours to recover."

Row 4: "6 workflows orchestrate the engines."
  body: "Birth Blueprint, Daily Practice, Full Spectrum, Creative
         Expression, Decision Support, Self-Inquiry — each workflow
         composes engines by question topology. One orchestration, one
         Folio."
```

---

## 7. Lenses Page Copy

```
badge: "The constellation"
title: "7 rooms. One graph."
lede:  "Each parent lens opens a room — a bounded surface over 13+ engines
        and 6 workflows. Never a menu of undifferentiated modes."
```

Each room renders with: name, tagline, detail body, capability string (e.g. "6 engines · 1 workflow"), and color-coded children pills (engine/workflow/witness/daily/info).

---

## 8. Principles Page Copy (FAQ)

```
badge: "FAQ"
title: "Answers that keep authority with you."
lede:  "How the field works, what the 7 rooms hold, and what Access
        actually gates."

Categories: Field (4 questions), Engines (4 questions), Rooms (4 questions), Access (4 questions)

Aside:
  title: "Still deciding?"
  body:  "The instrument, the rooms, and the posture are public. The
          console — and its 13+ engines — are not."
  cta:   "Open Urania 137 →"
```

16 FAQ questions total — all captured in `landingCopy.ts`.

---

## 9. Enter Page Copy

```
title:     "Enter when the question is active."
lede:      "What pattern keeps returning, and what concrete signal would
            show that it no longer applies?"
primary:   "Open Urania 137"
secondary: "Inspect the instrument first"
note:      "Cloudflare Access email OTP is required before the private
            environment opens."
```

---

## 10. App UI Copy

```typescript
UI_COPY = {
  promise:            "See what is active. Choose a lens; the narrator assembles the reading with you."
  beginReading:       "Begin a reading"
  folio:              "Folio"
  browseFolio:        "Browse Folio"
  returnToMap:        "Return to map"
  thresholdGrounding: "A private instrument for examining what is active while keeping authorship with you."
}
```

### App Navigation Labels (contract-locked)

```
Map / Folio / Begin / Settings / Operator
"Begin a reading"
"Open navigation menu"
"Product sections"
"Search stellar nodes"
"Search canonical readings"
"Browse Folio" / "Folio map" / "Reading"
"Continue in conversation" / "Return to Folio"
"Engine roster" / "Live Status"
"Leave the field" (logout)
```

---

## 11. App Routes

| Route | Page | Description |
|-------|------|-------------|
| `#/` | HomePage | Constellation graph, 7 parent nodes, stat footer |
| `#/threshold` | ThresholdPage | First-run onboarding, 7 scenes, scroll-driven |
| `#/node/:id` | NodePage | Room drill-in, child dialog per capability |
| `#/node/:id/:child` | NodePage | Child open (info/chat) |
| `#/node/:id/:child/run` | NodePage | Deterministic/daily run surface |
| `#/chat` | ConversationPage | Doorway chooser / ChatSheet |
| `#/chat/:node/:child` | ConversationPage | Active conversation |
| `#/readings` | ReadingLibraryPage | Folio gallery with filters |
| `#/readings/:id` | ReadingLibraryPage | Single reading detail |
| `#/settings` | SettingsPage | Pattern, circle, consent, session |
| `#/admin-data` | AdminDataBrowserPage | Operator-only data browser |
| `#/relationship-reading` | RelationshipReadingPage | Multi-subject witness |

---

## 12. Room Descriptions (for landing detail)

### Birth Witness
**Tagline**: Natal architecture. The arrival encoded.  
**Detail**: 6 engines decode the moment of arrival — numerological signature, Human Design bodygraph, Gene Keys spectrum, Vimshottari dasha timeline, Panchanga limbs, and Vedic Clock. The Birth Blueprint workflow orchestrates all six into one attributable document.

### Union Mirror
**Tagline**: Relational field. Consent-gated.  
**Detail**: Dyads and families only when participation is explicit. The Composite Dyad produces a merged witness for two subjects; the Relationship Reading extends the integrated pipeline to up to five, preserving each source distinctly.

### Sky Weather
**Tagline**: Current celestial weather. The day as witness.  
**Detail**: Today's Panchanga rendered as a reading — not a raw data dump. The Daily Practice workflow layers personal transits over the base sky, while standalone engines (Transits, Biorhythm, Panchanga, Vedic Clock) serve individual lenses.

### Noesis Reading
**Tagline**: The multi-pass reading. Narrative depth.  
**Detail**: The Integrated Kundali pipes every engine through a rubric-audited witness pipeline at Level 0. The Integrated Reading broadens coverage. Full Spectrum and Creative Expression are intention-bearing workflows that compose the reading with a sigil.

### Engine Status
**Tagline**: Diagnostic view. The machine named.  
**Detail**: Live telemetry over named engines. Each capture door stays honest — the status panel shows what the system actually computes, not a capability promise.

### Folio Archive
**Tagline**: The attributable record. Durable recovery.  
**Detail**: Every reading generates a Folio — the same document reopens with system stack, evidence ledger, and trust panel. Saved Reports, Noesis Mirror, Search, and Favorites provide four lenses over the canonical archive.

### Bridge Query
**Tagline**: Direct inquiry. Question as protocol.  
**Detail**: Decision Support and Self-Inquiry are structured workflows; Tarot, I Ching, Sigil Forge, and Enneagram serve as standalone divination and typology engines. The bridge is where a question becomes a computational protocol.

---

## 13. Kha-Ba-La Framework

The product cosmology:

| Layer | Sanskrit | Role | In Urania |
|-------|----------|------|-----------|
| Kha | Spirit | The observer | The witness posture — reflection not prediction |
| Ba | Body | The vehicle | Selemene engine — the computational substrate |
| La | Inertia | The sculpting material | The Folio — the attributable record that persists |

---

## 14. Test Contracts

These strings and patterns are enforced by tests and must survive any rebuild:

### Landing tests (`LandingPage.test.ts`)
- Home renders exactly one `<h1>`
- Semantic structure: `<header>`, `<nav>`, `<main>`, `<footer>`, skip link
- Protected app links point only to `https://app.urania.tryambakam.space/`
- Video uses `preload="metadata"` (never `preload="auto"`)
- Dynamic counts (`${ENGINE_COUNT}+`, `${ROOM_COUNT} rooms`) appear on home, lenses, instrument
- Forbidden vocabulary regex across all routes
- No absolute hrefs outside the allowlisted app origin

### App UI contract hooks (data attributes)
```
data-app-shell, data-route-field, data-bottom-chrome
data-experience-gate, data-graph-lens, data-graph-entry
data-graph-list-viewport, data-async-state/icon
data-reading-layer/density/preview/transition/relation/source
data-folio-map-encoding, data-folio-list-lens
data-conversation-route/doorway, data-origin-reading-id
data-reading-doorway, data-home-journey, data-consent-action
data-witness-run, data-witness-turn-status, data-native-run
data-node-id, data-engine-composition, data-workflow-composition
data-protected-app-cta, data-urania-threshold
```

---

## 15. Rebuild Principles

1. **Code is the source of truth for counts.** Import from `selemeneNodes.ts`, derive in a data layer, compose copy with template literals. Never hardcode "13 engines" in a string.

2. **The graph is the interface at every depth.** Every page is navigable by clicking nodes, not hunting menus. Rooms are graph surfaces, not tabs.

3. **Witness, not seer.** The system reflects pattern. It does not predict outcome. Copy must never claim causation or prescription.

4. **Source/inference/interpretation stay separate.** Three layers in every reading. The trust panel names which engine produced what, at what confidence.

5. **Folio, not archive.** The word is "Folio." It generates with every reading. It reopens with system stack and evidence ledger intact.

6. **One boundary.** Cloudflare Access email OTP is the only gate. The landing is public. The console is private. No signup form on the landing.

7. **Token discipline.** All colors in `tokens.ts` + `tailwind.config.js`. No inline hex. The `semanticTokens.test.ts` file guards this.

8. **Sentence rhythm.** Short declarations (3-8 words) alternate with technical traverses (25-45 words). Never two long sentences in a row.

9. **No banned words.** The test suite enforces this. Run tests before shipping copy.

10. **Non-destructive data model.** The `SelemeneChild` type carries discriminated `run` unions (`kind: engine | workflow | witness | daily`). This powers the entire data chain. Preserve it.

---

## 16. File Map (what to preserve, what to rebuild)

### Preserve (source of truth)
- `src/data/selemeneNodes.ts` — the canonical room/engine/workflow graph
- `src/types/index.ts` — TypeScript types for the entire system
- `src/styles/tokens.ts` — design tokens
- `src/content/uiCopy.ts` — app UI strings
- `tailwind.config.js` — Tailwind token extensions

### Preserve (data derivation — rebuild if architecture changes)
- `src/landing/landingData.ts` — derives counts/metadata from selemeneNodes
- `src/landing/landingCopy.ts` — composes all landing strings

### Rebuild freely (presentation layer)
- `src/landing/pages/*.tsx` — landing page components
- `src/landing/golden-portal.css` — landing styles
- `src/landing/LandingPage.tsx` — landing shell/router
- `src/pages/*.tsx` — app page components
- `src/components/**` — app UI components

### Preserve (infrastructure)
- `wrangler.toml` — app CF Pages config
- `wrangler.landing.toml` — landing CF Pages config
- `scripts/deploy/landing.mjs` — landing deploy script with integrity checks
- `vite.landing.config.ts` — landing Vite build (handles SPA sub-routes)
- `.claude/launch.json` — dev server configs (ports 5182, 5183, 5191)
- `ISA.md` — acceptance criteria ledger

---

## 17. Media Assets

Landing media referenced in the current build:
```
/media/gp-hero.mp4          — hero background video
/media/urania/hero-2k.png   — hero poster / fallback
/media/gp-cloud.png         — cloud overlay (parallax)
/media/gp-dove.png          — dove image (showcase)
/media/gp-quote-overlay.png — quote section overlay

/media/urania/instrument-threshold.jpg  — instrument page row 1
/media/urania/instrument-selemene.jpg   — instrument page rows 2+4
/media/urania/instrument-folio.jpg      — instrument page row 3
/media/urania/lens-birth.jpg            — lenses page room card
/media/urania/lens-union.jpg            — lenses page (compat room)
/media/urania/lens-transit.jpg          — lenses page
/media/urania/lens-witness.jpg          — lenses page
/media/urania/lens-engine.jpg           — lenses page
/media/urania/lens-folio.jpg            — lenses page
/media/urania/lens-bridge.jpg           — lenses page
```

---

## 18. Bundle Budget

```
Landing JS:  414 KB  (132 KB gzip)
Landing CSS:  23 KB  (5 KB gzip)
App entry:   575 KB max (enforced by bundle-budget.mjs)
App total:   625 KB max
```

---

*This document is the handoff. The code is the source of truth. When they disagree, trust the code.*
