-- Individual carton manifest rows for warehouse receipts.
-- Customer data is only exposed through authenticated Edge Functions that validate GC ownership.
BEGIN;

CREATE TABLE IF NOT EXISTS public.warehouse_receipt_cartons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.warehouse_receipts(id) ON DELETE CASCADE,
  customer_directory_id uuid NOT NULL REFERENCES public.customer_directory(id) ON DELETE RESTRICT,
  gc_code text NOT NULL CHECK (gc_code ~ '^GC-[A-Z0-9-]{2,30}$'),
  carton_index integer NOT NULL CHECK (carton_index > 0),
  carton_total integer NOT NULL CHECK (carton_total >= carton_index),
  carton_code text NOT NULL UNIQUE,
  warehouse_location text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','stored','in_transit','delivered','on_hold','damaged','lost','cancelled')),
  package_id uuid NULL REFERENCES public.shipment_packages(id) ON DELETE SET NULL,
  created_by uuid NULL REFERENCES public.staff(id) ON DELETE SET NULL,
  created_by_name text NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (receipt_id, carton_index)
);

CREATE INDEX IF NOT EXISTS warehouse_receipt_cartons_receipt_idx
  ON public.warehouse_receipt_cartons (receipt_id, carton_index);
CREATE INDEX IF NOT EXISTS warehouse_receipt_cartons_customer_received_idx
  ON public.warehouse_receipt_cartons (customer_directory_id, received_at DESC);
CREATE INDEX IF NOT EXISTS warehouse_receipt_cartons_gc_received_idx
  ON public.warehouse_receipt_cartons (gc_code, received_at DESC);
CREATE INDEX IF NOT EXISTS warehouse_receipt_cartons_package_idx
  ON public.warehouse_receipt_cartons (package_id)
  WHERE package_id IS NOT NULL;

ALTER TABLE public.warehouse_receipt_cartons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.warehouse_receipt_cartons FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.warehouse_receipt_cartons TO service_role;

COMMENT ON TABLE public.warehouse_receipt_cartons IS
  'Individual carton manifest rows for each warehouse receipt. Reads are served through authenticated Edge Functions so customer/GC ownership is explicitly checked.';
COMMENT ON COLUMN public.warehouse_receipt_cartons.carton_code IS
  'Unique internal tracking/label code that includes the owning GC code and is safe to use as a carton barcode.';
COMMENT ON COLUMN public.warehouse_receipt_cartons.received_at IS
  'Timestamp of intake at the warehouse; stored as timestamptz and displayed in Asia/Baghdad for customer/staff UI.';

COMMIT;
