# M2 Landing Design Ledger — 2026-09-11

## Decision: research-first, one direction

| Choice | Locked to | Why |
|---|---|---|
| Composition path | **In-repo Motionsites craft uplift** (not Motionskin full reskin; not React Bits Pro this pass) | React Bits license absent; Motionskin would replace structure. Host is a **static** landing (`vite.landing.config.ts` SSR-to-HTML, no hydrate). |
| Visual direction | Urania moodboard + page-references (void / sacred gold / Cinzel / parchment / constellation) | Live landing is ~10% density of `.assets/moodboard.png` and `.assets/page-references/*`. |
| Motionsites craft borrowed | `digital-experiences` liquid-glass + blur density; `mindloop` staggered reveal *pattern* (CSS only) | Free prompts; **skin stays Urania** — no Inter, no pure `#000`, no newsletter/email SaaS clone. |
| Motion | CSS `transform`/`opacity` only; honor `prefers-reduced-motion` | Landing has no React runtime; GSAP/Framer cannot mount. |
| Media | Inline SVG sacred geometry + CSS fields; **no `<video>` / `<img>`** | Landing boundary tests forbid video/img and eager payloads. |
| Funnel | Public → Access OTP via `app.urania.tryambakam.space` | Product truth; no fake signup/metrics. |
| Copy bans | No journey/path/healing/manifesting; no “AI as a feature” | Existing `LandingPage.test.ts` vocabulary gate. |

## Gap (honest)

| Surface | Moodboard / refs | Live before rewrite |
|---|---|---|
| Geometry density | Flower-of-life, rings, glyphs, console chrome | Thin CSS orbits |
| Hierarchy | Engraved Cinzel titles + console metadata | Sparse centered column |
| Sections | Multi-depth instrument rooms | 3 thin copy blocks |
| Media | Rich stills / cinematic fields | `mediaCount: 0` |
| Motion | Bloom / reveal | Mostly static |

## R-9 residues (unchanged)

ISC-143 / ISC-145 / ISC-146 remain open. This pass does **not** claim them closed.
