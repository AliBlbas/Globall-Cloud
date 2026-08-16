alter table public.shipments add column if not exists batch_code text;
create index if not exists shipments_batch_code_idx on public.shipments(batch_code);

create table if not exists public.warehouse_receipts (
  id bigint generated always as identity primary key,
  batch_code text not null,
  location text not null default 'Dubai',
  photos jsonb not null default '[]'::jsonb,
  notes text,
  received_at timestamptz not null default now(),
  created_by uuid references public.staff(id) on delete set null,
  created_by_name text,
  created_at timestamptz not null default now()
);

alter table public.warehouse_receipts enable row level security;

drop policy if exists warehouse_receipts_staff_select on public.warehouse_receipts;
create policy warehouse_receipts_staff_select on public.warehouse_receipts
  for select to authenticated using (is_staff());

drop policy if exists warehouse_receipts_staff_insert on public.warehouse_receipts;
create policy warehouse_receipts_staff_insert on public.warehouse_receipts
  for insert to authenticated with check (is_staff());

drop policy if exists warehouse_receipts_staff_delete on public.warehouse_receipts;
create policy warehouse_receipts_staff_delete on public.warehouse_receipts
  for delete to authenticated using (is_staff());

grant select, insert, delete on public.warehouse_receipts to authenticated;
grant usage, select on sequence public.warehouse_receipts_id_seq to authenticated;

create index if not exists warehouse_receipts_batch_code_idx on public.warehouse_receipts(batch_code);
create index if not exists warehouse_receipts_received_at_idx on public.warehouse_receipts(received_at desc);

insert into storage.buckets (id, name, public)
values ('warehouse-receipts', 'warehouse-receipts', true)
on conflict (id) do nothing;

drop policy if exists "warehouse_receipts_public_read" on storage.objects;
create policy "warehouse_receipts_public_read" on storage.objects
  for select using (bucket_id = 'warehouse-receipts');

drop policy if exists "warehouse_receipts_staff_write" on storage.objects;
create policy "warehouse_receipts_staff_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'warehouse-receipts' and is_staff());

drop policy if exists "warehouse_receipts_staff_delete" on storage.objects;
create policy "warehouse_receipts_staff_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'warehouse-receipts' and is_staff());
;
