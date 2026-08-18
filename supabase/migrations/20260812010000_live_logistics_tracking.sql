-- Globall Cloud live logistics tracking foundation.
-- Coordinates are optional so existing shipments remain compatible.

alter table public.shipments
  add column if not exists origin_lat numeric,
  add column if not exists origin_lng numeric,
  add column if not exists dest_lat numeric,
  add column if not exists dest_lng numeric,
  add column if not exists current_lat numeric,
  add column if not exists current_lng numeric,
  add column if not exists current_location_label text,
  add column if not exists transport_mode text,
  add column if not exists tracking_updated_at timestamptz;

create index if not exists shipments_current_location_idx
  on public.shipments (current_lat, current_lng)
  where current_lat is not null and current_lng is not null;

create table if not exists public.shipment_tracking_events (
  id bigint generated always as identity primary key,
  shipment_id text not null references public.shipments(id) on delete cascade,
  status_key text not null,
  title text,
  note text,
  location_label text,
  lat numeric,
  lng numeric,
  occurred_at timestamptz not null default now(),
  photos jsonb not null default '[]'::jsonb,
  created_by uuid references public.staff(id),
  created_by_name text,
  created_at timestamptz not null default now(),
  is_public boolean not null default true
);

create index if not exists shipment_tracking_events_shipment_idx
  on public.shipment_tracking_events (shipment_id, occurred_at desc);
create index if not exists shipment_tracking_events_public_idx
  on public.shipment_tracking_events (shipment_id, occurred_at desc)
  where is_public = true;

alter table public.shipment_tracking_events enable row level security;

drop policy if exists shipment_tracking_events_staff_select on public.shipment_tracking_events;
drop policy if exists shipment_tracking_events_staff_insert on public.shipment_tracking_events;
drop policy if exists shipment_tracking_events_customer_select on public.shipment_tracking_events;

create policy shipment_tracking_events_staff_select
on public.shipment_tracking_events
for select to authenticated
using ((select public.is_staff()));

create policy shipment_tracking_events_staff_insert
on public.shipment_tracking_events
for insert to authenticated
with check ((select public.is_staff()) and created_by = (select auth.uid()));

create policy shipment_tracking_events_customer_select
on public.shipment_tracking_events
for select to authenticated
using (
  exists (
    select 1 from public.shipments s
    where s.id = shipment_tracking_events.shipment_id
      and s.customer_user_id = (select auth.uid())
  )
);

do $$
begin
  alter publication supabase_realtime add table public.shipment_tracking_events;
exception when duplicate_object then
  null;
end $$;
