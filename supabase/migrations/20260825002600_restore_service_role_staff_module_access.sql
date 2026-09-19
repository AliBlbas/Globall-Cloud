-- Globall Cloud: restore trusted server access for protected Staff modules.
-- Forward-only and idempotent. Browser access remains governed by RLS;
-- service_role is used only inside server-side Edge Functions.

begin;

grant all on table public.staff_activity_log to service_role;
grant all on table public.staff_notifications to service_role;
grant all on table public.staff_chat_rooms to service_role;
grant all on table public.staff_chat_members to service_role;
grant all on table public.staff_chat_messages to service_role;
grant select on table public.notification_delivery_events to service_role;
grant select on table public.warehouse_receipts to service_role;
grant select, update on table public.pricing_rates to service_role;
grant select, update on table public.exchange_rates to service_role;

commit;

