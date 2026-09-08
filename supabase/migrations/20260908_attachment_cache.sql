-- Attachment-ID media cache (reusable attachments): stores the attachment_id
-- returned by POST /{ig-user-id}/message_attachments (is_reusable:true) keyed
-- by asset URL, so every later send of the same image/file skips the upload
-- round-trip entirely and lands instantly across all recipients.
create table if not exists attachment_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  ig_account_id uuid references instagram_accounts(id) on delete set null,
  asset_url text not null,
  asset_type text not null check (asset_type in ('image','file')),
  attachment_id text not null,
  created_at timestamptz default now(),
  unique (asset_url, asset_type, user_id)
);

alter table attachment_cache enable row level security;

-- Owners can read their cached attachment ids (UI/debug).
-- All writes come from the webhook via the service role, which bypasses
-- RLS — no insert/update policies needed.
create policy "attachment_cache owner read"
  on attachment_cache for select to authenticated
  using (auth.uid() = user_id);
