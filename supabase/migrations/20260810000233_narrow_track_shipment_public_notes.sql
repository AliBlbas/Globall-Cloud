-- track_shipment() is SECURITY DEFINER and callable by anyone who knows a
-- tracking ID (by design, for public tracking + invoice download). It was
-- returning `select *`, including internal staff `notes`. The frontend
-- fetches notes into the shipment object but never actually renders it
-- anywhere, so excluding it here is a pure risk reduction with no
-- functional change. name/phone/email/amounts are intentionally kept
-- because the invoice-by-tracking-ID feature needs them.
create or replace function public.track_shipment(p_id text)
returns setof public.shipments
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    id, customer_name, customer_phone, customer_email,
    null::text as notes,
    origin_key, dest_key, "type", weight_kg, volume_cbm, items_count,
    total_amount, paid_amount, current_step_index, step_dates, eta,
    created_at, customer_user_id, directory_customer_id, step_photos,
    batch_code, branch
  from public.shipments
  where id = p_id;
$function$;;
