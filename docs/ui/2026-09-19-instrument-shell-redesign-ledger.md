# Instrument Shell Redesign Ledger

Date: 2026-09-19
Branch: `redesign/instrument-shell`
Reference: Nutlope `inspo` repo (read-only audit)

## Decisions

| Subject | Adopted | Rejected | Reason |
|---------|---------|----------|--------|
| Capsule masthead | Sticky capsule nav, scroll-shrink via CSS scroll-timeline | Fixed masthead | Contract forbids `fixed` on interactive chrome; sticky respects scroll owner |
| Command palette | Lazy-chunked `cmdk`-based palette, global Cmd+K | Inline search in nav | Palette scales to nodes + readings + actions without bloating the masthead |
| Navigation items | Map / Folio / Begin / Settings + Operator | Hamburger-only mobile | All destinations reachable on every viewport via pills; hamburger kept as overflow |
| URL as state | Hash-encoded filters, admin tabs, node surfaces | Session state | URL sharing, back-button, and deep links work; no stale state on refresh |
| View transitions | `document.startViewTransition` with fallback | Route-level animations | Native API, zero-dependency, reduced-motion honored automatically |
| Folio gallery | Auto-fill tile grid with hover capsules | Card list | Tile density scales to viewport; hover reveals metadata without page change |
| Folio filters | Pill chips with zero-count hidden, hash-synced | Sidebar filter panel | Compact, URL-encoded, works on mobile without a drawer |
| Copy button | 4-state idle/copying/ok/err, 1.6s reset | Toast notifications | Inline feedback at the action site; no toast infrastructure needed |
| Threshold | Seven scenes inside AppShell, progress rail | Standalone full-page | Shell provides nav (Leave the field), deep link restore, retry on boot failure |
| Continuation dock | Bottom capsule, hidden when empty, all viewports | xl-only sidebar rail | Mobile parity; dock appears only when reader has state to continue |
| Begin page | Inline doorway grid at `#/chat` | Modal chooser | Page-level grid is linkable, scannable, and keyboard-navigable without overlay |
| Settings sections | Section IDs + pill nav + scroll-to | Single long page | Hashable sections allow direct links `#/settings/consent` |
| Confirmations | InstrumentDialog state-based | `window.confirm()` | Consistent visual language; confirm dialog shares the instrument overlay |
| Arrival gate | Skeleton inside shell, only map-shaped routes wait | Blank "Opening the field" | Shell paints immediately; Folio/Settings render their own boundaries |
| Not-found view | Dedicated page with palette search | Silent redirect to home | User knows the URL was wrong; palette offers recovery |
| Type scale | Seven-step scale re-pointing Tailwind utilities | Default Tailwind sizes | Consistent hierarchy from meta to hero; tokens-only source |
| Radius stops | Three stops: tile, card, pill | Arbitrary border-radius | Constraint reduces visual noise; tokens enforce consistency |
| Motion easing | Single `cubic-bezier(0.19,1,0.22,1)` | Per-component easing | Unified spring-out feel across all transitions |

## Brand locks held

| Lock | Evidence |
|------|----------|
| Void `#070B1D` field | All backgrounds resolve through `void` token |
| Gold `#C5A017` structure only | Gold used for borders, icons, active states; never fill |
| Parchment `#F0EDE3` reading material | Text content and reading surfaces only |
| No light mode | No `prefers-color-scheme: light` branch anywhere |
| Tokens in `tokens.ts` + `tailwind.config.js` only | No hex outside token files; `semanticTokens.test.ts` enforces |
| Graph is the interface | Home shows 7 parent nodes; every node a URL |
| Banned vocabulary | Archive, Library, Explore, Connect, Understand, Ascend, Frequency, Resonance removed |

## Borrowed from inspo (with adaptation)

- Capsule masthead with scroll-shrink (adapted to sticky + CSS scroll-timeline)
- Command palette architecture (adapted to `cmdk` lazy chunk)
- URL-as-state pattern for filters and tabs
- 4-state copy button (idle/copying/ok/err)
- View Transitions API usage
- Reduced-motion at three levels (animation, scroll-timeline, transition)
- Seven-step type scale (re-pointed to Urania's typographic tokens)
- Three radius stops

## Not borrowed

- Gradient placeholder tiles (Urania uses void + gold hairline)
- Toast notifications (replaced by inline feedback)
- `useSyncExternalStore` for recents (Urania uses `folioStore` pattern)
- Light/dark theme toggle (Urania is void-only)
