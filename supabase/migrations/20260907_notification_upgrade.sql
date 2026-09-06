-- Notification system upgrade (2026-09-07)
-- Milestone ladder + review-request tracking for the email/notification overhaul.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS milestone_50_email_sent BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS milestone_500_email_sent BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS milestone_1000_email_sent BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS review_request_sent_at TIMESTAMPTZ;

-- These are server-managed flags: block client writes (column-grant hardening
-- added 2026-09-06 grants an explicit allowlist, so new columns are NOT
-- writable by users — no further action needed).
