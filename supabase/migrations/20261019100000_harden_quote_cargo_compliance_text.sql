-- First-pass compliance guard: inspect product type, cargo description, and notes.
-- The later 20261019100500 migration refines the matching expression; the
-- 20261019110000 migration additionally requires a persisted private MSDS path.
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
