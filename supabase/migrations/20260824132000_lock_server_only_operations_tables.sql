-- Globall Cloud: lock internal operational tables behind trusted server APIs.
-- These tables are consumed by Edge Functions/RPCs, not by browser clients.
-- Forward-only and idempotent; row data and existing RLS definitions are kept.

begin;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'shipment_status_history',
    'shipment_packages',
    'shipment_customs_cases',
    'notification_outbox',
    'integration_inbox',
    'payment_sessions',
    'payment_webhook_events',
    'warehouse_movements',
    'shipment_route_legs',
    'shipment_documents'
  ] loop
    execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
    execute format('grant all on table public.%I to service_role', table_name);
  end loop;
end
$$;

commit;
