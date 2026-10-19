-- Fix shipment event notifications to match the live composite unique index.
-- The idempotency index is UNIQUE (customer_user_id, event_key), not UNIQUE (event_key).
-- With the old conflict target, every linked customer's shipment update raised a
-- PostgreSQL ON CONFLICT inference error and rolled back the tracking event.
CREATE OR REPLACE FUNCTION public.emit_shipment_realtime_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s public.shipments%rowtype;
  v_has_shipment boolean := false;
  k text;
  t text;
  b text;
BEGIN
  SELECT * INTO s
  FROM public.shipments
  WHERE id::text = NULLIF(BTRIM(NEW.shipment_id), '');
  v_has_shipment := FOUND;

  k := 'shipment-event:' || NEW.id::text;
  t := COALESCE(NEW.title, 'نوێکردنەوەی بار');
  b := COALESCE(NEW.note, 'دۆخی بار نوێکرایەوە.')
    || CASE WHEN NEW.location_label IS NOT NULL THEN ' · ' || NEW.location_label ELSE '' END;

  IF v_has_shipment AND s.customer_user_id IS NOT NULL THEN
    INSERT INTO public.customer_notifications(
      customer_user_id, shipment_id, kind, title, body, action_url, event_key
    ) VALUES (
      s.customer_user_id,
      s.id,
      'shipment_update',
      t,
      b,
      '/customer-portal.html#shipment-' || s.id::text,
      k
    )
    ON CONFLICT (customer_user_id, event_key) DO NOTHING;
  END IF;

  INSERT INTO public.staff_alerts(
    kind, title, body, entity_type, entity_id, action_url, severity, audience_role, read_by
  )
  SELECT
    'shipment_update',
    t,
    b,
    'shipment_event',
    NEW.id::text,
    '/staff-os-v5.html#shipments',
    CASE WHEN NEW.status_key IN ('delivered','cancelled') THEN 'high' ELSE 'normal' END,
    NULL,
    '{}'::uuid[]
  WHERE NOT EXISTS (
    SELECT 1 FROM public.staff_alerts
    WHERE entity_type='shipment_event' AND entity_id=NEW.id::text
  );

  RETURN NEW;
END;
$function$;
