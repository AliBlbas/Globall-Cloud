-- Globall Cloud: restore explicit service-role table privileges required by account-admin.
-- Forward-only and idempotent. RLS remains enabled; this only restores the
-- trusted Edge Function's table privileges after client-role revocations.

begin;

-- account-admin uses the service-role client for these aggregate reads/writes.
-- The service_role key is never exposed to the browser and continues to bypass
-- row-level policies as the trusted server boundary.
grant all on table public.staff_notifications to service_role;
grant all on table public.staff_chat_rooms to service_role;
grant all on table public.staff_chat_members to service_role;
grant all on table public.staff_chat_messages to service_role;
grant all on table public.notification_delivery_events to service_role;
grant all on table public.quote_requests to service_role;

commit;
