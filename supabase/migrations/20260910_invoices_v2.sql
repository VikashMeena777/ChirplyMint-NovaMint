-- Invoice v2: sequential financial-year numbers + uniqueness per order
alter table invoices add column if not exists invoice_number text;
create unique index if not exists invoices_order_unique on invoices (order_id);
create index if not exists invoices_number_idx on invoices (invoice_number);
-- Backfill any existing rows with sequential numbers via subquery
update invoices i
set invoice_number = 'CM/' || to_char(i.paid_at, 'YYYY') || '/' || lpad(s.rn::text, 5, '0')
from (
  select id, row_number() over (order by paid_at) as rn from invoices
) s
where i.id = s.id and i.invoice_number is null;
