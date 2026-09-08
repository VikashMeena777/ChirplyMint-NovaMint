-- D9: revenue/conversion attribution — bio link clicks attributed to leads
-- when DMs carry tagged links (?cmk_lead=<ig scoped id>).
alter table bio_link_clicks add column if not exists lead_ig_id text;
create index if not exists bio_clicks_lead_idx on bio_link_clicks (lead_ig_id);
-- quick revenue placeholder: owners can mark a converted lead's value later
alter table leads add column if not exists attributed_value numeric default 0;
