drop function if exists public.track_shipment(text);
create function public.track_shipment(p_id text)
returns setof public.shipments
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    s.id,
    case when auth.uid() is not null and (s.customer_user_id = auth.uid() or public.is_staff()) then s.customer_name else null end as customer_name,
    case when auth.uid() is not null and (s.customer_user_id = auth.uid() or public.is_staff()) then s.customer_phone else null end as customer_phone,
    case when auth.uid() is not null and (s.customer_user_id = auth.uid() or public.is_staff()) then s.customer_email else null end as customer_email,
    case when auth.uid() is not null and (s.customer_user_id = auth.uid() or public.is_staff()) then s.notes else null end as notes,
    s.origin_key,
    s.dest_key,
    s.type,
    s.weight_kg,
    s.volume_cbm,
    s.items_count,
    s.total_amount,
    s.paid_amount,
    s.current_step_index,
    s.step_dates,
    s.eta,
    s.created_at,
    case when auth.uid() is not null and (s.customer_user_id = auth.uid() or public.is_staff()) then s.customer_user_id else null end as customer_user_id,
    case when auth.uid() is not null and (s.customer_user_id = auth.uid() or public.is_staff()) then s.directory_customer_id else null end as directory_customer_id,
    s.step_photos,
    s.batch_code,
    s.branch
  from public.shipments s
  where s.id = p_id;
$$;

revoke execute on function public.track_shipment(text) from public;
grant execute on function public.track_shipment(text) to anon, authenticated;
;
