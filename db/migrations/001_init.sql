-- PlayRank initial schema

CREATE TABLE IF NOT EXISTS channels (
  channel_id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  region_code CHAR(2),
  subscriber_count BIGINT DEFAULT 0,
  view_count BIGINT DEFAULT 0,
  video_count INT DEFAULT 0,
  thumbnail_url TEXT,
  description TEXT,
  tags TEXT[],
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS rankings (
  id SERIAL PRIMARY KEY,
  channel_id VARCHAR(50) NOT NULL REFERENCES channels(channel_id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  region_code CHAR(2),
  rank INT NOT NULL,
  popularity_score BIGINT NOT NULL,
  snapshot_date DATE NOT NULL,
  UNIQUE(channel_id, category, region_code, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_rankings_lookup
  ON rankings(category, region_code, snapshot_date);

CREATE TABLE IF NOT EXISTS ai_insights (
  channel_id VARCHAR(50) PRIMARY KEY,
  insight_text TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL,
  channel_id VARCHAR(50) NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_session ON favorites(session_id);
