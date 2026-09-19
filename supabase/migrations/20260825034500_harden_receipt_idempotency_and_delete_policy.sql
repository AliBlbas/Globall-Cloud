-- Make receipt retries safe and keep deletion restricted to active Super Admins.
ALTER TABLE public.warehouse_receipts
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS warehouse_receipts_idempotency_key_uidx
  ON public.warehouse_receipts(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

DROP POLICY IF EXISTS warehouse_receipts_staff_delete ON public.warehouse_receipts;
CREATE POLICY warehouse_receipts_super_admin_delete ON public.warehouse_receipts
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff s
      WHERE s.id = (SELECT auth.uid())
        AND s.is_active = true
        AND s.role = 'super_admin'
    )
  );
