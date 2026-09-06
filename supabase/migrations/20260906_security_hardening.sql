-- ─────────────────────────────────────────────────────────────────────────────
-- ChirplyMint — Migration 20260906: Security Hardening (LIVE-DB VERIFIED)
--
-- Verified against the LIVE Supabase database on 2026-09-06 via a behavioral
-- RLS probe (throwaway test user, then deleted). Confirmed on live:
--   1. Any logged-in user could PATCH their own profiles row and set
--      plan='business', dm_limit=99999  → free-plan-escalation hole.
--   2. Any logged-in user could INSERT a fabricated subscriptions row
--      (plan='business', status='active').
--   3. Any logged-in user could INSERT a fake payment_orders row with
--      status='paid' → the subscription-check cron's RENEWAL path reads
--      plan from that row and would self-renew the fake plan forever.
--   4. profiles on live is MISSING columns the app code writes:
--      business_name, instagram_handle, onboarding_complete
--      (onboarding was silently broken on live because of this).
--   5. dm_logs has no UPDATE policy → the retry-DM action's status update
--      silently matched 0 rows.
--
-- Server-side code (webhooks, crons, payment routes) uses the service_role
-- key, which bypasses RLS and column grants — server behavior is unchanged.
-- Safe to run on the live database. All statements are idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Add columns that exist in code but not on the live profiles table ───
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- Backfill: existing users must not be forced through onboarding again
-- (the column never existed, so nobody could have completed it).
UPDATE public.profiles SET onboarding_complete = true WHERE onboarding_complete = false;

-- ─── 2. dm_limit default matches the Starter plan (PLANS.free.dmLimit = 50) ─
ALTER TABLE public.profiles ALTER COLUMN dm_limit SET DEFAULT 50;
UPDATE public.profiles
SET dm_limit = 50
WHERE plan = 'free' AND dm_limit <> 50 AND dm_limit < 100000;

-- ─── 3. profiles: column-level UPDATE grants (P0 escalation fix) ────────────
-- Postgres RLS is row-level only, so sensitive columns are locked with
-- column-level privileges. Users keep updating only what the UI writes.
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;

GRANT UPDATE (
  full_name,
  avatar_url,
  business_name,
  instagram_handle,
  notification_preferences,
  onboarding_complete,
  setup_checklist_dismissed,
  updated_at
) ON TABLE public.profiles TO authenticated;

-- Server-only columns (NOT updatable by users):
--   plan, dm_limit, dm_count_this_month, dm_count_reset_at, email,
--   plan_expires_at, plan_upgraded_email_sent, referral_code, referred_by,
--   referral_count, onboarding_email_step, onboarding_email_next_at,
--   ig_connected_email_sent, last_limit_warning_at, last_engagement_email_at,
--   lifetime_dm_count, first_dm_email_sent, milestone_100_email_sent,
--   last_active_at

-- ─── 4. subscriptions: server-only writes (P1 fabrication fix) ──────────────
-- Subscription rows are created/updated exclusively by the Cashfree webhook,
-- the verify route, and the subscription-check cron (all service_role).
-- Drops any INSERT/UPDATE/DELETE/ALL policy regardless of its live name.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subscriptions'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.subscriptions', r.policyname);
  END LOOP;
END $$;

-- Ensure users can still SEE their own subscription (billing UI).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subscriptions' AND cmd = 'SELECT'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id)';
  END IF;
END $$;

-- ─── 5. payment_orders: server-only writes (fake-paid-order fix) ────────────
-- Orders are inserted only by /api/payments/create-order (switched to the
-- service-role client) and updated by the webhook/verify routes/cron.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payment_orders'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.payment_orders', r.policyname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payment_orders' AND cmd = 'SELECT'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view own orders" ON public.payment_orders FOR SELECT TO authenticated USING (auth.uid() = user_id)';
  END IF;
END $$;

-- ─── 6. dm_logs: users own their rows' visibility; UPDATE for retry flow ────
-- Drop the INSERT policy (only the webhook, via service_role, inserts logs).
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'dm_logs'
      AND cmd IN ('INSERT', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.dm_logs', r.policyname);
  END LOOP;
END $$;

-- The retry-DM action updates a failed log's status as the owner — this
-- policy was missing, so those updates silently did nothing until now.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'dm_logs' AND cmd = 'UPDATE'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update own dm_logs" ON public.dm_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;
