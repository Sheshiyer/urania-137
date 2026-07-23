-- 0003_chat_turn_events (chat onboarding, Phase 1 W2): SSE event-id + replay
-- support. Each narrator turn persists the exact ChatEvent sequence it
-- emitted (JSON array, in emission order, reply_start..reply_end inclusive).
-- Event ids are NOT stored: the id space is derived at read time as the
-- 1-based ordinal position in the session's concatenated persisted event
-- stream (turns ordered by created_at, rowid), so live streams and the
-- replay endpoint (GET /api/chat/session/:id/events?after=<n>) always agree.
--
-- User turns carry NULL (they emit no SSE events). The column is nullable so
-- pre-0003 rows keep working: they simply contribute nothing to replay.

ALTER TABLE chat_turns ADD COLUMN events TEXT;  -- JSON ChatEvent[] | NULL (narrator turns only)
