# Urania UI Realignment Baseline

Recorded: 2026-07-27

Branch: `codex/urania-graph-first-ui-realignment`
Integrated baseline commit: `f8ea4c145b621fa8520eb8aafb09ba77c6b0a0d8`

## Recoverability

- Tracked binary diff: `/tmp/urania-137-before-ui-realignment.patch`
- Untracked archive: `/tmp/urania-137-before-ui-realignment-untracked.tgz`
- Exact 128-path integrated-work inventory:
  `docs/ui/realignment-baseline-allowlist.txt`
- Local-only exclusions retained without deletion: `.playwright-cli/` and the
  superseded Cloudflare execution scratch file `plan.md`.

Rollback is non-destructive: revert realignment commits in reverse order with
`git revert <sha>`. If this branch becomes unusable, create
`codex/urania-ui-recovery` from the baseline commit. Apply the patch or archive
only in that clean recovery worktree after `git apply --check`; never apply it
over the original workspace.

## Browser Evidence

The pre-realignment evidence directory is
`/tmp/urania-frontend-review-browser/`.

- Desktop `1440×1000`: `home-desktop.png`, `witness-desktop.png`,
  `folio-desktop.png`, `readings-desktop.png`, `settings-desktop.png`.
- Mobile `390×844`: `home-mobile.png`, `witness-mobile.png`,
  `folio-mobile.png`, `readings-mobile.png`, `settings-mobile.png`.
- Effective reflow `720×1000`: `folio-effective-200pct-720csspx.png`,
  `witness-effective-200pct-720csspx.png`.
- Dialog and activation evidence:
  `integrated-reading-open-desktop.png`,
  `integrated-reading-tab-desktop.png`,
  `integrated-reading-after-escape-desktop.png`,
  `mobile-integrated-reading-center-click.png`, and
  `mobile-integrated-reading-keyboard-open.png`.

These captures are evidence of the starting state, not golden-pixel fixtures.

## Authoritative Visual References

1. `.assets/moodboard.png`
2. `.assets/page-references/multi-page-architecture-moodboard.png`
3. `.assets/generated/readings-ecosystem/component-atlas.png`
4. `.assets/generated/readings-ecosystem/reading-folio.png`
5. `.assets/generated/engine-output-atlas/engine-component-families.png`

Generated references guide composition, density, framing, and hierarchy only.
Runtime identifiers, counts, evidence states, and provenance remain typed-data
contracts.

## Starting Findings

Blockers:

- Overlay shells lack complete dialog semantics and focus lifecycle.
- Home and node telemetry presents simulated values as observed evidence.
- Product structure still ships prohibited `path` and `journey` vocabulary.

Major findings:

- The first viewport does not yet explain the product promise.
- Conversation requires two navigation depths despite the direct-reading goal.
- Folio uses inconsistent Archive/Library/Folio terminology.
- Engine-shaped source data can dominate the human reading.
- Streaming and long-form reading share an unstable announcement surface.

## Characterization

`npm run verify:ui-baseline` builds the production bundle, asserts the three
known violation groups remain observable at this starting point, and replaces
`docs/ui/realignment-baseline.json` with the measured bundle size. Later exit
gates compare against that recorded value; they do not preserve the violations.

Recorded production bundle size: **516,660 bytes**.
