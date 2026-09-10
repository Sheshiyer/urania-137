# Requirements — Urania 137 (milestone-traceable)

Requirements are grouped by milestone (M1→M7 from `goal.md`). `[x]` = shipped with evidence. Open requirements are **plain bullets** (state word + milestone) — the executable queue lives in `.planning/phases/*/`, not here.

## M1 — Production readiness → release (ACTIVE)

- [x] **REQ-M1-01**: Corpus admin browser routes (`/api/corpus`, `/api/corpus/:id`, `/api/patterns/search`) are owner-scoped and fail-closed. *(ISC-132/133/137/139/138)*
- [x] **REQ-M1-02**: 53 readings ingested to R2 + D1 `catalogue_readings` + Vectorize (384-dim). *(H-2)*
- [x] **REQ-M1-03**: Release-path scripts exist and are preflight-asserted (`backup.mjs`, `validate-targets.mjs`, `cutover.mjs`, `alert-probe.mjs`, `mark-subjects-for-review.mjs`, `split-host-gates.mjs`). *(R-1→R-6)*
- [x] **REQ-M1-04**: Readiness workflow emits the five artifacts `release.yml` downloads (incl. `location-remediation-manifest.json`). *(R-6)*
- [x] **REQ-M1-05**: Pages preview D1 is bound and isolated from production (`6b90d773… ≠ d57550ea…`), fail-closed on secrets. *(R-7)*
- **REQ-M1-06** *(blocked, human-gated)*: Fresh Access login yields `platform-admin` + `admin:analytics:read` (FV-188, live evidence). *(ISC-188; R-8)*
- **REQ-M1-07** *(blocked)*: Archive records queryable through a permissioned admin boundary; `selemene-admin` stays the durable `platform-admin` mapping. *(ISC-143/144/145/146; R-9)*
- **REQ-M1-08** *(pending)*: `npm run verify:ci` green on the release-candidate SHA; deterministic version bump; fail-closed preflight. *(R-10/R-11/R-12)*
- **REQ-M1-09** *(pending, approval-gated)*: `release.yml` dispatched with production Environment approval; attestation `subject SHA == deployed SHA`. *(R-13)*
- **REQ-M1-10** *(pending)*: Corpus browser verified live behind Access (owner-scoped 53/53); ISA + `_PROJECT-STATUS` → `operationally_ready`. *(R-14/R-15/R-16)*

## M2 — Public landing (split-host)

- **REQ-M2-01** *(backlog)*: Unauthenticated static landing artifact built separately from the protected app artifact; no `vercel`/prototype remnants. *(Iteration 21/22/23)*
- **REQ-M2-02** *(backlog)*: Landing route/funnel passes split-host gates and is discoverable.

## M3 — Relationship journey UI

- **REQ-M3-01** *(backlog)*: Secure generation API has a production UI caller (consent-complete synastry/dyad/family).
- **REQ-M3-02** *(backlog)*: Two-account invite→accept→generate→browse→revoke→deny lifecycle proven live. *(ISC-189 — deferred)*

## M4 — 723 → canonical archive

- **REQ-M4-01** *(backlog)*: Canonical archive schema lands without breaking the frozen D1 API.
- **REQ-M4-02** *(backlog)*: Read-only catalogue + alias-review tool; one consented pilot import with artifacts (pilot importer exists).
- **REQ-M4-03** *(backlog)*: Versioned evidence + source-run panels; editorial state marks historical/prohibited copy.

## M5 — Vectorize continuous-learning loop

- **REQ-M5-01** *(backlog)*: Wire + test Vectorize language and relationship filters (currently only kind/mode/level/version/systems apply).
- **REQ-M5-02** *(backlog)*: Approval-gated pattern write worker deployed.
- **REQ-M5-03** *(backlog)*: Deletion-propagation proven before the loop is called continuous.

## M6 — AgentScope context orchestration

- **REQ-M6-01** *(backlog)*: Post-result Dyad interpretation with replayable provenance; AgentScope pinned 2.0.5 behind the executor port only.

## M7 — Boundary fast-follows

- **REQ-M7-01** *(backlog)*: `birth_profiles` — per-user saved birth profiles land as their own ISC. *(ISA ISC-31)*
- **REQ-M7-02** *(backlog)*: Calculation correctness — no manual `(0,0,Asia/Kolkata)` / longitude-tz approximation.
- **REQ-M7-03** *(backlog)*: Engine-side `daily-panchanga` mode served distinctly (REQ-1/REQ-3, Selemene repo).
- **REQ-M7-04** *(backlog)*: Mirror/Sankalpa doors deepened (grant-per-person field, published Sankalpa build).

## Traceability

| Requirement | ISA criteria | Milestone |
|---|---|---|
| REQ-M1-01..10 | ISC-132/133/137/138/139, ISC-143/144/145/146, ISC-188 | M1 |
| REQ-M2-01..02 | Iteration 21/22/23 | M2 |
| REQ-M3-01..02 | ISC-189 + relationship family | M3 |
| REQ-M4-01..03 | ISC-143/144 + corpus family | M4 |
| REQ-M5-01..03 | (authored at M5 gate) | M5 |
| REQ-M6-01 | (authored at M6 gate) | M6 |
| REQ-M7-01..04 | ISC-31, REQ-1/REQ-3 | M7 |
