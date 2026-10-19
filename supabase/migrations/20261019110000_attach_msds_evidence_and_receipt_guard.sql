-- Private MSDS evidence and final database-level cargo acceptance for quotes and warehouse receipts.
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS msds_document_path text;

ALTER TABLE public.warehouse_receipts
  ADD COLUMN IF NOT EXISTS has_battery boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_liquid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS msds_provided boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS medical_device boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS msds_document_path text,
  ADD COLUMN IF NOT EXISTS compliance_status text NOT NULL DEFAULT 'pending';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer-msds-documents',
  'customer-msds-documents',
  false,
  10485760,
  ARRAY['application/pdf','image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS gc_customer_msds_insert ON storage.objects;
CREATE POLICY gc_customer_msds_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'customer-msds-documents'
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);

DROP POLICY IF EXISTS gc_customer_msds_select ON storage.objects;
CREATE POLICY gc_customer_msds_select
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'customer-msds-documents'
  AND (
    (storage.foldername(name))[1] = (select auth.uid())::text
    OR is_staff()
  )
);

DROP POLICY IF EXISTS gc_customer_msds_delete ON storage.objects;
CREATE POLICY gc_customer_msds_delete
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'customer-msds-documents'
  AND (
    (storage.foldername(name))[1] = (select auth.uid())::text
    OR is_super_admin()
  )
);

CREATE OR REPLACE FUNCTION public.enforce_logistics_quote_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'pg_temp'
AS $function$
DECLARE
  c jsonb;
  p jsonb;
  v_cargo_text text;
  v_has_battery boolean;
  v_has_liquid boolean;
  v_medical_device boolean;
BEGIN
  v_cargo_text := concat_ws(' ', NULLIF(NEW.product_type, ''), NULLIF(NEW.cargo_description, ''), NULLIF(NEW.notes, ''));

  v_medical_device := COALESCE(NEW.medical_device, false)
    OR v_cargo_text ~* '(medical|medicine|medication|surgical|clinic|hospital|پزیشک|دەرمان|نەشتەرگەری)';
  v_has_battery := COALESCE(NEW.has_battery, false)
    OR v_cargo_text ~* '(^|[^[:alnum:]])(battery|batteries|lithium|power[[:space:]]?bank)([^[:alnum:]]|$)|باتری|پاتری';
  v_has_liquid := COALESCE(NEW.has_liquid, false)
    OR v_cargo_text ~* '(^|[^[:alnum:]])(liquid|perfume|fragrance|shampoo|gel|oil)([^[:alnum:]]|$)|شلە|شلەمەنی|عەتری|پەرفیوم';

  NEW.medical_device := v_medical_device;
  NEW.has_battery := v_has_battery;
  NEW.has_liquid := v_has_liquid;

  IF v_medical_device THEN
    RAISE EXCEPTION 'MEDICAL_EQUIPMENT_PROHIBITED';
  END IF;
  IF (v_has_battery OR v_has_liquid)
     AND (COALESCE(NEW.msds_provided, false) = false OR NULLIF(BTRIM(NEW.msds_document_path), '') IS NULL) THEN
    RAISE EXCEPTION 'MSDS_REQUIRED';
  END IF;

  c := public.validate_logistics_cargo(
    v_cargo_text,
    v_has_battery,
    v_has_liquid,
    COALESCE(NEW.msds_provided, false),
    v_medical_device
  );
  IF COALESCE((c->>'allowed')::boolean, false) = false THEN
    RAISE EXCEPTION '%', COALESCE(c->>'code', 'CARGO_NOT_ALLOWED');
  END IF;

  IF lower(COALESCE(NEW.transport_mode, '')) IN ('air', 'sea', 'land') THEN
    p := public.calculate_logistics_price(
      NEW.origin_key, NEW.dest_key, NEW.transport_mode,
      COALESCE(NEW.product_type, 'general'), NEW.weight_kg, NEW.volume_cbm, NULL
    );
    NEW.calculated_amount := COALESCE((p->>'iqd')::numeric, (p->>'usd')::numeric);
    NEW.calculated_currency := COALESCE(p->>'currency', 'IQD');
    NEW.calculated_rate_key := p->>'rate_key';
  END IF;

  NEW.compliance_status := 'approved';
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_logistics_warehouse_receipt_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'pg_temp'
AS $function$
DECLARE
  v_cargo_text text;
  v_has_battery boolean;
  v_has_liquid boolean;
  v_medical_device boolean;
  c jsonb;
BEGIN
  v_cargo_text := concat_ws(
    ' ',
    NULLIF(NEW.product_type, ''),
    NULLIF(NEW.description, ''),
    NULLIF(NEW.notes, ''),
    CASE WHEN NEW.label_metadata IS NULL THEN NULL ELSE NEW.label_metadata::text END
  );

  v_medical_device := COALESCE(NEW.medical_device, false)
    OR v_cargo_text ~* '(medical|medicine|medication|surgical|clinic|hospital|پزیشک|دەرمان|نەشتەرگەری)';
  v_has_battery := COALESCE(NEW.has_battery, false)
    OR v_cargo_text ~* '(^|[^[:alnum:]])(battery|batteries|lithium|power[[:space:]]?bank)([^[:alnum:]]|$)|باتری|پاتری';
  v_has_liquid := COALESCE(NEW.has_liquid, false)
    OR v_cargo_text ~* '(^|[^[:alnum:]])(liquid|perfume|fragrance|shampoo|gel|oil)([^[:alnum:]]|$)|شلە|شلەمەنی|عەتری|پەرفیوم';

  NEW.medical_device := v_medical_device;
  NEW.has_battery := v_has_battery;
  NEW.has_liquid := v_has_liquid;
  NEW.msds_provided := NULLIF(BTRIM(NEW.msds_document_path), '') IS NOT NULL;

  IF v_medical_device THEN
    RAISE EXCEPTION 'MEDICAL_EQUIPMENT_PROHIBITED';
  END IF;
  IF (v_has_battery OR v_has_liquid)
     AND NULLIF(BTRIM(NEW.msds_document_path), '') IS NULL THEN
    RAISE EXCEPTION 'MSDS_REQUIRED';
  END IF;

  c := public.validate_logistics_cargo(
    v_cargo_text, v_has_battery, v_has_liquid, NEW.msds_provided, v_medical_device
  );
  IF COALESCE((c->>'allowed')::boolean, false) = false THEN
    RAISE EXCEPTION '%', COALESCE(c->>'code', 'CARGO_NOT_ALLOWED');
  END IF;

  NEW.compliance_status := 'approved';
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_logistics_warehouse_receipt_rules ON public.warehouse_receipts;
CREATE TRIGGER trg_enforce_logistics_warehouse_receipt_rules
BEFORE INSERT OR UPDATE ON public.warehouse_receipts
FOR EACH ROW EXECUTE FUNCTION public.enforce_logistics_warehouse_receipt_rules();
