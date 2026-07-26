-- 0007_relationship_reading_grants: consent-revalidated generation audit.
--
-- Generated reading bodies remain in the Selemene response/canonical archive.
-- D1 records only integrity digests and the explicit Urania participants who
-- may see the result. Revoking a relationship blocks future generation; it
-- does not silently erase a participant's historical grant or audit record.

CREATE UNIQUE INDEX idx_relationship_participants_binding
  ON relationship_participants(relationship_id, user_id, subject_id);

CREATE TABLE relationship_synastry_generations (
  id                   TEXT PRIMARY KEY,
  relationship_id      TEXT NOT NULL
    REFERENCES relationship_invitations(id) ON DELETE CASCADE,
  requested_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode                 TEXT NOT NULL CHECK (mode = 'synastry'),
  request_sha256       TEXT NOT NULL CHECK (
    length(request_sha256) = 64 AND request_sha256 NOT GLOB '*[^0-9a-f]*'
  ),
  response_sha256      TEXT NOT NULL CHECK (
    length(response_sha256) = 64 AND response_sha256 NOT GLOB '*[^0-9a-f]*'
  ),
  result_json          TEXT NOT NULL CHECK (json_valid(result_json)),
  created_at           INTEGER NOT NULL,
  UNIQUE (id, relationship_id)
);

CREATE TABLE relationship_reading_grants (
  generation_id  TEXT NOT NULL,
  relationship_id TEXT NOT NULL,
  user_id        TEXT NOT NULL,
  subject_id     TEXT NOT NULL,
  visibility     TEXT NOT NULL CHECK (visibility = 'participant'),
  granted_at     INTEGER NOT NULL,
  PRIMARY KEY (generation_id, user_id),
  FOREIGN KEY (generation_id, relationship_id)
    REFERENCES relationship_synastry_generations(id, relationship_id) ON DELETE CASCADE,
  FOREIGN KEY (relationship_id, user_id, subject_id)
    REFERENCES relationship_participants(relationship_id, user_id, subject_id) ON DELETE CASCADE
);

CREATE INDEX idx_relationship_reading_grants_user
  ON relationship_reading_grants(user_id, granted_at DESC);
CREATE INDEX idx_relationship_reading_grants_relationship
  ON relationship_reading_grants(relationship_id, granted_at DESC);

CREATE TABLE relationship_generation_audit (
  id            TEXT PRIMARY KEY,
  generation_id TEXT NOT NULL,
  relationship_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  event         TEXT NOT NULL CHECK (event = 'committed'),
  created_at    INTEGER NOT NULL,
  FOREIGN KEY (generation_id, relationship_id)
    REFERENCES relationship_synastry_generations(id, relationship_id) ON DELETE CASCADE
);

CREATE INDEX idx_relationship_generation_audit_relationship
  ON relationship_generation_audit(relationship_id, created_at DESC);
