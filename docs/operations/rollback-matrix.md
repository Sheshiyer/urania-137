# Urania Rollback Matrix

Every production mutation needs a before-state receipt, exact target validation, an operator with scoped authority, and a tested rollback. Commands below are runbook shapes, not blanket authorization.

| Surface | Capture before mutation | Rollback | Required evidence | Authority |
|---|---|---|---|---|
| Source | `git rev-parse HEAD`, `git status --porcelain=v1 -uall`, required-check result | Open a corrective PR or redeploy an already verified compatible SHA; never reset shared history | Commit SHA, CI run, reviewed diff | Repository maintainer |
| Pages application | `wrangler pages deployment list --project-name urania-137 --json` | Redeploy the recorded last-known-good application artifact/SHA | Project/account IDs, deployment ID, artifact checksum, smoke result | Scoped Cloudflare Pages token + production Environment approval |
| Pages landing | Resolve the dedicated public project and current deployment via target validator | Redeploy the recorded last-known-good static-only artifact | Public project/account IDs, deployment ID, static-boundary proof | Scoped Cloudflare Pages token + production Environment approval |
| DNS | Export exact zone record JSON through the cutover tool | Apply the receipt's previous record value as one confirmed mutation | Zone/record IDs, before/after JSON hashes, public/protected probes | Scoped DNS token + explicit record-ID confirmation |
| Cloudflare Access | Export application and policy JSON | Restore the receipt's exact application/policy version | Account/app/policy IDs, before/after hashes, anonymous/authenticated probes | Zero Trust administrator + explicit policy-ID confirmation |
| D1 schema/data | Capture Time Travel bookmark, SQL export, SHA-256, migration list, counts, foreign-key check | Stop writes; capture post-failure state; restore the pre-mutation bookmark through the guarded tool; redeploy compatible SHA | Database ID, bookmark, export checksum, restore-drill receipt, counts/invariants | D1-scoped token + production Environment approval |
| Secrets | Record secret names/versions only, never values | Reinstall the prior version from the approved secret store; revoke compromised value | Target/project ID, secret-name manifest, rotation ticket | Secret manager + scoped Cloudflare token |
| GitHub rules | Export ruleset/branch/tag protection JSON | Restore previous ruleset JSON after validating repository ID | Repository/ruleset IDs, before/after hashes, admin acknowledgement | Repository administrator |
| Alerts | Export alert rule/destination identifiers and hashes | Restore prior reviewed rule configuration | Account/destination/rule IDs, synthetic correlation acknowledgement | Monitoring administrator |

## Stop Conditions

- Target identifiers do not exactly match the reviewed production targets file.
- Backup export, checksum, Time Travel bookmark, or restore rehearsal is missing.
- The release SHA differs from the required-check, deployment, tag, or attestation subject.
- A rollback command has not passed against preview/disposable infrastructure.
- A mutation would combine multiple targets in one invocation.
- A receipt contains secrets or personal data.

Under any stop condition, leave production unchanged and record the failed preflight. If a mutation already began, block further writes where appropriate and follow the receipt-specific compensating action.
