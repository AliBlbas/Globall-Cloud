-- The cargo-compliance routine is attached to warehouse_receipts as a trigger.
-- Do not expose direct EXECUTE privilege through the Supabase Data API.
-- Existing trigger behavior remains unchanged.
BEGIN;

REVOKE EXECUTE ON FUNCTION public.enforce_logistics_warehouse_receipt_rules() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_logistics_warehouse_receipt_rules() FROM anon, authenticated;

COMMIT;
