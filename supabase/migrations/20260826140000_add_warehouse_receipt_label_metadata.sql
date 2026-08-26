alter table public.warehouse_receipts
  add column if not exists label_metadata jsonb not null default '{}'::jsonb,
  add column if not exists whatsapp_message text,
  add column if not exists evidence_version integer not null default 1;

create index if not exists warehouse_receipts_gc_code_detected_idx
  on public.warehouse_receipts(gc_code_detected);

create index if not exists warehouse_receipts_shipment_id_idx
  on public.warehouse_receipts(shipment_id);
