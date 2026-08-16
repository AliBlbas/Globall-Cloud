create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id text not null references public.shipments(id) on delete cascade,
  event_type text not null,
  status text,
  location text,
  note text,
  occurred_at timestamptz not null default now(),
  created_by uuid references public.staff(id) on delete set null,
  created_by_name text,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists shipment_events_shipment_id_idx on public.shipment_events (shipment_id, occurred_at desc);
create index if not exists shipment_events_event_type_idx on public.shipment_events (event_type);
alter table public.shipment_events enable row level security;
;
