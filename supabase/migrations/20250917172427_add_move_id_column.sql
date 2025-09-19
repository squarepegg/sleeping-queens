-- Add move_id column to game_moves table for idempotency
ALTER TABLE game_moves
ADD COLUMN IF NOT EXISTS move_id TEXT;

-- Create an index for faster lookups (but not unique yet, to handle existing null values)
CREATE INDEX IF NOT EXISTS idx_game_moves_move_id ON game_moves(move_id) WHERE move_id IS NOT NULL;

-- Add a unique constraint on game_id + move_id combination
-- This ensures the same move_id can't be used twice for the same game
ALTER TABLE game_moves
ADD CONSTRAINT unique_game_move_id UNIQUE (game_id, move_id);

-- Comment on the column
COMMENT ON COLUMN game_moves.move_id IS 'Unique identifier for idempotent move processing';