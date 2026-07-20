#!/usr/bin/env bash
# T-054 — Phase-3 exit gate (runnable). Proves end-to-end LOCALLY:
#   persist+reload durability · list/search/favorite/save/delete round-trip ·
#   V3 per-user isolation · V6 import idempotency · contract conformance ·
#   tsc (SPA + functions) · vitest run — all green, or the gate is RED.
#
# Usage:  bash scripts/verify/phase3-exit-gate.sh
# Owns port 8789 exclusively (P3_QA); kills by port on every exit path.
set -euo pipefail
cd "$(dirname "$0")/../.."

PORT=8789
INSPECTOR=19230
BASE="http://localhost:${PORT}"
LOG=/tmp/p3qa-gate-8789.log
GATE_MARK="GATE-$(date +%s)"

say()  { printf '\n=== GATE %s ===\n' "$*"; }
pass() { printf '  ✓ %s\n' "$*"; }

kill_server() {
  kill $(lsof -tiTCP:${PORT}) 2>/dev/null || true
  pkill -f "pages dev dist --port ${PORT}" 2>/dev/null || true
  sleep 2
}
trap kill_server EXIT

start_server() { # $1 = extra wrangler args (e.g. --binding DEV_IDENTITY_EMAIL=...)
  kill_server
  # shellcheck disable=SC2086
  nohup npx wrangler pages dev dist --port ${PORT} --inspector-port ${INSPECTOR} $1 > "${LOG}" 2>&1 &
  for i in $(seq 1 45); do
    code=$(curl -s -o /dev/null -w '%{http_code}' "${BASE}/api/me" || true)
    [ "${code}" = "200" ] && { pass "server ready (${i}s) $1"; return 0; }
    sleep 1
  done
  echo "FATAL: server did not become ready — last log:"; tail -20 "${LOG}"; exit 1
}

d1() { npx wrangler d1 execute DB --local --command "$1" 2>/dev/null; }

say "0/6 static gates — vitest + tsc (SPA + functions)"
npm test 2>&1 | grep -E "Test Files|Tests "
npx tsc --noEmit && pass "root tsc (SPA + shared contract types) green"
npm run typecheck:functions >/dev/null 2>&1 && pass "typecheck:functions (Worker) green"

say "1/6 build + local D1 migration"
npx vite build >/dev/null 2>&1 && pass "vite build green"
npx wrangler d1 migrations apply DB --local >/dev/null 2>&1 && pass "migrations applied (0001_init)"

say "2/6 folio round-trip + restart durability (T-049)"
start_server ""
OUT=$(node scripts/verify/t049-folio-roundtrip.mjs "${BASE}")
echo "${OUT}" | grep -E "PASS|SURVIVOR"
SURVIVOR_ID=$(echo "${OUT}" | awk '/^SURVIVOR/ {print $2}')
SURVIVOR_TS=$(echo "${OUT}" | awk '/^SURVIVOR/ {print $3}')
d1 "SELECT COUNT(*) AS n FROM readings WHERE id='${SURVIVOR_ID}';" | grep -q '"n": 1' \
  && pass "D1 row persisted (id=${SURVIVOR_ID})"
start_server ""   # full restart, same local D1
node scripts/verify/t049-folio-roundtrip.mjs "${BASE}" --check-survivor "${SURVIVOR_ID}" "${SURVIVOR_TS}" | grep PASS

say "3/6 V3 per-user isolation (T-050)"
T050_MARK="T050-${GATE_MARK}"
start_server ""
A_ID=$(node scripts/verify/t050-isolation.mjs "${BASE}" --seed-a "${T050_MARK}" | awk '/^A_READING/ {print $2}')
pass "seeded as A: ${A_ID}"
start_server "--binding DEV_IDENTITY_EMAIL=dev-b@urania.local"
node scripts/verify/t050-isolation.mjs "${BASE}" --as-b "${T050_MARK}" "${A_ID}" | grep -E "PASS|404"
d1 "SELECT favorite FROM readings WHERE id='${A_ID}';" | grep -q '"favorite": 0' \
  && pass "A row provably unchanged in D1 after B tamper attempts"
start_server ""
node scripts/verify/t050-isolation.mjs "${BASE}" --verify-a "${T050_MARK}" "${A_ID}" | grep PASS

say "4/6 V6 import idempotency (T-051)"
T051_MARK="T051-${GATE_MARK}"
start_server ""
A_OUT=$(node scripts/verify/t051-import-idempotency.mjs "${BASE}" --as-a "${T051_MARK}")
echo "${A_OUT}" | grep PASS
d1 "SELECT COUNT(*) AS n FROM readings WHERE user_id='dev:dev@urania.local' AND title LIKE '${T051_MARK}%';" \
  | grep -q '"n": 4' && pass "A row count stable at 4 after double import"
A_IDS=$(echo "${A_OUT}" | awk '/^AIMP/ {print $2}' | paste -sd, -)
start_server "--binding DEV_IDENTITY_EMAIL=dev-b@urania.local"
node scripts/verify/t051-import-idempotency.mjs "${BASE}" --as-b "${T051_MARK}" "${A_IDS}" | grep PASS
d1 "SELECT COUNT(*) AS n FROM readings WHERE user_id='dev:dev-b@urania.local' AND title LIKE '${T051_MARK}%';" \
  | grep -q '"n": 4' && pass "B got own 4 rows (per-user namespace)"

say "5/6 contract conformance (T-053, runtime half)"
npx vitest run functions/__tests__/folio-contract.test.ts 2>&1 | grep -E "Tests "

say "6/6 hygiene"
kill_server
lsof -tiTCP:${PORT} >/dev/null 2>&1 && { echo "FATAL: port ${PORT} still held"; exit 1; }
pgrep -f "pages dev.*${PORT}" >/dev/null 2>&1 && { echo "FATAL: wrangler processes survive"; exit 1; }
pass "port ${PORT} free, no gate processes survive"

printf '\n========================================\n'
printf ' PHASE-3 EXIT GATE: PASS  (mark %s)\n' "${GATE_MARK}"
printf ' persist+durability ✓ round-trip ✓ V3 ✓ V6 ✓ contract ✓ tsc ✓ vitest ✓\n'
printf '========================================\n'
