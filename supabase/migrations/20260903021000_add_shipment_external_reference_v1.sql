alter table public.shipments add column if not exists external_reference text;
create index if not exists shipments_external_reference_idx on public.shipments(external_reference) where external_reference is not null;
