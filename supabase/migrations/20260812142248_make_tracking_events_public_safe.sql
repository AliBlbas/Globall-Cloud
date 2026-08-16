alter table public.shipment_tracking_events
  add column if not exists is_public boolean not null default true;

create index if not exists shipment_tracking_events_public_idx
  on public.shipment_tracking_events (shipment_id, occurred_at desc)
  where is_public = true;

;
