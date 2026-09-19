# Urania UI Instrument Shell Redesign Baseline

Recorded: 2026-09-19

Branch: `redesign/instrument-shell`
Baseline commit: Phase 6 — `8ab6ab1`

## Redesign phases completed

| Phase | Scope | Commit |
|-------|-------|--------|
| 1 | Foundation: tokens, radius/motion grammar, shell, arrival, errors | `ff151dc` |
| 2 | Capsule masthead, command palette, all-viewport identity | `6cfc73d` |
| 3 | URL is state: admin tabs, folio actions, view transitions | `a707377` |
| 4 | Folio gallery: tiles, filter pills, copy button, reading action bar | `a32c10a` |
| 5 | Threshold in-shell, continuation dock, begin page | `6ff124f` |
| 6 | Settings sections, dialog confirmations, session info | `8ab6ab1` |

## Bundle

- App entry: 574,793 bytes (budget: 575,000)
- App total: 653,114 bytes (entry + CommandPalette + AdminDataBrowser chunks)
- Landing: unchanged (pre-existing budget failures are landing-only)

## Resolved violations

All three vocabulary violation groups documented in the original baseline have
been resolved. The banned labels (`Archive`, `Library`, `Frequency`,
`Resonance`, `Live Paths`) and legacy stat numbers (`1,337`, `12,851`) no longer
appear in the runtime source files.

## Contract hooks preserved

`data-app-shell`, `data-route-field`, `data-bottom-chrome`,
`data-experience-gate`, `data-graph-lens`, `data-graph-entry`,
`data-graph-list-viewport`, `data-async-state`, `data-reading-layer`,
`data-reading-relation`, `data-folio-map-encoding`, `data-folio-list-lens`,
`data-conversation-route`, `data-conversation-doorway`,
`data-origin-reading-id`, `data-home-journey`, `data-consent-action`,
`data-witness-run`, `data-witness-turn-status`, `data-native-run`,
`data-node-id`, `data-engine-composition`, `data-workflow-composition`.

## Test evidence

- 883 unit tests pass (vitest)
- 128 node contract tests pass
- 7 source-shape contract scripts pass
- Bundle budget passes (app entry under 575 KB)
