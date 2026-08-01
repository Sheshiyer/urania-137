# Urania Production Readiness Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Urania calculation-correct, consent-complete, publicly discoverable, operationally recoverable, and releasable from one immutable verified commit.

**Architecture:** Build two host-specific artifacts from one repository: an unauthenticated static landing artifact and a Cloudflare Access-protected application/Functions artifact. Move location correctness and consent enforcement behind server-owned contracts, then make CI, release, backup, privacy, and observability gates prove the exact production commit.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Playwright, Cloudflare Pages/Functions/Access/D1, GitHub Actions, Wrangler, Node.js 22.

---

## Execution Rules

- Work from `codex/urania-production-readiness`; Task 1 captures the pre-existing dirty landing candidate in a clearly labelled prototype commit before shared files are changed.
- Use red → green → refactor for each behavior. Never weaken an assertion to make a failing implementation pass.
- Commit only the files named by the active task. Do not include unrelated dirty files.
- Tasks 1–2 are complete when their targeted checks pass; from Task 3 onward, a task also requires the canonical local CI command created by Task 3.
- Production mutations require the external-state gates in Task 18; code completion alone is not launch approval.
- Parallel rails may own distinct tasks, but one integrator reviews each diff before it reaches this branch.

## Parallel Ownership Map

| Wave | Rail A | Rail B | Rail C | Integration dependency |
|---|---|---|---|---|
| Foundation | Task 1 prototype/baseline | Task 2 release safety | Task 3 CI | Execute sequentially: 1 → 2 → 3 → 4 |
| Correctness | Tasks 5–7 location | Task 8 remediation | — | Foundation green |
| Product | Tasks 9–10 relationships | Task 11 landing extraction | Task 12 landing hardening | Correctness contracts stable |
| Hardening | Task 13 API perimeter | Task 14 privacy | Task 15 observability | CI canonicalized |
| Operations | Task 16 D1 recovery | Task 17 dependencies/performance | — | All prior waves green |
| Launch | Task 18 preview/dry-run readiness | Task 19 production release/attestation | — | Named approvals |

## Task 1: Freeze the Baseline and Recovery Envelope

**Files:**
- Checkpoint only: `package.json`, `package-lock.json`, `src/App.tsx`, `src/hooks/useHashRoute.ts`, `src/pages/LandingPage.tsx`, `public/landing-reference.html`, `wrangler.toml`
- Create: `docs/operations/production-baseline.md`
- Create: `docs/operations/rollback-matrix.md`
- Modify: `_PROJECT-STATUS.md`

**Step 1: Capture the landing prototype without pretending it passes**

Inventory tracked and untracked paths, verify the complete prototype subset exactly matches the checkpoint list, and record any unrelated/auto-maintained dirty paths separately so they remain unstaged and preserved. Run the known targeted build/test, document the expected root-route failure, and commit only those prototype files:

```bash
git status --porcelain=v1 -uall
npm run build
npx vitest run src/hooks/useHashRoute.test.ts
git add package.json package-lock.json src/App.tsx src/hooks/useHashRoute.ts src/pages/LandingPage.tsx public/landing-reference.html wrangler.toml
git commit -m "wip: checkpoint unverified landing prototype"
```

Expected: build passes; the route test records the already-known landing/home mismatch. The commit message and baseline document identify this as a recovery point, not verified product work. Persist the resulting full checkpoint SHA in `docs/operations/production-baseline.md` before reverting it.

**Step 2: Restore the protected application baseline**

Immediately revert the checkpoint commit as a whole. This preserves every prototype byte in Git history while returning shared application/dependency/configuration files to the last verified baseline.

```bash
LANDING_CHECKPOINT_SHA="$(git rev-parse HEAD)"
git revert --no-edit "$LANDING_CHECKPOINT_SHA"
npx vitest run src/hooks/useHashRoute.test.ts
npm run build
```

Expected: route tests and build pass; `docs/operations/production-baseline.md` contains the full checkpoint SHA and the full revert SHA. Task 11 verifies and salvages from the persisted checkpoint SHA, never from a transient variable or untracked working tree.

**Step 3: Record exact repository state**

Run:

```bash
git status --short --branch
git rev-parse HEAD
git rev-parse v0.6.0^{}
git diff --stat
```

Document the branch, HEAD, deployed SHA, tagged SHA, dirty-file ownership, current hostnames, Pages project, D1 binding/database IDs, and known failing test. Expected: the document explicitly says the dirty landing files are unverified candidate work.

**Step 4: Record reversible checkpoints**

In `docs/operations/rollback-matrix.md`, add rows for source, Pages deployment, Access/DNS policy, D1 schema/data, secrets, and GitHub rules. Each row must name the capture command, rollback command, evidence location, and authority required.

**Step 5: Correct the project status vocabulary**

Update `_PROJECT-STATUS.md` to use `implemented`, `verified`, `deployed`, and `operationally_ready`. Mark production launch `NO-GO` until Task 19.

**Step 6: Verify no product code changed after the checkpoint/revert pair**

Run:

```bash
git diff --name-only -- docs/operations _PROJECT-STATUS.md
```

Expected: only the three documentation surfaces appear.

**Step 7: Commit**

```bash
git add docs/operations/production-baseline.md docs/operations/rollback-matrix.md _PROJECT-STATUS.md
git commit -m "docs: establish production recovery baseline"
```

## Task 2: Make the Release Command Fail Closed

**Files:**
- Modify: `scripts/release.mjs`
- Modify: `src/lib/__tests__/release.test.ts`
- Modify: `src/types/release-mjs.d.ts`
- Modify: `docs/release-workflow.md`
- Create: `scripts/verify/release-preflight.mjs`
- Create: `scripts/verify/release-attestation.mjs`
- Create: `scripts/verify/release-attestation.test.mjs`
- Create: `.github/workflows/release.yml`

**Step 1: Write failing guard tests**

Add tests for untracked files, non-`main` branch, detached local HEAD, local HEAD behind/ahead of `origin/main`, missing CI success, existing local/remote tag, missing backup receipt, exact requested Actions SHA, allowed detached Actions checkout, wrong/ref-missing Actions SHA, explicit already-committed `--version`, accidental double bump, draft publication cleanup, and deploy/sign/upload failure before public tag/release creation.

Run:

```bash
npx vitest run src/lib/__tests__/release.test.ts
```

Expected: FAIL because guard helpers and immutable ordering do not exist.

**Step 2: Extract pure preflight helpers**

Implement and export parsers/validators for porcelain status, branch/ref state, remote synchronization, required-check response, backup receipt, and release phase ordering. Treat `??` as dirty.

**Step 3: Separate preparation from publication**

Make the local command support separate `--prepare <patch|minor|major>` and `--version <X.Y.Z>` modes. Publication accepts only the exact version already committed in `package.json`; it never increments again. Create `release.yml` with explicit `sha`/`version` inputs, production concurrency, minimal permissions, and a GitHub `production` Environment. It performs: resolve requested SHA on `main` → exact-SHA checkout → Actions-mode preflight → canonical verify when available → clean build → backup receipt check → deploy the same SHA → smoke → generate/checksum/attest assets → stage a draft release targeting that SHA with all assets → verify draft/tag/assets → publish. Remove `--commit-dirty=true`. Use argument-array subprocesses instead of interpolated shell strings. On any draft/tag/upload/signing failure, delete the draft and cleanup its tag; test the compensating cleanup and surface cleanup failure as a critical operator incident.

**Step 4: Add a read-only preflight command**

`scripts/verify/release-preflight.mjs` must print machine-readable results without changing files, tags, releases, deployments, or D1. It has explicit `local` and `actions` modes; Actions mode requires the requested SHA, verified `main` ancestry/equality, and matching `GITHUB_SHA` rather than an attached branch.

**Step 5: Verify**

```bash
npx vitest run src/lib/__tests__/release.test.ts
node --test scripts/verify/release-attestation.test.mjs
node scripts/release.mjs --version "$(node -p \"require('./package.json').version\")" --dry-run
node scripts/verify/release-preflight.mjs
```

Expected: tests pass; dry-run/preflight either pass or list the current dirty/branch gates without side effects.

**Step 6: Commit**

```bash
git add scripts/release.mjs scripts/verify/release-preflight.mjs scripts/verify/release-attestation.mjs scripts/verify/release-attestation.test.mjs src/lib/__tests__/release.test.ts src/types/release-mjs.d.ts docs/release-workflow.md .github/workflows/release.yml
git commit -m "fix: make production releases fail closed"
```

## Task 3: Create One Canonical CI Gate

**Files:**
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`
- Create: `scripts/verify/migration-chain.test.mjs`
- Create: `scripts/verify/d1-schema.mjs`
- Create: `scripts/verify/d1-schema.test.mjs`
- Create: `scripts/fixtures/d1-v8-populated.sql`
- Create: `scripts/verify/bundle-budget.mjs`

**Step 1: Add failing policy tests**

Make migration verification assert contiguous, unique migration numbers and non-empty SQL. Seed a populated schema-at-0008 fixture with users, subjects, readings, chats, relationships, grants, generations, interpretations, and audit rows; apply all later migrations in an isolated Wrangler/SQLite persistence directory; then assert row preservation, foreign keys, expected indexes, `PRAGMA foreign_key_check`, and idempotent second application. Make bundle verification fail when the configured application entry or landing entry exceeds its gzip budget.

Run:

```bash
node --test scripts/verify/migration-chain.test.mjs scripts/verify/d1-schema.test.mjs
npm run build && node scripts/verify/bundle-budget.mjs
```

Expected: FAIL until scripts/configuration exist. Establish a temporary measured no-regression application budget above the current 650 KB entry and label it with a Task 17 ratchet deadline; the final launch budget must be lower.

**Step 2: Remove current critical/high audit findings**

Upgrade the vulnerable Vitest/Vite testing toolchain as a compatible set, beginning with Vitest 4.x, and make any required test configuration changes. Do not defer a critical/high advisory while also making the security job required.

Run:

```bash
npm audit --audit-level=high
npm test
```

Expected: zero critical/high findings and all tests pass.

**Step 3: Add `verify:ci`**

Compose a single script that runs unit/Function tests, Node contract tests, Function typecheck, build, migration chain, delink, CF contracts, daily contracts, UI home/contracts/evidence, dependency audit, and bundle budgets. Remote probes must not be part of pull-request CI.

**Step 4: Make GitHub use only the canonical command**

Split work into stable jobs (`Unit & contracts`, `Typecheck & build`, `D1 migration smoke`, `Security audit`) and add a final no-op aggregator named `Production gate`. Branch protection requires only the stable aggregator. Use `npm ci`, read-only permissions, timeouts, concurrency, and failure artifacts; do not use production secrets.

**Step 5: Verify**

```bash
npm run verify:ci
```

Expected: PASS on a clean integrated tree.

**Step 6: Commit**

```bash
git add package.json package-lock.json .github/workflows/ci.yml scripts/verify/migration-chain.test.mjs scripts/verify/d1-schema.mjs scripts/verify/d1-schema.test.mjs scripts/fixtures/d1-v8-populated.sql scripts/verify/bundle-budget.mjs
git commit -m "ci: enforce the production verification gate"
```

## Task 4: Reconcile Planning, Issues, and Evidence

**Files:**
- Modify: `ISA.md`
- Modify: `_PROJECT-STATUS.md`
- Create: `docs/operations/production-readiness-register.md`
- Modify: relevant `docs/auth/*.md` and `docs/plans/*.md` only where their status is false or stale

**Step 1: Generate a criterion inventory**

Count checked, unchecked, and deferred ISA criteria. Record evidence links and the exact verification command for each launch-critical criterion.

**Step 2: Make false-complete states fail**

Add a small verifier under `scripts/verify/` that fails when the status document says production-ready while launch-critical ISA items remain unchecked/deferred.

**Step 3: Reconcile GitHub issues read-only first**

Run:

```bash
gh issue list --state all --limit 200 --json number,title,state,labels,updatedAt,url
```

Classify each issue as proven complete, superseded, duplicate, or open. Do not close issues without a direct evidence link.

**Step 4: Verify and commit**

```bash
npm run verify:planning
git add ISA.md _PROJECT-STATUS.md docs/operations/production-readiness-register.md scripts/verify/planning-status.mjs package.json
git commit -m "docs: make production planning evidence truthful"
```

## Task 5: Define the Authoritative Location Contract

**Files:**
- Modify: `src/types/index.ts`
- Modify: `functions/lib/chat/types.ts`
- Create: `functions/lib/location-resolution.ts`
- Create: `functions/__tests__/location.test.ts`
- Modify: `functions/lib/env.ts`
- Modify: `docs/daily/location-contract.md`

**Step 1: Write failing contract tests**

Cover Chennai (`Asia/Kolkata`), Kathmandu (`Asia/Kathmandu`), Adelaide (`Australia/Adelaide`), New York across DST dates, a timezone-border pair, invalid latitude/longitude, invalid IANA identifiers, `(0,0)` manual placeholders, and provider provenance.

Run:

```bash
npx vitest run functions/__tests__/location.test.ts
```

Expected: FAIL because there is no server-owned contract.

**Step 2: Add explicit resolution metadata**

Define `resolution: 'resolved' | 'needs_review' | 'unresolved'`, `provider`, and optional provider identifier/precision. `calculationReadyLocation()` must reject unresolved/manual placeholders and validate IANA timezones with `Intl.DateTimeFormat`. Define a short-lived HMAC-signed candidate token and `LOCATION_TOKEN_SECRET`; secrets never enter Wrangler source or client bundles.

**Step 3: Keep contract types synchronized**

Use one structural schema or shared helper imported by client and Functions; do not maintain divergent validators. Update both state-machine copies together while they remain duplicated.

**Step 4: Verify and commit**

```bash
npx vitest run functions/__tests__/location.test.ts functions/__tests__/subjects.test.ts src/lib/subjectsApi.test.ts
git add src/types/index.ts functions/lib/chat/types.ts functions/lib/location-resolution.ts functions/lib/env.ts functions/__tests__/location.test.ts docs/daily/location-contract.md
git commit -m "feat: define calculation-ready location contracts"
```

## Task 6: Resolve and Sign Real IANA Location Candidates

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/lib/geocode.ts`
- Modify: `src/lib/daily/location.ts`
- Create: `src/lib/geocode.test.ts`
- Modify: `functions/lib/location-resolution.ts`
- Modify: `functions/api/[[path]].ts`
- Create: `functions/__tests__/location-http.test.ts`

**Step 1: Write failing lookup tests**

Assert Bengaluru, Kathmandu, Adelaide, New York, fractional offsets, DST regions, border cases, coordinate bounds, token tampering/expiry, provider failure, query length, and failure when no timezone resolves.

**Step 2: Add a maintained Worker-side coordinate-to-IANA lookup**

Pin an actively maintained Worker-compatible package such as `tz-lookup` after checking its license, bundle cost, and data update cadence. Wrap it behind `timezoneAt(latitude, longitude)` so the vendor can be replaced. The lookup data must not inflate the public landing bundle.

**Step 3: Add the authenticated search endpoint**

Add bounded `GET /api/locations/search?q=…` behind a provider adapter. Public Nominatim is development/test-only because it has attribution, privacy, capacity, and no-SLA constraints. Production startup/preflight fails unless an approved provider base URL, credentials where required, privacy disclosure, attribution string, timeout, quota/rate policy, and outage owner are configured. Return signed candidates. Change `src/lib/geocode.ts` to call this same-origin route.

**Step 4: Remove longitude approximation from calculation paths**

Delete or quarantine `tzFromLongitude`; only verified server candidates may persist. Manual text alone returns unresolved and never fabricates `(0,0)`.

**Step 5: Verify bundle and correctness**

```bash
npx vitest run functions/__tests__/location.test.ts functions/__tests__/location-http.test.ts src/lib/geocode.test.ts src/lib/daily
npm run build
node scripts/verify/bundle-budget.mjs
```

Expected: all fixtures pass and lookup data does not push either artifact beyond budget.

**Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/geocode.ts src/lib/geocode.test.ts src/lib/daily/location.ts functions/lib/location-resolution.ts 'functions/api/[[path]].ts' functions/__tests__/location-http.test.ts
git commit -m "fix: resolve locations to real IANA timezones"
```

## Task 7: Reject Unresolved Subjects Before Calculation

**Files:**
- Modify: `functions/lib/subjects.ts`
- Modify: `functions/__tests__/subjects.test.ts`
- Modify: `functions/api/[[path]].ts`
- Modify: `functions/__tests__/chat.test.ts`
- Modify: `functions/__tests__/selemene-route.test.ts`
- Modify: `functions/lib/chat/turn.ts`
- Modify: `src/lib/chat/stateMachine.ts`
- Modify: `functions/lib/chat/stateMachine.ts`
- Modify: `src/pages/ThresholdPage.tsx`
- Modify: `src/pages/ThresholdPage.test.ts`
- Modify: `src/components/chrome/PatternSection.tsx`
- Modify: `src/components/chrome/patternDraft.ts`
- Modify: `src/components/chrome/patternDraft.test.ts`

**Step 1: Write failing API tests**

POST/PATCH subjects without a valid signed location token must return a stable `location_resolution_required` error. Forged normalized objects fail. Engine requests using unresolved subjects must be denied before proxying.

**Step 2: Remove `manualLocation()`**

Return a repairable validation error carrying no fabricated coordinates. Centralize range/IANA/token validation in `functions/lib/location-resolution.ts`. Verify chat location turns before the pure state machine accepts them.

**Step 3: Add a repair UI state**

Threshold retains the query, presents geocoding candidates, permits retry/edit, and cannot continue until one candidate is explicitly selected. Network/provider failure is distinct from “no results”. Settings place edits likewise require a newly selected signed candidate. Remove “Hold as written.”

**Step 4: Verify and commit**

```bash
npx vitest run functions/__tests__/subjects.test.ts functions/__tests__/chat.test.ts functions/__tests__/selemene-route.test.ts src/pages/ThresholdPage.test.ts
git add functions/lib/subjects.ts functions/__tests__/subjects.test.ts 'functions/api/[[path]].ts' functions/__tests__/chat.test.ts functions/__tests__/selemene-route.test.ts functions/lib/chat/turn.ts src/lib/chat/stateMachine.ts functions/lib/chat/stateMachine.ts src/pages/ThresholdPage.tsx src/pages/ThresholdPage.test.ts src/components/chrome/PatternSection.tsx src/components/chrome/patternDraft.ts src/components/chrome/patternDraft.test.ts
git commit -m "fix: block calculations with unresolved locations"
```

## Task 8: Inventory and Remediate Existing Profiles

**Files:**
- Create: `migrations/0009_subject_location_quality.sql`
- Create: `migrations/0010_subject_location_remediations.sql`
- Create: `scripts/data/audit-subject-locations.mjs`
- Create: `scripts/data/mark-subjects-for-review.mjs`
- Create: `scripts/data/audit-subject-locations.test.mjs`
- Modify: `functions/lib/subjects.ts`
- Modify: `docs/operations/rollback-matrix.md`

**Step 1: Write failing classifier tests**

Classify exact known-good rows, manual `(0,0)` placeholders, invalid IANA zones, approximate `Etc/GMT` zones, malformed JSON, out-of-range coordinates, and unknown providers. Output contains opaque row IDs only—no names, birth data, or full location queries.

**Step 2: Add additive metadata**

Migration `0009` adds `location_status`, `location_checked_at`, and `location_issue` with safe defaults and indexes. Migration `0010` adds an append-only remediation audit containing before/after hashes and actor/time metadata, not cleartext birth/location data. Do not destructively rewrite `normalized_location`.

**Step 3: Implement dry-run-first scripts**

The audit is read-only. The marker requires `--apply`, an exact database target, a backup receipt, and a generated manifest. Re-running is idempotent.

**Step 4: Prove locally**

```bash
node --test scripts/data/audit-subject-locations.test.mjs
npm run migrate:local
node scripts/data/audit-subject-locations.mjs --local
node scripts/data/mark-subjects-for-review.mjs --local --dry-run
```

**Step 5: Commit**

```bash
git add migrations/0009_subject_location_quality.sql migrations/0010_subject_location_remediations.sql scripts/data functions/lib/subjects.ts docs/operations/rollback-matrix.md
git commit -m "feat: quarantine ambiguous subject locations"
```

## Task 9: Make Relationship Generation Reachable

**Files:**
- Modify: `src/components/settings/ConsentConstellation.tsx`
- Modify: `src/lib/relationshipsApi.ts`
- Modify: `src/lib/relationshipsApi.test.ts`
- Modify: `src/pages/RelationshipReadingPage.tsx`
- Modify: `src/pages/RelationshipReadingPage.test.ts`
- Modify: `src/hooks/useHashRoute.ts`
- Modify: `src/hooks/useHashRoute.test.ts`

**Step 1: Write failing UI state tests**

Test active-grant generate action, pending/expired/revoked disabled states, in-flight de-duplication, successful navigation with relationship/reading identifiers, engine error retry, and id preservation.

**Step 2: Add a route that preserves identity**

Use a relationship-specific path such as `#/relationships/:relationshipId/readings/:readingId`; never navigate to a generic compatibility node that drops the consent context.

**Step 3: Wire the existing generation API**

Call `generateRelationshipReading()` only from an active server-reported grant. Show progress and stable error messages. On success, navigate using the response payload.

**Step 4: Verify and commit**

```bash
npx vitest run src/lib/relationshipsApi.test.ts src/pages/RelationshipReadingPage.test.ts src/hooks/useHashRoute.test.ts
git add src/components/settings/ConsentConstellation.tsx src/lib/relationshipsApi.ts src/lib/relationshipsApi.test.ts src/pages/RelationshipReadingPage.tsx src/pages/RelationshipReadingPage.test.ts src/hooks/useHashRoute.ts src/hooks/useHashRoute.test.ts
git commit -m "feat: expose consented relationship generation"
```

## Task 10: Prove Consent End to End

**Files:**
- Modify: `functions/__tests__/relationship-http.test.ts`
- Modify: `functions/__tests__/relationships.test.ts`
- Create: `scripts/verify/relationship-consent-e2e.mjs`
- Create: `docs/privacy/relationship-retention.md`

**Step 1: Expand backend denial tests**

Cover inviter/invitee ownership, wrong user, duplicate acceptance, expired invitation, revoked grant, concurrent revoke/generate, access to historical readings after revoke, and response redaction.

**Step 2: State the retention decision**

Document whether revocation removes future shared access only or also existing shared readings. Encode that decision in both tests and UI copy.

**Step 3: Build a deterministic two-identity browser proof**

The script owns its harness: create a temporary D1 persistence directory, apply migrations, seed two deterministic development identities through a non-production-only fixture path, start `wrangler pages dev` on an allocated port, wait for health, run invite → accept → generate → browse → revoke → generation denied → access-policy assertions, capture redacted screenshots/requests, then terminate the server and delete the temporary store in a `finally`/signal trap. Preview mode requires explicit fixture credentials and performs idempotent cleanup by run ID.

**Step 4: Verify and commit**

```bash
npx vitest run functions/__tests__/relationships.test.ts functions/__tests__/relationship-http.test.ts
node scripts/verify/relationship-consent-e2e.mjs --local
git add functions/__tests__/relationships.test.ts functions/__tests__/relationship-http.test.ts scripts/verify/relationship-consent-e2e.mjs docs/privacy/relationship-retention.md
git commit -m "test: prove relationship consent lifecycle"
```

## Task 11: Extract the Public Landing Artifact

**Files:**
- Create: `landing/index.html`
- Create: `src/landing/main.tsx`
- Salvage from the Task 1 checkpoint SHA: `src/pages/LandingPage.tsx` → `src/landing/LandingPage.tsx`
- Create: `src/config/landing.ts`
- Create: `src/config/landing.test.ts`
- Create: `vite.landing.config.ts`
- Create: `wrangler.landing.toml`
- Create: `scripts/deploy/landing.mjs`
- Create: `scripts/deploy/landing.test.mjs`
- Create: `scripts/verify/landing-boundary.test.mjs`
- Modify: `vite.config.ts`
- Modify: `package.json`
- Modify: `src/App.tsx`
- Modify: `src/hooks/useHashRoute.ts`
- Modify: `wrangler.toml`

**Step 1: Write failing artifact-boundary tests**

Read the full prototype checkpoint SHA from `docs/operations/production-baseline.md`, verify `git cat-file -e "$SHA^{commit}"`, verify its expected prototype path manifest, and extract only the explicitly salvaged source/reference files. Add a verifier asserting the landing bundle contains no `/api/me`, authenticated app bootstrap, D1 identifiers, Access AUD, or engine secrets; the application root remains the home/threshold route contract. Add deploy-command tests proving the public upload runs from a temporary directory containing only `dist/landing` plus a landing-only Wrangler config—never repository-root `functions/`, D1 bindings, or protected config.

**Step 2: Remove the conditional hook-order violation**

Restore unconditional hooks in `App.tsx`. The public landing is a separate entry, not an early return in the protected app component.

**Step 3: Add an allowlisted protected CTA**

Parse `VITE_PROTECTED_APP_ORIGIN` at build time, require `https:` outside development, reject credentials/query/hash and unexpected hosts, and render a declarative absolute `<a>` for full-document navigation.

**Step 4: Build both artifacts**

Add `build:app`, `build:landing`, and `build` scripts with distinct output directories such as `dist/app` and `dist/landing`, and distinct public directories (`public/` for the app, `landing/public/` for landing). `wrangler.toml` remains protected-app-only; `wrangler.landing.toml` names a different Pages project with no Functions. `scripts/deploy/landing.mjs` validates project/account/target, copies only the landing artifact and landing config into a fresh temporary working directory, and invokes Direct Upload there. Never publish one artifact over the other project.

**Step 5: Verify and commit**

```bash
npm run build
node --test scripts/verify/landing-boundary.test.mjs
node --test scripts/deploy/landing.test.mjs
npx vitest run src/hooks/useHashRoute.test.ts
git add landing/index.html src/landing src/config/landing.ts src/config/landing.test.ts vite.landing.config.ts wrangler.landing.toml vite.config.ts package.json package-lock.json src/App.tsx src/hooks/useHashRoute.ts src/hooks/useHashRoute.test.ts wrangler.toml scripts/deploy/landing.mjs scripts/deploy/landing.test.mjs scripts/verify/landing-boundary.test.mjs
git commit -m "feat: separate public landing from protected app"
```

## Task 12: Harden Landing Accessibility and Performance

**Files:**
- Modify: `src/landing/LandingPage.tsx`
- Create: `src/landing/LandingPage.test.tsx`
- Modify/create: `src/landing/landing.css`
- Add controlled media under: `landing/public/media/`
- Create: `scripts/verify/landing-e2e.mjs`

**Step 1: Write failing behavior tests**

Cover semantic landmarks, one `h1`, keyboard CTA, visible focus, reduced-motion static state, autoplay rejection, missing video poster/fallback, cleanup of RAF/observers/Lenis, and no dynamic style injection.

**Step 2: Convert the reference port into React-owned behavior**

Move styles to a static stylesheet. Split animation utilities into pure tested helpers. Respect `prefers-reduced-motion` by disabling smooth scrolling, video scrubbing, blur, and nonessential transforms.

**Step 3: Control media and fonts**

Use locally owned/licensed assets or allowlisted CDN assets with posters, preload policy, explicit dimensions, and cache headers. The current candidate videos are roughly 8.4 MB and 8.7 MB; neither may use unconditional `preload="auto"`. Remove reference-brand residue and inaccessible text splitting.

**Step 4: Add browser budgets**

Make the verifier build the landing, start an isolated static server on an allocated port, wait for readiness, and always stop it. Assert no console/page errors, Axe passes, CTA destination is correct, alert/test hooks fire where expected, LCP/transfer budgets are recorded, and mobile/desktop/reduced-motion screenshots exist.

**Step 5: Verify and commit**

```bash
npx vitest run src/landing/LandingPage.test.tsx
npm run build:landing
node scripts/verify/landing-e2e.mjs --local
git add src/landing landing/public/media scripts/verify/landing-e2e.mjs
git commit -m "fix: harden public landing experience"
```

## Task 13: Bound the API and Engine Proxy

**Files:**
- Modify: `functions/lib/engine-proxy.ts`
- Modify: `functions/lib/engine-proxy.test.ts`
- Modify: `functions/api/[[path]].ts`
- Create: `functions/lib/http-policy.ts`
- Create: `functions/__tests__/http-policy.test.ts`
- Create: `functions/lib/csrf.ts`
- Create: `functions/__tests__/csrf.test.ts`
- Create: `functions/lib/authorization.ts`
- Create: `functions/__tests__/authorization.test.ts`
- Modify: `functions/lib/cf-access.ts`
- Modify: `functions/lib/env.ts`
- Modify: `src/lib/api/contract.ts`

**Step 1: Write failing perimeter tests**

Test allowlisted upstream paths and methods, rejected suffix traversal/encoding, content types, per-route body limits, Folio item/count limits, chat/interpretation text limits, timeout/abort behavior, stable errors, rate-limit responses, rejected cross-site mutation origins, missing/expired/tampered CSRF tokens, valid same-origin mutation intent, and explicit synthetic-smoke-principal denial for every state-changing method and CSRF-token issuance.

**Step 2: Implement explicit policies**

Replace arbitrary suffix forwarding with a route table. Read request bodies through bounded helpers before JSON parsing. Add user/IP keyed conservative rate limits using a Cloudflare-native primitive selected for production and a deterministic in-memory seam for tests.

**Step 3: Enforce request intent for mutations**

Add authenticated `GET /api/session/csrf` returning a short-lived user/session-bound HMAC token. Require `Origin` to equal the allowlisted protected origin, reject cross-site `Sec-Fetch-Site`, and require `X-CSRF-Token` for every state-changing method. Update the shared client request contract to fetch/cache/refresh the token once and retry only the token-expired error—not consent or business conflicts.

Classify the configured Access service-token subject as `synthetic_smoke` during verified-claims mapping. Before route dispatch, allow that class only `GET`/`HEAD` on `/api/me`, non-sensitive `/api/health/*`, and the secret-gated fixed alert-probe route. Explicitly deny CSRF issuance, all other reads, and every `POST`/`PUT`/`PATCH`/`DELETE` regardless of supplied origin/token. Tests enumerate all mutating routes and prove the denial precedes body parsing/database access.

**Step 4: Preserve safe errors**

Upstream bodies, keys, stack traces, and personal input must never appear in client errors or logs. Return a request ID and stable code.

**Step 5: Verify and commit**

```bash
npx vitest run functions/lib/engine-proxy.test.ts functions/__tests__/http-policy.test.ts functions/__tests__/csrf.test.ts functions/__tests__/authorization.test.ts functions/__tests__/folio-routes.test.ts functions/__tests__/chat.test.ts
npm run typecheck:functions
git add functions/lib/engine-proxy.ts functions/lib/engine-proxy.test.ts 'functions/api/[[path]].ts' functions/lib/http-policy.ts functions/__tests__/http-policy.test.ts functions/lib/csrf.ts functions/__tests__/csrf.test.ts functions/lib/authorization.ts functions/__tests__/authorization.test.ts functions/lib/cf-access.ts functions/lib/env.ts src/lib/api/contract.ts
git commit -m "fix: bound worker inputs and engine routes"
```

## Task 14: Complete Privacy Export and Deletion

**Files:**
- Create: `migrations/0011_privacy_account_lifecycle.sql`
- Create: `functions/lib/privacy.ts`
- Create: `functions/__tests__/privacy.test.ts`
- Modify: `functions/api/[[path]].ts`
- Modify: `src/pages/SettingsPage.tsx`
- Create: `src/lib/privacyApi.ts`
- Create: `docs/privacy/data-inventory.md`
- Create: `docs/privacy/deletion-runbook.md`

**Step 1: Write failing ownership/coverage tests**

Export must include every owner-scoped table and exclude secrets/internal identifiers where required. Delete must remove or anonymize users, subjects, readings, chats/events, relationship invitations/grants/generations, interpretations, and relationship audit actor references according to retention policy. Migration `0011` changes blocking audit references from `ON DELETE RESTRICT` to a deletion-safe nullable/anonymized design. Cross-user requests return no existence signal.

**Step 2: Implement streaming/bounded export**

Return versioned JSON with a manifest and counts. Avoid loading unbounded data. Add an authenticated Settings action.

**Step 3: Implement confirmed deletion**

Use a short-lived server challenge and explicit confirmation; make retries idempotent. Record an audit event without retaining deleted personal content.

**Step 4: Verify and commit**

```bash
npx vitest run functions/__tests__/privacy.test.ts
npm run typecheck:functions
git add migrations/0011_privacy_account_lifecycle.sql functions/lib/privacy.ts functions/__tests__/privacy.test.ts 'functions/api/[[path]].ts' src/pages/SettingsPage.tsx src/lib/privacyApi.ts docs/privacy
git commit -m "feat: add owner export and deletion workflows"
```

## Task 15: Add Request IDs, Headers, Logs, and Failure Containment

**Files:**
- Create: `functions/lib/response.ts`
- Create: `functions/__tests__/response.test.ts`
- Modify: `functions/api/[[path]].ts`
- Create: `public/_headers`
- Create: `src/components/AppErrorBoundary.tsx`
- Create: `src/components/AppErrorBoundary.test.tsx`
- Modify: `src/main.tsx`
- Create: `ops/alerts.example.json`
- Create: `scripts/ops/alerts.mjs`
- Create: `scripts/ops/alerts.test.mjs`
- Create: `scripts/ops/alert-probe.mjs`
- Create: `scripts/ops/alert-probe.test.mjs`
- Create: `docs/operations/observability.md`

**Step 1: Write failing response tests**

Every success/error response carries `X-Request-ID`; errors use `{ error: { code, message, requestId } }`; CORS is closed; CSP and baseline security headers are present; logs contain route/status/duration/requestId but not request bodies, JWTs, birth inputs, or engine keys.

**Step 2: Centralize responses and sanitization**

Generate or validate request IDs, create JSON helpers, and wrap route exceptions. Add explicit cache policies for personal responses.

**Step 3: Contain frontend crashes**

Add an error boundary with a non-sensitive recovery state and request/support correlation guidance. Test reset/retry behavior.

**Step 4: Make alerts configurable and testable**

Define alert policy as reviewed configuration for server-error rate, latency, auth failures, engine failures, and D1 failures. `alerts.mjs` validates Cloudflare account/zone/destination IDs, defaults to dry-run, and requires `--apply --confirm <destination-id>`. Add a production-only safe alert-probe route that requires the read-only Access smoke principal plus `ALERT_PROBE_TOKEN`, emits only a random correlation ID and fixed synthetic event, and cannot read/write user data. `alert-probe.mjs` triggers it and polls the configured test sink for matching delivery with a bounded timeout. Tests mock configuration, wrong targets, unauthorized access, redaction, timeout, and acknowledgement.

**Step 5: Verify and commit**

```bash
npx vitest run functions/__tests__/response.test.ts src/components/AppErrorBoundary.test.tsx
node --test scripts/ops/alerts.test.mjs scripts/ops/alert-probe.test.mjs
npm run verify:cf-contracts
git add functions/lib/response.ts functions/__tests__/response.test.ts 'functions/api/[[path]].ts' public/_headers src/components/AppErrorBoundary.tsx src/components/AppErrorBoundary.test.tsx src/main.tsx ops/alerts.example.json scripts/ops/alerts.mjs scripts/ops/alerts.test.mjs scripts/ops/alert-probe.mjs scripts/ops/alert-probe.test.mjs docs/operations/observability.md
git commit -m "feat: add production failure containment"
```

## Task 16: Prove D1 Preview Isolation, Backup, and Restore

**Files:**
- Modify: `wrangler.toml`
- Create: `scripts/d1/backup.mjs`
- Create: `scripts/d1/restore-drill.mjs`
- Create: `scripts/d1/verify-isolation.mjs`
- Create: `scripts/d1/d1-tools.test.mjs`
- Create: `docs/operations/d1-recovery.md`

**Step 1: Write failing command-construction tests**

Tests must prove explicit local/preview/production targets, reject missing database IDs, reject production restore without typed confirmation, redact sensitive output, and write checksummed receipts.

**Step 2: Configure distinct preview D1**

Bind previews to `urania-137-db-preview` (`6b90d773-0233-4dcf-b548-2feb61365c77`) and non-production secrets. Add a verifier that fails if preview and production IDs match. The preview database currently has zero tables, so all migrations must be applied and verified before any preview application test.

**Step 3: Implement backup and restore drill**

Backup exports schema/data with timestamp, database ID, SHA-256, row counts, git SHA, and Wrangler version. Restore drill imports into disposable/local or preview D1, applies migrations, and compares counts/invariants.

**Step 4: Verify locally**

```bash
node --test scripts/d1/d1-tools.test.mjs
node scripts/d1/verify-isolation.mjs
node scripts/d1/backup.mjs --local
node scripts/d1/restore-drill.mjs --local --receipt <generated-receipt>
```

**Step 5: Commit**

```bash
git add wrangler.toml scripts/d1 docs/operations/d1-recovery.md
git commit -m "ops: prove D1 backup and preview isolation"
```

## Task 17: Close Dependency and Performance Gates

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vite.config.ts`
- Modify: relevant lazy-loading call sites under `src/`
- Modify: `scripts/verify/bundle-budget.mjs`

**Step 1: Capture current advisories and bundle composition**

```bash
npm audit --json > /tmp/urania-audit-before.json
npm run build
```

Record runtime versus dev-only advisories and entry chunk composition. Do not commit the raw audit file.

**Step 2: Upgrade supported toolchain versions**

Update Vite/Vitest/plugin dependencies together, respecting peer ranges. Replace or remove vulnerable dependencies; document any temporary exception with owner and expiry.

**Step 3: Split heavy routes**

Lazy-load graph, reading, and visualization surfaces. Keep the protected shell and landing entry within their separate gzip budgets. Add loading/error behavior tests where chunks are introduced.

**Step 4: Verify clean audits and budgets**

```bash
npm audit --omit=dev
npm audit
npm run verify:ci
```

Expected: zero production advisories; no critical/high development advisory without a time-bounded accepted risk; both bundle budgets pass.

**Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.ts src scripts/verify/bundle-budget.mjs
git commit -m "chore: close dependency and bundle risks"
```

## Task 18: Execute External-State Readiness Gates

**Files:**
- Modify: `docs/operations/production-readiness-register.md`
- Create: `ops/production-targets.example.json`
- Create: `scripts/ops/validate-targets.mjs`
- Create: `scripts/ops/cutover.mjs`
- Create: `scripts/ops/cutover.test.mjs`
- Create: `docs/operations/evidence/2026-08-01/` (pre-release redacted evidence only)

**Step 1: Obtain required decisions**

Record the Cloudflare account/zone IDs, public landing hostname, protected app hostname, public/protected Pages project names, Access application/policy IDs, production/preview/recovery D1 IDs, backup destination/retention, alert destination, independent GitHub reviewer, relationship revocation retention policy, and data-deletion retention exceptions in an uncommitted environment-specific targets file shaped by `ops/production-targets.example.json`. Provision a least-privilege synthetic Access smoke principal as GitHub Environment secrets `CF_ACCESS_SMOKE_CLIENT_ID`/`CF_ACCESS_SMOKE_CLIENT_SECRET`, and configure its verified Access subject as `CF_ACCESS_SMOKE_SUBJECT`. Prove live that it receives `/api/me`, is denied `/api/session/csrf`, and receives `403` for representative and enumerated state-changing routes before body/database work. Keep two-identity mutation proofs confined to isolated local/preview data with run-scoped cleanup.

**Step 2: Build fail-closed mutation controls**

`validate-targets.mjs` resolves every live target read-only and fails on account/zone/project/hostname/database mismatches. `cutover.mjs` defaults to dry-run, emits the before state and exact intended mutation, permits only one named mutation per invocation, and requires both `--apply` and `--confirm <resolved-resource-id>`. Each mutation writes a checksummed receipt containing before/after state and the tested rollback command. Unit tests mock all APIs and prove wrong-target, wildcard, missing-backup, multi-mutation, and rollback-receipt failures.

**Step 3: Capture before-state read-only**

Query Cloudflare Pages/DNS/Access/D1 and GitHub branch rules. Redact tokens, JWTs, email addresses, birth data, database content, and secrets.

**Step 4: Create and restore a production backup**

Run the backup tool against production, capture a Time Travel bookmark, then restore that receipt into a disposable recovery database/local persistence and verify invariants. Stop if restore proof fails; do not overwrite the shared preview database as a routine drill.

**Step 5: Prove migrations in preview only**

Apply migrations to preview and run the full preview suite. Run the location audit against production read-only and review counts/manifest. Do not apply production schema or data markers in Task 18; the release workflow performs those mutations against the final SHA with a fresh backup and rollback armed.

**Step 6: Prove host boundaries in preview and dry-run production cutover**

Deploy the landing and application SHA to their preview targets. Verify Access challenges protected preview HTML, public landing preview does not challenge, CTA crosses hosts, and every API route rejects unauthenticated calls. Validate and dry-run the production Pages/DNS/Access mutations, but leave production deployment/cutover to `release.yml`.

**Step 7: Configure GitHub governance**

Require `Production gate`, require conversation resolution, block force pushes/deletion, and require one approval after the named independent reviewer confirms availability. Capture the resulting rule JSON.

**Step 8: Configure and prove alert delivery in preview**

Apply the reviewed alert configuration one rule at a time using target confirmation. Trigger a preview synthetic correlation event and require acknowledgement from the configured test sink. Capture configuration/receipt hashes, not secret destinations.

**Step 9: Verify**

```bash
npm run verify:ci
node scripts/verify/auth-gates.mjs --base-url "$PROTECTED_APP_URL"
node scripts/verify/landing-e2e.mjs --base-url "$PUBLIC_LANDING_URL"
node scripts/verify/relationship-consent-e2e.mjs --base-url "$PREVIEW_APP_URL"
node scripts/ops/validate-targets.mjs --targets "$PRODUCTION_TARGETS_FILE"
node scripts/ops/alert-probe.mjs --base-url "$PREVIEW_APP_URL" --expect-delivery
```

Expected: every gate passes and evidence names the exact commit SHA.

**Step 10: Commit pre-release evidence index**

```bash
git add ops/production-targets.example.json scripts/ops/validate-targets.mjs scripts/ops/cutover.mjs scripts/ops/cutover.test.mjs docs/operations/production-readiness-register.md docs/operations/evidence/2026-08-01
git commit -m "docs: record production readiness evidence"
```

## Task 19: Release One Immutable Commit

**Files:**
- Modify: `ISA.md`
- Modify: `_PROJECT-STATUS.md`
- Modify: `docs/operations/production-readiness-register.md`
- Modify: `package.json`
- Modify: `package-lock.json`
- Generated by release workflow outside Git: `production-attestation.json`, checksums, probe outputs, SBOM/provenance, and release assets

**Step 1: Prepare the final source commit**

On the production-readiness branch, update version metadata without tagging, make ISA/status/register truthfully describe `release_candidate` state, and state that live-only criteria are satisfied solely by a successful production attestation whose subject equals this commit.

```bash
npm version minor --no-git-tag-version
npm run verify:ci
git add package.json package-lock.json ISA.md _PROJECT-STATUS.md docs/operations/production-readiness-register.md
git commit -m "chore: prepare Urania production release candidate"
```

Open/review/merge the pull request. No source-controlled file may change after this commit for the release.

**Step 2: Prove the merged release candidate**

```bash
git status --porcelain=v1
git switch main
git pull --ff-only
npm ci
npm run verify:ci
node scripts/verify/release-preflight.mjs
```

Expected: clean tree, synchronized `main`, required GitHub check green, restorable backup receipt present.

**Step 3: Run immutable release dry-run**

```bash
node scripts/release.mjs --version "$(node -p \"require('./package.json').version\")" --dry-run
```

Review the exact version, already-merged SHA, artifact paths, targets, smoke commands, and rollback deployment. The dry-run must reject any calculated version that differs from `package.json`.

**Step 4: Release**

```bash
gh workflow run release.yml -f sha="$(git rev-parse HEAD)" -f version="$(node -p \"require('./package.json').version\")"
```

Expected: the GitHub Environment-approved workflow builds/deploys the requested clean `main` SHA and completes smoke before attaching the tag/release; deployed SHA equals tag SHA.

**Step 5: Mutate production with rollback armed**

Inside the approved `production` Environment, resolve/validate all targets again, create a fresh Time Travel bookmark plus durable export/receipt, run the tested production migrations, apply only the reviewed location-remediation manifest, deploy both artifacts from the exact SHA, and execute each required Pages/DNS/Access cutover as a separate confirmed mutation. On any failure, stop writes where applicable and run the receipt-recorded rollback before publication.

**Step 6: Create the immutable production attestation**

Inside `release.yml`, use the read-only Access smoke principal to verify authenticated `/api/me`, while anonymous probes verify the Access challenge/API denial. Verify landing/CTA, location-provider health without persistence, security headers, request IDs, D1 schema/invariants, alert delivery, and rollback command. Import the same-SHA local/preview two-identity consent and location-repair proof artifacts rather than mutating production test records. Generate `production-attestation.json` containing the subject SHA, version/tag, deployment IDs, Pages artifact checksums, backup/restore receipt hashes, migration set, preview product-proof hashes, production read-only probe results, governance snapshot hash, timestamp, and workflow run identity.

**Step 7: Publish without changing source**

Checksum/sign the attestation with GitHub artifact attestation/provenance, upload it and redacted probe outputs as workflow artifacts and GitHub release assets, and set the GitHub Deployment/Environment status to success. Any failed live-only criterion prevents the tag/release and marks the deployment failed.

**Step 8: Verify identity**

```bash
RELEASE_SHA="$(git rev-parse HEAD)"
git rev-parse "v$(node -p \"require('./package.json').version\")^{}"
gh release download "v$(node -p \"require('./package.json').version\")" --pattern production-attestation.json --dir /tmp/urania-release-attestation
node scripts/verify/release-attestation.mjs --sha "$RELEASE_SHA" --file /tmp/urania-release-attestation/production-attestation.json
```

Expected: main/tag/deployment/artifact/attestation subject all equal `RELEASE_SHA`; the working tree remains clean and there is no post-release source commit.

## Final Definition of Done

- `npm run verify:ci` passes from a clean clone of the release SHA.
- Public landing and protected application are separate artifacts and host policies.
- No unresolved/manual location can produce a calculation; existing suspect profiles are quarantined.
- Two identities pass invite → accept → generate → browse → revoke → deny.
- Engine proxy paths/methods and all request bodies are bounded.
- Owner export/delete flows and retention decisions are tested and documented.
- Preview and production D1 are distinct; a production snapshot has passed a restore drill.
- Runtime audit is clean and critical/high development risks are closed or explicitly time-bounded.
- `main` requires the canonical CI check and protected-review policy.
- Tag SHA, deployed SHA, release notes subject, and signed attestation subject are identical; evidence is an external immutable artifact, not a later commit.
- Rollback, monitoring, alerts, and post-deploy probes are proven.
- ISA and project status contain no false-complete launch criteria.
