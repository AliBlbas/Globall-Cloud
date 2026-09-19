-- Expand staff role and branch validation for the SUPER CARGO ULTRA role model.
-- Existing values remain valid for backward compatibility; no row data is changed.
ALTER TABLE public.staff
  DROP CONSTRAINT IF EXISTS staff_role_check,
  DROP CONSTRAINT IF EXISTS staff_branch_check;

ALTER TABLE public.staff
  ADD CONSTRAINT staff_role_check CHECK (
    role = ANY (ARRAY[
      'admin'::text,
      'super_admin'::text,
      'accountant'::text,
      'finance'::text,
      'warehouse'::text,
      'warehouse_china'::text,
      'warehouse_uae'::text,
      'warehouse_erbil'::text,
      'operations'::text,
      'driver'::text,
      'delivery'::text
    ])
  );

ALTER TABLE public.staff
  ADD CONSTRAINT staff_branch_check CHECK (
    branch = ANY (ARRAY[
      'all'::text,
      'erbil'::text,
      'china'::text,
      'uae'::text,
      'dubai'::text
    ])
  );
