# R2 / Vectorize Resource Reference

Provisioned: 2026-08-12

## R2 Bucket

- Name: `urania-137-corpus`
- Storage class: Standard
- Binding name (wrangler.toml): `READINGS_BUCKET`
- Key pattern: `corpus/readings/{sha256}/reading.html` — 723 reading renders
- Key pattern: `corpus/readings/{sha256}/metadata.json` — provenance metadata

## Vectorize Index

- Name: `urania-137-corpus-index`
- Dimensions: 1536 (bge-small-en-v1.5)
- Metric: cosine
- Binding name (wrangler.toml): `PATTERN_INDEX`
- Query options: `top_k = 10`
- Metadata schema per vector:
  ```json
  {
    "reading_sha256": "string",
    "owner_email": "sheshnarayan.iyer@gmail.com",
    "title": "string",
    "mode": "Solo|Synastry",
    "source_type": "string",
    "created_at": "ISO timestamp",
    "preview": "string (first 200 chars of pattern text)"
  }
  ```

## D1 Tables

- `catalogue_readings` — created by migration 0009
  - Columns: id, user_id, sha256, title, mode, source_type, created_at, is_synastry, canonical_uri, r2_key
  - FKs: user_id → users(id) ON DELETE CASCADE
  - Index: idx_catalogue_readings_owner_sha (user_id, sha256)

## Cloudflare Account Context

- Team: red-queen-4dfa
- Account ID: 9d9d
- Pages project: urania-137 (already bound to D1 DB `urania-137-db`)
