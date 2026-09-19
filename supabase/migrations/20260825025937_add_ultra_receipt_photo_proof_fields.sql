-- Add additive warehouse evidence fields for the ULTRA Photo Proof flow.
-- Existing receipt rows remain valid and existing photos JSONB is preserved.
ALTER TABLE public.warehouse_receipts
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'received',
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS photo_taken_at timestamptz,
  ADD COLUMN IF NOT EXISTS gc_code_detected text,
  ADD COLUMN IF NOT EXISTS ocr_text text,
  ADD COLUMN IF NOT EXISTS ocr_confidence numeric,
  ADD COLUMN IF NOT EXISTS ai_detected_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_assigned boolean NOT NULL DEFAULT false;

ALTER TABLE public.warehouse_receipts
  DROP CONSTRAINT IF EXISTS warehouse_receipts_stage_chk;
ALTER TABLE public.warehouse_receipts
  ADD CONSTRAINT warehouse_receipts_stage_chk
  CHECK (stage IN ('received','china_received','uae_arrived','erbil_arrived','delivery_proof'));

ALTER TABLE public.warehouse_receipts
  DROP CONSTRAINT IF EXISTS warehouse_receipts_coordinates_chk;
ALTER TABLE public.warehouse_receipts
  ADD CONSTRAINT warehouse_receipts_coordinates_chk
  CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180));

CREATE INDEX IF NOT EXISTS warehouse_receipts_stage_idx
  ON public.warehouse_receipts(stage, received_at DESC);
CREATE INDEX IF NOT EXISTS warehouse_receipts_gc_code_detected_idx
  ON public.warehouse_receipts(gc_code_detected)
  WHERE gc_code_detected IS NOT NULL;

-- Receipt uploads use the protected account-admin function. Direct deletion from
-- the bucket is restricted to active Super Admins for defense in depth.
DROP POLICY IF EXISTS "warehouse_receipts_staff_delete" ON storage.objects;
CREATE POLICY "warehouse_receipts_super_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'warehouse-receipts'
    AND EXISTS (
      SELECT 1
      FROM public.staff s
      WHERE s.id = (SELECT auth.uid())
        AND s.is_active = true
        AND s.role = 'super_admin'
    )
  );
