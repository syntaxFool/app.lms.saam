-- Migration 010: Add sessions table for single-session enforcement and inactivity tracking
-- This enables:
-- 1. Single session per user (invalidate old sessions on new login)
-- 2. 40-minute inactivity timeout
-- 3. Session validity checking on each API request

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  token TEXT NOT NULL,
  device_info JSONB DEFAULT '{}',
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_sessions_last_activity ON sessions(last_activity);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON TABLE sessions IS 'Tracks active user sessions for single-session enforcement and inactivity timeout';
COMMENT ON COLUMN sessions.session_id IS 'Unique session identifier included in JWT token';
COMMENT ON COLUMN sessions.last_activity IS 'Last time user made an API request (for 40min inactivity check)';
COMMENT ON COLUMN sessions.device_info IS 'User agent and device information for session management';
