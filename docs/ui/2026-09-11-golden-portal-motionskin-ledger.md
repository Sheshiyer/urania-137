# Golden Portal Motionskin — 2026-09-11

## Decision

| Choice | Locked to | Why |
|---|---|---|
| Revert | Drop Void Atlas + M2 craft from the live landing source | Operator asked to start the Motionskin from Motionsites MCP. |
| Template | Motionsites **Golden Portal** (`golden-portal`, premium) | Editorial cinematic landing; liquid-glass nav; video hero; overlapping showcase; Q&A; quote; footer. |
| Motionskin rule | Structure/motion 1:1; skin = type/palette/copy/assets | Do not splice other templates onto this page. Later pages would share this Urania skin via a Shell. |
| Skin | Cinzel + Satoshi, void/gold/parchment, Urania funnel, Access OTP | Brand tokens. Arsenica/Inter and gallery copy stay in the template as placeholders. |
| Media | Self-hosted `landing/public/media/gp-*` | CSP `img-src`/`media-src 'self'`. Quote still 403 from CloudFront; overlay + night gradient used. |
| Host | Hydrated Vite landing (React) | Template needs IntersectionObserver + parallax; static SSR cannot run that motion. |
| Exit | `app.urania.tryambakam.space/` only | Split-host unchanged. |

## Section map

| Golden Portal | Urania |
|---|---|
| Gallery / Talents / Journal / Story | Instrument / Lenses / Principles / Invitation |
| DIGITAL ARCHIVE hero | SEE THE / PATTERN + lede |
| Enter Gallery | Enter the field |
| Still Frame showcase | The instrument |
| Q & A | Seven rooms + honesty / Folio / Access |
| Quote banner | Source / consent / privacy |
| Footer | Open Urania 137 |

## Non-goals

R-9 / ISC-143/145/146 remain open. No React Bits. No template splicing.
