-- 0010_subject_location_quality (Task 8): additive location-quality metadata
-- on subjects, WITHOUT rewriting normalized_location.
--
-- Quarantines ambiguous/placeholder birth locations so the audit can flag
-- profiles for human review instead of silently computing from a (0,0) or
-- Etc/GMT placeholder. Columns are additive with safe defaults; existing rows
-- are untouched (location_status defaults to 'unchecked').

ALTER TABLE subjects ADD COLUMN location_status TEXT NOT NULL DEFAULT 'unchecked';
ALTER TABLE subjects ADD COLUMN location_checked_at INTEGER;
ALTER TABLE subjects ADD COLUMN location_issue TEXT;

CREATE INDEX idx_subjects_location_status ON subjects(location_status);
CREATE INDEX idx_subjects_location_checked ON subjects(location_checked_at);
