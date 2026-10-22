-- Customer-facing warehouse receipt alerts are Dubai-only.
-- Other locations remain available in the authenticated customer's own receipt evidence,
-- but should not produce an in-app warehouse_received alert.
CREATE OR REPLACE FUNCTION public.emit_warehouse_realtime_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $function$
DECLARE
  v_customer_user_id uuid;
  v_gc_code text;
  v_location text;
  v_event_key text;
  v_in_app_enabled boolean;
  v_is_dubai boolean;
  v_title text;
  v_body text;
BEGIN
  IF NEW.directory_customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    cd.auth_user_id,
    COALESCE(NULLIF(BTRIM(cd.gc_code), ''), NULLIF(BTRIM(cd.normalized_gc_code), ''), NULLIF(BTRIM(cd.code), '')),
    COALESCE(p.in_app_enabled, TRUE)
  INTO v_customer_user_id, v_gc_code, v_in_app_enabled
  FROM public.customer_directory AS cd
  LEFT JOIN public.customer_notification_preferences AS p
    ON p.customer_user_id = cd.auth_user_id
  WHERE cd.id = NEW.directory_customer_id
    AND cd.is_active IS TRUE;

  IF v_customer_user_id IS NULL OR v_in_app_enabled IS FALSE THEN
    RETURN NEW;
  END IF;

  v_gc_code := COALESCE(NULLIF(v_gc_code, ''), NULLIF(BTRIM(NEW.gc_code_detected), ''), NULLIF(BTRIM(NEW.gc_code), ''), 'GC');
  v_location := COALESCE(NULLIF(BTRIM(NEW.location), ''), NULLIF(BTRIM(NEW.source_warehouse), ''), NULLIF(BTRIM(NEW.warehouse), ''), 'warehouse');
  v_is_dubai := LOWER(BTRIM(v_location)) IN ('dubai', 'uae', 'united arab emirates', 'دوبەی', 'دوبی');

  -- Do not notify customers about non-Dubai warehouse receipts.
  IF NOT v_is_dubai THEN
    RETURN NEW;
  END IF;

  v_event_key := 'warehouse_received:' || NEW.id::text;
  v_title := 'کاڵاکەت لە کۆگای دوبەی وەرگیرا';
  v_body := 'وردەکاری، وێنە و ژمارەی کارتۆن لە بەشی بارەکان ببینە.';

  INSERT INTO public.customer_notifications (
    customer_user_id, shipment_id, kind, title, body, action_url, event_key
  )
  VALUES (
    v_customer_user_id,
    NEW.shipment_id,
    'warehouse_received',
    v_title,
    v_body,
    '/#shipmentsSection',
    v_event_key
  )
  ON CONFLICT (customer_user_id, event_key) DO NOTHING;

  RETURN NEW;
END;
$function$;
