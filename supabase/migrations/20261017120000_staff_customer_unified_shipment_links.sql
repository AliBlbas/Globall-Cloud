-- Explicit per-customer membership for consolidated shipments.
-- Edge Functions write this table with the service role; browser clients cannot mutate it.
create table if not exists public.shipment_customer_links (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  customer_directory_id uuid not null references public.customer_directory(id) on delete restrict,
  customer_user_id uuid null references auth.users(id) on delete set null,
  customer_gc_code text null,
  created_by uuid null references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipment_customer_links_shipment_customer_key unique (shipment_id, customer_directory_id)
);
create index if not exists shipment_customer_links_shipment_idx on public.shipment_customer_links (shipment_id);
create index if not exists shipment_customer_links_directory_customer_idx on public.shipment_customer_links (customer_directory_id);
create index if not exists shipment_customer_links_auth_user_idx on public.shipment_customer_links (customer_user_id) where customer_user_id is not null;
alter table public.shipment_customer_links enable row level security;
revoke all on table public.shipment_customer_links from anon, authenticated;
grant all on table public.shipment_customer_links to service_role;
insert into public.shipment_customer_links (shipment_id,customer_directory_id,customer_user_id,customer_gc_code)
select distinct s.id,cd.id,cd.auth_user_id,coalesce(nullif(btrim(cd.gc_code),''),nullif(btrim(cd.code),''))
from public.shipments s join public.customer_directory cd on cd.id=s.directory_customer_id
where s.directory_customer_id is not null
on conflict (shipment_id,customer_directory_id) do update
set customer_user_id=excluded.customer_user_id,
    customer_gc_code=coalesce(excluded.customer_gc_code,public.shipment_customer_links.customer_gc_code),
    updated_at=now();
insert into public.shipment_customer_links (shipment_id,customer_directory_id,customer_user_id,customer_gc_code)
select distinct ci.shipment_id,cd.id,cd.auth_user_id,coalesce(nullif(btrim(cd.gc_code),''),nullif(btrim(cd.code),''))
from public.shipment_cargo_items ci join public.customer_directory cd on cd.id=ci.customer_directory_id
where ci.shipment_id is not null and ci.customer_directory_id is not null
on conflict (shipment_id,customer_directory_id) do update
set customer_user_id=excluded.customer_user_id,
    customer_gc_code=coalesce(excluded.customer_gc_code,public.shipment_customer_links.customer_gc_code),
    updated_at=now();
