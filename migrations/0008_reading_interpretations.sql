-- 0008_reading_interpretations: immutable, owner-scoped interpretation rows
-- linked to a canonical reading, never mutating the source `readings` row.
--
-- Additive only: this migration creates one new table and its indexes. It
-- does not ALTER `readings`. Saving an interpretation is always an INSERT
-- here; the source reading row it references is read-only from this path.
--
-- Idempotency: (owner_user_id, idempotency_key) is unique, so retried saves
-- with the same key resolve to the same row rather than a duplicate insert.
-- Provenance/fact-lock hashes are additive columns carried verbatim from the
-- ContextPacketV1/ExecutionEnvelopeV1/ProvenanceEnvelopeV1 pipeline — never
-- recomputed or reinterpreted here.

CREATE TABLE reading_interpretations (
  id                   TEXT PRIMARY KEY,           -- uuid (Worker-generated)
  reading_id           TEXT NOT NULL
    REFERENCES readings(id) ON DELETE CASCADE,      -- canonical source reading (read-only from here)
  owner_user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idempotency_key      TEXT NOT NULL,
  route                TEXT NOT NULL,               -- InterpretationRoute (pattern | embodied | synthesis | navigate)
  interpretation_depth INTEGER NOT NULL CHECK (interpretation_depth BETWEEN 0 AND 5),
  consciousness_level  INTEGER NOT NULL CHECK (consciousness_level BETWEEN 1 AND 5),
  question             TEXT NOT NULL,
  answer               TEXT NOT NULL,
  context_packet_hash  TEXT NOT NULL CHECK (
    length(context_packet_hash) = 64 AND context_packet_hash NOT GLOB '*[^0-9a-f]*'
  ),
  fact_lock_hash        TEXT NOT NULL CHECK (
    length(fact_lock_hash) = 64 AND fact_lock_hash NOT GLOB '*[^0-9a-f]*'
  ),
  source_refs_json      TEXT NOT NULL CHECK (json_valid(source_refs_json)), -- allowed source IDs / provenance refs
  provenance_json        TEXT,                       -- optional additive ProvenanceEnvelopeV1-shaped payload
  created_at            INTEGER NOT NULL,            -- unix ms (Worker-set)
  UNIQUE (owner_user_id, idempotency_key)
);

CREATE INDEX idx_reading_interpretations_reading
  ON reading_interpretations(reading_id, owner_user_id, created_at DESC);
CREATE INDEX idx_reading_interpretations_owner
  ON reading_interpretations(owner_user_id, created_at DESC);
