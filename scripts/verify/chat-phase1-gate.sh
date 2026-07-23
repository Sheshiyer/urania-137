#!/usr/bin/env bash
# chat-phase1-gate.sh — Phase 1 exit gate (W2 Stream_QA): a scripted curl
# conversation against a locally-running `wrangler pages dev` instance.
#
# Usage:  bash scripts/verify/chat-phase1-gate.sh [base-url] [out-dir]
# Expects the dev server already running with DEV_IDENTITY_EMAIL configured
# (dev-identity loop) and migrations applied to local D1.
#
# Drives a full solo-witness intake over SSE (with a simulated disconnect on
# turn 2), then the replay endpoint, writing raw artifacts for
# chat-phase1-gate-assert.mjs to verify. Never prints secrets.
set -euo pipefail

BASE="${1:-http://localhost:8790}"
OUT="${2:-$(mktemp -d /tmp/chat-gate.XXXXXX)}"
mkdir -p "$OUT"
echo "gate base: $BASE"
echo "gate artifacts: $OUT"

SEED='{"seed":{"kind":"witness","mode":"integrated-kundali-l0","minSubjects":1,"maxSubjects":1,"level":"L0"}}'

# --- create session (witness seed) -----------------------------------------
code=$(curl -sS -X POST -H 'content-type: application/json' -d "$SEED" \
  "$BASE/api/chat/session" -o "$OUT/session.json" -w '%{http_code}')
if [ "$code" != "201" ]; then
  echo "FAIL: create session returned $code"; cat "$OUT/session.json"; exit 1
fi
SID=$(node -pe "JSON.parse(require('fs').readFileSync('$OUT/session.json','utf8')).session.sessionId")
echo "session: $SID"

turn() { # <nn> <json-input>
  curl -sS -N -X POST -H 'content-type: application/json' \
    -d "{\"sessionId\":\"$SID\",\"input\":$2}" \
    "$BASE/api/chat/turn" -o "$OUT/turn-$1.sse"
  echo "turn $1 done ($(wc -c < "$OUT/turn-$1.sse" | tr -d ' ') bytes)"
}

# --- turn 1: awakening -> surface ------------------------------------------
turn 01 '"begin"'

# --- turn 2 (surface confirm) with a SIMULATED DISCONNECT ------------------
curl -sS -N -X POST -H 'content-type: application/json' \
  -d "{\"sessionId\":\"$SID\",\"input\":\"yes\"}" \
  "$BASE/api/chat/turn" -o "$OUT/turn-02.sse" &
CURL_PID=$!
sleep 0.3
kill "$CURL_PID" 2>/dev/null || true
wait "$CURL_PID" 2>/dev/null || true
echo "turn 02 client killed mid-flight (simulated disconnect)"

# The turn must persist regardless — poll the snapshot until both turns land.
n=0
for _ in $(seq 1 30); do
  curl -sS "$BASE/api/chat/session/$SID" -o "$OUT/poll.json"
  n=$(node -pe "JSON.parse(require('fs').readFileSync('$OUT/poll.json','utf8')).turns.length")
  [ "$n" -ge 4 ] && break
  sleep 0.2
done
echo "after disconnect: persisted turns=$n (expect >= 4)"

# --- remaining scripted conversation ---------------------------------------
turn 03 '"Asha"'
turn 04 '"2023-02-30"'   # invalid calendar date — rejected in-stream
turn 05 '"1990-05-17"'
turn 06 '"unknown"'      # birth time unknown -> noon convention
turn 07 '"Pune, India"'
turn 08 '"en"'
turn 09 '"L2"'
turn 10 '"3"'
turn 11 '"yes"'
turn 12 '"yes"'          # assembly confirm -> handoff-ready

# --- final snapshot ---------------------------------------------------------
curl -sS "$BASE/api/chat/session/$SID" -o "$OUT/session-final.json"
echo "final snapshot fetched"

# --- replay endpoint ---------------------------------------------------------
curl -sS "$BASE/api/chat/session/$SID/events?after=0" -o "$OUT/replay-full.sse"
# Resume cut = last event id of turn 1 (computed from the live stream).
CUT=$(node -pe "
  const fs=require('fs');
  const frames=fs.readFileSync('$OUT/turn-01.sse','utf8').split('\n\n').filter(f=>f.includes('id: '));
  const last=frames.at(-1).split('\n').find(l=>l.startsWith('id: '));
  last.slice(4)
")
echo "replay cut (end of turn 1): id=$CUT"
curl -sS "$BASE/api/chat/session/$SID/events?after=$CUT" -o "$OUT/replay-tail.sse"
curl -sS -H "Last-Event-ID: $CUT" "$BASE/api/chat/session/$SID/events" -o "$OUT/replay-leid.sse"
# Bad cursor must 400.
bad=$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/api/chat/session/$SID/events?after=abc")
echo "replay ?after=abc -> $bad (expect 400)"
[ "$bad" = "400" ] || { echo "FAIL: bad after did not 400"; exit 1; }

# --- assertions --------------------------------------------------------------
node "$(dirname "$0")/chat-phase1-gate-assert.mjs" "$OUT" "$CUT"
