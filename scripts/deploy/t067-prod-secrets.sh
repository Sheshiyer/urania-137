#!/usr/bin/env bash
# T-067 — Apply production secrets/vars (AUD, team, SELEMENE) — FINAL WAVE.
#
# Run this ONLY after BOTH preconditions hold (they are the human half of the
# final wave; the script re-checks what it can and refuses to proceed silently):
#
#   1. T-066 cutover: in the Zero Trust dashboard (9d9d account, team
#      red-queen-4dfa), the EXISTING SELEMENE self-hosted Access application
#      now lists urania-137.pages.dev in its covered domains.
#      (Reuse decision 2026-07-23 — no new Access app was created; see
#      docs/auth/2026-07-23-t081-resolution-final-wave-runbook.md.)
#   2. SELEMENE_API_KEY has been ROTATED by the owner (the old local key is
#      expired — verified 401). The NEW value must be in your environment or
#      pasted at the prompt. It is never written to disk or echoed by this
#      script.
#
# What it does:
#   a. Asserts the no-dev-bypass invariant (DEV_IDENTITY_EMAIL must not exist
#      in wrangler.toml, .dev.vars, or the process env).
#   b. Asserts CF_ACCESS_AUD / CF_ACCESS_TEAM_DOMAIN are present in
#      wrangler.toml [vars] (they ship with the redeploy — non-secret).
#   c. Sets the SELEMENE_API_KEY Pages secret on project urania-137.
#   d. Lists the project's secrets (values redacted by wrangler) as evidence.
#
# Usage:
#   SELEMENE_API_KEY='<new-rotated-key>' bash scripts/deploy/t067-prod-secrets.sh
#   bash scripts/deploy/t067-prod-secrets.sh        # prompts for the key (hidden)
#
# After this script: redeploy (git push on feat/cf-auth or
# `npm run build && wrangler pages deploy dist --project-name urania-137`)
# so the [vars] bindings go live, then run the live gates per the runbook.

set -euo pipefail
cd "$(dirname "$0")/../.."

PROJECT="urania-137"
EXPECTED_AUD="df8a00b1d19f2e8034ed262544912656ca969fcdadf0e2599b61d4d2f687b6b4"
EXPECTED_TEAM="red-queen-4dfa.cloudflareaccess.com"

echo "T-067 prod secrets · project ${PROJECT}"
echo

# --- (a) no-dev-bypass invariant ----------------------------------------------
echo "[1/4] Asserting DEV_IDENTITY_EMAIL is absent everywhere..."
if grep -Rns "DEV_IDENTITY_EMAIL" wrangler.toml .dev.vars 2>/dev/null; then
  echo "FAIL: DEV_IDENTITY_EMAIL found in a config file — remove it before prod." >&2
  exit 1
fi
if [ -n "${DEV_IDENTITY_EMAIL:-}" ]; then
  echo "FAIL: DEV_IDENTITY_EMAIL is set in the process env — unset it first." >&2
  exit 1
fi
echo "      ok — no dev-identity binding anywhere."

# --- (b) Access vars staged in wrangler.toml -----------------------------------
echo "[2/4] Checking CF Access vars in wrangler.toml [vars]..."
grep -q "CF_ACCESS_AUD = \"${EXPECTED_AUD}\"" wrangler.toml \
  || { echo "FAIL: CF_ACCESS_AUD missing/mismatched in wrangler.toml" >&2; exit 1; }
grep -q "CF_ACCESS_TEAM_DOMAIN = \"${EXPECTED_TEAM}\"" wrangler.toml \
  || { echo "FAIL: CF_ACCESS_TEAM_DOMAIN missing/mismatched in wrangler.toml" >&2; exit 1; }
echo "      ok — AUD + team domain match the live SELEMENE Access app (byte-for-byte)."

# --- (c) SELEMENE_API_KEY secret -----------------------------------------------
echo "[3/4] Setting SELEMENE_API_KEY Pages secret on ${PROJECT}..."
if [ -z "${SELEMENE_API_KEY:-}" ]; then
  read -r -s -p "      Paste the NEW (rotated) SELEMENE_API_KEY: " SELEMENE_API_KEY
  echo
fi
[ -n "${SELEMENE_API_KEY}" ] || { echo "FAIL: empty key refused." >&2; exit 1; }
printf '%s' "${SELEMENE_API_KEY}" | wrangler pages secret put SELEMENE_API_KEY --project-name "${PROJECT}"
unset SELEMENE_API_KEY

# --- (d) evidence ---------------------------------------------------------------
echo "[4/4] Listing production secrets (values redacted)..."
wrangler pages secret list --project-name "${PROJECT}"

echo
echo "T-067 secrets half complete. Remaining: redeploy to carry [vars], then"
echo "run the live gates (see docs/auth/2026-07-23-t081-resolution-final-wave-runbook.md)."
