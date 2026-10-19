-- Align published air-transit windows with the approved business rules.
-- Safe to rerun: only active rows for these exact origin/mode/destination keys are touched.
UPDATE public.pricing_rates
SET transit_min_days = 7,
    transit_max_days = 10,
    updated_at = now()
WHERE origin_key = 'china'
  AND destination_key = 'erbil'
  AND transport_mode = 'air'
  AND is_active = true;

UPDATE public.pricing_rates
SET transit_min_days = 10,
    transit_max_days = 15,
    updated_at = now()
WHERE origin_key = 'usa'
  AND destination_key = 'erbil'
  AND transport_mode = 'air'
  AND is_active = true;
