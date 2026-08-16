create or replace function public.detect_stale_shipments()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  inserted_count integer := 0;
begin
  insert into public.logistics_exceptions (
    shipment_id,
    severity,
    title,
    note,
    status,
    created_by,
    due_at
  )
  select
    s.id,
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
      select 1
      from public.logistics_exceptions le
      where le.shipment_id = s.id
        and le.status = 'open'
        and le.title = 'Shipment tracking is stale'
    );

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.detect_stale_shipments() from public;
grant execute on function public.detect_stale_shipments() to service_role;

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where command = 'select public.detect_stale_shipments();'
  limit 1;

  if existing_job is null then
    perform cron.schedule(
      'global-cloud-stale-shipment-monitor',
      '*/15 * * * *',
      'select public.detect_stale_shipments();'
    );
  end if;
end;
$$;;
