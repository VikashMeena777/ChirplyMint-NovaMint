-- Widen the subscriptions.status check to match the app's state machine.
-- Old constraint only allowed (active, cancelled, past_due, trialing) but
-- the app writes: canceled (single-L), grace_period, expired.
-- Both cancelled spellings kept for any legacy rows.
alter table subscriptions drop constraint if exists subscriptions_status_check;
alter table subscriptions add constraint subscriptions_status_check
  check (status = any (array[
    'active'::text,
    'grace_period'::text,
    'canceled'::text,
    'cancelled'::text,
    'expired'::text,
    'past_due'::text,
    'trialing'::text
  ]));
