-- Staff-only policies for sensitive tables that were RLS-enabled without policies.
DO $migration$
DECLARE
  t text;
  target_tables text[] := ARRAY[
    'chat_messages',
    'excel_import_batches',
    'excel_import_rows',
    'financial_records',
    'pricing_rates',
    'shipment_customer_links',
    'warehouse_items',
    'warehouse_receipt_cartons',
    'warehouse_receipts'
  ];
BEGIN
  FOREACH t IN ARRAY target_tables LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (private.is_real_authenticated_session() AND private.is_staff()) WITH CHECK (private.is_real_authenticated_session() AND private.is_staff())',
      'gc_staff_only_' || t, t
    );
  END LOOP;
END
$migration$;

REVOKE EXECUTE ON FUNCTION public.shop_update_order_status(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shop_update_order_status(uuid, text)
  TO service_role;

-- GC sequence values are allocated by server-side functions only.
REVOKE ALL ON TABLE public.customer_gc_sequence FROM anon, authenticated;
