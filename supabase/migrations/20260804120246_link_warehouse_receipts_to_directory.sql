alter table public.warehouse_receipts add column if not exists directory_customer_id uuid references public.customer_directory(id) on delete set null;
create index if not exists warehouse_receipts_directory_customer_idx on public.warehouse_receipts(directory_customer_id);
;
