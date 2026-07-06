-- Add retry columns to dm_logs for rate-limited DM retry queue
-- These columns enable the dm-retry cron to pick up and retry failed DMs

ALTER TABLE dm_logs
ADD COLUMN IF NOT EXISTS retry_after timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;

-- Index for the retry cron query: find rate_limited DMs ready for retry
CREATE INDEX IF NOT EXISTS idx_dm_logs_retry
ON dm_logs (status, retry_after)
WHERE status = 'rate_limited';

-- Comment explaining the status values
COMMENT ON COLUMN dm_logs.status IS 'sent | failed | rate_limited (queued for retry)';
COMMENT ON COLUMN dm_logs.retry_after IS 'When this DM should be retried (NULL = no retry needed)';
COMMENT ON COLUMN dm_logs.retry_count IS 'Number of retry attempts (max 3 before marking as failed)';
