-- Production schema sync: keep repository migrations aligned with the live
-- operational contract used by Staff OS, Warehouse OS and logistics APIs.

alter table public.shipments
  add column if not exists customer_user_id uuid,
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists customer_email text,
  add column if not exists directory_customer_id uuid,
  add column if not exists notes text,
  add column if not exists origin_key text,
  add column if not exists dest_key text,
  add column if not exists weight_kg numeric,
  add column if not exists volume_cbm numeric,
  add column if not exists items_count integer default 0,
  add column if not exists total_amount numeric default 0,
  add column if not exists paid_amount numeric default 0,
  add column if not exists current_step_index integer default 0,
  add column if not exists step_dates jsonb default '{}'::jsonb,
  add column if not exists step_photos jsonb default '[]'::jsonb,
  add column if not exists eta timestamptz,
  add column if not exists operational_status text,
  add column if not exists branch text default 'all',
  add column if not exists priority text default 'normal',
  add column if not exists current_location_label text,
  add column if not exists tracking_updated_at timestamptz,
  add column if not exists service_level text,
  add column if not exists incoterm text,
  add column if not exists origin_hub text,
  add column if not exists transit_hub text,
  add column if not exists destination_hub text,
  add column if not exists state_version integer default 1,
  add column if not exists assigned_staff_id uuid,
  add column if not exists archived_at timestamptz,
  add column if not exists currency text default 'USD',
  add column if not exists batch_code text;

update public.shipments
set customer_name = coalesce(customer_name, customer_gc_code),
    operational_status = coalesce(operational_status, status, 'pending'),
    current_step_index = coalesce(current_step_index, 0),
    step_dates = coalesce(step_dates, '{}'::jsonb),
    step_photos = coalesce(step_photos, '[]'::jsonb),
    branch = coalesce(branch, 'all'),
    priority = coalesce(priority, 'normal'),
    state_version = coalesce(state_version, 1),
    currency = coalesce(currency, 'USD'),
    items_count = coalesce(items_count, 0),
    total_amount = coalesce(total_amount, 0),
    paid_amount = coalesce(paid_amount, 0),
    weight_kg = coalesce(weight_kg, actual_weight_kg),
    volume_cbm = coalesce(volume_cbm, case when length_cm is not null and width_cm is not null and height_cm is not null then (length_cm * width_cm * height_cm) / 1000000 else null end),
    tracking_updated_at = coalesce(tracking_updated_at, updated_at),
    origin_key = coalesce(origin_key, origin_warehouse),
    dest_key = coalesce(dest_key, destination_warehouse),
    origin_hub = coalesce(origin_hub, origin_warehouse),
    destination_hub = coalesce(destination_hub, destination_warehouse);

alter table public.warehouse_receipts
  add column if not exists location text,
  add column if not exists created_by uuid,
  add column if not exists created_by_name text,
  add column if not exists directory_customer_id uuid,
  add column if not exists directory_phone text,
  add column if not exists scan_code text,
  add column if not exists scan_type text,
  add column if not exists scanned_at timestamptz,
  add column if not exists verified_at timestamptz,
  add column if not exists verification_status text,
  add column if not exists stage text,
  add column if not exists photo_taken_at timestamptz,
  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  add column if not exists gc_code_detected text,
  add column if not exists ocr_text text,
  add column if not exists ocr_confidence numeric,
  add column if not exists ai_detected_items jsonb default '[]'::jsonb,
  add column if not exists auto_assigned boolean default false,
  add column if not exists label_metadata jsonb default '{}'::jsonb,
  add column if not exists label_captured_at timestamptz,
  add column if not exists label_capture_method text,
  add column if not exists whatsapp_message text,
  add column if not exists evidence_version integer default 1,
  add column if not exists shipment_id text,
  add column if not exists consolidated boolean default false,
  add column if not exists idempotency_key text;

update public.warehouse_receipts
set location = coalesce(location, warehouse),
    gc_code_detected = coalesce(gc_code_detected, gc_code),
    scan_code = coalesce(scan_code, barcode, gc_code),
    stage = coalesce(stage, 'received'),
    verification_status = coalesce(verification_status, 'verified'),
    evidence_version = coalesce(evidence_version, 1),
    ai_detected_items = coalesce(ai_detected_items, '[]'::jsonb),
    label_metadata = coalesce(label_metadata, '{}'::jsonb),
    auto_assigned = coalesce(auto_assigned, false),
    consolidated = coalesce(consolidated, false),
    idempotency_key = coalesce(idempotency_key, 'legacy:' || id::text)
where true;

alter table public.warehouse_receipts
  alter column idempotency_key set default gen_random_uuid()::text,
  alter column idempotency_key set not null;

create unique index if not exists warehouse_receipts_idempotency_key_uniq
  on public.warehouse_receipts(idempotency_key);

create index if not exists company_costs_created_by_fk_idx on public.company_costs(created_by);
create index if not exists company_costs_staff_id_fk_idx on public.company_costs(staff_id);
create index if not exists consolidation_requests_created_by_fk_idx on public.consolidation_requests(created_by);
create index if not exists consolidation_requests_reviewed_by_fk_idx on public.consolidation_requests(reviewed_by);
create index if not exists shipment_insurance_purchased_by_fk_idx on public.shipment_insurance(purchased_by);
create index if not exists shopping_orders_payment_session_id_fk_idx on public.shopping_orders(payment_session_id);
create index if not exists shopping_orders_platform_id_fk_idx on public.shopping_orders(platform_id);

-- Keep helper functions safe and deterministic under an untrusted search_path.
alter function public.calculate_chargeable_weight(numeric,numeric,numeric,numeric)
  set search_path = public, pg_temp;

-- These functions are invoked only through authenticated application flows or
-- database triggers; they are not public RPC endpoints.
revoke all on function public.guard_payment_session_update() from public, anon, authenticated;
revoke all on function public.queue_warehouse_whatsapp() from public, anon, authenticated;

-- Remove verified duplicate indexes, keeping the canonical versions.
drop index if exists public.customer_directory_created_at_idx;
drop index if exists public.customer_directory_name_lower_idx;
drop index if exists public.pricing_rates_lookup_idx;
drop index if exists public.idx_shopping_orders_status;
drop index if exists public.ux_shopping_orders_user_idempotency;
