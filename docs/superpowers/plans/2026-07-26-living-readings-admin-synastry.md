# Living Readings, Admin Access, and Synastry — Implementation Plan

Date: 2026-07-26
Owner: `sheshnarayan.iyer@gmail.com`
Repositories:

- Urania: `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/urania-137`
- Selemene: `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/Selemene-engine`
- Historical corpus: `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/723`

## Why this plan supersedes the active `plan.md`

The repository-level `plan.md` is the completed Cloudflare auth and Folio
migration plan. It explicitly excludes the archive schema, corpus ingestion,
admin role configuration, and cross-account consent model requested here.
Executing those mutations against that plan would be unsafe. This continuation
plan preserves the existing Cloudflare and Folio contracts and adds the missing
data, identity, and relationship layers.

## Architectural decisions

1. **Selemene Postgres is the canonical shared reading archive.** It already
   owns generated readings and the protected admin browser. Urania D1 remains
   the owner-scoped conversational Folio and subject store.
2. **Large and binary artifacts belong in object storage.** Postgres stores
   checksums, metadata, and object locators; it does not absorb the 1.21 GB
   source tree as opaque rows.
3. **Owner, subject, source, and producer are separate relations.** Mapping the
   corpus to an admin account does not make that person the subject of every
   reading.
4. **Cloudflare Access groups are the durable admin authority.** The
   `selemene-admin` claim maps to `platform-admin`; a direct local role patch is
   only diagnostic because the next Access login replaces local roles.
5. **Cross-account synastry is invitation- and consent-based.** Admin status
   does not authorize pairing two users' birth profiles. Existing same-owner
   subject dyads continue unchanged.
6. **No full production import precedes a reversible one-reading pilot.** The
   pilot must preserve provenance, round-trip, idempotence, authorization, and
   deletion before the corpus can scale.

## Batch 1 — foundations (execute now)

### Task 1 — Deterministic corpus provenance manifest

Files:

- `scripts/readings/lib/corpus-manifest.mjs`
- `scripts/readings/build-corpus-manifest.mjs`
- `scripts/readings/corpus-manifest.test.mjs`

Steps:

1. Add fixture-first tests for deterministic ordering, stable source IDs,
   SHA-256 content checksums, media classification, subject/relationship
   candidates, manifest discovery, symlink exclusion, and owner/subject
   separation.
2. Implement a library that reads file bytes only for explicit hashing and
   emits a stable, schema-versioned manifest.
3. Implement a stdout-only CLI. It must not write to D1, Postgres, R2,
   Vectorize, KV, or the source corpus.
4. Run the focused Node test and a catalogue-only full-corpus smoke test.

Verification:

```bash
node --test scripts/readings/corpus-manifest.test.mjs
node scripts/readings/build-corpus-manifest.mjs \
  /Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/723 \
  --owner sheshnarayan.iyer@gmail.com \
  --catalogue-only >/tmp/corpus-723-manifest.json
jq '{schemaVersion, owner, totals, manifestId}' /tmp/corpus-723-manifest.json
```

### Task 2 — Canonical archive schema in Selemene

Files:

- `migrations/036_living_readings_archive.sql`
- focused migration/schema test in the existing Selemene migration test surface
- archive model/repository files only if required to prove round-trip

Steps:

1. Add stable tables for import runs, sources, corpus subjects and aliases,
   relationships and members, archived readings, reading-subject links,
   artifacts, evidence, and editorial state.
2. Reference the existing Selemene user as owner without reusing it as subject.
3. Enforce stable-ID, locator, and import-run idempotence constraints while
   permitting distinct source paths that contain identical bytes.
4. Keep object bytes out of Postgres; record object locators and checksums.
5. Add reversible deletion semantics and indexes required by admin browsing.
6. Prove migration apply/rollback and one-record repository round-trip locally.

Verification:

```bash
cargo test -p noesis-data living_readings
```

### Task 3 — Consent-gated cross-account synastry contract

Files:

- `migrations/0006_relationship_consents.sql`
- `functions/lib/relationships.ts`
- `functions/__tests__/relationships.test.ts`
- route wiring only when the domain tests pass

Steps:

1. Add relationship invitations, participants, consent timestamps, expiry,
   revocation, and audit timestamps to Urania D1.
2. Bind each participant to an owned `subjects` row; never accept a subject
   identifier supplied by another owner.
3. Return an opaque invitation token once and store only its hash.
4. Require the authenticated invitee identity and intended email to match
   before acceptance.
5. Expose create, accept, list, decline, and revoke operations through a typed
   domain layer.
6. Permit a synastry request only when both participants are active and neither
   consent has been revoked.
7. Preserve the current same-owner `subjects[]` Composite Dyad and Relationship
   Reading flow.

Verification:

```bash
npx vitest run functions/__tests__/relationships.test.ts
```

## Batch 1 checkpoint

After Tasks 1–3:

- run focused tests;
- run Urania full tests, Functions typecheck, build, and diff check;
- run the Selemene focused archive tests;
- report exact evidence and any external-access blocker;
- say `Ready for feedback.` before continuing.

## Batch 2 — product surfaces

### Task 4 — Selemene admin living-readings browser

- Add provenance/editorial/subject filters to the protected admin API.
- Add a living-readings page or a clearly separated tab in Readings Browser.
- Show why the admin can see a record, its source checksum, subjects,
  relationships, artifacts, evidence treatment, and import run.
- Keep the surface read-only until editorial actions have their own permission.

### Task 5 — Urania reading library and settings

- Add settings sections for self profile, circle subjects, shared
  relationships, consent state, and reading visibility.
- Let the same canonical reading open through chat or the visual Folio.
- Explain `owner`, `subject`, `source`, and `producer` in visible copy.

### Task 6 — Cross-account synastry generation

- Resolve two consented subject snapshots server-side.
- Submit the existing typed `relationship_context` and two subjects to the
  verified Selemene relationship capability.
- Save the result for each participant according to the accepted grant.
- Revoke future access without silently deleting the other participant's
  independently owned audit record.

## Batch 3 — identity and one-reading production pilot

### Task 7 — Durable Cloudflare admin mapping

- Add `sheshnarayan.iyer@gmail.com` to the `selemene-admin` Access group policy.
- Verify a fresh Access login produces `platform-admin` and
  `admin:analytics:read`.
- Do not use a Postgres-only role patch as the final state.

Preflight blocker observed on 2026-07-26: the current Wrangler OAuth token has
Access read scope but no Access write scope. A refreshed credential with Access
policy write permission, or a human Zero Trust dashboard change, is required.

### Task 8 — One-reading pilot

- Select one explicitly consented Shesh reading and its companion artifacts.
- Produce and freeze its manifest.
- Upload artifacts to the configured object store.
- Import metadata and relationships into the canonical archive.
- Verify admin browse, owner browse, checksum, round-trip, idempotent rerun, and
  deletion propagation.

### Task 9 — Two-account synastry pilot

- Use two real OTP accounts.
- Invite, accept, generate, browse from both accounts, revoke, and verify that
  a new generation is denied.
- Confirm the admin cannot bypass participant consent.

## Batch 4 — reviewed corpus rollout

1. Reconcile aliases and ambiguous directory names.
2. Classify historical, current, contradictory, placeholder, and prohibited
   register content.
3. Obtain subject/artifact consent decisions.
4. Import approved records in restartable batches.
5. Reconcile counts, checksums, sources, relationships, and artifact locators.
6. Add privacy-scrubbed pattern candidates only after explicit approval.
7. Wire Vectorize retrieval only after owner, subject, language, relationship,
   deletion, and provenance filters pass.

## Stop conditions

Stop and request direction if:

- a corpus alias would merge two people without review;
- a source lacks enough provenance to identify owner versus subject;
- a production mutation lacks backup, rollback, or idempotence;
- the Access credential cannot modify the exact intended policy;
- either synastry participant has not actively consented;
- a full import is requested before the one-reading pilot passes.
