-- Normalize legacy shipment status values without inventing missing transport/customer data.
UPDATE public.shipments
SET status='in_transit', operational_status='in_transit'
WHERE lower(trim(status))='in-transit'
  AND (operational_status IS NULL OR lower(trim(operational_status))='in-transit');

-- Ensure every normalized shipment has at least one timeline event.
INSERT INTO public.shipment_tracking_events (shipment_id,status_key,title,note,location_label,is_public)
SELECT s.id::text,
       'in_transit',
       'Tracking timeline initialized',
       'Legacy shipment normalized to the canonical in_transit status.',
       s.current_location_label,
       true
FROM public.shipments s
WHERE s.status='in_transit'
  AND NOT EXISTS (
    SELECT 1
    FROM public.shipment_tracking_events e
    WHERE e.shipment_id=s.id::text
  );
