-- Globall Cloud: remove residual authenticated privileges left by historical
-- table-level grants. RLS policies are unchanged; only SQL privileges narrow.

begin;

-- Staff delivery monitoring only needs SELECT. TRIGGER, TRUNCATE and
-- REFERENCES are not required by the browser or Realtime client.
revoke all on table public.notification_delivery_events from authenticated;
grant select on table public.notification_delivery_events to authenticated;

-- Browser customers may create quote requests and read rows allowed by RLS.
-- Quote updates are performed through the trusted account-admin service role;
-- no direct authenticated UPDATE/DELETE/TRUNCATE/trigger/reference privilege
-- is required by the deployed client contract.
revoke all on table public.quote_requests from authenticated;
grant select, insert on table public.quote_requests to authenticated;

commit;
