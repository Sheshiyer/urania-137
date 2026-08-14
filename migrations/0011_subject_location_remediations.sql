-- 0011_subject_location_remediations (Task 8): append-only remediation audit.
--
-- Records the application of a reviewed location-remediation manifest without
-- storing cleartext birth/location data. Rows carry opaque content hashes of
-- before/after normalized_location, the subject id (opaque), actor, and time.
-- Append-only: no UPDATE/DELETE path is provided by the application.

CREATE TABLE subject_location_remediations (
  id             TEXT PRIMARY KEY,           -- uuid (Worker-generated)
  subject_id     TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  before_hash    TEXT NOT NULL,              -- sha256 of prior normalized_location JSON
  after_hash     TEXT NOT NULL,              -- sha256 of remediated normalized_location JSON
  manifest_sha   TEXT NOT NULL,              -- sha256 of the manifest that authorized this row
  actor          TEXT NOT NULL,              -- 'release:<workflow-run>' | reviewer handle
  remediated_at  INTEGER NOT NULL            -- unix ms
);

CREATE INDEX idx_location_remediations_subject ON subject_location_remediations(subject_id);
CREATE INDEX idx_location_remediations_manifest ON subject_location_remediations(manifest_sha);
