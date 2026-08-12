-- 0009_catalogue_readings (T-079 fast-follow): owner-scoped metadata for the
-- 723 historical corpus catalogue. Each row is a content-addressed reading in
-- the corpus; its body HTML lives in R2 (READINGS_BUCKET) under
-- corpus/readings/{sha256}/reading.html, never in D1.
--
-- ISC-#139: 723 readings with full provenance + R2 body.

CREATE TABLE catalogue_readings (
  id           TEXT PRIMARY KEY,           -- uuid (Worker-generated)
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sha256       TEXT NOT NULL,               -- content checksum, unique per user
  title        TEXT NOT NULL,
  mode         TEXT NOT NULL,               -- 'Solo' or 'Synastry'
  source_type  TEXT NOT NULL,               -- engine run type / lineage
  created_at   INTEGER NOT NULL,            -- unix ms (Worker-set)
  is_synastry  INTEGER NOT NULL DEFAULT 0, -- boolean (0/1)
  canonical_uri TEXT,                        -- provenance link back to Selemene Engine
  r2_key       TEXT NOT NULL                 -- R2 object key: corpus/readings/{sha256}/reading.html
);

CREATE INDEX idx_catalogue_readings_owner_sha ON catalogue_readings(user_id, sha256);
CREATE INDEX idx_catalogue_readings_owner_time ON catalogue_readings(user_id, created_at DESC);
CREATE UNIQUE INDEX idx_catalogue_readings_owner_unique_sha ON catalogue_readings(user_id, sha256);
