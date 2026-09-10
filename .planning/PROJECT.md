# Urania 137 — the integrated online entry

## What This Is

Urania 137 is the online entry to the Tryambakam Noesis integrated product: a graph-first stellar console over the Selemene engine. The constellation is the interface at every depth; chat is the threshold that collects exactly one intake slot per turn; every reading resolves into a canonical, source-honest `ReadingDocument` archived to a durable Folio.

This repo owns urania-137 only. Noesis Mirror (the person's 3D field) and Sankalpa (the local consent-gated instrument) are sibling surfaces; Selemene is the upstream calculation authority.

## Core Value

A person enters through conversation, receives a reading without losing the thread, reopens the same material as a legible folio that names exactly which systems and sources support it, moves between related readings without identity leakage, and understands where computation ends and witness interpretation begins.

## Current Focus

Production readiness → release: ship the corpus admin browser (T-079) through the governed immutable release path and reach `operationally_ready`. See `.planning/ROADMAP.md` for the milestone ladder and `.planning/tasks.md` for the executable wave.

## Requirements

- Validated (shipped): see `.planning/REQUIREMENTS.md` — chat onboarding, threshold + subjects, daily panchanga, auth/identity, Folio/reading library, corpus admin browser (53 readings).
- Open: see `.planning/REQUIREMENTS.md` REQ-xx → M-milestone + ISA ISC traceability.

## Out of Scope (this repo)

- Selemene engine changes (upstream repo; tracked as requests in `docs/selemene-engine-requests.md`).
- Noesis Mirror and Sankalpa implementation.
- Camera/image/consent capture engines (`biofield`, `biofield-capture`, `face-reading`) — Sankalpa owns those.
- Replacing the SVG graph with Canvas/WebGL; re-architecting the React/Vite/Tailwind stack.

## Constraints

- **Authority:** Selemene is the calculation authority; urania owns reading identity, storage, and presentation. The engine stays shared-key and stateless.
- **Trust:** Cloudflare Access is the only trust boundary; every `/api/*` request verifies a CF Access JWT (fail-closed, never a redirect).
- **Release:** one governed immutable path (`readiness.yml` → `release.yml`, production Environment approval, attestation).
- **Honesty:** never send an unresolved engine mode; never offer a surface whose input can't be gathered; never link to something that doesn't exist.
- **Voice:** witness-as-mirror, non-predictive, non-prescriptive; prohibited wellness vocabulary is gated.

## Key Decisions

- 2026-07-16: multi-page console (reverted scroll-journey) — faithful high-detail SVG, Cinzel serif, full console chrome.
- 2026-07-17: taxonomy realigned to capabilities the engine actually serves (never the wider `WitnessMode` union).
- 2026-07-20/21: Cloudflare-native auth (CF Access + Pages Functions + D1); Vercel delinked.
- 2026-07-24: modal era retired — chat renders readings in-thread; `VITE_CHAT_ONBOARDING` removed.
- 2026-07-26: canonical `ReadingDocument` + `structureSource` honesty rule (`native` vs `flat`).
- 2026-08-12/13: corpus = **53 readings (51 Solo + 2 Synastry)** — `/723/` is the archive directory name, not a count.
- 2026-08-14: Pages **preview** env stays **fail-closed** (no engine secrets) — accepted posture.
- 2026-08-16: goal.md + GSD spine bootstrapped; milestone ladder M1→M7; M1 = live release path.

## Session Continuity

See `.planning/STATE.md`.
