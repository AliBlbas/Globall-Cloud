alter table public.warehouse_receipts add column if not exists consolidated boolean not null default false;
create index if not exists warehouse_receipts_consolidated_idx on public.warehouse_receipts(consolidated);

alter table public.warehouse_receipts add column if not exists directory_phone text;
update public.warehouse_receipts wr set directory_phone = cd.phone
  from public.customer_directory cd where wr.directory_customer_id = cd.id and wr.directory_phone is null;
;
