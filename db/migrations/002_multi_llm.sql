-- PlayRank multi-LLM channel analysis cache

CREATE TABLE IF NOT EXISTS channel_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id VARCHAR(50) NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  analysis_type VARCHAR(20) NOT NULL DEFAULT 'deep',
  filter_score DECIMAL(3,2),
  filter_trusted BOOLEAN,
  filter_flags JSONB,
  filter_reason TEXT,
  gpt_summary JSONB,
  claude_analysis JSONB,
  gemini_classification JSONB,
  perplexity_trends JSONB,
  overall_score INT,
  recommendation VARCHAR(50),
  executive_summary TEXT,
  key_insights JSONB,
  recommendations JSONB,
  processing_time_ms INT,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, language, analysis_type)
);

CREATE INDEX IF NOT EXISTS idx_channel_analyses_channel ON channel_analyses(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_analyses_processed ON channel_analyses(processed_at DESC);
