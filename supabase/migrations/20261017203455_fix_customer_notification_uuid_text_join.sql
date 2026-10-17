-- Prevent customer-notification fan-out from comparing a UUID shipment id to the legacy text notification id.
-- This trigger runs in the same transaction as the notification insert, so the type mismatch can roll back warehouse or chat operations.
-- Keep the notification schema backward-compatible and retain all existing opt-in, recipient, and idempotency rules.
BEGIN;

CREATE OR REPLACE FUNCTION public.fanout_customer_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_email text;
  v_phone text;
  v_email_enabled boolean := false;
  v_whatsapp_enabled boolean := false;
  v_sms_enabled boolean := false;
  v_event_key text := COALESCE(NULLIF(TRIM(NEW.event_key), ''), 'customer_notification:' || NEW.id::text);
  v_payload jsonb := jsonb_build_object(
    'title', LEFT(NEW.title, 180),
    'body', LEFT(COALESCE(NEW.body, ''), 4000),
    'action_url', COALESCE(NEW.action_url, '/customer-portal.html')
  );
BEGIN
  IF NEW.customer_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.event_key IS NULL THEN
    UPDATE public.customer_notifications
       SET event_key = v_event_key
     WHERE id = NEW.id;
  END IF;

  SELECT
    COALESCE(NULLIF(TRIM(s.customer_email), ''), u.email),
    COALESCE(NULLIF(TRIM(s.customer_phone), ''), NULLIF(TRIM(u.phone), '')),
    COALESCE(p.email_enabled, false),
    COALESCE(p.whatsapp_enabled, false),
    COALESCE(p.sms_enabled, false)
  INTO v_email, v_phone, v_email_enabled, v_whatsapp_enabled, v_sms_enabled
  FROM auth.users AS u
  LEFT JOIN public.shipments AS s
    ON s.id::text = NULLIF(BTRIM(NEW.shipment_id), '')
  LEFT JOIN public.customer_notification_preferences AS p
    ON p.customer_user_id = u.id
  WHERE u.id = NEW.customer_user_id;

  IF v_email_enabled AND v_email IS NOT NULL THEN
    INSERT INTO public.notification_outbox(customer_user_id, shipment_id, channel, event_key, recipient, payload)
    VALUES (NEW.customer_user_id, NEW.shipment_id, 'email', v_event_key, v_email, v_payload)
    ON CONFLICT (event_key, channel) DO NOTHING;
  END IF;

  IF v_phone IS NOT NULL AND (v_whatsapp_enabled OR v_sms_enabled) THEN
    IF v_whatsapp_enabled THEN
      INSERT INTO public.notification_outbox(customer_user_id, shipment_id, channel, event_key, recipient, payload)
      VALUES (NEW.customer_user_id, NEW.shipment_id, 'whatsapp', v_event_key, v_phone, v_payload)
      ON CONFLICT (event_key, channel) DO NOTHING;
    END IF;

    IF v_sms_enabled THEN
      INSERT INTO public.notification_outbox(customer_user_id, shipment_id, channel, event_key, recipient, payload)
      VALUES (NEW.customer_user_id, NEW.shipment_id, 'sms', v_event_key, v_phone, v_payload)
      ON CONFLICT (event_key, channel) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

COMMIT;
