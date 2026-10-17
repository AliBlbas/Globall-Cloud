-- Allow the customer-self Edge Function's server-only service role to read
-- customer-scoped cargo details and delivery proof for verified solo shipments.
-- The function filters cargo by the authenticated customer's directory id, and
-- delivery proofs by shipment ids established after its ownership checks.
-- No anon/authenticated privileges are added; RLS remains enabled.
GRANT SELECT ON TABLE public.shipment_cargo_items TO service_role;
GRANT SELECT ON TABLE public.delivery_proofs TO service_role;
