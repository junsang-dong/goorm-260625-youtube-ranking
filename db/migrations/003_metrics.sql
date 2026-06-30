-- Per-LLM timing and cost metrics for cached analyses

ALTER TABLE channel_analyses
  ADD COLUMN IF NOT EXISTS metrics JSONB;
