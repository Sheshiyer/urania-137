# Release Workflow

Urania releases are prepared in a pull request and published only by the GitHub `production` Environment. Local code cannot deploy, push a tag, or create a GitHub release.

## Invariant

The version commit, required CI result, protected application artifact, public landing artifact, deployment receipts, tag, release notes subject, and signed `production-attestation.json` subject must all identify one full 40-character SHA.

Live evidence is a checksummed GitHub artifact/release asset. It is not committed after deployment, because that would create a different source SHA.

## Prepare Version Metadata

Start with a clean production-readiness branch:

```bash
node scripts/release.mjs --prepare minor --dry-run
node scripts/release.mjs --prepare minor
git diff -- package.json package-lock.json
```

`--prepare` accepts only `patch`, `minor`, or `major`. It updates `package.json` and both root version fields in `package-lock.json`; it does not commit, tag, push, deploy, or contact GitHub/Cloudflare. Review and commit the metadata with all source-controlled release-candidate evidence, then merge it through the protected pull-request path.

Implicit positional bumps and combined prepare/publish commands are rejected.

## Prove the Merged Candidate

On clean, synchronized `main`, with a same-SHA readiness/restore receipt available:

```bash
export URANIA_BACKUP_RECEIPT=/absolute/path/to/backup-receipt.json
node scripts/release.mjs \
  --version "$(node -p "require('./package.json').version")" \
  --dry-run
```

Local publication preflight fails closed unless all conditions hold:

- every tracked and untracked path is clean;
- the branch is attached `main`;
- `HEAD` exactly equals fetched `origin/main` with zero ahead/behind;
- the `Production gate` check for that exact SHA concluded `success`;
- neither local nor remote `vX.Y.Z` tag exists;
- the requested version exactly equals committed `package.json`;
- the readiness receipt belongs to the same SHA, includes a database ID and SHA-256, and records a successful restore verification.

The Actions preflight deliberately supports an exact detached checkout, but only when `GITHUB_SHA`, the requested SHA, and fetched `origin/main` are identical. This is a separate mode from local preflight.

## Dispatch

The release workflow needs the exact release SHA, committed version, and the prior readiness workflow run containing `urania-readiness-<SHA>`:

```bash
gh workflow run release.yml \
  -f sha="$(git rev-parse HEAD)" \
  -f version="$(node -p "require('./package.json').version")" \
  -f readiness_run_id="<verified-readiness-run-id>"
```

`scripts/release.mjs --version X.Y.Z --dispatch --yes` is an equivalent guarded dispatcher when `URANIA_READINESS_RUN_ID` is configured. Always review `--dry-run` first.

## Environment and Secrets

The `production` GitHub Environment supplies scoped values, never source-controlled values:

- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`;
- `CF_ACCESS_SMOKE_CLIENT_ID` and `CF_ACCESS_SMOKE_CLIENT_SECRET` for the application-classified read-only synthetic principal;
- `ALERT_PROBE_TOKEN` for the fixed, non-data-bearing alert correlation route.

The Environment must require an operator approval. The Cloudflare token is limited to the named Pages/D1/DNS/Access resources. The synthetic Access subject is denied CSRF issuance and every state-changing application route by server authorization, regardless of token/origin headers.

## Publication Order

`.github/workflows/release.yml` executes these phases in order:

1. Validate inputs and check out the exact SHA.
2. Download same-SHA readiness/preview evidence.
3. Run Actions preflight and canonical `verify:ci`.
4. Build both immutable artifacts.
5. Revalidate every production target.
6. Capture a fresh production backup/restore receipt.
7. Apply tested migrations and the reviewed remediation manifest.
8. Deploy protected app and public landing through one-target confirmed cutovers.
9. Run non-mutating production smoke and alert-delivery probes; import same-SHA mutation proofs from preview.
10. Generate, validate, checksum, and provenance-attest production evidence.
11. Stage a draft release targeting the exact SHA with all evidence assets.
12. Re-download and validate the draft assets, then publish the release last.

No command uses `--commit-dirty=true`. Production deployment runs from the Actions checkout, not the operator worktree.

## Draft Cleanup and Failure Semantics

Tag/release creation happens only after deploy, smoke, and attestation succeed. Publication is staged as a draft. If draft creation, asset upload, asset verification, signing, or publication fails, the workflow runs:

```bash
gh release delete "vX.Y.Z" --cleanup-tag --yes
```

Cleanup failure is a critical operator incident and the release remains failed. A normal post-publication defect never deletes a published tag; it uses a corrective patch release.

Code/deployment rollback uses the exact receipt recorded for that mutation. D1 recovery stops writes, captures post-failure state, and uses the pre-mutation Time Travel bookmark only through the guarded recovery tool.

## Attestation Verification

After publication:

```bash
RELEASE_SHA="$(git rev-parse HEAD)"
gh release download "v$(node -p "require('./package.json').version")" \
  --pattern production-attestation.json \
  --dir /tmp/urania-release-attestation
node scripts/verify/release-attestation.mjs verify \
  --sha "$RELEASE_SHA" \
  --file /tmp/urania-release-attestation/production-attestation.json
```

The verifier checks schema, version/tag identity, app and landing deployment SHAs, artifact checksums, backup receipt checksum, same-SHA preview proofs, production probe status, and governance snapshot checksum.

## Application Version Display

`package.json` remains the source for Vite build constants:

```text
package.json
  → vite.config.ts (__APP_VERSION__, __APP_BUILD_TIME__, __APP_BUILD_SHA__)
  → src/lib/appVersion.ts
  → VersionBadge and Settings
```

The Selemene engine version is independent and continues to come from engine health.
