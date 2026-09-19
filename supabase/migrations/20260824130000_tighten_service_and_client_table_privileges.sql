-- Globall Cloud: remove residual table privileges exposed by historical grants.
-- Forward-only and idempotent. RLS/policies remain the authorization boundary;
-- this migration narrows the SQL privilege surface underneath them.

begin;

-- Never expose direct table privileges to the PUBLIC or anonymous roles.
revoke all on table public.staff from public, anon;
revoke all on table public.staff_activity_log from public, anon;
revoke all on table public.staff_notifications from public, anon;
revoke all on table public.staff_chat_rooms from public, anon;
revoke all on table public.staff_chat_members from public, anon;
revoke all on table public.staff_chat_messages from public, anon;
revoke all on table public.notification_delivery_events from public, anon;
revoke all on table public.quote_requests from public, anon;

-- Re-establish only the browser operations used by the existing RLS policies.
-- Column-level grants for writes remain least-privilege and are preserved from
-- the earlier staff/chat hardening migration.
grant select on table public.staff to authenticated;
grant select on table public.staff_activity_log to authenticated;
grant insert (staff_id, staff_name, action, target_id, details)
  on table public.staff_activity_log to authenticated;
grant select on table public.staff_notifications to authenticated;
grant update (read_at) on table public.staff_notifications to authenticated;
grant select on table public.staff_chat_rooms to authenticated;
grant select on table public.staff_chat_members to authenticated;
grant update (last_read_at) on table public.staff_chat_members to authenticated;
grant select on table public.staff_chat_messages to authenticated;
grant insert (room_id, sender_id, body, client_message_id)
  on table public.staff_chat_messages to authenticated;
grant update (body, edited_at) on table public.staff_chat_messages to authenticated;

-- Quote creation and own-record reads are supported by the existing customer
-- RLS policies. No direct browser delete, truncate, trigger, or references
-- privileges are required.
grant select, insert on table public.quote_requests to authenticated;

-- Staff delivery monitoring uses Realtime and the account-admin API; SELECT is
-- sufficient for the authenticated Realtime authorization path.
grant select on table public.notification_delivery_events to authenticated;

-- The trusted server boundary remains unchanged.
grant all on table public.staff to service_role;
grant all on table public.staff_activity_log to service_role;
grant all on table public.staff_notifications to service_role;
grant all on table public.staff_chat_rooms to service_role;
grant all on table public.staff_chat_members to service_role;
grant all on table public.staff_chat_messages to service_role;
grant all on table public.notification_delivery_events to service_role;
grant all on table public.quote_requests to service_role;

commit;
