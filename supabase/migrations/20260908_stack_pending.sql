-- Message Stack delivery pipeline (comment → private reply → lead replies →
-- full stack). Meta only allows text/button templates as comment private
-- replies, so phase 1 sends the first text/button block and enrolls the
-- commenter here; phase 2 fires when their reply opens the 24h window.
create table if not exists stack_pending (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  automation_id uuid not null references automations(id) on delete cascade,
  instagram_account_id uuid references instagram_accounts(id) on delete set null,
  recipient_ig_id text not null,
  recipient_username text,
  pre_sent_count int not null default 0,
  status text not null default 'waiting',   -- waiting | delivered | expired
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

-- Hot lookup: "does this sender have a pending stack for this user?"
create index if not exists stack_pending_lookup
  on stack_pending (user_id, recipient_ig_id, status, created_at desc);

alter table stack_pending enable row level security;

-- Owners can read their own pending stacks (Messages/automation UI).
-- All writes go through the webhook/service role.
create policy "stack_pending owner read"
  on stack_pending for select to authenticated
  using (auth.uid() = user_id);
