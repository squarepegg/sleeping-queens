-- Seed data for testing (optional)

-- Insert a test game for development
INSERT INTO games (id, room_code, state, max_players, current_players) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'TEST01',
  '{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "players": [],
    "currentPlayerIndex": 0,
    "sleepingQueens": [],
    "deck": [],
    "discardPile": [],
    "phase": "waiting",
    "winner": null,
    "createdAt": 1700000000000,
    "updatedAt": 1700000000000,
    "roomCode": "TEST01",
    "maxPlayers": 5
  }'::jsonb,
  5,
  0
) ON CONFLICT (room_code) DO NOTHING;

-- Insert test user sessions for development
INSERT INTO user_sessions (username, session_token) VALUES 
  ('TestPlayer1', 'test-token-1'),
  ('TestPlayer2', 'test-token-2'),
  ('TestPlayer3', 'test-token-3')
ON CONFLICT (username) DO NOTHING;