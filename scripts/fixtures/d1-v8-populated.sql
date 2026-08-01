PRAGMA foreign_keys = ON;

INSERT INTO users (id, email, created_at, last_seen_at) VALUES
  ('user-a', 'alpha@example.test', 1700000000000, 1700000000000),
  ('user-b', 'beta@example.test', 1700000000000, 1700000000000);

INSERT INTO readings (id, user_id, node_id, node_label, mode, title, content, raw, favorite, created_at)
VALUES ('reading-a', 'user-a', 'birth', 'Birth', 'natal', 'Fixture reading', 'Fixture content', NULL, 0, 1700000000000);

INSERT INTO chat_sessions (
  session_id, user_id, seed, chapter, subject_index, intake, created_at, updated_at, prefilled_count
) VALUES (
  'session-a', 'user-a', '{"nodeId":"birth"}', 'subjects', 0, '{}',
  '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 1
);

INSERT INTO chat_turns (turn_id, session_id, role, blocks, chapter, created_at, events)
VALUES (
  'turn-a', 'session-a', 'narrator', '[{"type":"text","text":"Fixture"}]', 'subjects',
  '2026-01-01T00:00:01.000Z', '[{"type":"reply_start"},{"type":"reply_end"}]'
);

INSERT INTO subjects (
  id, user_id, role, name, birth_date, birth_time, birth_time_confidence,
  birth_location_query, normalized_location, created_at, updated_at
) VALUES
  (
    'subject-a', 'user-a', 'self', 'Alpha', '1990-01-01', '12:00', 'exact', 'Chennai',
    '{"display_name":"Chennai","latitude":13.0827,"longitude":80.2707,"timezone":"Asia/Kolkata","provider":"fixture","confidence":"geocoded"}',
    1700000000000, 1700000000000
  ),
  (
    'subject-b', 'user-b', 'self', 'Beta', '1991-02-02', '13:00', 'exact', 'Kathmandu',
    '{"display_name":"Kathmandu","latitude":27.7172,"longitude":85.324,"timezone":"Asia/Kathmandu","provider":"fixture","confidence":"geocoded"}',
    1700000000000, 1700000000000
  );

INSERT INTO relationship_invitations (
  id, created_by_user_id, invitee_email, invite_token_hash, status, expires_at,
  accepted_at, declined_at, revoked_at, created_at, updated_at
) VALUES (
  'relationship-a', 'user-a', 'beta@example.test', NULL, 'active', 1800000000000,
  1700000001000, NULL, NULL, 1700000000000, 1700000001000
);

INSERT INTO relationship_participants (
  relationship_id, role, user_id, subject_id, consent_status, consented_at,
  revoked_at, created_at, updated_at
) VALUES
  ('relationship-a', 'inviter', 'user-a', 'subject-a', 'active', 1700000000000, NULL, 1700000000000, 1700000000000),
  ('relationship-a', 'invitee', 'user-b', 'subject-b', 'active', 1700000001000, NULL, 1700000000000, 1700000001000);

INSERT INTO relationship_synastry_generations (
  id, relationship_id, requested_by_user_id, mode, request_sha256,
  response_sha256, result_json, created_at
) VALUES (
  'generation-a', 'relationship-a', 'user-a', 'synastry',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  '{"reading":"fixture"}', 1700000002000
);

INSERT INTO relationship_reading_grants (
  generation_id, relationship_id, user_id, subject_id, visibility, granted_at
) VALUES
  ('generation-a', 'relationship-a', 'user-a', 'subject-a', 'participant', 1700000002000),
  ('generation-a', 'relationship-a', 'user-b', 'subject-b', 'participant', 1700000002000);

INSERT INTO relationship_generation_audit (
  id, generation_id, relationship_id, actor_user_id, event, created_at
) VALUES ('audit-a', 'generation-a', 'relationship-a', 'user-a', 'committed', 1700000002000);

INSERT INTO reading_interpretations (
  id, reading_id, owner_user_id, idempotency_key, route, interpretation_depth,
  consciousness_level, question, answer, context_packet_hash, fact_lock_hash,
  source_refs_json, provenance_json, created_at
) VALUES (
  'interpretation-a', 'reading-a', 'user-a', 'fixture-key', 'pattern', 2, 3,
  'Fixture question?', 'Fixture answer.',
  'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
  'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
  '["reading-a"]', '{"source":"fixture"}', 1700000003000
);
