-- The public system-health function uses a server-side client for bounded probes.
-- Restore only SELECT on the existing probe tables; no browser role is widened.
GRANT SELECT ON TABLE
  public.shipment_status_history,
  public.shipment_packages,
  public.shipment_customs_cases,
  public.notification_outbox,
  public.integration_inbox,
  public.payment_sessions,
  public.payment_webhook_events,
  public.warehouse_movements,
  public.shipment_route_legs,
  public.shipment_documents
TO service_role;
