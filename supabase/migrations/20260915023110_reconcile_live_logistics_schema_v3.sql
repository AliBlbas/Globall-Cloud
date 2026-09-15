begin;

alter table public.shipments
  add column if not exists customer_user_id uuid,
  add column if not exists directory_customer_id uuid,
  add column if not exists tracking_number text,
  add column if not exists origin text,
  add column if not exists destination text,
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists customer_email text,
  add column if not exists notes text,
  add column if not exists origin_key text,
  add column if not exists dest_key text,
  add column if not exists customer_gc_code text,
  add column if not exists branch text,
  add column if not exists batch_code text,
  add column if not exists total_amount numeric default 0,
  add column if not exists paid_amount numeric default 0,
  add column if not exists current_step_index integer default 0,
  add column if not exists step_dates jsonb default '{}'::jsonb,
  add column if not exists eta timestamptz,
  add column if not exists items_count integer default 0,
  add column if not exists volume_cbm numeric,
  add column if not exists weight_kg numeric,
  add column if not exists transport_mode text,
  add column if not exists origin_warehouse text,
  add column if not exists destination_warehouse text,
  add column if not exists cargo_description text,
  add column if not exists carton_count integer,
  add column if not exists actual_weight_kg numeric,
  add column if not exists length_cm numeric,
  add column if not exists width_cm numeric,
  add column if not exists height_cm numeric,
  add column if not exists volumetric_weight_kg numeric,
  add column if not exists chargeable_weight_kg numeric,
  add column if not exists step_photos jsonb default '[]'::jsonb,
  add column if not exists current_location_label text,
  add column if not exists current_lat numeric,
  add column if not exists current_lng numeric,
  add column if not exists tracking_updated_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists currency text default 'USD',
  add column if not exists external_reference text,
  add column if not exists priority text default 'normal',
  add column if not exists assigned_staff_id uuid,
  add column if not exists operational_status text,
  add column if not exists service_level text,
  add column if not exists incoterm text,
  add column if not exists origin_hub text,
  add column if not exists transit_hub text,
  add column if not exists destination_hub text,
  add column if not exists state_version integer default 1,
  add column if not exists source text default 'logistics',
  add column if not exists source_order_id uuid,
  add column if not exists updated_at timestamptz default now();

update public.shipments
set tracking_number=coalesce(nullif(tracking_number,''),tracking_id),
    tracking_id=coalesce(nullif(tracking_id,''),tracking_number),
    origin_key=coalesce(origin_key,lower(origin)),
    dest_key=coalesce(dest_key,lower(destination)),
    operational_status=coalesce(operational_status,status),
    transport_mode=coalesce(transport_mode,type),
    weight_kg=coalesce(weight_kg,actual_weight_kg),
    chargeable_weight_kg=coalesce(chargeable_weight_kg,weight_kg),
    current_location_label=coalesce(current_location_label,destination),
    tracking_updated_at=coalesce(tracking_updated_at,created_at),
    updated_at=coalesce(updated_at,created_at),
    total_amount=coalesce(total_amount,0),
    paid_amount=coalesce(paid_amount,0),
    current_step_index=coalesce(current_step_index,0),
    step_dates=coalesce(step_dates,'{}'::jsonb),
    step_photos=coalesce(step_photos,'[]'::jsonb),
    items_count=coalesce(items_count,carton_count,0),
    priority=coalesce(priority,'normal'),
    currency=coalesce(currency,'USD'),
    state_version=coalesce(state_version,1);

create index if not exists shipments_tracking_id_idx on public.shipments(tracking_id);
create index if not exists shipments_customer_user_id_idx on public.shipments(customer_user_id);
create index if not exists shipments_operational_status_idx on public.shipments(operational_status);
create index if not exists shipments_eta_idx on public.shipments(eta);
create index if not exists shipments_external_reference_idx on public.shipments(external_reference);

alter table public.warehouse_receipts
  add column if not exists shipment_id uuid,
  add column if not exists receipt_code text,
  add column if not exists location text,
  add column if not exists stage text default 'received',
  add column if not exists photos jsonb default '[]'::jsonb,
  add column if not exists product_type text,
  add column if not exists description text,
  add column if not exists barcode text,
  add column if not exists source_warehouse text,
  add column if not exists customer_name text,
  add column if not exists notes text,
  add column if not exists idempotency_key text,
  add column if not exists created_by uuid,
  add column if not exists created_by_name text,
  add column if not exists directory_customer_id uuid,
  add column if not exists directory_phone text,
  add column if not exists scan_code text,
  add column if not exists scan_type text,
  add column if not exists scanned_at timestamptz,
  add column if not exists verified_at timestamptz,
  add column if not exists verification_status text default 'pending',
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
  add column if not exists consolidated boolean default false,
  add column if not exists updated_at timestamptz default now();

update public.warehouse_receipts
set location=coalesce(location,warehouse),
    stage=coalesce(stage,'received'),
    photos=coalesce(photos,'[]'::jsonb),
    gc_code_detected=coalesce(gc_code_detected,gc_code),
    scanned_at=coalesce(scanned_at,received_at),
    photo_taken_at=coalesce(photo_taken_at,received_at),
    verification_status=coalesce(verification_status,'pending'),
    updated_at=coalesce(updated_at,received_at);

create unique index if not exists warehouse_receipts_idempotency_key_uidx on public.warehouse_receipts(idempotency_key) where idempotency_key is not null;
create index if not exists warehouse_receipts_shipment_id_idx on public.warehouse_receipts(shipment_id);
create index if not exists warehouse_receipts_directory_customer_id_idx on public.warehouse_receipts(directory_customer_id);
create index if not exists warehouse_receipts_received_at_idx on public.warehouse_receipts(received_at desc);

create or replace function public.detect_stale_shipments()
returns integer language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare inserted_count integer:=0;
begin
 insert into public.logistics_exceptions(shipment_id,severity,title,note,status,created_by,due_at)
 select s.id::text,'warning','Shipment tracking is stale','No tracking update has been received for more than 6 hours while the shipment is in an active transit step.','open',null,now()+interval '1 hour'
 from public.shipments s where s.archived_at is null and coalesce(s.current_step_index,0) between 1 and 4 and s.tracking_updated_at is not null and s.tracking_updated_at<now()-interval '6 hours'
 and not exists(select 1 from public.logistics_exceptions le where le.shipment_id=s.id::text and le.status='open' and le.title='Shipment tracking is stale');
 get diagnostics inserted_count=row_count; return inserted_count;
end;$$;

create or replace function public.detect_eta_sla_breaches()
returns integer language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare inserted_count integer:=0;
begin
 insert into public.logistics_exceptions(shipment_id,severity,title,note,status,created_by,created_source,due_at)
 select s.id::text,case when now()-s.eta>interval '24 hours' then 'critical' else 'high' end,'Shipment ETA breached','The shipment ETA has passed by more than 2 hours while it is not yet delivered.','open',null,'system',now()+interval '2 hours'
 from public.shipments s where s.archived_at is null and s.eta is not null and s.eta<now()-interval '2 hours' and coalesce(s.current_step_index,0)<5 and coalesce(s.operational_status,'') not in ('delivered','cancelled','closed')
 and not exists(select 1 from public.logistics_exceptions le where le.shipment_id=s.id::text and le.status='open' and le.title='Shipment ETA breached');
 get diagnostics inserted_count=row_count;
 insert into public.customer_notifications(customer_user_id,shipment_id,kind,title,body,action_url)
 select s.customer_user_id,s.id::text,'eta_breach','Shipment delivery update','Your shipment ETA has passed by more than 2 hours. Our operations team is reviewing the delay.','/?track='||replace(s.id::text,' ','%20')
 from public.shipments s where s.archived_at is null and s.customer_user_id is not null and s.eta is not null and s.eta<now()-interval '2 hours' and coalesce(s.current_step_index,0)<5 and coalesce(s.operational_status,'') not in ('delivered','cancelled','closed')
 and not exists(select 1 from public.customer_notifications cn where cn.customer_user_id=s.customer_user_id and cn.shipment_id=s.id::text and cn.kind='eta_breach' and cn.created_at>now()-interval '24 hours');
 return inserted_count;
end;$$;

commit;
