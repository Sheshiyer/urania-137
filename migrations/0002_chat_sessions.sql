-- 0002_chat_sessions (chat onboarding, Phase 1 W1-A): narrative chat session
-- persistence. chat_sessions holds the resumable ChatSessionState (seed /
-- chapter cursor / partially-filled intake as JSON); chat_turns holds the
-- persisted ChatMsg per turn (one user msg + one narrator msg per turn).
--
-- Unlike migration 0001 (unix ms integers), timestamps here are ISO 8601 TEXT
-- to match the canonical chat contract (ChatSessionState.createdAt/updatedAt,
-- ChatMsg.createdAt in src/types/chat.ts). User scoping mirrors readings:
-- every read/write binds user_id (sessions) or goes through the owning
-- session (turns), so cross-user ids simply match zero rows.

CREATE TABLE chat_sessions (
  session_id    TEXT PRIMARY KEY,        -- uuid (Worker-generated)
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seed          TEXT NOT NULL,           -- JSON ChildRun (capability card from the clicked node)
  chapter       TEXT NOT NULL,           -- StoryChapter cursor
  subject_index INTEGER NOT NULL DEFAULT 0,
  intake        TEXT NOT NULL,           -- JSON Partial<AssetGenerateRequest>
  created_at    TEXT NOT NULL,           -- ISO 8601
  updated_at    TEXT NOT NULL            -- ISO 8601
);

CREATE INDEX idx_chat_sessions_user_time ON chat_sessions(user_id, updated_at DESC);

CREATE TABLE chat_turns (
  turn_id    TEXT PRIMARY KEY,           -- uuid (Worker-generated), == ChatMsg.id
  session_id TEXT NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
  role       TEXT NOT NULL,              -- 'user' | 'narrator' | 'system'
  blocks     TEXT NOT NULL,              -- JSON ChatBlock[]
  chapter    TEXT NOT NULL,              -- StoryChapter the msg was authored in
  created_at TEXT NOT NULL               -- ISO 8601
);

-- created_at ties are broken by rowid so same-millisecond turns keep
-- insertion order (the DAL orders by created_at ASC, rowid ASC).
CREATE INDEX idx_chat_turns_session_time ON chat_turns(session_id, created_at);
