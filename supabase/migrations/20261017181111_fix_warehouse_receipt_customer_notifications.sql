-- Keep warehouse intake notifications idempotent and tied to the receipt's verified customer account.
-- This trigger complements the Edge Function notification queue; the shared key prevents duplicates.
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
  v_received_local text;
  v_cartons integer;
  v_photo_count integer;
  v_weight text;
  v_body text;
BEGIN
  -- The directory link is authoritative; a receipt can exist before a shipment does.
  IF NEW.directory_customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    cd.auth_user_id,
    COALESCE(NULLIF(BTRIM(cd.gc_code), ''), NULLIF(BTRIM(cd.normalized_gc_code), ''), NULLIF(BTRIM(cd.code), ''))
  INTO v_customer_user_id, v_gc_code
  FROM public.customer_directory AS cd
  WHERE cd.id = NEW.directory_customer_id
    AND cd.is_active IS TRUE;

  IF v_customer_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_gc_code := COALESCE(NULLIF(v_gc_code, ''), NULLIF(BTRIM(NEW.gc_code_detected), ''), NULLIF(BTRIM(NEW.gc_code), ''), 'GC');
  v_location := COALESCE(NULLIF(BTRIM(NEW.location), ''), NULLIF(BTRIM(NEW.source_warehouse), ''), NULLIF(BTRIM(NEW.warehouse), ''), 'warehouse');
  v_cartons := GREATEST(1, COALESCE(NEW.carton_count, 1));
  v_photo_count := CASE
    WHEN jsonb_typeof(COALESCE(NEW.photos, '[]'::jsonb)) = 'array'
      THEN jsonb_array_length(COALESCE(NEW.photos, '[]'::jsonb))
    ELSE 0
  END;
  v_weight := CASE
    WHEN NEW.weight_actual IS NULL THEN '—'
    ELSE BTRIM(TO_CHAR(NEW.weight_actual, 'FM999999990.###')) || ' kg'
  END;
  v_received_local := TO_CHAR(COALESCE(NEW.received_at, NOW()) AT TIME ZONE 'Asia/Baghdad', 'YYYY-MM-DD HH24:MI');
  v_event_key := 'warehouse_received:' || NEW.id::text;
  v_body := FORMAT(
    E'GC: %s\nکۆگا: %s\nکارتۆن: %s\nکێش: %s\nکاتی وەرگرتن (هەولێر): %s\nوێنەی بەڵگە: %s',
    v_gc_code, v_location, v_cartons, v_weight, v_received_local, v_photo_count
  );

  INSERT INTO public.customer_notifications (
    customer_user_id, shipment_id, kind, title, body, action_url, event_key
  )
  VALUES (
    v_customer_user_id,
    NEW.shipment_id,
    'warehouse_received',
    'کاڵاکەت لە کۆگا وەرگیرا',
    v_body,
    '/#records',
    v_event_key
  )
  ON CONFLICT (customer_user_id, event_key) DO NOTHING;

  RETURN NEW;
END;
$function$;
