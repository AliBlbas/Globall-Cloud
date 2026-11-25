-- Production source mirror of live migration applied on 2026-11-25.
-- SQL function definitions below were read directly from production PostgreSQL after application.
-- This file is for fresh rebuilds and source-control consistency; do not re-apply manually to an already migrated database.

CREATE OR REPLACE FUNCTION public.calculate_logistics_price(p_origin_key text, p_destination_key text DEFAULT 'Erbil'::text, p_transport_mode text DEFAULT 'air'::text, p_product_type text DEFAULT 'general'::text, p_weight_kg numeric DEFAULT NULL::numeric, p_volume_cbm numeric DEFAULT NULL::numeric, p_rate_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'pg_temp'
AS $function$
DECLARE
  v_origin text;
  v_dest text := 'Erbil';
  v_mode text := lower(trim(coalesce(p_transport_mode, '')));
  v_raw_type text := lower(trim(coalesce(p_product_type, '')));
  v_type text := regexp_replace(lower(trim(coalesce(p_product_type, 'general'))), '[^a-z0-9]+', '', 'g');
  v_selected_rate_key text;
  v_rate record;
  v_rate_count integer := 0;
  v_fx numeric;
  v_min_iqd numeric;
  v_usd numeric;
  v_iqd numeric;
  v_minimum_applied boolean := false;
BEGIN
  v_origin := CASE lower(trim(coalesce(p_origin_key, '')))
    WHEN 'china' THEN 'China'
    WHEN 'cn' THEN 'China'
    WHEN 'foshan' THEN 'China'
    WHEN 'guangzhou' THEN 'China'
    WHEN 'dubai' THEN 'UAE'
    WHEN 'uae' THEN 'UAE'
    WHEN 'united arab emirates' THEN 'UAE'
    WHEN 'unitedarabemirates' THEN 'UAE'
    WHEN 'usa' THEN 'USA'
    WHEN 'us' THEN 'USA'
    WHEN 'america' THEN 'USA'
    ELSE NULL
  END;

  IF v_origin IS NULL THEN RAISE EXCEPTION 'Unsupported origin'; END IF;
  IF lower(trim(coalesce(p_destination_key, 'erbil'))) NOT IN ('erbil', 'hawler', 'hwr') THEN
    RAISE EXCEPTION 'This pricing contract is currently for Erbil';
  END IF;
  IF v_mode NOT IN ('air', 'sea', 'land') THEN RAISE EXCEPTION 'Unsupported transport mode'; END IF;
  IF p_weight_kg IS NOT NULL AND (p_weight_kg < 0 OR p_weight_kg > 100000) THEN RAISE EXCEPTION 'Invalid weight'; END IF;
  IF p_volume_cbm IS NOT NULL AND (p_volume_cbm < 0 OR p_volume_cbm > 100000) THEN RAISE EXCEPTION 'Invalid volume'; END IF;
  IF p_weight_kg IS NULL AND p_volume_cbm IS NULL THEN RAISE EXCEPTION 'Weight or volume is required'; END IF;

  SELECT value INTO v_min_iqd
  FROM public.app_settings
  WHERE key = 'minimum_charge_iqd'
  LIMIT 1;
  v_min_iqd := coalesce(v_min_iqd, 5000);
  IF v_min_iqd <= 0 THEN RAISE EXCEPTION 'Minimum charge is not configured'; END IF;

  SELECT er.usd_to_iqd INTO v_fx
  FROM public.exchange_rates er
  WHERE er.usd_to_iqd > 0
    AND coalesce(er.is_active, true) = true
    AND coalesce(er.base_currency, 'USD') = 'USD'
    AND coalesce(er.quote_currency, 'IQD') = 'IQD'
    AND (er.effective_from IS NULL OR er.effective_from <= current_date)
    AND (er.effective_to IS NULL OR er.effective_to >= current_date)
  ORDER BY er.effective_from DESC NULLS LAST, er.updated_at DESC NULLS LAST, er.created_at DESC NULLS LAST
  LIMIT 1;

  IF v_fx IS NULL THEN
    SELECT value INTO v_fx FROM public.app_settings WHERE key = 'usd_iqd_rate' LIMIT 1;
  END IF;
  IF v_fx IS NULL OR v_fx <= 0 THEN RAISE EXCEPTION 'USD/IQD exchange rate is not configured'; END IF;

  -- Explicit rate_key is used by trusted staff/server workflows.
  -- Public pricing calls use NULL and are resolved to one exact, canonical key below.
  v_selected_rate_key := nullif(trim(p_rate_key), '');

  IF v_selected_rate_key IS NULL THEN
    IF v_mode = 'sea' THEN
      IF v_origin <> 'China' THEN RAISE EXCEPTION 'Sea rate is configured for China to Erbil only'; END IF;
      IF p_volume_cbm IS NULL OR p_volume_cbm <= 0 THEN RAISE EXCEPTION 'CBM volume is required for sea cargo'; END IF;
      v_selected_rate_key := 'china_erbil_sea_container_per_meter_';

    ELSIF v_origin = 'China' THEN
      IF v_mode <> 'air' THEN RAISE EXCEPTION 'China is configured for Air and Sea only'; END IF;
      IF p_weight_kg IS NULL OR p_weight_kg <= 0 THEN RAISE EXCEPTION 'Weight is required for air cargo'; END IF;

      IF (
        v_type IN ('battery','lithiumbattery','powerbank','powerbankbattery','pattery','patry','lithium')
        OR (v_type LIKE '%battery%' AND v_type NOT LIKE '%nobattery%')
        OR v_raw_type ~ '(باتری|پاتری)'
      ) THEN
        v_selected_rate_key := 'china_erbil_air_battery';
      ELSIF (
        v_type IN ('screen','display','monitor','screendisplay','displaypanel','lcd','ledscreen')
        OR (v_type LIKE '%screen%' AND v_type NOT LIKE '%noscreen%')
        OR v_raw_type ~ '(شاشە|شاشة)'
      ) THEN
        v_selected_rate_key := 'china_erbil_air_screen_display';
      ELSE
        v_selected_rate_key := 'china_erbil_air_general_cargo_no_battery_screen_';
      END IF;

    ELSIF v_origin = 'USA' THEN
      IF v_mode <> 'air' THEN RAISE EXCEPTION 'USA is configured for Air only'; END IF;
      IF p_weight_kg IS NULL OR p_weight_kg <= 0 THEN RAISE EXCEPTION 'Weight is required for air cargo'; END IF;
      v_selected_rate_key := 'usa_erbil_air_general_goods';

    ELSIF v_origin = 'UAE' THEN
      IF p_weight_kg IS NULL OR p_weight_kg <= 0 THEN RAISE EXCEPTION 'Weight is required for UAE cargo'; END IF;

      IF v_mode = 'air' THEN
        IF v_type ~ '(accessories|accessory)' THEN
          v_selected_rate_key := 'dubai_erbil_air_accessories';
        ELSIF v_type ~ '(camera)' THEN
          v_selected_rate_key := 'dubai_erbil_air_camera';
        ELSIF v_type ~ '(tablet|tab)' THEN
          v_selected_rate_key := 'dubai_erbil_air_tablet';
        ELSIF v_type ~ '(usediphone|used)' THEN
          v_selected_rate_key := 'dubai_erbil_air_used_iphone';
        ELSIF v_type ~ '(android)' THEN
          v_selected_rate_key := 'dubai_erbil_air_android_phone';
        ELSIF v_type ~ '(iphone17|samsung.*s25|samsung.*s26|s25|s26|flagship|premiumphone)' THEN
          v_selected_rate_key := 'dubai_erbil_air_iphone_17_samsung_s25_s26';
        ELSIF v_type ~ '(laptop|labtop)' THEN
          v_selected_rate_key := 'dubai_erbil_air_laptop';
        ELSIF v_type ~ '(playstation|ps4|ps5|^ps$)' THEN
          v_selected_rate_key := 'dubai_erbil_air_playstation';
        ELSE
          RAISE EXCEPTION 'Unsupported Dubai Air product category';
        END IF;

      ELSIF v_mode = 'land' THEN
        IF v_type ~ '(clothing|clothes|shoes|shein)' THEN
          v_selected_rate_key := 'dubai_erbil_land_shoes_clothes';
        ELSIF v_type ~ '(airpods|perfume|fragrance|iherb)' THEN
          v_selected_rate_key := 'dubai_erbil_land_iherb_perfume';
        ELSIF v_type ~ '(cosmetics|electronics|makeup)' THEN
          v_selected_rate_key := 'dubai_erbil_land_cosmetics_electronics';
        ELSE
          RAISE EXCEPTION 'Unsupported Dubai Land product category';
        END IF;
      ELSE
        RAISE EXCEPTION 'Unsupported UAE transport mode';
      END IF;
    END IF;
  END IF;

  -- Fail closed when a key is missing or duplicated; never choose an arbitrary rate row.
  SELECT count(*) INTO v_rate_count
  FROM public.pricing_rates r
  WHERE r.rate_key = v_selected_rate_key
    AND r.is_active = true
    AND lower(r.destination_key) = 'erbil'
    AND lower(r.transport_mode) = v_mode
    AND (r.effective_from IS NULL OR r.effective_from <= current_date)
    AND (r.effective_to IS NULL OR r.effective_to >= current_date)
    AND (
      (v_origin = 'China' AND lower(r.origin_key) = 'china')
      OR (v_origin = 'UAE' AND lower(r.origin_key) IN ('uae','dubai'))
      OR (v_origin = 'USA' AND lower(r.origin_key) IN ('usa','us'))
    );

  IF v_rate_count = 0 THEN
    RAISE EXCEPTION 'No active rate configured for the requested route/category (%).', v_selected_rate_key;
  ELSIF v_rate_count > 1 THEN
    RAISE EXCEPTION 'Multiple active rates configured for key (%); Super Admin review required.', v_selected_rate_key;
  END IF;

  SELECT r.* INTO v_rate
  FROM public.pricing_rates r
  WHERE r.rate_key = v_selected_rate_key
    AND r.is_active = true
    AND lower(r.destination_key) = 'erbil'
    AND lower(r.transport_mode) = v_mode
    AND (r.effective_from IS NULL OR r.effective_from <= current_date)
    AND (r.effective_to IS NULL OR r.effective_to >= current_date)
    AND (
      (v_origin = 'China' AND lower(r.origin_key) = 'china')
      OR (v_origin = 'UAE' AND lower(r.origin_key) IN ('uae','dubai'))
      OR (v_origin = 'USA' AND lower(r.origin_key) IN ('usa','us'))
    )
  LIMIT 1;

  IF upper(coalesce(v_rate.currency, 'USD')) <> 'USD' THEN
    RAISE EXCEPTION 'The selected pricing rate must be stored in USD';
  END IF;

  IF v_mode = 'sea' THEN
    IF lower(coalesce(v_rate.unit,'')) NOT IN ('cbm','meter','per cbm') THEN
      RAISE EXCEPTION 'Sea pricing rate must use CBM';
    END IF;
    v_usd := v_rate.amount * p_volume_cbm;
  ELSE
    IF lower(coalesce(v_rate.unit,'')) <> 'kg' THEN
      RAISE EXCEPTION 'Air and Land pricing rates must use KG';
    END IF;
    v_usd := v_rate.amount * p_weight_kg;
  END IF;

  -- Contract: any recorded positive shipment weight below 1kg has a fixed minimum of 5,000 IQD.
  IF p_weight_kg > 0 AND p_weight_kg < 1 THEN
    v_iqd := round(v_min_iqd, 0);
    v_usd := round(v_min_iqd / v_fx, 4);
    v_minimum_applied := true;
  ELSE
    v_iqd := round(v_usd * v_fx, 0);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'minimum_applied', v_minimum_applied,
    'rate_key', v_rate.rate_key,
    'product_type', v_rate.product_type,
    'unit', CASE WHEN v_mode = 'sea' THEN 'cbm' ELSE coalesce(v_rate.unit, 'kg') END,
    'rate_usd', v_rate.amount,
    'usd', round(v_usd, 2),
    'iqd', v_iqd,
    'currency', 'IQD',
    'exchange_rate', v_fx,
    'origin_key', v_origin,
    'destination_key', v_dest,
    'transport_mode', v_mode,
    'weight_kg', p_weight_kg,
    'volume_cbm', p_volume_cbm
  );
END;
$function$
;

UPDATE public.gc_warehouse_addresses
SET is_active = false, updated_at = now()
WHERE id = 'china';

UPDATE public.gc_warehouse_addresses
SET label = 'China Foshan Air warehouse',
    address = '广东省佛山市南海区里水镇草场海南州工业区32号 B区 212号-2459',
    contact = 'Warehouse phone: 18128741185',
    is_active = true, updated_at = now()
WHERE id = 'china-air';

UPDATE public.gc_warehouse_addresses
SET label = 'China Foshan General / Sea warehouse',
    address = '佛山市南海区里水镇共同孔东村东街一巷 2号，启梦芯华创意园 A6仓',
    contact = 'Warehouse: 15818124096 · Sofia office: 19157444035',
    is_active = true, updated_at = now()
WHERE id = 'china-sea';

UPDATE public.gc_warehouse_addresses
SET label = 'Dubai Main Gateway warehouse',
    address = 'Dubai, Deira, Al Khabaisi, Street 6A. Building Number: Dubai-Deira-AlKhabaisi-6A street-Global cloud company. Postal code: 50819.',
    contact = '+971 50 720 6201',
    is_active = true, updated_at = now()
WHERE id = 'dubai';

UPDATE public.gc_warehouse_addresses
SET pickup_hours = '09:00–17:00',
    contact = 'Erbil office pickup only · customer arranges own taxi/collection · no company delivery',
    is_active = true, updated_at = now()
WHERE id = 'erbil';

UPDATE public.warehouse_locations
SET name = 'GLOBAL CLOUD company',
    address_line = 'Dubai, Deira, Al Khabaisi, Street 6A.',
    contact_phone = '+971 507206201',
    postal_code = '50819',
    building_number = 'Dubai-Deira-AlKhabaisi-6A street-Global cloud company',
    purpose = 'Main gateway warehouse',
    delivery_available = false,
    timezone = 'Asia/Dubai',
    is_active = true,
    updated_at = now()
WHERE code = 'AE-DXB';

UPDATE public.warehouse_locations
SET address_line = '广东省佛山市南海区里水镇草场海南州工业区32号 B区 212号-2459',
    contact_phone = '18128741185',
    building_number = 'B区 212号-2459',
    purpose = 'Air cargo',
    delivery_available = false,
    timezone = 'Asia/Shanghai',
    is_active = true,
    updated_at = now()
WHERE code = 'CN-FS-AIR';

UPDATE public.warehouse_locations
SET address_line = '佛山市南海区里水镇共同孔东村东街一巷 2号，启梦芯华创意园 A6仓',
    contact_phone = '15818124096',
    building_number = '启梦芯华创意园 A6仓',
    purpose = 'General goods / Sea cargo',
    delivery_available = false,
    timezone = 'Asia/Shanghai',
    is_active = true,
    updated_at = now()
WHERE code = 'CN-FS-GENERAL';

UPDATE public.warehouse_locations
SET delivery_available = false,
    pickup_open = time '09:00',
    pickup_close = time '17:00',
    timezone = 'Asia/Baghdad',
    purpose = 'Customer pickup only; no company delivery',
    is_active = true,
    updated_at = now()
WHERE code = 'IQ-EBL';

UPDATE public.warehouse_private_details AS details
SET access_code = 'Hacos-Damon',
    contact_phone_2 = '19157444035',
    contact_role_2 = 'Sofia — Office',
    updated_at = now()
FROM public.warehouse_locations AS locations
WHERE locations.code = 'CN-FS-GENERAL'
  AND details.warehouse_id = locations.id;

CREATE OR REPLACE FUNCTION public.normalize_customer_identity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'pg_temp'
AS $function$
DECLARE
  v_code text;
BEGIN
  v_code := upper(trim(coalesce(NEW.gc_code, NEW.code, '')));
  IF v_code = '' THEN
    RAISE EXCEPTION 'GC customer code is required';
  END IF;
  IF v_code !~ '^GC-[0-9]+$' THEN
    RAISE EXCEPTION 'Customer code must match GC-<number>';
  END IF;

  NEW.gc_code := v_code;
  NEW.normalized_gc_code := v_code;
  NEW.purchase_first_name := replace(v_code, 'GC-', 'Gc-');
  NEW.purchase_last_name := nullif(trim(NEW.name), '');
  NEW.whatsapp_group_name := replace(v_code, 'GC-', 'Gc-');
  RETURN NEW;
END;
$function$
;

UPDATE public.customer_directory
SET whatsapp_group_name = replace(normalized_gc_code, 'GC-', 'Gc-'),
    purchase_first_name = replace(normalized_gc_code, 'GC-', 'Gc-'),
    purchase_last_name = nullif(trim(name), '')
WHERE normalized_gc_code ~ '^GC-[0-9]+$'
  AND (
    whatsapp_group_name IS DISTINCT FROM replace(normalized_gc_code, 'GC-', 'Gc-')
    OR purchase_first_name IS DISTINCT FROM replace(normalized_gc_code, 'GC-', 'Gc-')
    OR purchase_last_name IS DISTINCT FROM nullif(trim(name), '')
  );

DO $verification$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.warehouse_locations
    WHERE code = 'AE-DXB'
      AND building_number = 'Dubai-Deira-AlKhabaisi-6A street-Global cloud company'
      AND contact_phone = '+971 507206201'
      AND delivery_available = false
  ) THEN RAISE EXCEPTION 'Dubai warehouse verification failed'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.warehouse_locations
    WHERE code = 'CN-FS-AIR'
      AND address_line = '广东省佛山市南海区里水镇草场海南州工业区32号 B区 212号-2459'
      AND contact_phone = '18128741185'
  ) THEN RAISE EXCEPTION 'Foshan Air warehouse verification failed'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.warehouse_locations
    WHERE code = 'CN-FS-GENERAL'
      AND address_line LIKE '%启梦芯华创意园 A6仓%'
      AND contact_phone = '15818124096'
  ) THEN RAISE EXCEPTION 'Foshan General/Sea warehouse verification failed'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.warehouse_locations
    WHERE code = 'IQ-EBL'
      AND pickup_open = time '09:00'
      AND pickup_close = time '17:00'
      AND delivery_available = false
  ) THEN RAISE EXCEPTION 'Erbil pickup policy verification failed'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.customer_directory
    WHERE normalized_gc_code ~ '^GC-[0-9]+$'
      AND (
        purchase_first_name IS DISTINCT FROM replace(normalized_gc_code, 'GC-', 'Gc-')
        OR whatsapp_group_name IS DISTINCT FROM replace(normalized_gc_code, 'GC-', 'Gc-')
      )
  ) THEN RAISE EXCEPTION 'Customer GC/WhatsApp identity verification failed'; END IF;
END
$verification$;
