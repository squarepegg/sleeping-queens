-- Create the health_checks table for keep-alive monitoring
-- This table is used to prevent Supabase from pausing due to inactivity
CREATE TABLE IF NOT EXISTS health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source TEXT DEFAULT 'external'
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_health_checks_checked_at ON health_checks(checked_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE health_checks ENABLE ROW LEVEL SECURITY;

-- Create policies - allow everyone to read and insert health checks
CREATE POLICY "Health checks are viewable by everyone" ON health_checks FOR SELECT USING (true);
CREATE POLICY "Health checks can be inserted by everyone" ON health_checks FOR INSERT WITH CHECK (true);

-- Optional: Function to clean up old health check records (keep only last 100)
CREATE OR REPLACE FUNCTION cleanup_old_health_checks()
RETURNS void AS $$
BEGIN
  DELETE FROM health_checks
  WHERE id NOT IN (
    SELECT id FROM health_checks
    ORDER BY checked_at DESC
    LIMIT 100
  );
END;
$$ LANGUAGE plpgsql;
