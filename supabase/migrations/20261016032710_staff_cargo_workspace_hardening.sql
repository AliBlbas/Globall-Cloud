-- Cargo workspace hardening: branch-scoped updates, item audit snapshots, batch codes,
-- and accurate dispatch dates. Historical Excel quantities are not imported.
CREATE OR REPLACE FUNCTION public.staff_save_shipment_workspace(p_shipment_id uuid, p_payload jsonb, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'private', 'auth', 'pg_temp'
AS $function$
DECLARE
  v_staff public.staff%ROWTYPE;
  v_customer public.customer_directory%ROWTYPE;
  v_existing public.shipments%ROWTYPE;
  v_item jsonb;
  v_id uuid;
  v_tracking text;
  v_gc text;
  v_mode text;
  v_status text;
  v_old_status text;
  v_origin text;
  v_destination text;
  v_origin_key text;
  v_dest_key text;
  v_branch text;
  v_staff_branch text;
  v_existing_branch text;
  v_old_items jsonb := '[]'::jsonb;
  v_new_items jsonb := '[]'::jsonb;
  v_location text;
  v_currency text;
  v_dispatch timestamptz;
  v_total numeric(14,2);
  v_paid numeric(14,2);
  v_cost numeric(14,2);
  v_pc integer := 0;
  v_boxes integer := 0;
  v_weight numeric(14,3) := 0;
  v_items_count integer := 0;
  v_description text;
  v_step_dates jsonb;
  v_now timestamptz := clock_timestamp();
  v_created boolean := p_shipment_id IS NULL;
  v_step integer;
BEGIN
  IF (SELECT auth.uid()) IS NULL
     OR NOT (SELECT private.is_real_authenticated_session()) THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_staff
  FROM public.staff
  WHERE id = (SELECT auth.uid())
    AND is_active = true
    AND role IN ('super_admin','admin','operations','warehouse','warehouse_china','warehouse_uae','warehouse_erbil')
  LIMIT 1;
  IF NOT FOUND OR NOT (SELECT is_staff()) THEN
    RAISE EXCEPTION 'Operational staff permission required' USING ERRCODE = '42501';
  END IF;

  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN RAISE EXCEPTION 'Shipment data is required'; END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN RAISE EXCEPTION 'Cargo items must be a list'; END IF;
  IF jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'At least one cargo item is required'; END IF;
  IF jsonb_array_length(p_items) > 100 THEN RAISE EXCEPTION 'A shipment can contain at most 100 cargo lines'; END IF;

  v_gc := upper(regexp_replace(coalesce(p_payload->>'customer_gc_code', p_payload->>'gc_code', ''), '[[:space:]]', '', 'g'));
  IF v_gc !~ '^(GC-|GCN-)[A-Z0-9-]{2,30}$' THEN RAISE EXCEPTION 'Enter a valid GC customer code'; END IF;

  SELECT cd.* INTO v_customer
  FROM public.customer_directory cd
  WHERE cd.is_active = true
    AND (
      upper(regexp_replace(coalesce(cd.gc_code,''), '[[:space:]]', '', 'g')) = v_gc
      OR upper(regexp_replace(coalesce(cd.code,''), '[[:space:]]', '', 'g')) = v_gc
      OR upper(regexp_replace(coalesce(cd.normalized_gc_code,''), '[[:space:]]', '', 'g')) = v_gc
    )
  ORDER BY CASE WHEN upper(regexp_replace(coalesce(cd.gc_code,''), '[[:space:]]', '', 'g')) = v_gc THEN 0 ELSE 1 END,
           cd.created_at DESC
  LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active customer was not found for code %', v_gc; END IF;

  v_mode := lower(coalesce(nullif(p_payload->>'transport_mode',''), nullif(p_payload->>'mode',''), 'air'));
  IF v_mode NOT IN ('air','land','sea') THEN RAISE EXCEPTION 'Transport mode must be air, land or sea'; END IF;
  v_status := coalesce(nullif(p_payload->>'status',''), 'received_origin');
  IF v_status NOT IN ('received_origin','in_transit','at_transit_hub','customs','out_for_delivery','delivered','on_hold','cancelled') THEN RAISE EXCEPTION 'Invalid shipment status'; END IF;

  v_origin := coalesce(nullif(trim(p_payload->>'origin'),''), 'China');
  v_destination := coalesce(nullif(trim(p_payload->>'destination'),''), 'Erbil');
  v_origin_key := lower(regexp_replace(coalesce(nullif(p_payload->>'origin_key',''), v_origin), '[^a-zA-Z0-9]+', '_', 'g'));
  v_dest_key := lower(regexp_replace(coalesce(nullif(p_payload->>'dest_key',''), v_destination), '[^a-zA-Z0-9]+', '_', 'g'));
  v_branch := 'all';
  v_location := coalesce(nullif(trim(p_payload->>'current_location_label'),''), v_origin);
  v_currency := upper(coalesce(nullif(p_payload->>'currency',''), 'USD'));
  IF v_currency NOT IN ('USD','IQD','AED') THEN RAISE EXCEPTION 'Currency must be USD, IQD or AED'; END IF;
  v_total := greatest(0, coalesce(nullif(p_payload->>'total_amount','')::numeric, 0));
  v_paid := greatest(0, coalesce(nullif(p_payload->>'paid_amount','')::numeric, 0));
  v_cost := greatest(0, coalesce(nullif(p_payload->>'cost_amount','')::numeric, 0));
  IF v_paid > v_total THEN RAISE EXCEPTION 'Paid amount cannot exceed total amount'; END IF;
  v_dispatch := nullif(p_payload->>'dispatched_at','')::timestamptz;
  v_staff_branch := lower(coalesce(nullif(v_staff.branch,''),'all'));
  IF v_staff_branch = 'uae' THEN v_staff_branch := 'dubai'; END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS e(value) LOOP
    IF length(trim(coalesce(v_item->>'item_name',''))) = 0 THEN RAISE EXCEPTION 'Every cargo line needs an item name'; END IF;
    IF coalesce(nullif(v_item->>'quantity_pc','')::integer,0) < 0 OR coalesce(nullif(v_item->>'box_count','')::integer,0) < 0
       OR coalesce(nullif(v_item->>'weight_kg','')::numeric,0) < 0 OR coalesce(nullif(v_item->>'declared_value','')::numeric,0) < 0 THEN
      RAISE EXCEPTION 'PC, boxes, weight and declared value cannot be negative';
    END IF;
    v_pc := v_pc + coalesce(nullif(v_item->>'quantity_pc','')::integer,0);
    v_boxes := v_boxes + coalesce(nullif(v_item->>'box_count','')::integer,0);
    v_weight := v_weight + coalesce(nullif(v_item->>'weight_kg','')::numeric,0);
    v_items_count := v_items_count + 1;
  END LOOP;

  SELECT string_agg(item_name, ', ' ORDER BY item_order)
  INTO v_description
  FROM (
    SELECT (value->>'item_name') AS item_name, ordinality AS item_order
    FROM jsonb_array_elements(p_items) WITH ORDINALITY AS x(value, ordinality)
  ) q;

  IF v_created THEN
    v_id := gen_random_uuid();
    LOOP
      v_tracking := 'GC-' || to_char(v_now AT TIME ZONE 'UTC','YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.shipments s WHERE s.tracking_id = v_tracking OR s.tracking_number = v_tracking);
    END LOOP;
    v_step_dates := jsonb_build_object('created', v_now::text);
    v_old_status := NULL;
    INSERT INTO public.shipments (id, tracking_id, tracking_number, route, type, status, cargo_currency)
    VALUES (v_id, v_tracking, v_tracking, v_origin_key || '-' || v_dest_key, v_mode, v_status, v_currency);
  ELSE
    v_id := p_shipment_id;
    SELECT * INTO v_existing FROM public.shipments WHERE id = v_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Shipment not found'; END IF;
    v_tracking := v_existing.tracking_id;
    v_old_status := v_existing.status;
    v_step_dates := coalesce(v_existing.step_dates, '{}'::jsonb);
    v_existing_branch := lower(coalesce(v_existing.branch,''));
    IF v_existing_branch = 'uae' THEN v_existing_branch := 'dubai'; END IF;
    IF v_staff.role NOT IN ('admin','super_admin') AND v_staff_branch <> 'all' AND v_existing_branch <> v_staff_branch THEN
      RAISE EXCEPTION 'This shipment belongs to another branch' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF v_created THEN
    v_branch := lower(coalesce(nullif(trim(p_payload->>'branch'),''), v_staff_branch, 'all'));
  ELSIF v_staff.role IN ('admin','super_admin') THEN
    v_branch := lower(coalesce(nullif(trim(p_payload->>'branch'),''), nullif(v_existing.branch,''), v_staff_branch, 'all'));
  ELSIF v_staff_branch = 'all' THEN
    v_branch := coalesce(nullif(v_existing.branch,''),'all');
  ELSE
    v_branch := v_staff_branch;
  END IF;
  IF v_branch = 'uae' THEN v_branch := 'dubai'; END IF;

  IF v_dispatch IS NULL AND (v_created OR v_old_status IS DISTINCT FROM v_status)
     AND v_status = 'in_transit' THEN
    v_dispatch := v_now;
  END IF;
  IF v_dispatch IS NOT NULL THEN v_step_dates := v_step_dates || jsonb_build_object('departed', v_dispatch::text);
  ELSIF p_payload ? 'dispatched_at' THEN v_step_dates := v_step_dates - 'departed'; END IF;
  IF v_old_status IS DISTINCT FROM v_status THEN v_step_dates := v_step_dates || jsonb_build_object(v_status, v_now::text); END IF;
  v_step := CASE v_status WHEN 'received_origin' THEN 0 WHEN 'in_transit' THEN 1 WHEN 'at_transit_hub' THEN 2 WHEN 'customs' THEN 3 WHEN 'out_for_delivery' THEN 4 WHEN 'delivered' THEN 5 WHEN 'on_hold' THEN 6 WHEN 'cancelled' THEN 7 ELSE 0 END;

  UPDATE public.shipments
  SET route = v_origin_key || '-' || v_dest_key, type = v_mode, status = v_status,
      directory_customer_id = v_customer.id, customer_user_id = v_customer.auth_user_id,
      tracking_number = v_tracking, batch_code = nullif(trim(p_payload->>'batch_code'), ''),
      origin = v_origin, destination = v_destination,
      customer_name = v_customer.name, customer_phone = v_customer.phone, customer_email = v_customer.email,
      origin_key = v_origin_key, dest_key = v_dest_key, customer_gc_code = v_gc, branch = v_branch,
      total_amount = v_total, paid_amount = v_paid, current_step_index = v_step, step_dates = v_step_dates,
      items_count = v_pc, pc_count = v_pc, carton_count = v_boxes, box_count = v_boxes,
      weight_kg = v_weight, actual_weight_kg = v_weight, chargeable_weight_kg = v_weight,
      transport_mode = v_mode, origin_warehouse = v_origin, destination_warehouse = v_destination,
      cargo_description = left(coalesce(nullif(trim(p_payload->>'cargo_description'),''), v_description), 2000),
      notes = nullif(trim(coalesce(p_payload->>'notes','')), ''), dispatched_at = v_dispatch,
      tracking_updated_at = v_now, current_location_label = v_location, currency = v_currency,
      priority = coalesce(nullif(p_payload->>'priority',''), 'normal'), operational_status = v_status,
      updated_at = v_now, cargo_type = v_mode, cargo_cost = v_cost, cargo_currency = v_currency,
      warehouse_location = v_location, source = 'staff_cargo_workspace',
      batch_code = CASE WHEN v_created OR p_payload ? 'batch_code' THEN nullif(trim(coalesce(p_payload->>'batch_code','')), '') ELSE v_existing.batch_code END,
      state_version = coalesce(state_version,0) + 1
  WHERE id = v_id;

  SELECT coalesce(jsonb_agg(jsonb_build_object('item_name',item_name,'quantity_pc',quantity_pc,'box_count',box_count,'weight_kg',weight_kg,'declared_value',declared_value,'currency',currency,'notes',notes) ORDER BY created_at), '[]'::jsonb)
  INTO v_old_items FROM public.shipment_cargo_items WHERE shipment_id = v_id;
  DELETE FROM public.shipment_cargo_items WHERE shipment_id = v_id;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS e(value) LOOP
    INSERT INTO public.shipment_cargo_items (
      shipment_id, customer_directory_id, customer_gc_code, item_name, quantity_pc, box_count, weight_kg,
      declared_value, currency, item_status, notes, created_by, updated_by
    ) VALUES (
      v_id, v_customer.id, v_gc, trim(v_item->>'item_name'),
      coalesce(nullif(v_item->>'quantity_pc','')::integer,0), coalesce(nullif(v_item->>'box_count','')::integer,0),
      coalesce(nullif(v_item->>'weight_kg','')::numeric,0), coalesce(nullif(v_item->>'declared_value','')::numeric,0),
      v_currency, v_status, nullif(trim(coalesce(v_item->>'notes','')), ''), v_staff.id, v_staff.id
    );
  END LOOP;

  SELECT coalesce(jsonb_agg(jsonb_build_object('item_name',item_name,'quantity_pc',quantity_pc,'box_count',box_count,'weight_kg',weight_kg,'declared_value',declared_value,'currency',currency,'notes',notes) ORDER BY created_at), '[]'::jsonb)
  INTO v_new_items FROM public.shipment_cargo_items WHERE shipment_id = v_id;

  INSERT INTO public.shipment_tracking_events (shipment_id, status_key, title, note, location_label, created_by, created_by_name, is_public)
  VALUES (
    v_id::text, v_status,
    CASE WHEN v_created THEN 'Shipment created' WHEN v_old_status IS DISTINCT FROM v_status THEN 'Shipment status updated' ELSE 'Cargo details updated' END,
    'GC ' || v_gc || ' · ' || v_boxes || ' boxes · ' || v_pc || ' PC · ' || round(v_weight,3) || ' kg',
    v_location, v_staff.id, v_staff.full_name, true
  );
  INSERT INTO public.staff_activity_log (staff_id, staff_name, action, target_id, details)
  VALUES (v_staff.id, v_staff.full_name, CASE WHEN v_created THEN 'shipment.cargo.created' ELSE 'shipment.cargo.updated' END, v_tracking,
    jsonb_build_object('shipment_id',v_id,'customer_gc_code',v_gc,'mode',v_mode,'status_before',v_old_status,'status_after',v_status,
    'boxes',v_boxes,'pc',v_pc,'weight_kg',round(v_weight,3),'item_lines',v_items_count,'batch_code',nullif(trim(coalesce(p_payload->>'batch_code','')),''),'items_before',v_old_items,'items_after',v_new_items)::text);

  RETURN jsonb_build_object('ok',true,'created',v_created,'id',v_id,'tracking_id',v_tracking,'customer_gc_code',v_gc,
    'status',v_status,'box_count',v_boxes,'pc_count',v_pc,'weight_kg',round(v_weight,3),'item_lines',v_items_count);
END;
$function$;

CREATE INDEX IF NOT EXISTS shipment_cargo_items_customer_idx ON public.shipment_cargo_items(customer_directory_id);
CREATE INDEX IF NOT EXISTS shipment_cargo_items_created_by_idx ON public.shipment_cargo_items(created_by);
CREATE INDEX IF NOT EXISTS shipment_cargo_items_updated_by_idx ON public.shipment_cargo_items(updated_by);

REVOKE ALL ON FUNCTION public.staff_save_shipment_workspace(uuid,jsonb,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_save_shipment_workspace(uuid,jsonb,jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.staff_save_shipment_workspace(uuid,jsonb,jsonb) TO authenticated;
