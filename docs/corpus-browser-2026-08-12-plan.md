# Corpus Browser + R2/Vectorize Integration Plan (T-079 Fast-Follow)

**Date:** 2026-08-12
**Plan ID:** `r2-vectorize-corpus-ui`
**Status:** ✅ Foundation + Implementation complete | ⏳ Ingestion pending corpus data

## What was done

### 1. Cloudflare Resources Provisioned
- **R2 bucket:** `urania-137-corpus` (Standard storage class)
- **Vectorize index:** `urania-137-corpus-index` (1536 dims, cosine metric, bge-small-en-v1.5)

### 2. wrangler.toml Updated
Added three new bindings:
```toml
[[r2_buckets]]
binding = "READINGS_BUCKET"
bucket_name = "urania-137-corpus"

[[vectorize]]
binding = "PATTERN_INDEX"
index_name = "urania-137-corpus-index"

[ai]
binding = "AI"
```

### 3. Env Interface Updated
`functions/lib/env.ts` now includes `READINGS_BUCKET?: R2Bucket`, `PATTERN_INDEX?: VectorizeIndex`, and `AI?: Ai`.

### 4. D1 Migration 0009
Created `migrations/0009_catalogue_readings.sql` with the `catalogue_readings` table (owner-scoped, SHA-256 keyed, R2 key reference). Applied successfully to local D1.

### 5. API Routes Added
All three routes added to `functions/api/[[path]].ts`, behind the existing `authenticate()` middleware (T-008):

| Route | Description | ISC |
|-------|-------------|-----|
| `GET /api/corpus` | Owner-scoped catalogue list with `?search=` and `?mode=` | #133 |
| `GET /api/corpus/:id` | Single reading metadata + R2 HTML body | #137, #139, ISC-333 |
| `GET /api/patterns/search?q=` | Vectorize similarity search via Workers AI embeddings | #132, #138, ISC-334 |

### 6. Admin Data Browser UI
- **`src/pages/AdminDataBrowserPage.tsx`** — full SPA page with corpus list, reading viewer, and pattern search tabs
- **Route:** `#/admin-data`, `#/admin-data/corpus`, `#/admin-data/patterns`
- Wired into `useHashRoute.ts` (Route type + parseHash + AppPath)
- Wired into `App.tsx`
- Nav link added on `SettingsPage`

### 7. Shared Contracts
`src/lib/api/contract.ts` now exports:
- `CorpusReading`, `CorpusListResponse`, `CorpusDetailResponse`
- `PatternSearchResult`, `PatternSearchResponse`

### 8. Tests
- **15 new function tests** in `functions/__tests__/corpus-api.test.ts` covering:
  - Corpus list with search/filter
  - Cross-user isolation (404 for non-owner)
  - R2 object missing → 404
  - Vectorize search with mock matches
  - Auth fail-closed (401 without identity)
  - AI binding missing → 502
- All 351 function tests pass
- All 802 SPA tests pass
- TypeScript compiles cleanly (`npx tsc --noEmit`)

## What remains

### Ingestion (pending corpus data access)
The 723 corpus HTML files need to be uploaded to R2 and metadata to D1:
1. **R2 ingestion:** Upload 723 reading HTML files to `corpus/readings/{sha256}/reading.html`
   - Source: the archived corpus from Selemene Engine
   - Script: `scripts/readings/upload-corpus-to-r2.mjs` (to be written)
2. **D1 ingestion:** Insert 723 rows into `catalogue_readings`
   - Script: `scripts/readings/upload-catalogue-to-d1.mjs` (to be written)

### Production deployment
- Run `npm run migrate:remote` to apply migration 0009 to production D1
- Deploy via `git push` to the `main` branch (Pages auto-deploys)

## R2 Key / Vectorize Schema

| Layer | Location | Key/Pattern |
|-------|----------|-------------|
| D1 metadata | `catalogue_readings` table | `(user_id, sha256)` |
| R2 body | `urania-137-corpus` | `corpus/readings/{sha256}/reading.html` |
| Vectorize | `urania-137-corpus-index` | metadata: `reading_sha256`, `owner_email`, `title`, `mode`, `source_type`, `preview` |

## Auth Model

All corpus routes reuse the exact same `authenticate()` middleware as `/api/folio`:
- CF Access JWT verified against `CF_ACCESS_AUD`
- Dev-identity injection (`DEV_IDENTITY_EMAIL`) only works in local dev, fail-closed in production (T-008)
- Unauthenticated → 401 JSON (never redirect, never synthetic identity)
- Owner-scoping: every query includes `WHERE user_id = ?` from the verified claims
