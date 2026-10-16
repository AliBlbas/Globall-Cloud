-- Globall Cloud cargo workspace: structured PC/box/weight records per shipment.
-- Legacy Excel summaries are intentionally not imported; customer codes are lookup references only.
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS box_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pc_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dispatched_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shipments_box_count_nonnegative') THEN
    ALTER TABLE public.shipments ADD CONSTRAINT shipments_box_count_nonnegative CHECK (box_count >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shipments_pc_count_nonnegative') THEN
    ALTER TABLE public.shipments ADD CONSTRAINT shipments_pc_count_nonnegative CHECK (pc_count >= 0);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.shipment_cargo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  customer_directory_id uuid REFERENCES public.customer_directory(id) ON DELETE SET NULL,
  customer_gc_code text NOT NULL,
  item_name text NOT NULL CHECK (length(trim(item_name)) > 0),
  quantity_pc integer NOT NULL DEFAULT 0 CHECK (quantity_pc >= 0),
  box_count integer NOT NULL DEFAULT 0 CHECK (box_count >= 0),
  weight_kg numeric(12,3) NOT NULL DEFAULT 0 CHECK (weight_kg >= 0),
  declared_value numeric(12,2) NOT NULL DEFAULT 0 CHECK (declared_value >= 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD','IQD','AED')),
  item_status text NOT NULL DEFAULT 'received_origin',
  notes text,
  created_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shipment_cargo_items_shipment_idx
  ON public.shipment_cargo_items (shipment_id, created_at);
CREATE INDEX IF NOT EXISTS shipment_cargo_items_customer_code_idx
  ON public.shipment_cargo_items (upper(customer_gc_code));

ALTER TABLE public.shipment_cargo_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shipment_cargo_items_staff_access ON public.shipment_cargo_items;
CREATE POLICY shipment_cargo_items_staff_access
  ON public.shipment_cargo_items
  FOR ALL TO authenticated
  USING (is_staff() AND (SELECT private.is_real_authenticated_session()))
  WITH CHECK (is_staff() AND (SELECT private.is_real_authenticated_session()));

DROP POLICY IF EXISTS shipment_cargo_items_customer_read_own ON public.shipment_cargo_items;
CREATE POLICY shipment_cargo_items_customer_read_own
  ON public.shipment_cargo_items
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_real_authenticated_session())
    AND EXISTS (
      SELECT 1
      FROM public.shipments s
      WHERE s.id = shipment_cargo_items.shipment_id
        AND (
          s.customer_user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.customer_directory cd
            WHERE cd.id = s.directory_customer_id
              AND cd.auth_user_id = (SELECT auth.uid())
              AND cd.is_active = true
          )
        )
    )
  );

GRANT SELECT ON public.shipments, public.customer_directory, public.staff TO authenticated;
GRANT INSERT, UPDATE ON public.shipments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipment_cargo_items TO authenticated;
GRANT INSERT ON public.shipment_tracking_events, public.staff_activity_log TO authenticated;

CREATE OR REPLACE FUNCTION public.staff_save_shipment_workspace(
  p_shipment_id uuid,
  p_payload jsonb,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private, auth, pg_temp
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
  v_branch := coalesce(nullif(p_payload->>'branch',''), nullif(v_staff.branch,''), 'all');
  v_location := coalesce(nullif(trim(p_payload->>'current_location_label'),''), v_origin);
  v_currency := upper(coalesce(nullif(p_payload->>'currency',''), 'USD'));
  IF v_currency NOT IN ('USD','IQD','AED') THEN RAISE EXCEPTION 'Currency must be USD, IQD or AED'; END IF;
  v_total := greatest(0, coalesce(nullif(p_payload->>'total_amount','')::numeric, 0));
  v_paid := greatest(0, coalesce(nullif(p_payload->>'paid_amount','')::numeric, 0));
  v_cost := greatest(0, coalesce(nullif(p_payload->>'cost_amount','')::numeric, 0));
  IF v_paid > v_total THEN RAISE EXCEPTION 'Paid amount cannot exceed total amount'; END IF;
  v_dispatch := nullif(p_payload->>'dispatched_at','')::timestamptz;

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
  END IF;

  IF v_dispatch IS NULL AND (v_created OR v_old_status IS DISTINCT FROM v_status)
     AND v_status IN ('in_transit','at_transit_hub','customs','out_for_delivery','delivered') THEN
    v_dispatch := v_now;
  END IF;
  IF v_dispatch IS NOT NULL THEN v_step_dates := v_step_dates || jsonb_build_object('departed', v_dispatch::text); END IF;
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
      state_version = coalesce(state_version,0) + 1
  WHERE id = v_id;

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
    'boxes',v_boxes,'pc',v_pc,'weight_kg',round(v_weight,3),'item_lines',v_items_count)::text);

  RETURN jsonb_build_object('ok',true,'created',v_created,'id',v_id,'tracking_id',v_tracking,'customer_gc_code',v_gc,
    'status',v_status,'box_count',v_boxes,'pc_count',v_pc,'weight_kg',round(v_weight,3),'item_lines',v_items_count);
END;
$function$;

REVOKE ALL ON FUNCTION public.staff_save_shipment_workspace(uuid,jsonb,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_save_shipment_workspace(uuid,jsonb,jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.staff_save_shipment_workspace(uuid,jsonb,jsonb) TO authenticated;
