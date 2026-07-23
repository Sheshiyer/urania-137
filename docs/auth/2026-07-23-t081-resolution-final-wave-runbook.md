# T-081 resolution (by reuse) + final-wave runbook — 2026-07-23

## T-081 resolution: the existing SELEMENE Access app is reused — no new app

**Decision (owner, 2026-07-23):** do NOT create a new CF Access application.
The existing SELEMENE self-hosted Access application in the 9d9d account
already fronts the SELEMENE engine, the admin dashboard, and the immersive
API (`immersiveapi.tryambakam.space`, noesismirror-web-falseearth). One
Access app covers multiple hostnames; a second app would duplicate the same
IdP/policy config. `urania-137` joins the existing app.

**Captured values:**

| Value | |
|---|---|
| `CF_ACCESS_AUD` | `df8a00b1d19f2e8034ed262544912656ca969fcdadf0e2599b61d4d2f687b6b4` |
| `CF_ACCESS_TEAM_DOMAIN` | `red-queen-4dfa.cloudflareaccess.com` (bare team name: `red-queen-4dfa`) |

**AUD provenance — live capture supersedes the sibling config.** An earlier
staging pass used the immersive API's AUD (`11a62a84…`) from
`noesismirror-web-falseearth/api/wrangler.toml`. When the T-066 domain edit
landed (2026-07-23 ~22:25 IST), the live Access edge challenge on
`urania-137.pages.dev` returned `kid` / meta-`aud` = `df8a00b1…b6b4` —
evidence: `docs/auth/evidence/2026-07-23-t066-cutover-curl.txt`. The app that
now covers this hostname issues JWTs with THAT aud, so it is the value the
Worker must validate against; `11a62a84…` belongs to a different Access app
in the same team (the immersive API's). Reuse decision unchanged: no new app
was created; the hostname joined an existing one.

**Human actions:** domain edit ✅ done (2026-07-23). `SELEMENE_API_KEY`
rotation ⏳ deferred by the owner ("we'll rotate later; if it's not working
I'll give you a new one") — the secrets script stays staged for that moment;
the expired key only affects the `/api/selemene/*` engine proxy behind auth,
never the V1–V4 auth gates.

---

## Final-wave runbook (fires once the two human actions above are done)

Ordered; each step's output feeds the next. Gates must stay green
(`npm run verify` etc. per repo convention) before every push.

### Step 0 — commit the staged config (T-067 vars half)

`wrangler.toml [vars]` already carries `CF_ACCESS_AUD` +
`CF_ACCESS_TEAM_DOMAIN` (staged uncommitted 2026-07-23). Commit ONLY
wrangler.toml + this doc + the harness README + the secrets script —
the untracked `chat/` files in the tree are unrelated in-flight work:

```sh
git add wrangler.toml scripts/verify/auth-gates.README.md \
        scripts/deploy/t067-prod-secrets.sh docs/auth/2026-07-23-t081-resolution-final-wave-runbook.md
git commit -m "feat(cf-auth): T-081 resolved by reuse — SELEMENE AUD/team vars staged for T-067"
```

### Step 1 — T-066 cutover verification

After the owner confirms the domain edit:

```sh
curl -sI https://urania-137.pages.dev/ | head -5
```

Acceptance: unauthenticated request → **302** to
`red-queen-4dfa.cloudflareaccess.com` (OTP challenge), not the SPA.
Capture the HAR + Access app config screenshot per the T-066 validation
requirements. If the redirect does NOT appear, risk R1 applies: verify the
app covers the exact hostname `urania-137.pages.dev`; fallback is a custom
hostname proxied through CF.

### Step 2 — T-067 secrets half + redeploy

```sh
SELEMENE_API_KEY='<new-rotated-key>' bash scripts/deploy/t067-prod-secrets.sh
npm run build && wrangler pages deploy dist --project-name urania-137   # or git push
```

The script asserts the no-dev-bypass invariant, diffs the AUD/team vars
byte-for-byte, sets the secret, and lists bindings (redacted) as evidence.
This closes issue #150 (the last open T-059 item).

### Step 3 — acquire the two OTP sessions

Two genuinely separate identities, both allowed by the SELEMENE app policy:

```sh
# A: browser OTP login → DevTools → CF_Authorization cookie, or:
cloudflared access token -app=https://urania-137.pages.dev
export CF_ACCESS_SESSION_A='cookie:<value-A>'   # or the bare JWT
export CF_ACCESS_SESSION_B='cookie:<value-B>'   # second profile / second email
```

### Step 4 — V1–V4 + no-dev-bypass LIVE (T-069…T-073)

```sh
mkdir -p docs/auth/evidence
node scripts/verify/auth-gates.mjs --strict \
  --evidence-json docs/auth/evidence/$(date +%F)-v1-v4-live.json
```

`--strict` means any SKIP exits 2 — the T-079 sign-off bar. Expected:
**all PASS, 0 SKIP**. (V2's D1 `users`-row / `last_seen_at` diff and V4's
two-profile browser walkthrough remain the documented manual halves.)

### Step 5 — remaining wave (in order)

| Task | What |
|---|---|
| T-074 | V5/V6/V7/V8 re-confirmed against the deployed env |
| T-075 | Backend hardening pass on any live-gate findings |
| T-076 | SPA live-auth polish (useMe / logout / Folio states) |
| T-077 | Consolidated evidence dossier (harness JSON + HAR + screenshots) |
| T-078 | ISA Phase 5 ISCs marked verified |
| T-079 | Phase-5 exit gate — all 8 gates green LIVE, migration sign-off |
