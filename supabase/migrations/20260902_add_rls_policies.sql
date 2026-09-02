-- 20260902_add_rls_policies.sql
-- Row-Level Security (RLS) policies for core logistic tables
-- Creates helper functions and conservative policies that allow:
--  - staff roles to perform administrative operations
--  - customers to view their own shipments/delivery proofs
--  - restricts payment sessions to finance staff
-- Notes:
--  - This migration assumes a public.staff table exists with columns (id uuid, role text, is_active boolean)
--  - Customer ownership is encoded in shipments.metadata->>'customer_id' as the customer's auth.uid()
--  - Service-role usage (server processes) should use the Supabase service role key which bypasses RLS entirely.
--  - Review and adapt policies to your exact user/ownership model before deploying to production.

BEGIN;

-- Helper function: check whether current authenticated user is an active staff with any of the given roles
CREATE OR REPLACE FUNCTION public.is_staff_in(roles text[])
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.staff s
    WHERE s.id::text = auth.uid()::text
      AND s.role = ANY(roles)
      AND s.is_active = true
  );
$$;

-- Enable RLS and conservative policies on shipments
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- Staff full access (all operations)
CREATE POLICY shipments_staff_full_access ON public.shipments
  FOR ALL
  USING ( public.is_staff_in(ARRAY['admin','super_admin','operations','warehouse','accountant']) )
  WITH CHECK ( public.is_staff_in(ARRAY['admin','super_admin','operations','warehouse','accountant']) );

-- Allow customers to SELECT their own shipments (based on metadata.customer_id)
CREATE POLICY shipments_customer_select_own ON public.shipments
  FOR SELECT
  USING ( (metadata ->> 'customer_id') = auth.uid() );

-- Allow authenticated users to INSERT a shipment for themselves (customer creating a request)
CREATE POLICY shipments_customer_insert_own ON public.shipments
  FOR INSERT
  WITH CHECK ( (metadata ->> 'customer_id') = auth.uid() );

-- Shipment packages: staff full access; customers may SELECT packages for shipments they own
ALTER TABLE public.shipment_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY shipment_packages_staff_full_access ON public.shipment_packages
  FOR ALL
  USING ( public.is_staff_in(ARRAY['admin','super_admin','operations','warehouse','accountant']) )
  WITH CHECK ( public.is_staff_in(ARRAY['admin','super_admin','operations','warehouse','accountant']) );

CREATE POLICY shipment_packages_customer_select_own ON public.shipment_packages
  FOR SELECT
  USING ( EXISTS ( SELECT 1 FROM public.shipments s WHERE s.id = shipment_packages.shipment_id AND (s.metadata->> 'customer_id') = auth.uid() ) );

-- Shipment status history: staff append-only; customers can SELECT history for their shipments
ALTER TABLE public.shipment_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY shipment_status_staff_append ON public.shipment_status_history
  FOR INSERT
  WITH CHECK ( public.is_staff_in(ARRAY['admin','super_admin','operations','warehouse']) );

CREATE POLICY shipment_status_staff_full ON public.shipment_status_history
  FOR UPDATE, DELETE
  USING ( public.is_staff_in(ARRAY['admin','super_admin','operations','warehouse']) )
  WITH CHECK ( public.is_staff_in(ARRAY['admin','super_admin','operations','warehouse']) );

CREATE POLICY shipment_status_customer_select_own ON public.shipment_status_history
  FOR SELECT
  USING ( EXISTS ( SELECT 1 FROM public.shipments s WHERE s.id = shipment_status_history.shipment_id AND (s.metadata->> 'customer_id') = auth.uid() ) );

-- Delivery proofs: customers can SELECT proofs for their shipments; staff full access; INSERT by staff only (proofs created by authenticated devices should go through edge functions)
ALTER TABLE public.delivery_proofs ENABLE ROW LEVEL SECURITY;
CREATE POLICY delivery_proofs_staff_full ON public.delivery_proofs
  FOR ALL
  USING ( public.is_staff_in(ARRAY['admin','super_admin','operations','warehouse']) )
  WITH CHECK ( public.is_staff_in(ARRAY['admin','super_admin','operations','warehouse']) );

CREATE POLICY delivery_proofs_customer_select_own ON public.delivery_proofs
  FOR SELECT
  USING ( EXISTS ( SELECT 1 FROM public.shipments s WHERE s.id = delivery_proofs.shipment_id AND (s.metadata->> 'customer_id') = auth.uid() ) );

-- Warehouse receipts & movements: staff only
ALTER TABLE public.warehouse_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY warehouse_receipts_staff_full ON public.warehouse_receipts
  FOR ALL
  USING ( public.is_staff_in(ARRAY['admin','super_admin','warehouse','operations']) )
  WITH CHECK ( public.is_staff_in(ARRAY['admin','super_admin','warehouse','operations']) );

ALTER TABLE public.warehouse_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY warehouse_movements_staff_full ON public.warehouse_movements
  FOR ALL
  USING ( public.is_staff_in(ARRAY['admin','super_admin','warehouse','operations']) )
  WITH CHECK ( public.is_staff_in(ARRAY['admin','super_admin','warehouse','operations']) );

-- Notification outbox: inserts allowed for staff roles that produce notifications; workers (service role) will bypass RLS
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY notification_outbox_staff_insert ON public.notification_outbox
  FOR INSERT
  WITH CHECK ( public.is_staff_in(ARRAY['admin','super_admin','operations','accountant']) );

CREATE POLICY notification_outbox_staff_select ON public.notification_outbox
  FOR SELECT
  USING ( public.is_staff_in(ARRAY['admin','super_admin','operations','accountant']) );

-- Payment sessions: restrict to finance staff for reads; inserts/updates generally via server-side functions (service role)
ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_sessions_finance_select ON public.payment_sessions
  FOR SELECT
  USING ( public.is_staff_in(ARRAY['admin','super_admin','accountant','finance']) );

CREATE POLICY payment_sessions_finance_update ON public.payment_sessions
  FOR UPDATE
  USING ( public.is_staff_in(ARRAY['admin','super_admin','accountant','finance']) )
  WITH CHECK ( public.is_staff_in(ARRAY['admin','super_admin','accountant','finance']) );

-- Payment webhook events: staff can view; processing uses service-role or worker privileges
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_webhook_events_staff_select ON public.payment_webhook_events
  FOR SELECT
  USING ( public.is_staff_in(ARRAY['admin','super_admin','accountant','finance']) );

-- Safety note: service/worker processes should use the Supabase service_role key which bypasses RLS.
-- If you intend to allow certain authenticated non-staff operations, add explicit policies.

COMMIT;
