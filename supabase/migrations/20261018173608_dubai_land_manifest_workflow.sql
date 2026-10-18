-- Dubai -> Erbil land freight manifests from the staff Excel workflow.
-- Uses the existing shipment_manifests + shipments + cargo + customer membership model.
-- All write functions are service-role only; the Edge Function validates active staff identity and branch before calling them.

CREATE OR REPLACE FUNCTION public.create_dubai_land_manifest(
  p_manifest_number text,
  p_planned_departure date,
  p_notes text,
  p_currency text,
  p_rows jsonb,
  p_staff_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_number text := btrim(coalesce(p_manifest_number, ''));
  v_currency text := upper(btrim(coalesce(p_currency, 'USD')));
  v_row jsonb;
  v_index integer := 0;
  v_name text;
  v_gc text;
  v_cargo text;
  v_date date;
  v_boxes integer;
  v_pcs integer;
  v_kg numeric(12,3);
  v_price numeric(14,2);
  v_notes text;
  v_dir uuid;
  v_user uuid;
  v_tracking text;
  v_ship_id uuid;
  v_manifest_id uuid;
  v_count integer := 0;
  v_linked integer := 0;
  v_boxes_total integer := 0;
  v_pcs_total integer := 0;
  v_kg_total numeric(14,3) := 0;
  v_price_total numeric(16,2) := 0;
  v_header_date date;
BEGIN
  IF v_number !~ '^[A-Za-z0-9][A-Za-z0-9._/-]{1,79}$' THEN
    RAISE EXCEPTION 'Manifest number must be 2–80 letters, digits, dots, slashes or dashes';
  END IF;
  IF v_currency NOT IN ('USD','IQD','AED') THEN
    RAISE EXCEPTION 'Currency must be USD, IQD or AED';
  END IF;
  IF p_staff_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.staff st WHERE st.id=p_staff_id AND st.is_active=true) THEN
    RAISE EXCEPTION 'Active staff identity is required';
  END IF;
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'Manifest rows must be an array';
  END IF;
  IF jsonb_array_length(p_rows) < 1 OR jsonb_array_length(p_rows) > 1000 THEN
    RAISE EXCEPTION 'Manifest must contain between 1 and 1000 rows';
  END IF;
  v_header_date := coalesce(p_planned_departure, current_date);

  INSERT INTO public.shipment_manifests (
    manifest_number, origin_hub, destination_hub, transport_mode, status,
    total_packages, total_weight_kg, planned_departure, notes, metadata,
    created_by, updated_by
  ) VALUES (
    v_number, 'Dubai', 'Erbil', 'land', 'draft',
    0, 0, (v_header_date::timestamp AT TIME ZONE 'Asia/Baghdad'),
    nullif(left(btrim(coalesce(p_notes,'')),2000),''),
    jsonb_build_object(
      'manifest_kind','dubai_land_to_erbil',
      'currency',v_currency,
      'row_count',jsonb_array_length(p_rows),
      'total_pieces',0,
      'total_sell_price',0,
      'linked_rows',0,
      'unlinked_rows',jsonb_array_length(p_rows),
      'source','staff_console'
    ),
    p_staff_id,p_staff_id
  ) RETURNING id INTO v_manifest_id;

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    v_index := v_index + 1;
    v_name := left(btrim(coalesce(v_row->>'customer_name','')),180);
    v_cargo := left(btrim(coalesce(v_row->>'cargo_type','')),120);
    v_gc := nullif(upper(regexp_replace(btrim(coalesce(v_row->>'gc_code','')),'\s','','g')),'');
    IF v_gc IS NOT NULL AND v_gc !~ '^GC-[A-Z0-9-]{2,30}$' THEN v_gc := NULL; END IF;
    v_date := coalesce(nullif(btrim(coalesce(v_row->>'shipment_date','')),'')::date,v_header_date);
    v_boxes := coalesce(nullif(btrim(coalesce(v_row->>'box_count','')),'')::integer,0);
    v_pcs := coalesce(nullif(btrim(coalesce(v_row->>'quantity_pc','')),'')::integer,0);
    v_kg := coalesce(nullif(btrim(coalesce(v_row->>'weight_kg','')),'')::numeric,0);
    v_price := coalesce(nullif(btrim(coalesce(v_row->>'sell_price','')),'')::numeric,0);
    v_notes := left(btrim(coalesce(v_row->>'notes','')),1000);

    IF v_name = '' THEN RAISE EXCEPTION 'Row %: customer name is required',v_index; END IF;
    IF v_cargo = '' THEN RAISE EXCEPTION 'Row %: cargo type is required',v_index; END IF;
    IF v_boxes < 0 OR v_pcs < 0 OR v_kg < 0 OR v_price < 0 THEN
      RAISE EXCEPTION 'Row %: boxes, pcs, kg and sell price must be zero or greater',v_index;
    END IF;
    IF v_boxes > 1000000 OR v_pcs > 1000000 OR v_kg > 1000000 OR v_price > 1000000000 THEN
      RAISE EXCEPTION 'Row %: value exceeds the allowed limit',v_index;
    END IF;

    v_dir := NULL;
    v_user := NULL;
    IF v_gc IS NOT NULL THEN
      SELECT cd.id, cd.auth_user_id
        INTO v_dir, v_user
      FROM public.customer_directory cd
      WHERE cd.is_active=true
        AND (
          upper(regexp_replace(coalesce(cd.gc_code,''),'\s','','g'))=v_gc
          OR upper(regexp_replace(coalesce(cd.code,''),'\s','','g'))=v_gc
          OR upper(regexp_replace(coalesce(cd.normalized_gc_code,''),'\s','','g'))=v_gc
        )
      ORDER BY CASE
        WHEN upper(regexp_replace(coalesce(cd.gc_code,''),'\s','','g'))=v_gc THEN 0
        WHEN upper(regexp_replace(coalesce(cd.normalized_gc_code,''),'\s','','g'))=v_gc THEN 1
        ELSE 2
      END, cd.created_at DESC
      LIMIT 1;
    END IF;
    IF v_dir IS NOT NULL THEN v_linked := v_linked + 1; END IF;

    v_tracking := upper(regexp_replace(v_number,'[^A-Za-z0-9-]+','-','g')) || '-L' || lpad(v_index::text,4,'0');
    INSERT INTO public.shipments (
      tracking_id, tracking_number, route, type, status, operational_status,
      directory_customer_id, customer_user_id, customer_gc_code, customer_name,
      origin, destination, origin_key, dest_key, origin_hub, destination_hub,
      origin_warehouse, destination_warehouse, warehouse_location, branch,
      transport_mode, batch_code, source, dispatched_at,
      total_amount, paid_amount, currency, cargo_currency, items_count, pc_count,
      box_count, carton_count, weight_kg, actual_weight_kg, chargeable_weight_kg,
      cargo_type, cargo_description, notes, external_reference, current_location_label,
      tracking_updated_at, updated_at
    ) VALUES (
      v_tracking, v_tracking, 'Dubai → Erbil', 'land', 'pending', 'pending',
      v_dir, v_user, v_gc, v_name,
      'Dubai', 'Erbil', 'dubai', 'erbil', 'Dubai', 'Erbil',
      'Dubai', 'Erbil', 'Dubai', 'dubai',
      'land', v_number, 'land_manifest', (v_date::timestamp AT TIME ZONE 'Asia/Baghdad'),
      v_price, 0, v_currency, v_currency, v_pcs, v_pcs,
      v_boxes, v_boxes, v_kg, v_kg, v_kg,
      v_cargo, v_cargo, nullif(v_notes,''), v_number || ':row:' || v_index::text, 'Dubai Warehouse',
      now(), now()
    ) RETURNING id INTO v_ship_id;

    IF v_gc IS NOT NULL THEN
      INSERT INTO public.shipment_cargo_items (
        shipment_id, customer_directory_id, customer_gc_code, item_name,
        quantity_pc, box_count, weight_kg, declared_value, currency,
        item_status, notes, created_by, updated_by
      ) VALUES (
        v_ship_id, v_dir, v_gc, v_cargo, v_pcs, v_boxes, v_kg, 0, v_currency,
        'received_origin', nullif(v_notes,''), p_staff_id, p_staff_id
      );
    END IF;

    IF v_dir IS NOT NULL THEN
      INSERT INTO public.shipment_customer_links (
        shipment_id, customer_directory_id, customer_user_id, customer_gc_code,
        created_by, updated_at
      ) VALUES (
        v_ship_id, v_dir, v_user, v_gc, p_staff_id, now()
      )
      ON CONFLICT (shipment_id,customer_directory_id) DO UPDATE SET
        customer_user_id=excluded.customer_user_id,
        customer_gc_code=excluded.customer_gc_code,
        updated_at=now();
    END IF;

    v_boxes_total := v_boxes_total + v_boxes;
    v_pcs_total := v_pcs_total + v_pcs;
    v_kg_total := v_kg_total + v_kg;
    v_price_total := v_price_total + v_price;
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.shipment_manifests
  SET total_packages=v_boxes_total,
      total_weight_kg=v_kg_total,
      metadata=jsonb_build_object(
        'manifest_kind','dubai_land_to_erbil',
        'currency',v_currency,
        'row_count',v_count,
        'total_boxes',v_boxes_total,
        'total_pieces',v_pcs_total,
        'total_weight_kg',v_kg_total,
        'total_sell_price',v_price_total,
        'linked_rows',v_linked,
        'unlinked_rows',v_count-v_linked,
        'source','staff_console'
      ),
      updated_by=p_staff_id,
      updated_at=now()
  WHERE id=v_manifest_id;

  RETURN jsonb_build_object(
    'ok',true,'manifest_id',v_manifest_id,'manifest_number',v_number,
    'row_count',v_count,'total_boxes',v_boxes_total,'total_pieces',v_pcs_total,
    'total_weight_kg',v_kg_total,'total_sell_price',v_price_total,
    'linked_rows',v_linked,'unlinked_rows',v_count-v_linked,'status','draft'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_dubai_land_manifest_status(
  p_manifest_id uuid,
  p_new_status text,
  p_staff_id uuid,
  p_staff_name text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_manifest public.shipment_manifests%rowtype;
  v_new text := lower(btrim(coalesce(p_new_status,'')));
  v_prev text;
  v_count integer := 0;
  v_event_title text;
  v_event_note text;
  v_location text;
  v_shipment record;
BEGIN
  SELECT * INTO v_manifest
  FROM public.shipment_manifests
  WHERE id=p_manifest_id AND metadata->>'manifest_kind'='dubai_land_to_erbil'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Manifest not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.staff st WHERE st.id=p_staff_id AND st.is_active=true) THEN
    RAISE EXCEPTION 'Active staff identity is required';
  END IF;

  v_prev := v_manifest.status;
  IF v_new NOT IN ('issued','departed','arrived','closed','cancelled') THEN
    RAISE EXCEPTION 'Unsupported manifest status';
  END IF;
  IF NOT (
    (v_prev='draft' AND v_new IN ('issued','cancelled')) OR
    (v_prev='issued' AND v_new IN ('departed','cancelled')) OR
    (v_prev='departed' AND v_new='arrived') OR
    (v_prev='arrived' AND v_new='closed')
  ) THEN
    RAISE EXCEPTION 'Manifest status cannot move from % to %',v_prev,v_new;
  END IF;

  IF v_new='departed' THEN
    v_event_title := 'بار لە دوبەی نێردرا';
    v_event_note := 'مانيفێستی ' || v_manifest.manifest_number || ' لە دوبەی بۆ هەولێر نێردرا.';
    v_location := 'Dubai Warehouse';
    UPDATE public.shipments SET
      status='in_transit', operational_status='in_transit',
      current_location_label=v_location, dispatched_at=coalesce(dispatched_at,now()),
      tracking_updated_at=now(), updated_at=now()
    WHERE batch_code=v_manifest.manifest_number AND archived_at IS NULL;
  ELSIF v_new='arrived' THEN
    v_event_title := 'بار گەیشتە هەولێر';
    v_event_note := 'مانيفێستی ' || v_manifest.manifest_number || ' گەیشتە کۆگای هەولێر.';
    v_location := 'Erbil Warehouse';
    UPDATE public.shipments SET
      status='at_transit_hub', operational_status='at_transit_hub',
      current_location_label=v_location, tracking_updated_at=now(), updated_at=now()
    WHERE batch_code=v_manifest.manifest_number AND archived_at IS NULL;
  ELSIF v_new='cancelled' THEN
    v_event_title := 'ناردنی مانيفێست هەڵوەشێنرایەوە';
    v_event_note := 'مانيفێستی ' || v_manifest.manifest_number || ' هەڵوەشێنرایەوە.';
    v_location := 'Dubai Warehouse';
    UPDATE public.shipments SET
      status='cancelled', operational_status='cancelled',
      current_location_label=v_location, tracking_updated_at=now(), updated_at=now()
    WHERE batch_code=v_manifest.manifest_number AND archived_at IS NULL;
  END IF;

  IF v_new IN ('departed','arrived','cancelled') THEN
    FOR v_shipment IN
      SELECT id FROM public.shipments
      WHERE batch_code=v_manifest.manifest_number AND archived_at IS NULL
    LOOP
      INSERT INTO public.shipment_tracking_events(
        shipment_id,status_key,title,note,location_label,created_by,created_by_name,is_public,occurred_at
      ) VALUES (
        v_shipment.id::text,
        CASE v_new WHEN 'departed' THEN 'in_transit' WHEN 'arrived' THEN 'at_transit_hub' ELSE 'cancelled' END,
        v_event_title,v_event_note,v_location,p_staff_id,p_staff_name,true,now()
      );
      v_count := v_count + 1;
    END LOOP;
  END IF;

  UPDATE public.shipment_manifests
  SET status=v_new,
      actual_departure=CASE WHEN v_new='departed' THEN coalesce(actual_departure,now()) ELSE actual_departure END,
      actual_arrival=CASE WHEN v_new='arrived' THEN coalesce(actual_arrival,now()) ELSE actual_arrival END,
      metadata=metadata || jsonb_build_object('last_status_change',v_new,'last_status_changed_at',now(),'last_status_changed_by',p_staff_id),
      updated_by=p_staff_id,
      updated_at=now()
  WHERE id=p_manifest_id;

  RETURN jsonb_build_object('ok',true,'manifest_id',p_manifest_id,'manifest_number',v_manifest.manifest_number,
    'previous_status',v_prev,'status',v_new,'tracking_events_created',v_count);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_dubai_land_manifest_row(
  p_manifest_id uuid,
  p_shipment_id uuid,
  p_row jsonb,
  p_staff_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_manifest public.shipment_manifests%rowtype;
  v_shipment public.shipments%rowtype;
  v_name text;
  v_gc text;
  v_cargo text;
  v_date date;
  v_boxes integer;
  v_pcs integer;
  v_kg numeric(12,3);
  v_price numeric(14,2);
  v_notes text;
  v_currency text;
  v_dir uuid;
  v_user uuid;
  v_total_boxes integer;
  v_total_pcs integer;
  v_total_rows integer;
  v_linked integer;
  v_total_kg numeric(14,3);
  v_total_price numeric(16,2);
BEGIN
  SELECT * INTO v_manifest FROM public.shipment_manifests
  WHERE id=p_manifest_id AND metadata->>'manifest_kind'='dubai_land_to_erbil' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Manifest not found'; END IF;
  IF v_manifest.status <> 'draft' THEN RAISE EXCEPTION 'Only draft manifests can be edited'; END IF;

  SELECT * INTO v_shipment FROM public.shipments
  WHERE id=p_shipment_id AND batch_code=v_manifest.manifest_number AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Manifest row not found'; END IF;

  v_name := left(btrim(coalesce(p_row->>'customer_name','')),180);
  v_cargo := left(btrim(coalesce(p_row->>'cargo_type','')),120);
  v_gc := nullif(upper(regexp_replace(btrim(coalesce(p_row->>'gc_code','')),'\s','','g')),'');
  IF v_gc IS NOT NULL AND v_gc !~ '^GC-[A-Z0-9-]{2,30}$' THEN v_gc := NULL; END IF;
  v_date := coalesce(nullif(btrim(coalesce(p_row->>'shipment_date','')),'')::date, v_shipment.dispatched_at::date, current_date);
  v_boxes := coalesce(nullif(btrim(coalesce(p_row->>'box_count','')),'')::integer,0);
  v_pcs := coalesce(nullif(btrim(coalesce(p_row->>'quantity_pc','')),'')::integer,0);
  v_kg := coalesce(nullif(btrim(coalesce(p_row->>'weight_kg','')),'')::numeric,0);
  v_price := coalesce(nullif(btrim(coalesce(p_row->>'sell_price','')),'')::numeric,0);
  v_notes := left(btrim(coalesce(p_row->>'notes','')),1000);
  v_currency := upper(coalesce(nullif(btrim(coalesce(p_row->>'currency','')),''),v_manifest.metadata->>'currency','USD'));

  IF v_name='' OR v_cargo='' THEN RAISE EXCEPTION 'Customer name and cargo type are required'; END IF;
  IF v_boxes<0 OR v_pcs<0 OR v_kg<0 OR v_price<0 THEN RAISE EXCEPTION 'Numeric values must be zero or greater'; END IF;
  IF v_currency NOT IN ('USD','IQD','AED') THEN RAISE EXCEPTION 'Unsupported currency'; END IF;

  v_dir := NULL; v_user := NULL;
  IF v_gc IS NOT NULL THEN
    SELECT cd.id,cd.auth_user_id INTO v_dir,v_user
    FROM public.customer_directory cd
    WHERE cd.is_active=true AND (
      upper(regexp_replace(coalesce(cd.gc_code,''),'\s','','g'))=v_gc OR
      upper(regexp_replace(coalesce(cd.code,''),'\s','','g'))=v_gc OR
      upper(regexp_replace(coalesce(cd.normalized_gc_code,''),'\s','','g'))=v_gc
    )
    ORDER BY CASE WHEN upper(regexp_replace(coalesce(cd.gc_code,''),'\s','','g'))=v_gc THEN 0 ELSE 1 END,cd.created_at DESC
    LIMIT 1;
  END IF;

  UPDATE public.shipments SET
    directory_customer_id=v_dir,customer_user_id=v_user,customer_gc_code=v_gc,
    customer_name=v_name,type='land',route='Dubai → Erbil',
    origin='Dubai',destination='Erbil',origin_key='dubai',dest_key='erbil',
    origin_hub='Dubai',destination_hub='Erbil',origin_warehouse='Dubai',destination_warehouse='Erbil',
    transport_mode='land',branch='dubai',warehouse_location='Dubai',
    cargo_type=v_cargo,cargo_description=v_cargo,notes=nullif(v_notes,''),
    box_count=v_boxes,carton_count=v_boxes,items_count=v_pcs,pc_count=v_pcs,
    weight_kg=v_kg,actual_weight_kg=v_kg,chargeable_weight_kg=v_kg,
    total_amount=v_price,currency=v_currency,cargo_currency=v_currency,
    dispatched_at=(v_date::timestamp AT TIME ZONE 'Asia/Baghdad'),updated_at=now()
  WHERE id=p_shipment_id;

  DELETE FROM public.shipment_cargo_items WHERE shipment_id=p_shipment_id;
  IF v_gc IS NOT NULL THEN
    INSERT INTO public.shipment_cargo_items(
      shipment_id,customer_directory_id,customer_gc_code,item_name,quantity_pc,box_count,
      weight_kg,declared_value,currency,item_status,notes,created_by,updated_by
    ) VALUES(p_shipment_id,v_dir,v_gc,v_cargo,v_pcs,v_boxes,v_kg,0,v_currency,'received_origin',nullif(v_notes,''),p_staff_id,p_staff_id);
  END IF;

  DELETE FROM public.shipment_customer_links WHERE shipment_id=p_shipment_id;
  IF v_dir IS NOT NULL THEN
    INSERT INTO public.shipment_customer_links(shipment_id,customer_directory_id,customer_user_id,customer_gc_code,created_by,updated_at)
    VALUES(p_shipment_id,v_dir,v_user,v_gc,p_staff_id,now())
    ON CONFLICT(shipment_id,customer_directory_id) DO UPDATE SET customer_user_id=excluded.customer_user_id,customer_gc_code=excluded.customer_gc_code,updated_at=now();
  END IF;

  SELECT count(*)::integer,coalesce(sum(box_count),0)::integer,coalesce(sum(pc_count),0)::integer,
         coalesce(sum(weight_kg),0)::numeric,coalesce(sum(total_amount),0)::numeric,
         count(*) FILTER(WHERE directory_customer_id IS NOT NULL)::integer
    INTO v_total_rows,v_total_boxes,v_total_pcs,v_total_kg,v_total_price,v_linked
  FROM public.shipments WHERE batch_code=v_manifest.manifest_number AND archived_at IS NULL;

  UPDATE public.shipment_manifests SET
    total_packages=v_total_boxes,total_weight_kg=v_total_kg,
    metadata=metadata||jsonb_build_object('row_count',v_total_rows,'total_boxes',v_total_boxes,
      'total_pieces',v_total_pcs,'total_weight_kg',v_total_kg,'total_sell_price',v_total_price,
      'linked_rows',v_linked,'unlinked_rows',v_total_rows-v_linked),
    updated_by=p_staff_id,updated_at=now()
  WHERE id=p_manifest_id;

  RETURN jsonb_build_object('ok',true,'shipment_id',p_shipment_id,'row_count',v_total_rows,
    'total_boxes',v_total_boxes,'total_pieces',v_total_pcs,'total_weight_kg',v_total_kg,
    'total_sell_price',v_total_price,'linked_rows',v_linked,'unlinked_rows',v_total_rows-v_linked);
END;
$function$;

CREATE OR REPLACE FUNCTION public.archive_dubai_land_manifest_row(
  p_manifest_id uuid,
  p_shipment_id uuid,
  p_staff_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_manifest public.shipment_manifests%rowtype;
  v_total_rows integer;
  v_total_boxes integer;
  v_total_pcs integer;
  v_linked integer;
  v_total_kg numeric(14,3);
  v_total_price numeric(16,2);
BEGIN
  SELECT * INTO v_manifest FROM public.shipment_manifests
  WHERE id=p_manifest_id AND metadata->>'manifest_kind'='dubai_land_to_erbil' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Manifest not found'; END IF;
  IF v_manifest.status<>'draft' THEN RAISE EXCEPTION 'Only draft manifests can be edited'; END IF;

  UPDATE public.shipments SET archived_at=now(),status='cancelled',operational_status='cancelled',updated_at=now()
  WHERE id=p_shipment_id AND batch_code=v_manifest.manifest_number AND archived_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Manifest row not found'; END IF;

  SELECT count(*)::integer,coalesce(sum(box_count),0)::integer,coalesce(sum(pc_count),0)::integer,
         coalesce(sum(weight_kg),0)::numeric,coalesce(sum(total_amount),0)::numeric,
         count(*) FILTER(WHERE directory_customer_id IS NOT NULL)::integer
    INTO v_total_rows,v_total_boxes,v_total_pcs,v_total_kg,v_total_price,v_linked
  FROM public.shipments WHERE batch_code=v_manifest.manifest_number AND archived_at IS NULL;

  UPDATE public.shipment_manifests SET
    total_packages=v_total_boxes,total_weight_kg=v_total_kg,
    metadata=metadata||jsonb_build_object('row_count',v_total_rows,'total_boxes',v_total_boxes,
      'total_pieces',v_total_pcs,'total_weight_kg',v_total_kg,'total_sell_price',v_total_price,
      'linked_rows',v_linked,'unlinked_rows',v_total_rows-v_linked),
    updated_by=p_staff_id,updated_at=now()
  WHERE id=p_manifest_id;
  RETURN jsonb_build_object('ok',true,'shipment_id',p_shipment_id,'row_count',v_total_rows,
    'total_boxes',v_total_boxes,'total_pieces',v_total_pcs,'total_weight_kg',v_total_kg,
    'total_sell_price',v_total_price,'linked_rows',v_linked,'unlinked_rows',v_total_rows-v_linked);
END;
$function$;

REVOKE ALL ON FUNCTION public.create_dubai_land_manifest(text,date,text,text,jsonb,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_dubai_land_manifest_status(uuid,text,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_dubai_land_manifest_row(uuid,uuid,jsonb,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.archive_dubai_land_manifest_row(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_dubai_land_manifest(text,date,text,text,jsonb,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_dubai_land_manifest_status(uuid,text,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_dubai_land_manifest_row(uuid,uuid,jsonb,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.archive_dubai_land_manifest_row(uuid,uuid,uuid) TO service_role;
