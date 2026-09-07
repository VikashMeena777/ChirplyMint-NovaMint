-- Read receipts (messaging_seen webhook field): when a lead reads our DM,
-- stamp the outbound dm_logs rows for that conversation. Powers the "seen"
-- indicator in the Messages UI.
ALTER TABLE dm_logs ADD COLUMN IF NOT EXISTS seen_at timestamptz;

-- dm_logs rows are inserted by the webhook (service role). Mark seen via
-- service role too, so no RLS policy change is needed; but the owner user
-- must be able to READ seen_at in the dashboard.
GRANT SELECT (seen_at) ON dm_logs TO authenticated;
