create or replace function public.detect_stale_shipments()
returns integer
language plpgsql
security definer
set search_path to pg_catalog, public, pg_temp
as $$
declare
  inserted_count integer := 0;
begin
  insert into public.logistics_exceptions (
    shipment_id,severity,title,note,status,created_by,due_at
  )
  select
    s.id::text,
    'warning',
    'Shipment tracking is stale',
    'No tracking update has been received for more than 6 hours while the shipment is in an active transit step.',
    'open',
    null,
    now() + interval '1 hour'
  from public.shipments s
  where s.archived_at is null
    and s.current_step_index between 1 and 4
    and s.tracking_updated_at is not null
    and s.tracking_updated_at < now() - interval '6 hours'
    and not exists (
      select 1 from public.logistics_exceptions le
      where le.shipment_id=s.id::text
        and le.status='open'
        and le.title='Shipment tracking is stale'
    );
  get diagnostics inserted_count=row_count;
  return inserted_count;
end;
$$;

create or replace function public.detect_eta_sla_breaches()
returns integer
language plpgsql
security definer
set search_path to pg_catalog, public, pg_temp
as $$
declare
  inserted_count integer := 0;
begin
  insert into public.logistics_exceptions(
    shipment_id,severity,title,note,status,created_by,created_source,due_at
  )
  select
    s.id::text,
    case when now()-s.eta > interval '24 hours' then 'critical' else 'high' end,
    'Shipment ETA breached',
    'The shipment ETA has passed by more than 2 hours while it is not yet delivered.',
    'open',null,'system',now()+interval '2 hours'
  from public.shipments s
  where s.archived_at is null
    and s.eta is not null
    and s.eta < now()-interval '2 hours'
    and coalesce(s.current_step_index,0)<5
    and coalesce(s.operational_status,'') not in ('delivered','cancelled','closed')
    and not exists (
      select 1 from public.logistics_exceptions le
      where le.shipment_id=s.id::text and le.status='open' and le.title='Shipment ETA breached'
    );
  get diagnostics inserted_count=row_count;

  insert into public.customer_notifications(customer_user_id,shipment_id,kind,title,body,action_url)
  select
    s.customer_user_id,s.id::text,'eta_breach','Shipment delivery update',
    'Your shipment ETA has passed by more than 2 hours. Our operations team is reviewing the delay.',
    '/?track='||replace(s.id::text,' ','%20')
  from public.shipments s
  where s.archived_at is null
    and s.customer_user_id is not null
    and s.eta is not null
    and s.eta < now()-interval '2 hours'
    and coalesce(s.current_step_index,0)<5
    and coalesce(s.operational_status,'') not in ('delivered','cancelled','closed')
    and not exists (
      select 1 from public.customer_notifications cn
      where cn.customer_user_id=s.customer_user_id
        and cn.shipment_id=s.id::text
        and cn.kind='eta_breach'
        and cn.created_at > now()-interval '24 hours'
    );
  return inserted_count;
end;
$$;

revoke all on function public.detect_stale_shipments() from public,anon,authenticated;
revoke all on function public.detect_eta_sla_breaches() from public,anon,authenticated;
grant execute on function public.detect_stale_shipments() to service_role;
grant execute on function public.detect_eta_sla_breaches() to service_role;
