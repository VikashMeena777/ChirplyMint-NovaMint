-- Lead interaction timeline: every quick-reply / button tap recorded with
-- its payload, so the Leads page can show WHAT each lead tapped.
alter table leads add column if not exists interactions jsonb not null default '[]';
