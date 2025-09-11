-- Create the games table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  room_code TEXT UNIQUE NOT NULL,
  max_players INTEGER DEFAULT 5,
  current_players INTEGER DEFAULT 0
);

-- Create the players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT NOT NULL,
  position INTEGER,
  is_connected BOOLEAN DEFAULT true,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, user_id)
);

-- Create the game_moves table for history/replay
CREATE TABLE IF NOT EXISTS game_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  move_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the user_sessions table for simple auth
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_games_room_code ON games(room_code);
CREATE INDEX IF NOT EXISTS idx_games_active ON games(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_players_game_id ON players(game_id);
CREATE INDEX IF NOT EXISTS idx_players_connected ON players(is_connected) WHERE is_connected = true;
CREATE INDEX IF NOT EXISTS idx_game_moves_game_id ON game_moves(game_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_username ON user_sessions(username);

-- Create updated_at trigger for games
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update current_players count
CREATE OR REPLACE FUNCTION update_game_player_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE games 
    SET current_players = (
      SELECT COUNT(*) 
      FROM players 
      WHERE game_id = NEW.game_id AND is_connected = true
    )
    WHERE id = NEW.game_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE games 
    SET current_players = (
      SELECT COUNT(*) 
      FROM players 
      WHERE game_id = NEW.game_id AND is_connected = true
    )
    WHERE id = NEW.game_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE games 
    SET current_players = (
      SELECT COUNT(*) 
      FROM players 
      WHERE game_id = OLD.game_id AND is_connected = true
    )
    WHERE id = OLD.game_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_player_count AFTER INSERT OR UPDATE OR DELETE ON players
  FOR EACH ROW EXECUTE FUNCTION update_game_player_count();

-- Enable Row Level Security (RLS)
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for games table
CREATE POLICY "Games are viewable by everyone" ON games FOR SELECT USING (true);
CREATE POLICY "Games can be inserted by everyone" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "Games can be updated by everyone" ON games FOR UPDATE USING (true);

-- Create policies for players table  
CREATE POLICY "Players are viewable by everyone" ON players FOR SELECT USING (true);
CREATE POLICY "Players can be inserted by everyone" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Players can be updated by everyone" ON players FOR UPDATE USING (true);
CREATE POLICY "Players can be deleted by everyone" ON players FOR DELETE USING (true);

-- Create policies for game_moves table
CREATE POLICY "Game moves are viewable by everyone" ON game_moves FOR SELECT USING (true);
CREATE POLICY "Game moves can be inserted by everyone" ON game_moves FOR INSERT WITH CHECK (true);

-- Create policies for user_sessions table
CREATE POLICY "User sessions are viewable by owner" ON user_sessions FOR SELECT USING (true);
CREATE POLICY "User sessions can be inserted by everyone" ON user_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "User sessions can be updated by owner" ON user_sessions FOR UPDATE USING (true);