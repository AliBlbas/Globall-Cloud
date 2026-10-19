-- Restore only the server-side write permissions required by the authenticated Staff OS Edge Functions.
-- Browser roles remain unchanged; each Edge Function continues to authenticate and authorize staff before writes.
GRANT UPDATE ON TABLE public.shipments TO service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE public.shipment_cargo_items TO service_role;
