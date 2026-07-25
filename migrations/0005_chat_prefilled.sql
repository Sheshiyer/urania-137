-- 0005_chat_prefilled (Threshold W0-A): persist the prefill count on chat
-- sessions. Profile-prefilled sessions (seed.prefilledSubjects) must resume
-- with the same chapter routing they were created with — the count drives
-- chapterSequence's subjects-skip logic and cannot be reconstructed from the
-- intake JSON alone. Set once at session creation; never updated after.
ALTER TABLE chat_sessions ADD COLUMN prefilled_count INTEGER NOT NULL DEFAULT 0;
