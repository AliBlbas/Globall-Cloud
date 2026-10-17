-- Add indexes to cover foreign-key lookups reported by the production performance advisor.
-- The statements are idempotent and do not modify or delete operational data.
BEGIN;

CREATE INDEX IF NOT EXISTS customer_legacy_code_review_reviewed_by_idx
  ON public.customer_legacy_code_review (reviewed_by);
CREATE INDEX IF NOT EXISTS financial_records_gc_code_idx
  ON public.financial_records (gc_code);
CREATE INDEX IF NOT EXISTS shop_order_items_product_id_idx
  ON public.shop_order_items (product_id);
CREATE INDEX IF NOT EXISTS warehouse_items_gc_code_idx
  ON public.warehouse_items (gc_code);
CREATE INDEX IF NOT EXISTS warehouse_receipt_cartons_created_by_idx
  ON public.warehouse_receipt_cartons (created_by);

COMMIT;
