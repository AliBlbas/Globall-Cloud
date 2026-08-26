-- Structured label metadata for the real Globall Cloud receiving workflow.
-- The physical carrier label is the source of truth for the package receipt record.
ALTER TABLE public.warehouse_receipts
  ADD COLUMN IF NOT EXISTS label_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.warehouse_receipts
  ADD COLUMN IF NOT EXISTS label_captured_at timestamptz;

ALTER TABLE public.warehouse_receipts
  ADD COLUMN IF NOT EXISTS label_capture_method text NOT NULL DEFAULT 'manual';

ALTER TABLE public.warehouse_receipts
  DROP CONSTRAINT IF EXISTS warehouse_receipts_label_capture_method_chk;
ALTER TABLE public.warehouse_receipts
  ADD CONSTRAINT warehouse_receipts_label_capture_method_chk
  CHECK (label_capture_method IN ('manual','barcode','ocr','import'));

CREATE INDEX IF NOT EXISTS warehouse_receipts_label_tracking_idx
  ON public.warehouse_receipts ((label_metadata->>'carrier_tracking_number'))
  WHERE label_metadata ? 'carrier_tracking_number';

CREATE INDEX IF NOT EXISTS warehouse_receipts_label_invoice_idx
  ON public.warehouse_receipts ((label_metadata->>'invoice_number'))
  WHERE label_metadata ? 'invoice_number';

COMMENT ON COLUMN public.warehouse_receipts.label_metadata IS
  'Normalized carrier-label facts captured at receiving: invoice number, quantity, gross weight, declared value, package count, carrier, tracking number, supplier/origin and related label text.';
