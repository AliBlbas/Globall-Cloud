begin;

-- Common analytics / timeline access paths
create index if not exists shipments_created_at_desc_idx
  on public.shipments (created_at desc);

create index if not exists lg_shipments_created_at_desc_idx
  on public.lg_shipments (created_at desc);

create index if not exists lg_tracking_events_occurred_at_desc_idx
  on public.lg_tracking_events (occurred_at desc);

-- Missing covering indexes for foreign keys flagged by Supabase advisors
create index if not exists lg_routes_shipment_id_idx
  on public.lg_routes (shipment_id);

create index if not exists lg_shipments_order_id_idx
  on public.lg_shipments (order_id);

create index if not exists lg_tracking_events_shipment_id_idx
  on public.lg_tracking_events (shipment_id);

create index if not exists lg_warehouse_stock_item_id_idx
  on public.lg_warehouse_stock (item_id);

create index if not exists staff_activity_log_staff_id_idx
  on public.staff_activity_log (staff_id);

create index if not exists warehouse_receipts_created_by_idx
  on public.warehouse_receipts (created_by);

-- Remove the duplicate shipments directory-customer index; keep the explicitly named one.
drop index if exists public.idx_shipments_dir_customer;

commit;;
