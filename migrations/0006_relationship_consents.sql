-- 0006_relationship_consents: consent-gated cross-account relationships.
--
-- Invitations carry only a SHA-256 token hash. The opaque bearer token is
-- returned by the Worker exactly once and can never be recovered from D1.
-- A relationship becomes active only after the intended email accepts and
-- binds a subject they personally own.

-- SQLite requires an explicitly unique parent key for the composite foreign
-- key below. `id` remains the subjects primary key; this index additionally
-- lets D1 enforce that every participant's subject belongs to that user.
CREATE UNIQUE INDEX idx_subjects_id_user ON subjects(id, user_id);

CREATE TABLE relationship_invitations (
  id                 TEXT PRIMARY KEY, -- uuid (Worker-generated)
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_email      TEXT NOT NULL,
  invite_token_hash  TEXT UNIQUE,      -- lowercase SHA-256 hex; cleared after use
  status             TEXT NOT NULL CHECK (
    status IN ('pending', 'active', 'declined', 'revoked', 'expired')
  ),
  expires_at         INTEGER NOT NULL, -- invitation expiry; active grants do not expire
  accepted_at        INTEGER,
  declined_at        INTEGER,
  revoked_at         INTEGER,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  CHECK (invitee_email = lower(trim(invitee_email)))
);

CREATE TABLE relationship_participants (
  relationship_id TEXT NOT NULL
    REFERENCES relationship_invitations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('inviter', 'invitee')),
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id      TEXT NOT NULL,
  consent_status  TEXT NOT NULL CHECK (
    consent_status IN ('pending', 'active', 'declined', 'revoked')
  ),
  consented_at    INTEGER,
  revoked_at      INTEGER,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  PRIMARY KEY (relationship_id, role),
  UNIQUE (relationship_id, user_id),
  FOREIGN KEY (subject_id, user_id)
    REFERENCES subjects(id, user_id) ON DELETE CASCADE
);

CREATE INDEX idx_relationship_invitations_creator
  ON relationship_invitations(created_by_user_id, created_at DESC);
CREATE INDEX idx_relationship_invitations_invitee
  ON relationship_invitations(invitee_email, status, created_at DESC);
CREATE INDEX idx_relationship_invitations_status_expiry
  ON relationship_invitations(status, expires_at);
CREATE INDEX idx_relationship_participants_user
  ON relationship_participants(user_id, updated_at DESC);
CREATE INDEX idx_relationship_participants_subject
  ON relationship_participants(subject_id);
