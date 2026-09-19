-- Finalize the shopping-order/shipment reference contract.
-- shopping_orders.shipment_id stores the human-readable shipment tracking_id.
-- shipments.id remains the canonical UUID. This function accepts either form defensively.

create or replace function public.admin_update_shopping_status(p_order_id uuid,p_new_status text)
returns jsonb
language plpgsql
security definer
set search_path to public, pg_temp
as $$
declare
  v_order public.shopping_orders%rowtype;
  v_shipment_uuid uuid;
  v_tracking_id text;
begin
  if not public.is_admin() then raise exception 'Not admin'; end if;

  select * into v_order
  from public.shopping_orders
  where id=p_order_id
  for update;
  if not found then raise exception 'Order not found'; end if;

  if not public.is_valid_transition(v_order.status,p_new_status) then
    raise exception 'Invalid transition % -> %',v_order.status,p_new_status;
  end if;

  select s.id,s.tracking_id
    into v_shipment_uuid,v_tracking_id
  from public.shipments s
  where s.tracking_id=v_order.shipment_id
     or s.id::text=v_order.shipment_id
  order by case when s.tracking_id=v_order.shipment_id then 0 else 1 end
  limit 1
  for update;
  if not found then raise exception 'Shipment not found'; end if;

  if p_new_status='paid' then
    update public.shipments
       set status='paid',operational_status='pending',tracking_updated_at=now(),updated_at=now()
     where id=v_shipment_uuid;
  elsif p_new_status='ordered_from_platform' then
    update public.shipments
       set status='ordered_from_platform',operational_status='pending',
           current_location_label='SHEIN / Origin Warehouse',
           notes='Purchased from SHEIN; awaiting origin warehouse receipt',
           tracking_updated_at=now(),updated_at=now()
     where id=v_shipment_uuid;
  elsif p_new_status='arrived_at_origin_warehouse' then
    update public.shipments
       set status='arrived_at_origin_warehouse',operational_status='in_transit',
           current_location_label='Origin warehouse',
           tracking_updated_at=now(),updated_at=now()
     where id=v_shipment_uuid;
  elsif p_new_status='shipped_to_erbil' then
    update public.shipments
       set status='shipped_to_erbil',operational_status='in_transit',
           current_location_label='In transit to Erbil',
           origin_hub='SHEIN / Origin Warehouse',destination_hub='Erbil',
           tracking_updated_at=now(),updated_at=now()
     where id=v_shipment_uuid;

    update public.shopping_orders
       set tracking_number=coalesce(v_tracking_id,v_order.shipment_id),updated_at=now()
     where id=p_order_id;
  elsif p_new_status='delivered' then
    update public.shipments
       set status='delivered',operational_status='delivered',
           current_location_label='Erbil — Delivered',
           current_step_index=5,
           tracking_updated_at=now(),updated_at=now()
     where id=v_shipment_uuid;
  end if;

  update public.shopping_orders
     set status=p_new_status,updated_at=now()
   where id=p_order_id;

  return jsonb_build_object(
    'order_id',p_order_id,
    'new_status',p_new_status,
    'shipment_id',v_shipment_uuid::text,
    'tracking_id',v_tracking_id
  );
end;
$$;

revoke all on function public.admin_update_shopping_status(uuid,text) from public,anon;
grant execute on function public.admin_update_shopping_status(uuid,text) to authenticated;
