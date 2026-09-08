-- D8: Public API keys (Business plan). Hashed at rest — the raw key is
-- shown once at creation. Scopes: read-only v1 endpoints.
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null default 'API key',
  key_prefix text not null,          -- first 12 chars for identification
  key_hash text not null,            -- sha256 of full key
  last_used_at timestamptz,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists api_keys_user_idx on api_keys (user_id, revoked);
alter table api_keys enable row level security;
create policy "api_keys owner all" on api_keys for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
