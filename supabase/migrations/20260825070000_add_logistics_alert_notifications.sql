-- Deterministic logistics alert fan-out for active staff.
-- In-app delivery is durable and deduplicated; external delivery remains provider-gated.

begin;

alter table public.staff_notifications
  alter column entity_id drop not null;

alter table public.staff_notifications
  add column if not exists dedupe_key text;

create unique index if not exists staff_notifications_staff_dedupe_uidx
  on public.staff_notifications(staff_id, dedupe_key)
  where dedupe_key is not null;

create or replace function public.detect_logistics_operational_alerts()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_total integer := 0;
  v_inserted integer := 0;
begin
  -- Preserve the existing customer-facing ETA monitor and add staff routing.
  perform public.detect_eta_sla_breaches();

  insert into public.staff_notifications(
    staff_id, kind, title, body, action_url, entity_type, entity_id, dedupe_key
  )
  select
    st.id,
    'logistics_alert',
    case when now() - sh.eta > interval '24 hours' then 'Critical ETA breach' else 'Shipment ETA breach' end,
    format('Shipment %s is overdue beyond its ETA. Current status: %s. Location: %s.', sh.id, replace(coalesce(sh.operational_status, 'unknown'), '_', ' '), coalesce(sh.current_location_label, 'unknown')),
    '/staff-os?tab=shipments&shipment_id=' || replace(sh.id, ' ', '%20'),
    'shipment',
    null,
    'eta_breach:' || sh.id || ':' || to_char(sh.eta, 'YYYY-MM-DD"T"HH24:MI:SSOF')
  from public.staff st
  join public.shipments sh on (
    st.branch = 'all'
    or sh.branch is null
    or sh.branch = st.branch
  )
  where st.is_active = true
    and st.role in ('admin','super_admin','accountant','operations','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','delivery','driver')
    and sh.archived_at is null
    and sh.eta is not null
    and sh.eta < now() - interval '2 hours'
    and coalesce(sh.current_step_index, 0) < 5
    and coalesce(sh.operational_status, '') not in ('delivered','cancelled','closed')
  on conflict do nothing;
  get diagnostics v_inserted = row_count;
  v_total := v_total + v_inserted;

  insert into public.staff_notifications(
    staff_id, kind, title, body, action_url, entity_type, entity_id, dedupe_key
  )
  select
    st.id,
    'logistics_alert',
    case when le.severity = 'critical' then 'Critical logistics exception' else 'Logistics exception needs attention' end,
    format('%s%s', le.title, case when nullif(trim(coalesce(le.note, '')), '') is null then '' else ' — ' || left(trim(le.note), 500) end),
    case when le.shipment_id is null then '/staff-os?tab=alerts' else '/staff-os?tab=shipments&shipment_id=' || replace(le.shipment_id, ' ', '%20') end,
    'logistics_exception',
    null,
    'exception:' || le.id::text || ':' || le.status
  from public.staff st
  join public.logistics_exceptions le on true
  left join public.shipments sh on sh.id = le.shipment_id
  where st.is_active = true
    and st.role in ('admin','super_admin','accountant','operations','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','delivery','driver')
    and le.status in ('open','acknowledged')
    and le.severity in ('high','critical')
    and (
      st.branch = 'all'
      or (sh.branch is not null and sh.branch = st.branch)
      or (sh.branch is null and st.role in ('admin','super_admin','accountant','operations'))
    )
  on conflict do nothing;
  get diagnostics v_inserted = row_count;
  v_total := v_total + v_inserted;

  insert into public.staff_notifications(
    staff_id, kind, title, body, action_url, entity_type, entity_id, dedupe_key
  )
  select
    st.id,
    'logistics_alert',
    'Tracking heartbeat is stale',
    format('Shipment %s has had no tracking update for more than 24 hours. Last location: %s.', sh.id, coalesce(sh.current_location_label, 'unknown')),
    '/staff-os?tab=shipments&shipment_id=' || replace(sh.id, ' ', '%20'),
    'shipment',
    null,
    'stale_tracking:' || sh.id || ':' || to_char(now(), 'YYYY-MM-DD')
  from public.staff st
  join public.shipments sh on (
    st.branch = 'all'
    or sh.branch is null
    or sh.branch = st.branch
  )
  where st.is_active = true
    and st.role in ('admin','super_admin','accountant','operations','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','delivery','driver')
    and sh.archived_at is null
    and sh.tracking_updated_at is not null
    and sh.tracking_updated_at < now() - interval '24 hours'
    and coalesce(sh.current_step_index, 0) < 5
    and coalesce(sh.operational_status, '') not in ('delivered','cancelled','closed')
  on conflict do nothing;
  get diagnostics v_inserted = row_count;
  v_total := v_total + v_inserted;

  return v_total;
end;
$$;

revoke all on function public.detect_logistics_operational_alerts() from public, anon, authenticated;
grant execute on function public.detect_logistics_operational_alerts() to service_role;

-- The detector is intentionally not scheduled here. Production activation of
-- staff notification writes requires explicit operational approval and a
-- verified scheduler/worker secret. The read-only Staff OS feed is live now.

commit;
