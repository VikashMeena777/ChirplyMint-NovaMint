-- Lead engagement tracking: auto-lifecycle powered by webhook signals
-- (button taps, replies, reactions, contact sharing).
-- new = captured, interested = engaged with a DM/button/reaction,
-- converted = tagged customer manually.
alter table leads add column if not exists engagement text not null default 'new';
create index if not exists leads_engagement_idx on leads (user_id, engagement);
