#!/usr/bin/env bash
# T-088 — Provision Wave-2 production + CI secrets (auth/authorization layer).
#
# Two surfaces, one script. Each secret is set via the CORRECT primitive:
#
#   A. Pages runtime secrets  → `wrangler pages secret put`  (the app reads
#      these at request time; KV is NOT the right store — KV is an object
#      store, not a secret manager).
#   B. GitHub Actions secrets → `gh secret set` (the frozen readiness.yml /
#      release.yml workflows read these; they are environment-scoped).
#
# NEVER pasted here, never echoed, never written to disk. Each value is taken
# from an exported env var or read at a hidden prompt.
#
# PRE-CONDITIONS (the human half — the script re-checks what it can):
#   1. `wrangler whoami` is authenticated to the account that OWNS the
#      production D1 (d57550ea-c8d3-48fc-a2ee-c6b3fc41948e). NOTE: as of
#      2026-08-14 the local token resolves D1 to a DIFFERENT account
#      (9d7cec1b…) and fails with auth error 10000 — fix the account/token
#      before running section A.
#   2. `gh auth status` is authenticated to Sheshiyer/urania-137 with
#      `repo` + `workflow` scopes.
#   3. You have the real values in hand. Do NOT run this with placeholders:
#      every secret is authoritative and fail-closed.
#
# USAGE (env-var form):
#   CLOUDFLARE_API_TOKEN='…' \
#   CLOUDFLARE_ACCOUNT_ID='…' \
#   CF_ACCESS_SMOKE_CLIENT_ID='…' \
#   CF_ACCESS_SMOKE_CLIENT_SECRET='…' \
#   ALERT_PROBE_TOKEN='…' \
#   CF_PLATFORM_ADMIN_EMAILS='sheshnarayan.iyer@gmail.com' \
#   PRODUCTION_TARGETS_JSON='<JSON — see .release-input/production-targets.json>' \
#   LOCATION_REMEDIATION_MANIFEST_JSON='<JSON — see .release-input/location-remediation-manifest.json>' \
#   bash scripts/deploy/t088-prod-secrets.sh
#
# USAGE (prompt form — hidden reads for each missing value):
#   bash scripts/deploy/t088-prod-secrets.sh
#
# Sections can be skipped with:
#   SKIP_PAGES=1        skip section A (Pages runtime secrets)
#   SKIP_GH=1           skip section B (GitHub Actions secrets)

set -euo pipefail
cd "$(dirname "$0")/../.."

PAGES_PROJECT="urania-137"
REPO="Sheshiyer/urania-137"

# GitHub Actions environments the frozen workflows reference. GH matches env
# names case-insensitively; the workflows use lowercase, the created envs are
# "Preview"/"Production" — both are the same environments.
GH_ENV_PREVIEW="preview"
GH_ENV_PRODUCTION="production"

read_secret() {
  local name="$1" hint="$2" out="$3"
  local current="${!out:-}"
  if [ -n "${current}" ]; then
    # Value already in env; consume it and don't echo it.
    return 0
  fi
  read -r -s -p "      ${name} ${hint}: " current
  echo
  export "${out}=${current}"
}

fail_empty() {
  local name="$1" value="$2"
  if [ -z "${value}" ]; then
    echo "FAIL: ${name} is empty — refused." >&2
    exit 1
  fi
}

echo "T-088 prod secrets · Pages project ${PAGES_PROJECT} · repo ${REPO}"
echo

# ---------------------------------------------------------------------------
# Section A — Pages runtime secrets (wrangler pages secret put)
# ---------------------------------------------------------------------------
if [ "${SKIP_PAGES:-0}" = "1" ]; then
  echo "[A] SKIPPED — Pages runtime secrets (SKIP_PAGES=1)"
else
  echo "[A] Pages runtime secrets for ${PAGES_PROJECT}..."
  if ! wrangler whoami >/dev/null 2>&1; then
    echo "FAIL: wrangler is not authenticated (run `wrangler login`)." >&2
    exit 1
  fi

  # A1 — CF_PLATFORM_ADMIN_EMAILS: the fail-closed platform-admin allowlist.
  # Authority-bearing; committed nowhere. Comma-separated, case-insensitive.
  read_secret "CF_PLATFORM_ADMIN_EMAILS" "(comma-separated allowlist)" CF_PLATFORM_ADMIN_EMAILS
  fail_empty "CF_PLATFORM_ADMIN_EMAILS" "${CF_PLATFORM_ADMIN_EMAILS}"
  printf '%s' "${CF_PLATFORM_ADMIN_EMAILS}" \
    | wrangler pages secret put CF_PLATFORM_ADMIN_EMAILS --project-name "${PAGES_PROJECT}"
  unset CF_PLATFORM_ADMIN_EMAILS

  # A2 — ALERT_PROBE_TOKEN: bounded bearer token for POST /api/alert-probe.
  # Must be >= 16 chars (the route + probe script enforce this fail-closed).
  read_secret "ALERT_PROBE_TOKEN" "(>=16 chars, unguessable)" ALERT_PROBE_TOKEN
  fail_empty "ALERT_PROBE_TOKEN" "${ALERT_PROBE_TOKEN}"
  [ "${#ALERT_PROBE_TOKEN}" -ge 16 ] || { echo "FAIL: ALERT_PROBE_TOKEN too short." >&2; exit 1; }
  printf '%s' "${ALERT_PROBE_TOKEN}" \
    | wrangler pages secret put ALERT_PROBE_TOKEN --project-name "${PAGES_PROJECT}"
  # NOTE: ALERT_PROBE_TOKEN is ALSO needed as a GitHub Actions secret (B5). Keep
  # it in the shell for section B by NOT unsetting here.

  echo "[A] listing Pages secrets (values redacted)..."
  wrangler pages secret list --project-name "${PAGES_PROJECT}"
fi

# ---------------------------------------------------------------------------
# Section B — GitHub Actions secrets (gh secret set)
# ---------------------------------------------------------------------------
if [ "${SKIP_GH:-0}" = "1" ]; then
  echo "[B] SKIPPED — GitHub Actions secrets (SKIP_GH=1)"
else
  echo "[B] GitHub Actions secrets for ${REPO}..."
  if ! gh auth status >/dev/null 2>&1; then
    echo "FAIL: gh is not authenticated (run `gh auth login`)." >&2
    exit 1
  fi

  # Production environment (release.yml):
  #   CLOUDFLARE_API_TOKEN      — d1:write + pages:write + workers:write scope
  #   CLOUDFLARE_ACCOUNT_ID     — the account owning the production D1
  #   CF_ACCESS_SMOKE_CLIENT_ID / SECRET — Access service-token pair for smoke
  #   ALERT_PROBE_TOKEN         — SAME value as the Pages runtime secret (A2)
  read_secret "CLOUDFLARE_API_TOKEN" "(prod env)" CLOUDFLARE_API_TOKEN
  fail_empty "CLOUDFLARE_API_TOKEN" "${CLOUDFLARE_API_TOKEN}"
  read_secret "CLOUDFLARE_ACCOUNT_ID" "(prod env, 32-hex)" CLOUDFLARE_ACCOUNT_ID
  fail_empty "CLOUDFLARE_ACCOUNT_ID" "${CLOUDFLARE_ACCOUNT_ID}"
  [[ "${CLOUDFLARE_ACCOUNT_ID}" =~ ^[0-9a-f]{32}$ ]] \
    || { echo "FAIL: CLOUDFLARE_ACCOUNT_ID must be 32 hex chars." >&2; exit 1; }

  read_secret "CF_ACCESS_SMOKE_CLIENT_ID" "(prod env)" CF_ACCESS_SMOKE_CLIENT_ID
  fail_empty "CF_ACCESS_SMOKE_CLIENT_ID" "${CF_ACCESS_SMOKE_CLIENT_ID}"
  read_secret "CF_ACCESS_SMOKE_CLIENT_SECRET" "(prod env)" CF_ACCESS_SMOKE_CLIENT_SECRET
  fail_empty "CF_ACCESS_SMOKE_CLIENT_SECRET" "${CF_ACCESS_SMOKE_CLIENT_SECRET}"

  # ALERT_PROBE_TOKEN — carried from A2 or newly read; must match the Pages secret.
  read_secret "ALERT_PROBE_TOKEN" "(must match Pages secret)" ALERT_PROBE_TOKEN
  fail_empty "ALERT_PROBE_TOKEN" "${ALERT_PROBE_TOKEN}"
  [ "${#ALERT_PROBE_TOKEN}" -ge 16 ] || { echo "FAIL: ALERT_PROBE_TOKEN too short." >&2; exit 1; }

  echo "      setting production-environment secrets..."
  gh secret set CLOUDFLARE_API_TOKEN --repo "${REPO}" --env "${GH_ENV_PRODUCTION}" --body "${CLOUDFLARE_API_TOKEN}"
  gh secret set CLOUDFLARE_ACCOUNT_ID --repo "${REPO}" --env "${GH_ENV_PRODUCTION}" --body "${CLOUDFLARE_ACCOUNT_ID}"
  gh secret set CF_ACCESS_SMOKE_CLIENT_ID --repo "${REPO}" --env "${GH_ENV_PRODUCTION}" --body "${CF_ACCESS_SMOKE_CLIENT_ID}"
  gh secret set CF_ACCESS_SMOKE_CLIENT_SECRET --repo "${REPO}" --env "${GH_ENV_PRODUCTION}" --body "${CF_ACCESS_SMOKE_CLIENT_SECRET}"
  gh secret set ALERT_PROBE_TOKEN --repo "${REPO}" --env "${GH_ENV_PRODUCTION}" --body "${ALERT_PROBE_TOKEN}"
  unset CF_ACCESS_SMOKE_CLIENT_ID CF_ACCESS_SMOKE_CLIENT_SECRET

  # Preview environment (readiness.yml):
  #   CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID — same account, preview ops
  #   PRODUCTION_TARGETS_JSON             — top-level targets shape
  #   LOCATION_REMEDIATION_MANIFEST_JSON  — reviewed, subjectSha-binds to RELEASE_SHA
  read_secret "PRODUCTION_TARGETS_JSON" "(preview env, JSON)" PRODUCTION_TARGETS_JSON
  fail_empty "PRODUCTION_TARGETS_JSON" "${PRODUCTION_TARGETS_JSON}"
  read_secret "LOCATION_REMEDIATION_MANIFEST_JSON" "(preview env, JSON)" LOCATION_REMEDIATION_MANIFEST_JSON
  fail_empty "LOCATION_REMEDIATION_MANIFEST_JSON" "${LOCATION_REMEDIATION_MANIFEST_JSON}"

  # Validate JSON parse before setting (fail closed on malformed input).
  node -e 'JSON.parse(process.argv[1])' "${PRODUCTION_TARGETS_JSON}" \
    || { echo "FAIL: PRODUCTION_TARGETS_JSON is not valid JSON." >&2; exit 1; }
  node -e 'JSON.parse(process.argv[1])' "${LOCATION_REMEDIATION_MANIFEST_JSON}" \
    || { echo "FAIL: LOCATION_REMEDIATION_MANIFEST_JSON is not valid JSON." >&2; exit 1; }

  echo "      setting preview-environment secrets..."
  gh secret set CLOUDFLARE_API_TOKEN --repo "${REPO}" --env "${GH_ENV_PREVIEW}" --body "${CLOUDFLARE_API_TOKEN}"
  gh secret set CLOUDFLARE_ACCOUNT_ID --repo "${REPO}" --env "${GH_ENV_PREVIEW}" --body "${CLOUDFLARE_ACCOUNT_ID}"
  gh secret set PRODUCTION_TARGETS_JSON --repo "${REPO}" --env "${GH_ENV_PREVIEW}" --body "${PRODUCTION_TARGETS_JSON}"
  gh secret set LOCATION_REMEDIATION_MANIFEST_JSON --repo "${REPO}" --env "${GH_ENV_PREVIEW}" --body "${LOCATION_REMEDIATION_MANIFEST_JSON}"
  unset CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID
  unset PRODUCTION_TARGETS_JSON LOCATION_REMEDIATION_MANIFEST_JSON
  unset ALERT_PROBE_TOKEN
fi

echo
echo "T-088 secrets provisioning complete. Verify with:"
echo "  wrangler pages secret list --project-name ${PAGES_PROJECT}"
echo "  gh secret list --repo ${REPO} --env ${GH_ENV_PRODUCTION}"
echo "  gh secret list --repo ${REPO} --env ${GH_ENV_PREVIEW}"
echo
echo "Remaining (human-gated):"
echo "  - fix the wrangler D1 account mismatch (whoami 9d9d23b2… vs d1 9d7cec1b…)"
echo "  - FV-188 fresh browser login to capture the admin session"
echo "  - FV-189 second real Access identity (consent cannot be simulated)"
