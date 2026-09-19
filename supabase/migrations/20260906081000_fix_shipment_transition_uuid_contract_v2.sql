-- Fix the shipment transition contract to use shipments.id as UUID while
-- retaining the text contract used by shipment history/events and the Edge Function.

create or replace function public.record_shipment_transition(
  p_actor_id uuid,
  p_shipment_id text,
  p_to_status text,
  p_to_step integer,
  p_location_code text default null,
  p_note text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_idempotency_key text default null
)
returns public.shipments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor public.staff%rowtype;
  v_shipment public.shipments%rowtype;
  v_existing public.shipment_status_history%rowtype;
  v_shipment_uuid uuid;
  v_from_status text;
  v_from_step integer;
  v_now timestamptz := now();
  v_status text := lower(trim(coalesce(p_to_status,'')));
  v_step integer := p_to_step;
  v_event_key text;
begin
  if auth.uid() is not null and auth.uid() <> p_actor_id then raise exception 'Actor mismatch'; end if;
  select * into v_actor from public.staff where id = p_actor_id and is_active = true;
  if not found then raise exception 'Active staff account required'; end if;
  if v_actor.role not in ('admin','super_admin','operations','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','delivery','driver') then raise exception 'Operations role required'; end if;
  if p_shipment_id is null or length(trim(p_shipment_id)) = 0 then raise exception 'Shipment id is required'; end if;
  begin
    v_shipment_uuid := trim(p_shipment_id)::uuid;
  exception when invalid_text_representation then
    raise exception 'Shipment id must be a valid UUID';
  end;
  if v_status not in ('pending','booked','received_origin','in_transit','at_transit_hub','customs','out_for_delivery','delivered','exception','on_hold','cancelled','archived') then raise exception 'Unsupported shipment status'; end if;
  if v_step is null or v_step < 0 or v_step > 5 then raise exception 'Shipment step must be between 0 and 5'; end if;

  if p_idempotency_key is not null then
    select * into v_existing from public.shipment_status_history where shipment_id = p_shipment_id and idempotency_key = p_idempotency_key limit 1;
    if found then
      select * into v_shipment from public.shipments where id = v_shipment_uuid;
      if not found then raise exception 'Shipment not found'; end if;
      return v_shipment;
    end if;
  end if;

  select * into v_shipment from public.shipments where id = v_shipment_uuid for update;
  if not found then raise exception 'Shipment not found'; end if;
  v_from_status := lower(coalesce(v_shipment.operational_status, v_shipment.status, ''));
  v_from_step := coalesce(v_shipment.current_step_index, 0);

  if v_status in ('pending','booked') then
    if v_actor.role not in ('admin','super_admin') then raise exception 'Administrative role required'; end if;
  elsif v_status = 'archived' then
    if v_actor.role not in ('admin','super_admin') then raise exception 'Administrative role required'; end if;
  elsif v_status = 'cancelled' then
    if v_actor.role not in ('admin','super_admin','operations') then raise exception 'Operations role required'; end if;
  elsif v_status = 'on_hold' then
    null;
  else
    if v_status = 'received_origin' and v_step <> 0 then raise exception 'received_origin must be step 0'; end if;
    if v_status = 'in_transit' and v_step <> 1 then raise exception 'in_transit must be step 1'; end if;
    if v_status = 'at_transit_hub' and v_step <> 2 then raise exception 'at_transit_hub must be step 2'; end if;
    if v_status = 'customs' and v_step <> 3 then raise exception 'customs must be step 3'; end if;
    if v_status = 'out_for_delivery' and v_step <> 4 then raise exception 'out_for_delivery must be step 4'; end if;
    if v_status = 'delivered' and v_step <> 5 then raise exception 'delivered must be step 5'; end if;
    if v_status = 'exception' and v_step <> v_from_step then raise exception 'exception must retain the current operational step'; end if;
  end if;

  if v_status <> 'cancelled' and v_status <> 'archived' and v_status <> 'on_hold' then
    if v_from_status <> 'on_hold' and v_status <> 'exception' and v_step < v_from_step then raise exception 'Shipment step cannot move backwards'; end if;
    if v_from_status <> 'on_hold' and v_status <> 'exception' and v_step > v_from_step + 1 and v_actor.role not in ('admin','super_admin') then raise exception 'Shipment step cannot skip ahead'; end if;
  end if;

  if v_status = 'delivered' and not exists (select 1 from public.delivery_proofs dp where dp.shipment_id = p_shipment_id) then raise exception 'Delivery proof is required before delivered status'; end if;

  update public.shipments
     set operational_status = v_status,
         current_step_index = v_step,
         current_location_label = coalesce(nullif(trim(p_location_code), ''), current_location_label),
         tracking_updated_at = v_now,
         state_version = coalesce(state_version, 0) + 1,
         updated_at = v_now,
         step_dates = jsonb_set(coalesce(step_dates, '{}'::jsonb), array[v_status], to_jsonb(v_now), true)
   where id = v_shipment_uuid
   returning * into v_shipment;

  insert into public.shipment_status_history(
    shipment_id, from_status, to_status, from_step, to_step, location_code, note, metadata,
    changed_by, changed_by_name, idempotency_key, occurred_at
  ) values (
    p_shipment_id, nullif(v_from_status,''), v_status, v_from_step, v_step,
    nullif(trim(p_location_code), ''), nullif(trim(p_note), ''), coalesce(p_metadata,'{}'::jsonb),
    p_actor_id, v_actor.full_name, p_idempotency_key, v_now
  );

  insert into public.shipment_events(
    shipment_id, event_type, status, location, note, occurred_at, created_by, created_by_name, metadata
  ) values (
    p_shipment_id, 'status_change', v_status, nullif(trim(p_location_code), ''), nullif(trim(p_note), ''),
    v_now, p_actor_id, v_actor.full_name,
    jsonb_build_object('state_version', v_shipment.state_version, 'metadata', coalesce(p_metadata,'{}'::jsonb))
  );

  if v_shipment.customer_user_id is not null and to_regprocedure('public.enqueue_customer_notification(uuid,text,text,text,text,text,jsonb)') is not null then
    v_event_key := format('shipment:%s:status:%s', p_shipment_id, v_shipment.state_version);
    perform public.enqueue_customer_notification(
      v_shipment.customer_user_id, p_shipment_id, v_event_key,
      'Shipment status updated',
      format('Shipment %s is now %s.', v_shipment.tracking_number, replace(v_status, '_', ' ')),
      '/?track=' || replace(v_shipment.tracking_number, ' ', '%20'),
      jsonb_build_object('status', v_status, 'step', v_step, 'location', p_location_code, 'note', p_note)
    );
  end if;

  insert into public.staff_activity_log(staff_id, staff_name, action, target_id, details)
  values(
    p_actor_id, v_actor.full_name, 'transition_shipment', p_shipment_id,
    jsonb_build_object('from_status', v_from_status, 'to_status', v_status, 'from_step', v_from_step, 'to_step', v_step, 'idempotency_key', p_idempotency_key)
  );
  return v_shipment;
end;
$$;

revoke all on function public.record_shipment_transition(uuid, text, text, integer, text, text, jsonb, text) from public, anon;
grant execute on function public.record_shipment_transition(uuid, text, text, integer, text, text, jsonb, text) to authenticated, service_role;
