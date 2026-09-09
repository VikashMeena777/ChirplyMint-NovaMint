-- Round 19: inbox, trial, top-ups, funnel
-- Pause AI for specific leads (inbox takeover)
alter table leads add column if not exists ai_paused boolean not null default false;

-- Free trial tracking (one per account)
alter table profiles add column if not exists trial_used boolean not null default false;
alter table profiles add column if not exists trial_ends_at timestamptz;

-- DM top-up packs (impulse purchase): +500 DMs
alter table profiles add column if not exists dm_topup_balance int not null default 0;

-- Invoice records for downloads (Business/pro buyers)
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  order_id text not null,
  amount numeric not null,
  currency text not null default 'INR',
  plan text not null,
  description text,
  paid_at timestamptz not null default now()
);
create index if not exists invoices_user_idx on invoices (user_id, paid_at desc);
alter table invoices enable row level security;
create policy "invoices owner read" on invoices for select to authenticated
  using (auth.uid() = user_id);
