-- Prevent unauthenticated or signed-in API clients from directly invoking internal SECURITY DEFINER functions.
-- These functions are used as an event-trigger/trigger implementation and do not need REST/RPC EXECUTE access.
revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.shipments_set_branch() from public;

-- Defense-in-depth for the SECURITY DEFINER trigger function: pin the search_path
-- so object resolution cannot be influenced by caller-controlled schemas.
alter function public.shipments_set_branch() set search_path = public, pg_temp;

-- Keep the event-trigger helper restricted to the database owner path.
alter function public.rls_auto_enable() set search_path = pg_catalog;
;
