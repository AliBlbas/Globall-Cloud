-- Allow authenticated customer-self Edge Function writes to update their
-- own notification read_at timestamp without invoking the client-only is_staff()
-- RPC from a service_role database session. Browser/RLS checks remain unchanged.
BEGIN;

CREATE OR REPLACE FUNCTION public.guard_customer_notification_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Trusted Edge Functions validate the request and scope writes to customer_user_id.
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NOT (SELECT public.is_staff()) THEN
    IF NEW.customer_user_id IS DISTINCT FROM OLD.customer_user_id
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.body IS DISTINCT FROM OLD.body
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Customer notifications are immutable except read_at';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

COMMIT;
