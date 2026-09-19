create or replace function public.track_shipment(p_id text)
returns setof public.shipments
language sql
stable
security definer
set search_path = public, pg_temp
set statement_timeout = '2000ms'
as $function$
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
    case when auth.uid() is not null and (s.customer_user_id = auth.uid() or public.is_staff()) then s.total_amount else null end as total_amount,
    case when auth.uid() is not null and (s.customer_user_id = auth.uid() or public.is_staff()) then s.paid_amount else null end as paid_amount,
    s.current_step_index,
    s.step_dates,
    s.eta,
    s.created_at,
    case when auth.uid() is not null and (s.customer_user_id = auth.uid() or public.is_staff()) then s.customer_user_id else null end as customer_user_id,
    case when auth.uid() is not null and (s.customer_user_id = auth.uid() or public.is_staff()) then s.directory_customer_id else null end as directory_customer_id,
    case when auth.uid() is not null and (s.customer_user_id = auth.uid() or public.is_staff()) then s.step_photos else null end as step_photos,
    case when auth.uid() is not null and (s.customer_user_id = auth.uid() or public.is_staff()) then s.batch_code else null end as batch_code,
    case when auth.uid() is not null and public.is_staff() then s.branch else null end as branch
  from public.shipments s
  where length(trim(coalesce(p_id, ''))) between 1 and 128
    and s.id = trim(p_id);
$function$;

revoke execute on function public.track_shipment(text) from public;
revoke execute on function public.track_shipment(text) from authenticated;
grant execute on function public.track_shipment(text) to anon;;
