-- Final production performance hardening: initialize auth context once per statement and remove duplicate index.
DROP POLICY IF EXISTS customer_notifications_select ON public.customer_notifications;
CREATE POLICY customer_notifications_select ON public.customer_notifications FOR SELECT TO authenticated USING ((SELECT is_staff()) OR customer_user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS customer_notifications_update ON public.customer_notifications;
CREATE POLICY customer_notifications_update ON public.customer_notifications FOR UPDATE TO authenticated USING ((SELECT is_staff()) OR customer_user_id = (SELECT auth.uid())) WITH CHECK ((SELECT is_staff()) OR customer_user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS customer_notifications_staff_insert ON public.customer_notifications;
CREATE POLICY customer_notifications_staff_insert ON public.customer_notifications FOR INSERT TO authenticated WITH CHECK ((SELECT is_staff()));

DROP POLICY IF EXISTS delivery_proofs_select ON public.delivery_proofs;
CREATE POLICY delivery_proofs_select ON public.delivery_proofs FOR SELECT TO authenticated USING ((SELECT is_staff()) OR EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = delivery_proofs.shipment_id AND s.customer_user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS delivery_proofs_staff_insert ON public.delivery_proofs;
CREATE POLICY delivery_proofs_staff_insert ON public.delivery_proofs FOR INSERT TO authenticated WITH CHECK ((SELECT is_staff()) AND created_by = (SELECT auth.uid()));
DROP POLICY IF EXISTS delivery_proofs_staff_update ON public.delivery_proofs;
CREATE POLICY delivery_proofs_staff_update ON public.delivery_proofs FOR UPDATE TO authenticated USING ((SELECT is_staff())) WITH CHECK ((SELECT is_staff()));

DROP POLICY IF EXISTS logistics_exceptions_staff_all ON public.logistics_exceptions;
CREATE POLICY logistics_exceptions_staff_all ON public.logistics_exceptions FOR ALL TO authenticated USING ((SELECT is_staff())) WITH CHECK ((SELECT is_staff()) AND created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS quote_requests_customer_insert ON public.quote_requests;
CREATE POLICY quote_requests_customer_insert ON public.quote_requests FOR INSERT TO authenticated WITH CHECK (customer_user_id = (SELECT auth.uid()) OR (SELECT is_staff()));
DROP POLICY IF EXISTS quote_requests_customer_select ON public.quote_requests;
CREATE POLICY quote_requests_customer_select ON public.quote_requests FOR SELECT TO authenticated USING ((SELECT is_staff()) OR customer_user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS quote_requests_staff_update ON public.quote_requests;
CREATE POLICY quote_requests_staff_update ON public.quote_requests FOR UPDATE TO authenticated USING ((SELECT is_staff()) OR customer_user_id = (SELECT auth.uid())) WITH CHECK ((SELECT is_staff()) OR customer_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS shipment_documents_select ON public.shipment_documents;
CREATE POLICY shipment_documents_select ON public.shipment_documents FOR SELECT TO authenticated USING ((SELECT is_staff()) OR customer_user_id = (SELECT auth.uid()) OR is_public);
DROP POLICY IF EXISTS shipment_documents_staff_delete ON public.shipment_documents;
CREATE POLICY shipment_documents_staff_delete ON public.shipment_documents FOR DELETE TO authenticated USING ((SELECT is_staff()));
DROP POLICY IF EXISTS shipment_documents_staff_insert ON public.shipment_documents;
CREATE POLICY shipment_documents_staff_insert ON public.shipment_documents FOR INSERT TO authenticated WITH CHECK ((SELECT is_staff()));
DROP POLICY IF EXISTS shipment_documents_staff_update ON public.shipment_documents;
CREATE POLICY shipment_documents_staff_update ON public.shipment_documents FOR UPDATE TO authenticated USING ((SELECT is_staff())) WITH CHECK ((SELECT is_staff()));

DROP INDEX IF EXISTS public.shipments_customer_user_idx;;
