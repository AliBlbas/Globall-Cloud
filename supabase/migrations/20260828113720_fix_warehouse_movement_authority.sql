-- Keep warehouse receiving aligned with the warehouse role matrix.
-- The existing movement ledger accepts only intake/transfer/dispatch/return;
-- warehouse receipt chaining must record an intake movement.
create or replace function public.record_warehouse_movement(
  p_actor_id uuid,
  p_shipment_id text default null,
  p_package_id uuid default null,
  p_receipt_id bigint default null,
  p_from_hub text default null,
  p_to_hub text default null,
  p_movement_type text default 'transfer',
  p_scan_code text default null,
  p_notes text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_idempotency_key text default null
)
returns public.warehouse_movements
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor public.staff%rowtype;
  v_package public.shipment_packages%rowtype;
  v_movement public.warehouse_movements%rowtype;
  v_shipment_id text := nullif(trim(p_shipment_id), '');
  v_type text := lower(trim(coalesce(p_movement_type, 'transfer')));
  v_to_hub text := lower(nullif(trim(coalesce(p_to_hub, '')), ''));
  v_from_hub text := lower(nullif(trim(coalesce(p_from_hub, '')), ''));
  v_status text;
begin
  if auth.uid() is not null and auth.uid() <> p_actor_id then raise exception 'Actor mismatch'; end if;
  select * into v_actor from public.staff where id = p_actor_id and is_active = true;
  if not found then raise exception 'Active staff account required'; end if;
  if v_actor.role not in ('admin','super_admin','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','operations') then raise exception 'Operations role required'; end if;
  if v_to_hub is null then raise exception 'Destination hub is required'; end if;
  if v_actor.role = 'warehouse_china' and v_to_hub <> 'china' then raise exception 'China warehouse scope required'; end if;
  if v_actor.role = 'warehouse_uae' and v_to_hub <> 'dubai' then raise exception 'UAE warehouse scope required'; end if;
  if v_actor.role = 'warehouse_erbil' and v_to_hub <> 'erbil' then raise exception 'Erbil warehouse scope required'; end if;
  if v_type not in ('intake','transfer','dispatch','return') then raise exception 'Unsupported movement type'; end if;
  if p_idempotency_key is not null then
    select * into v_movement from public.warehouse_movements where idempotency_key = p_idempotency_key;
    if found then return v_movement; end if;
  end if;

  if p_package_id is not null then
    select * into v_package from public.shipment_packages where id = p_package_id for update;
    if not found then raise exception 'Package not found'; end if;
    if v_shipment_id is null then v_shipment_id := v_package.shipment_id; end if;
    if v_package.shipment_id <> v_shipment_id then raise exception 'Package does not belong to shipment'; end if;
    if p_scan_code is not null and upper(trim(p_scan_code)) not in (upper(v_package.package_code), upper(coalesce(v_package.barcode, ''))) then
      raise exception 'Package scan code mismatch';
    end if;
  end if;
  if v_shipment_id is null then raise exception 'Shipment or package is required'; end if;
  if not exists (select 1 from public.shipments where id = v_shipment_id) then raise exception 'Shipment not found'; end if;

  v_status := case v_type when 'dispatch' then 'in_transit' when 'return' then 'received' else 'received' end;
  insert into public.warehouse_movements(
    shipment_id, package_id, receipt_id, from_hub, to_hub, movement_type,
    scanned_by, scanned_at, scan_code, idempotency_key, notes, metadata
  ) values (
    v_shipment_id, p_package_id, p_receipt_id, v_from_hub, v_to_hub, v_type,
    p_actor_id, now(), nullif(upper(trim(coalesce(p_scan_code, ''))), ''), p_idempotency_key,
    nullif(trim(coalesce(p_notes, '')), ''), coalesce(p_metadata, '{}'::jsonb)
  ) returning * into v_movement;

  if p_package_id is not null then
    update public.shipment_packages
    set current_hub = v_to_hub, status = v_status, updated_at = now()
    where id = p_package_id;
  end if;
  update public.shipments
  set current_location_label = v_to_hub, tracking_updated_at = now(), updated_at = now()
  where id = v_shipment_id;
  insert into public.shipment_events(shipment_id, event_type, status, location, note, occurred_at, created_by, created_by_name, metadata)
  values (v_shipment_id, 'warehouse_movement', v_type, v_to_hub, v_movement.notes, now(), p_actor_id, v_actor.full_name,
          jsonb_build_object('movement_id', v_movement.id, 'package_id', p_package_id, 'from_hub', v_from_hub, 'to_hub', v_to_hub));
  insert into public.staff_activity_log(staff_id, staff_name, action, target_id, details)
  values (p_actor_id, v_actor.full_name, 'record_warehouse_movement', v_shipment_id,
          jsonb_build_object('movement_id', v_movement.id, 'movement_type', v_type, 'to_hub', v_to_hub, 'package_id', p_package_id));
  return v_movement;
end;
$$;

revoke execute on function public.record_warehouse_movement(uuid,text,uuid,bigint,text,text,text,text,text,jsonb,text) from public, anon;
grant execute on function public.record_warehouse_movement(uuid,text,uuid,bigint,text,text,text,text,text,jsonb,text) to authenticated, service_role;
