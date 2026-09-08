-- D6: Team seats (Business plan, 3 seats). Owner invites by email; the
-- invitee accepts via /invite/<token>. Members appear in the roster.
create table if not exists team_invites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  email text not null,
  token text not null unique,
  status text not null default 'pending',  -- pending | accepted | revoked
  invited_by_email text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create index if not exists team_invites_owner_idx on team_invites (owner_id, status);
alter table team_invites enable row level security;
create policy "team_invites owner all" on team_invites for all to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  member_user_id uuid not null references profiles(id) on delete cascade,
  member_email text not null,
  role text not null default 'member',     -- member | admin
  created_at timestamptz not null default now(),
  unique (owner_id, member_user_id)
);
create index if not exists team_members_owner_idx on team_members (owner_id);
alter table team_members enable row level security;
create policy "team_members owner read" on team_members for select to authenticated
  using (auth.uid() = owner_id or auth.uid() = member_user_id);
