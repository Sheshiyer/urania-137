-- 0004_subjects (Threshold W0-A): persistent subject profiles.
-- The Threshold collects birth fundamentals ONCE (role 'self'); doorway chats
-- prefill from these rows and collect only deltas. Circle members (partner,
-- family, …) persist only after an explicit opt-in ("hold for next time?").
-- Rows are exactly the SPA's SubjectInput shape + role + timestamps.

CREATE TABLE subjects (
  id                    TEXT PRIMARY KEY,           -- uuid (Worker-generated)
  user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role                  TEXT NOT NULL,              -- 'self' | 'partner' | 'family' | …
  name                  TEXT NOT NULL,
  birth_date            TEXT NOT NULL,              -- strict YYYY-MM-DD (real calendar date)
  birth_time            TEXT NOT NULL,              -- strict HH:MM 24h (noon convention when unknown)
  birth_time_confidence TEXT NOT NULL,              -- exact | approximate | unknown
  birth_location_query  TEXT NOT NULL,
  normalized_location   TEXT NOT NULL,              -- JSON NormalizedLocation
  created_at            INTEGER NOT NULL,           -- unix ms (Worker-set)
  updated_at            INTEGER NOT NULL
);

CREATE INDEX idx_subjects_user ON subjects(user_id, created_at);
-- At most one 'self' row per user — the Threshold writes it exactly once.
CREATE UNIQUE INDEX idx_subjects_self ON subjects(user_id) WHERE role = 'self';
