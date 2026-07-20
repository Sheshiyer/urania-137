-- 0001_init (T-003): users + readings for per-user reading storage.
-- readings is a 1:1 superset of the SPA's FolioEntry so the Folio migrates cleanly.

CREATE TABLE users (
  id           TEXT PRIMARY KEY,          -- CF Access sub, else SHA-256 of lowercased email
  email        TEXT NOT NULL UNIQUE,
  created_at   INTEGER NOT NULL,          -- unix ms (Worker-set)
  last_seen_at INTEGER NOT NULL
);

CREATE TABLE readings (
  id          TEXT PRIMARY KEY,           -- uuid (Worker-generated)
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_id     TEXT NOT NULL,
  node_label  TEXT NOT NULL,
  mode        TEXT NOT NULL,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  raw         TEXT,
  favorite    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

CREATE INDEX idx_readings_user_time ON readings(user_id, created_at DESC);
CREATE INDEX idx_readings_user_fav  ON readings(user_id, favorite);
