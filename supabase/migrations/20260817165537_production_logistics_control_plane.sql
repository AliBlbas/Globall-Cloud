-- Globall Cloud production control plane.
-- Adds auditable state transitions, package-level traceability, customs control,
-- idempotent integration intake, notification outbox, and server-side RPCs.

create extension if not exists pgcrypto;

alter table public.shipments
  add column if not exists state_version bigint not null default 1,
  add column if not exists service_level text not null default 'standard',
  add column if not exists incoterm text,
  add column if not exists declared_value numeric(14,2),
  add column if not exists declared_currency text not null default 'USD',
  add column if not exists external_reference text,
  add column if not exists origin_hub text,
  add column if not exists transit_hub text,
  add column if not exists destination_hub text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists shipments_external_reference_idx
  on public.shipments(external_reference) where external_reference is not null;
create index if not exists shipments_state_monitor_idx
  on public.shipments(operational_status, current_step_index, eta)
  where archived_at is null;

alter table public.logistics_exceptions
  alter column created_by drop not null,
  add column if not exists resolution_note text;

create table if not exists public.shipment_status_history (
  id bigint generated always as identity primary key,
  shipment_id text not null references public.shipments(id) on delete cascade,
  from_status text,
  to_status text not null,
  from_step integer,
  to_step integer not null,
  location_code text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  changed_by uuid references public.staff(id) on delete set null,
  changed_by_name text,
  idempotency_key text,
  occurred_at timestamptz not null default now(),
  unique (shipment_id, idempotency_key)
);
create index if not exists shipment_status_history_shipment_idx
  on public.shipment_status_history(shipment_id, occurred_at desc);
create index if not exists shipment_status_history_status_idx
  on public.shipment_status_history(to_status, occurred_at desc);

create table if not exists public.shipment_packages (
  id uuid primary key default gen_random_uuid(),
  shipment_id text not null references public.shipments(id) on delete cascade,
  package_code text not null unique,
  barcode text,
  package_type text not null default 'carton',
  description text,
  weight_kg numeric(12,3),
  length_cm numeric(10,2),
  width_cm numeric(10,2),
  height_cm numeric(10,2),
  declared_value numeric(14,2),
  declared_currency text not null default 'USD',
  current_hub text,
  status text not null default 'created' check (status in ('created','received','consolidated','in_transit','customs','delivered','lost','damaged','cancelled')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shipment_packages_shipment_idx
  on public.shipment_packages(shipment_id, created_at desc);
create index if not exists shipment_packages_hub_status_idx
  on public.shipment_packages(current_hub, status);

create table if not exists public.shipment_customs_cases (
  id uuid primary key default gen_random_uuid(),
  shipment_id text not null unique references public.shipments(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','submitted','inspection','cleared','held','rejected')),
  declaration_number text,
  hs_codes jsonb not null default '[]'::jsonb,
  declared_value numeric(14,2),
  declared_currency text not null default 'USD',
  duty_amount numeric(14,2),
  duty_currency text not null default 'USD',
  broker_name text,
  documents_complete boolean not null default false,
  hold_reason text,
  submitted_at timestamptz,
  cleared_at timestamptz,
  created_by uuid references public.staff(id) on delete set null,
  updated_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shipment_customs_cases_status_idx
  on public.shipment_customs_cases(status, updated_at desc);

create table if not exists public.integration_inbox (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  signature_valid boolean not null default false,
  status text not null default 'received' check (status in ('received','processing','processed','ignored','failed')),
  attempts integer not null default 0,
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_id)
);
create index if not exists integration_inbox_status_idx
  on public.integration_inbox(status, received_at);

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid references auth.users(id) on delete cascade,
  shipment_id text references public.shipments(id) on delete cascade,
  channel text not null check (channel in ('in_app','email','whatsapp','sms')),
  event_key text not null,
  recipient text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','cancelled')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_key, channel)
);
create index if not exists notification_outbox_delivery_idx
  on public.notification_outbox(status, next_attempt_at, created_at);
create index if not exists notification_outbox_customer_idx
  on public.notification_outbox(customer_user_id, created_at desc);

alter table public.shipment_status_history enable row level security;
alter table public.shipment_packages enable row level security;
alter table public.shipment_customs_cases enable row level security;
alter table public.integration_inbox enable row level security;
alter table public.notification_outbox enable row level security;

drop policy if exists shipment_status_history_staff_select on public.shipment_status_history;
create policy shipment_status_history_staff_select on public.shipment_status_history
  for select to authenticated using (
    public.is_staff() or exists (
      select 1 from public.shipments s
      where s.id = shipment_status_history.shipment_id
        and s.customer_user_id = auth.uid()
    )
  );
drop policy if exists shipment_packages_staff_select on public.shipment_packages;
create policy shipment_packages_staff_select on public.shipment_packages
  for select to authenticated using (
    public.is_staff() or exists (
      select 1 from public.shipments s
      where s.id = shipment_packages.shipment_id
        and s.customer_user_id = auth.uid()
    )
  );
drop policy if exists shipment_packages_staff_write on public.shipment_packages;
create policy shipment_packages_staff_write on public.shipment_packages
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists shipment_customs_cases_staff_select on public.shipment_customs_cases;
create policy shipment_customs_cases_staff_select on public.shipment_customs_cases
  for select to authenticated using (public.is_staff());
drop policy if exists notification_outbox_customer_select on public.notification_outbox;
create policy notification_outbox_customer_select on public.notification_outbox
  for select to authenticated using (
    public.is_staff() or customer_user_id = auth.uid()
  );

create or replace function public.record_shipment_transition(
  p_actor_id uuid,
  p_shipment_id text,
  p_to_status text,
  p_to_step integer,
  p_location_code text default null,
  p_note text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_idempotency_key text default null
)
returns public.shipments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor public.staff%rowtype;
  v_shipment public.shipments%rowtype;
  v_existing public.shipment_status_history%rowtype;
  v_from_status text;
  v_from_step integer;
  v_now timestamptz := now();
  v_status text := lower(trim(p_to_status));
  v_step integer := greatest(0, least(5, p_to_step));
begin
  if auth.uid() is not null and auth.uid() <> p_actor_id then
    raise exception 'Actor mismatch';
  end if;
  select * into v_actor from public.staff where id = p_actor_id and is_active = true;
  if not found then raise exception 'Active staff account required'; end if;
  if p_shipment_id is null or length(trim(p_shipment_id)) = 0 then
    raise exception 'Shipment id is required';
  end if;
  if v_status not in ('pending','booked','received_origin','in_transit','at_transit_hub','customs','out_for_delivery','delivered','exception','on_hold','cancelled','archived') then
    raise exception 'Unsupported shipment status';
  end if;
  if p_idempotency_key is not null then
    select * into v_existing
    from public.shipment_status_history
    where shipment_id = p_shipment_id and idempotency_key = p_idempotency_key
    limit 1;
    if found then
      select * into v_shipment from public.shipments where id = p_shipment_id;
      return v_shipment;
    end if;
  end if;
  select * into v_shipment from public.shipments where id = p_shipment_id for update;
  if not found then raise exception 'Shipment not found'; end if;
  v_from_status := v_shipment.operational_status;
  v_from_step := coalesce(v_shipment.current_step_index, 0);
  if v_step < v_from_step then
    raise exception 'Shipment step cannot move backwards';
  end if;
  if v_step > v_from_step + 1 and v_actor.role not in ('admin','super_admin') then
    raise exception 'Shipment step cannot skip ahead';
  end if;
  if v_status = 'delivered' and not exists (
    select 1 from public.delivery_proofs dp where dp.shipment_id = p_shipment_id
  ) then
    raise exception 'Delivery proof is required before delivered status';
  end if;
  update public.shipments
  set operational_status = v_status,
      current_step_index = v_step,
      current_location_label = coalesce(nullif(trim(p_location_code), ''), current_location_label),
      tracking_updated_at = v_now,
      state_version = coalesce(state_version, 0) + 1,
      updated_at = v_now,
      step_dates = jsonb_set(coalesce(step_dates, '{}'::jsonb), array[v_status], to_jsonb(v_now), true)
  where id = p_shipment_id
  returning * into v_shipment;
  insert into public.shipment_status_history (
    shipment_id, from_status, to_status, from_step, to_step, location_code,
    note, metadata, changed_by, changed_by_name, idempotency_key, occurred_at
  ) values (
    p_shipment_id, v_from_status, v_status,
    v_from_step, v_step,
    nullif(trim(p_location_code), ''), nullif(trim(p_note), ''), coalesce(p_metadata, '{}'::jsonb),
    p_actor_id, v_actor.full_name, p_idempotency_key, v_now
  );
  insert into public.shipment_events (
    shipment_id, event_type, status, location, note, occurred_at,
    created_by, created_by_name, metadata
  ) values (
    p_shipment_id, 'status_change', v_status,
    nullif(trim(p_location_code), ''), nullif(trim(p_note), ''), v_now,
    p_actor_id, v_actor.full_name,
    jsonb_build_object('state_version', v_shipment.state_version, 'metadata', coalesce(p_metadata, '{}'::jsonb))
  );
  if v_shipment.customer_user_id is not null then
    insert into public.customer_notifications (customer_user_id, shipment_id, kind, title, body, action_url)
    values (
      v_shipment.customer_user_id, p_shipment_id, 'shipment_status',
      'Shipment status updated',
      format('Shipment %s is now %s.', p_shipment_id, replace(v_status, '_', ' ')),
      '/?track=' || replace(p_shipment_id, ' ', '%20')
    );
    insert into public.notification_outbox (customer_user_id, shipment_id, channel, event_key, recipient, payload)
    values (
      v_shipment.customer_user_id, p_shipment_id, 'in_app',
      format('shipment:%s:status:%s', p_shipment_id, v_shipment.state_version),
      null,
      jsonb_build_object('status', v_status, 'step', v_step, 'location', p_location_code, 'note', p_note)
    ) on conflict (event_key, channel) do nothing;
  end if;
  insert into public.staff_activity_log (staff_id, staff_name, action, target_id, details)
  values (p_actor_id, v_actor.full_name, 'transition_shipment', p_shipment_id,
          jsonb_build_object('from_status', v_from_status, 'to_status', v_status, 'from_step', v_from_step, 'to_step', v_step, 'idempotency_key', p_idempotency_key));
  return v_shipment;
end;
$$;

revoke all on function public.record_shipment_transition(uuid,text,text,integer,text,text,jsonb,text) from public, anon;
grant execute on function public.record_shipment_transition(uuid,text,text,integer,text,text,jsonb,text) to authenticated, service_role;

create or replace function public.upsert_shipment_package(
  p_actor_id uuid,
  p_shipment_id text,
  p_package_code text,
  p_weight_kg numeric default null,
  p_length_cm numeric default null,
  p_width_cm numeric default null,
  p_height_cm numeric default null,
  p_hub_code text default null,
  p_status text default 'created',
  p_metadata jsonb default '{}'::jsonb
)
returns public.shipment_packages
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor public.staff%rowtype;
  v_package public.shipment_packages%rowtype;
begin
  if auth.uid() is not null and auth.uid() <> p_actor_id then raise exception 'Actor mismatch'; end if;
  select * into v_actor from public.staff where id = p_actor_id and is_active = true;
  if not found then raise exception 'Active staff account required'; end if;
  if not exists (select 1 from public.shipments where id = p_shipment_id) then raise exception 'Shipment not found'; end if;
  insert into public.shipment_packages (shipment_id, package_code, weight_kg, length_cm, width_cm, height_cm, current_hub, status, metadata, created_by, updated_at)
  values (p_shipment_id, trim(p_package_code), p_weight_kg, p_length_cm, p_width_cm, p_height_cm, nullif(trim(p_hub_code), ''), lower(trim(p_status)), coalesce(p_metadata, '{}'::jsonb), p_actor_id, now())
  on conflict (package_code) do update set
    shipment_id = excluded.shipment_id,
    weight_kg = excluded.weight_kg,
    length_cm = excluded.length_cm,
    width_cm = excluded.width_cm,
    height_cm = excluded.height_cm,
    current_hub = excluded.current_hub,
    status = excluded.status,
    metadata = excluded.metadata,
    updated_at = now()
  returning * into v_package;
  insert into public.staff_activity_log (staff_id, staff_name, action, target_id, details)
  values (p_actor_id, v_actor.full_name, 'upsert_shipment_package', p_shipment_id, jsonb_build_object('package_code', p_package_code, 'status', p_status, 'hub', p_hub_code));
  return v_package;
end;
$$;
revoke all on function public.upsert_shipment_package(uuid,text,text,numeric,numeric,numeric,numeric,text,text,jsonb) from public, anon;
grant execute on function public.upsert_shipment_package(uuid,text,text,numeric,numeric,numeric,numeric,text,text,jsonb) to authenticated, service_role;

create or replace function public.upsert_shipment_customs_case(
  p_actor_id uuid,
  p_shipment_id text,
  p_status text default 'draft',
  p_declaration_number text default null,
  p_hs_codes jsonb default '[]'::jsonb,
  p_declared_value numeric default null,
  p_duty_amount numeric default null,
  p_broker_name text default null,
  p_documents_complete boolean default false,
  p_hold_reason text default null
)
returns public.shipment_customs_cases
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor public.staff%rowtype;
  v_case public.shipment_customs_cases%rowtype;
  v_status text := lower(trim(p_status));
  v_now timestamptz := now();
begin
  if auth.uid() is not null and auth.uid() <> p_actor_id then raise exception 'Actor mismatch'; end if;
  select * into v_actor from public.staff where id = p_actor_id and is_active = true;
  if not found then raise exception 'Active staff account required'; end if;
  if not exists (select 1 from public.shipments where id = p_shipment_id) then raise exception 'Shipment not found'; end if;
  if v_status not in ('draft','submitted','inspection','cleared','held','rejected') then raise exception 'Unsupported customs status'; end if;
  if v_status in ('submitted','inspection','cleared') and not p_documents_complete then raise exception 'Customs documents must be complete'; end if;
  insert into public.shipment_customs_cases (shipment_id, status, declaration_number, hs_codes, declared_value, duty_amount, broker_name, documents_complete, hold_reason, submitted_at, cleared_at, created_by, updated_by, updated_at)
  values (p_shipment_id, v_status, nullif(trim(p_declaration_number), ''), coalesce(p_hs_codes, '[]'::jsonb), p_declared_value, p_duty_amount, nullif(trim(p_broker_name), ''), p_documents_complete, nullif(trim(p_hold_reason), ''), case when v_status in ('submitted','inspection','cleared') then v_now else null end, case when v_status = 'cleared' then v_now else null end, p_actor_id, p_actor_id, v_now)
  on conflict (shipment_id) do update set
    status = excluded.status,
    declaration_number = excluded.declaration_number,
    hs_codes = excluded.hs_codes,
    declared_value = excluded.declared_value,
    duty_amount = excluded.duty_amount,
    broker_name = excluded.broker_name,
    documents_complete = excluded.documents_complete,
    hold_reason = excluded.hold_reason,
    submitted_at = coalesce(public.shipment_customs_cases.submitted_at, excluded.submitted_at),
    cleared_at = excluded.cleared_at,
    updated_by = p_actor_id,
    updated_at = v_now
  returning * into v_case;
  insert into public.staff_activity_log (staff_id, staff_name, action, target_id, details)
  values (p_actor_id, v_actor.full_name, 'upsert_customs_case', p_shipment_id, jsonb_build_object('status', v_status, 'documents_complete', p_documents_complete, 'declaration_number', p_declaration_number));
  return v_case;
end;
$$;
revoke all on function public.upsert_shipment_customs_case(uuid,text,text,text,jsonb,numeric,numeric,text,boolean,text) from public, anon;
grant execute on function public.upsert_shipment_customs_case(uuid,text,text,text,jsonb,numeric,numeric,text,boolean,text) to authenticated, service_role;

create or replace function public.resolve_logistics_exception(
  p_actor_id uuid,
  p_exception_id uuid,
  p_status text default 'resolved',
  p_resolution_note text default null
)
returns public.logistics_exceptions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor public.staff%rowtype;
  v_exception public.logistics_exceptions%rowtype;
  v_status text := lower(trim(p_status));
begin
  if auth.uid() is not null and auth.uid() <> p_actor_id then raise exception 'Actor mismatch'; end if;
  select * into v_actor from public.staff where id = p_actor_id and is_active = true;
  if not found then raise exception 'Active staff account required'; end if;
  if v_status not in ('open','acknowledged','resolved','closed') then raise exception 'Unsupported exception status'; end if;
  update public.logistics_exceptions
  set status = v_status,
      resolution_note = nullif(trim(p_resolution_note), ''),
      resolved_by = case when v_status in ('resolved','closed') then p_actor_id else null end,
      resolved_at = case when v_status in ('resolved','closed') then now() else null end
  where id = p_exception_id
  returning * into v_exception;
  if not found then raise exception 'Exception not found'; end if;
  insert into public.staff_activity_log (staff_id, staff_name, action, target_id, details)
  values (p_actor_id, v_actor.full_name, 'resolve_logistics_exception', v_exception.shipment_id, jsonb_build_object('exception_id', p_exception_id, 'status', v_status, 'note', p_resolution_note));
  return v_exception;
end;
$$;
revoke all on function public.resolve_logistics_exception(uuid,uuid,text,text) from public, anon;
grant execute on function public.resolve_logistics_exception(uuid,uuid,text,text) to authenticated, service_role;

create or replace function public.requeue_stale_notification_outbox()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  update public.notification_outbox
  set status = 'pending', next_attempt_at = now(), updated_at = now(), last_error = 'Requeued after worker timeout'
  where status = 'processing' and updated_at < now() - interval '10 minutes';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.requeue_stale_notification_outbox() from public, anon, authenticated;
grant execute on function public.requeue_stale_notification_outbox() to service_role;

create or replace function public.set_control_plane_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shipment_packages_updated_at on public.shipment_packages;
create trigger shipment_packages_updated_at before update on public.shipment_packages for each row execute function public.set_control_plane_updated_at();
drop trigger if exists customs_cases_updated_at on public.shipment_customs_cases;
create trigger customs_cases_updated_at before update on public.shipment_customs_cases for each row execute function public.set_control_plane_updated_at();
drop trigger if exists notification_outbox_updated_at on public.notification_outbox;
create trigger notification_outbox_updated_at before update on public.notification_outbox for each row execute function public.set_control_plane_updated_at();

do $$
begin
  begin
    if exists (select 1 from pg_extension where extname = 'pg_cron') then
      if not exists (select 1 from cron.job where jobname = 'global-cloud-notification-outbox-requeue') then
        perform cron.schedule('global-cloud-notification-outbox-requeue', '*/5 * * * *', 'select public.requeue_stale_notification_outbox();');
      end if;
    end if;
  exception when others then
    raise notice 'Notification outbox cron was not scheduled: %', sqlerrm;
  end;
end;
$$;

create or replace function public.claim_notification_outbox(p_limit integer default 50)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with picked as (
    select id
    from public.notification_outbox
    where status = 'pending'
      and next_attempt_at <= now()
    order by created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 50), 200))
  )
  update public.notification_outbox n
  set status = 'processing', attempts = n.attempts + 1, updated_at = now()
  from picked
  where n.id = picked.id
  returning n.*;
end;
$$;
revoke all on function public.claim_notification_outbox(integer) from public, anon, authenticated;
grant execute on function public.claim_notification_outbox(integer) to service_role;

create or replace function public.complete_notification_outbox(
  p_id uuid,
  p_success boolean,
  p_error text default null
)
returns public.notification_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.notification_outbox%rowtype;
begin
  update public.notification_outbox
  set status = case when p_success then 'sent' else case when attempts >= 5 then 'failed' else 'pending' end end,
      sent_at = case when p_success then now() else sent_at end,
      next_attempt_at = case when p_success then next_attempt_at else now() + make_interval(mins => least(60, greatest(5, attempts * 5))) end,
      last_error = case when p_success then null else left(coalesce(p_error, 'Notification delivery failed'), 500) end,
      updated_at = now()
  where id = p_id
  returning * into v_row;
  if not found then raise exception 'Notification outbox item not found'; end if;
  return v_row;
end;
$$;
revoke all on function public.complete_notification_outbox(uuid,boolean,text) from public, anon, authenticated;
grant execute on function public.complete_notification_outbox(uuid,boolean,text) to service_role;

create table if not exists public.consolidation_batches (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null unique,
  origin_hub text not null,
  transit_hub text,
  destination_hub text not null,
  transport_mode text not null default 'air' check (transport_mode in ('air','sea','land')),
  status text not null default 'draft' check (status in ('draft','sealed','in_transit','arrived','closed','cancelled')),
  seal_number text,
  expected_departure timestamptz,
  actual_departure timestamptz,
  arrived_at timestamptz,
  total_weight_kg numeric(14,3) not null default 0,
  package_count integer not null default 0,
  notes text,
  created_by uuid references public.staff(id) on delete set null,
  updated_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists consolidation_batches_status_idx
  on public.consolidation_batches(status, expected_departure);

create table if not exists public.consolidation_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.consolidation_batches(id) on delete cascade,
  package_id uuid not null unique references public.shipment_packages(id) on delete restrict,
  shipment_id text not null references public.shipments(id) on delete cascade,
  package_code text not null,
  loaded_at timestamptz,
  unloaded_at timestamptz,
  status text not null default 'planned' check (status in ('planned','loaded','unloaded','missing','damaged')),
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (batch_id, package_id)
);
create index if not exists consolidation_items_batch_idx
  on public.consolidation_items(batch_id, status);
create index if not exists consolidation_items_shipment_idx
  on public.consolidation_items(shipment_id);

alter table public.consolidation_batches enable row level security;
alter table public.consolidation_items enable row level security;
drop policy if exists consolidation_batches_staff_select on public.consolidation_batches;
create policy consolidation_batches_staff_select on public.consolidation_batches for select to authenticated using (public.is_staff());
drop policy if exists consolidation_items_staff_select on public.consolidation_items;
create policy consolidation_items_staff_select on public.consolidation_items for select to authenticated using (public.is_staff());

create or replace function public.upsert_consolidation_batch(
  p_actor_id uuid,
  p_batch_code text,
  p_origin_hub text,
  p_transit_hub text default null,
  p_destination_hub text default 'erbil',
  p_transport_mode text default 'air',
  p_status text default 'draft',
  p_seal_number text default null,
  p_expected_departure timestamptz default null,
  p_notes text default null
)
returns public.consolidation_batches
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor public.staff%rowtype;
  v_batch public.consolidation_batches%rowtype;
  v_status text := lower(trim(p_status));
begin
  if auth.uid() is not null and auth.uid() <> p_actor_id then raise exception 'Actor mismatch'; end if;
  select * into v_actor from public.staff where id = p_actor_id and is_active = true;
  if not found then raise exception 'Active staff account required'; end if;
  if v_status not in ('draft','sealed','in_transit','arrived','closed','cancelled') then raise exception 'Unsupported consolidation status'; end if;
  insert into public.consolidation_batches(batch_code,origin_hub,transit_hub,destination_hub,transport_mode,status,seal_number,expected_departure,notes,created_by,updated_by)
  values (upper(trim(p_batch_code)), lower(trim(p_origin_hub)), nullif(lower(trim(p_transit_hub)), ''), lower(trim(p_destination_hub)), lower(trim(p_transport_mode)), v_status, nullif(trim(p_seal_number), ''), p_expected_departure, nullif(trim(p_notes), ''), p_actor_id, p_actor_id)
  on conflict (batch_code) do update set
    origin_hub=excluded.origin_hub, transit_hub=excluded.transit_hub, destination_hub=excluded.destination_hub,
    transport_mode=excluded.transport_mode, status=excluded.status, seal_number=excluded.seal_number,
    expected_departure=excluded.expected_departure, notes=excluded.notes, updated_by=p_actor_id, updated_at=now()
  returning * into v_batch;
  insert into public.staff_activity_log(staff_id,staff_name,action,target_id,details)
  values(p_actor_id,v_actor.full_name,'upsert_consolidation_batch',v_batch.batch_code,jsonb_build_object('status',v_status,'origin_hub',p_origin_hub,'destination_hub',p_destination_hub));
  return v_batch;
end;
$$;
revoke all on function public.upsert_consolidation_batch(uuid,text,text,text,text,text,text,text,timestamptz,text) from public, anon;
grant execute on function public.upsert_consolidation_batch(uuid,text,text,text,text,text,text,text,timestamptz,text) to authenticated, service_role;

create or replace function public.attach_package_to_consolidation(
  p_actor_id uuid,
  p_batch_id uuid,
  p_package_id uuid
)
returns public.consolidation_items
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor public.staff%rowtype;
  v_package public.shipment_packages%rowtype;
  v_batch public.consolidation_batches%rowtype;
  v_item public.consolidation_items%rowtype;
  v_old_batch_id uuid;
begin
  if auth.uid() is not null and auth.uid() <> p_actor_id then raise exception 'Actor mismatch'; end if;
  select * into v_actor from public.staff where id = p_actor_id and is_active = true;
  if not found then raise exception 'Active staff account required'; end if;
  select * into v_batch from public.consolidation_batches where id=p_batch_id for update;
  if not found then raise exception 'Consolidation batch not found'; end if;
  if v_batch.status not in ('draft','sealed') then raise exception 'Batch cannot accept packages in current status'; end if;
  select * into v_package from public.shipment_packages where id=p_package_id;
  if not found then raise exception 'Package not found'; end if;
  select batch_id into v_old_batch_id from public.consolidation_items where package_id=p_package_id;
  insert into public.consolidation_items(batch_id,package_id,shipment_id,package_code,created_by)
  values(p_batch_id,p_package_id,v_package.shipment_id,v_package.package_code,p_actor_id)
  on conflict (package_id) do update set batch_id=excluded.batch_id, status='planned'
  returning * into v_item;
  update public.consolidation_batches b
  set package_count=(select count(*) from public.consolidation_items i where i.batch_id=b.id),
      total_weight_kg=coalesce((select sum(coalesce(p.weight_kg,0)) from public.consolidation_items i join public.shipment_packages p on p.id=i.package_id where i.batch_id=b.id),0),
      updated_by=p_actor_id, updated_at=now()
  where b.id in (p_batch_id, coalesce(v_old_batch_id, p_batch_id));
  insert into public.staff_activity_log(staff_id,staff_name,action,target_id,details)
  values(p_actor_id,v_actor.full_name,'attach_package_to_consolidation',v_batch.batch_code,jsonb_build_object('package_id',p_package_id,'package_code',v_package.package_code));
  return v_item;
end;
$$;
revoke all on function public.attach_package_to_consolidation(uuid,uuid,uuid) from public, anon;
grant execute on function public.attach_package_to_consolidation(uuid,uuid,uuid) to authenticated, service_role;

drop trigger if exists consolidation_batches_updated_at on public.consolidation_batches;
create trigger consolidation_batches_updated_at before update on public.consolidation_batches for each row execute function public.set_control_plane_updated_at();

create table if not exists public.shipment_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  shipment_id text not null references public.shipments(id) on delete restrict,
  customer_user_id uuid references auth.users(id) on delete set null,
  line_items jsonb not null default '[]'::jsonb,
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  paid_total numeric(14,2) not null default 0,
  currency text not null default 'USD',
  status text not null default 'draft' check (status in ('draft','issued','partially_paid','paid','overdue','void')),
  due_at timestamptz,
  issued_at timestamptz,
  created_by uuid references public.staff(id) on delete set null,
  updated_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shipment_invoices_shipment_idx on public.shipment_invoices(shipment_id, created_at desc);
create index if not exists shipment_invoices_status_due_idx on public.shipment_invoices(status, due_at);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.shipment_invoices(id) on delete set null,
  shipment_id text not null references public.shipments(id) on delete restrict,
  provider text not null default 'manual',
  provider_reference text,
  transaction_type text not null default 'payment' check (transaction_type in ('payment','refund','adjustment')),
  status text not null default 'pending' check (status in ('pending','succeeded','failed','reversed')),
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'USD',
  method text,
  idempotency_key text not null unique,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payment_transactions_invoice_idx on public.payment_transactions(invoice_id, created_at desc);
create index if not exists payment_transactions_shipment_idx on public.payment_transactions(shipment_id, created_at desc);

create table if not exists public.reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  status text not null default 'started' check (status in ('started','completed','failed')),
  matched_count integer not null default 0,
  unmatched_count integer not null default 0,
  total_amount numeric(14,2) not null default 0,
  summary jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  started_by uuid references public.staff(id) on delete set null
);

alter table public.shipment_invoices enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.reconciliation_runs enable row level security;
drop policy if exists shipment_invoices_staff_select on public.shipment_invoices;
create policy shipment_invoices_staff_select on public.shipment_invoices for select to authenticated using (public.is_staff() or customer_user_id = auth.uid());
drop policy if exists payment_transactions_staff_select on public.payment_transactions;
create policy payment_transactions_staff_select on public.payment_transactions for select to authenticated using (public.is_staff() or exists (select 1 from public.shipment_invoices i where i.id = payment_transactions.invoice_id and i.customer_user_id = auth.uid()));
drop policy if exists reconciliation_runs_staff_select on public.reconciliation_runs;
create policy reconciliation_runs_staff_select on public.reconciliation_runs for select to authenticated using (public.is_staff());

create or replace function public.upsert_shipment_invoice(
  p_actor_id uuid,
  p_invoice_number text,
  p_shipment_id text,
  p_line_items jsonb default '[]'::jsonb,
  p_subtotal numeric default 0,
  p_discount numeric default 0,
  p_tax numeric default 0,
  p_currency text default 'USD',
  p_status text default 'draft',
  p_due_at timestamptz default null
)
returns public.shipment_invoices
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor public.staff%rowtype;
  v_invoice public.shipment_invoices%rowtype;
  v_total numeric(14,2) := greatest(0, coalesce(p_subtotal,0) - coalesce(p_discount,0) + coalesce(p_tax,0));
  v_status text := lower(trim(p_status));
begin
  if auth.uid() is not null and auth.uid() <> p_actor_id then raise exception 'Actor mismatch'; end if;
  select * into v_actor from public.staff where id = p_actor_id and is_active = true;
  if not found then raise exception 'Active staff account required'; end if;
  if v_actor.role not in ('admin','super_admin','accountant') then raise exception 'Finance role required'; end if;
  if not exists (select 1 from public.shipments where id=p_shipment_id) then raise exception 'Shipment not found'; end if;
  if v_status not in ('draft','issued','partially_paid','paid','overdue','void') then raise exception 'Unsupported invoice status'; end if;
  insert into public.shipment_invoices(invoice_number,shipment_id,customer_user_id,line_items,subtotal,discount,tax,total,currency,status,due_at,issued_at,created_by,updated_by)
  select upper(trim(p_invoice_number)), s.id, s.customer_user_id, coalesce(p_line_items,'[]'::jsonb), greatest(0,coalesce(p_subtotal,0)), greatest(0,coalesce(p_discount,0)), greatest(0,coalesce(p_tax,0)), v_total, upper(trim(coalesce(p_currency,'USD'))), v_status, p_due_at, case when v_status <> 'draft' then now() else null end, p_actor_id, p_actor_id
  from public.shipments s where s.id=p_shipment_id
  on conflict (invoice_number) do update set
    line_items=excluded.line_items, subtotal=excluded.subtotal, discount=excluded.discount, tax=excluded.tax,
    total=excluded.total, currency=excluded.currency, status=excluded.status, due_at=excluded.due_at,
    issued_at=coalesce(public.shipment_invoices.issued_at, excluded.issued_at), updated_by=p_actor_id, updated_at=now()
  returning * into v_invoice;
  insert into public.staff_activity_log(staff_id,staff_name,action,target_id,details)
  values(p_actor_id,v_actor.full_name,'upsert_shipment_invoice',p_shipment_id,jsonb_build_object('invoice_number',p_invoice_number,'total',v_total,'status',v_status));
  return v_invoice;
end;
$$;
revoke all on function public.upsert_shipment_invoice(uuid,text,text,jsonb,numeric,numeric,numeric,text,text,timestamptz) from public, anon;
grant execute on function public.upsert_shipment_invoice(uuid,text,text,jsonb,numeric,numeric,numeric,text,text,timestamptz) to authenticated, service_role;

create or replace function public.record_payment_transaction(
  p_actor_id uuid,
  p_invoice_id uuid,
  p_amount numeric,
  p_transaction_type text default 'payment',
  p_status text default 'succeeded',
  p_provider text default 'manual',
  p_provider_reference text default null,
  p_method text default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.payment_transactions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor public.staff%rowtype;
  v_invoice public.shipment_invoices%rowtype;
  v_tx public.payment_transactions%rowtype;
  v_type text := lower(trim(p_transaction_type));
  v_status text := lower(trim(p_status));
  v_key text := coalesce(nullif(trim(p_idempotency_key), ''), 'manual-' || gen_random_uuid()::text);
  v_delta numeric(14,2);
  v_paid numeric(14,2);
  v_invoice_status text;
begin
  if auth.uid() is not null and auth.uid() <> p_actor_id then raise exception 'Actor mismatch'; end if;
  select * into v_actor from public.staff where id = p_actor_id and is_active = true;
  if not found then raise exception 'Active staff account required'; end if;
  if v_actor.role not in ('admin','super_admin','accountant') then raise exception 'Finance role required'; end if;
  if p_amount is null or p_amount < 0 then raise exception 'Payment amount must be non-negative'; end if;
  if lower(coalesce(p_provider, 'manual')) <> 'manual' and nullif(trim(p_idempotency_key), '') is null then raise exception 'Provider payments require an idempotency key'; end if;
  if v_type not in ('payment','refund','adjustment') or v_status not in ('pending','succeeded','failed','reversed') then raise exception 'Unsupported transaction state'; end if;
  select * into v_tx from public.payment_transactions where idempotency_key=v_key;
  if found then return v_tx; end if;
  select * into v_invoice from public.shipment_invoices where id=p_invoice_id for update;
  if not found then raise exception 'Invoice not found'; end if;
  insert into public.payment_transactions(invoice_id,shipment_id,provider,provider_reference,transaction_type,status,amount,currency,method,idempotency_key,paid_at,metadata,created_by)
  values(p_invoice_id,v_invoice.shipment_id,coalesce(nullif(trim(p_provider),''),'manual'),nullif(trim(p_provider_reference),''),v_type,v_status,p_amount,v_invoice.currency,nullif(trim(p_method),''),v_key,case when v_status='succeeded' then now() else null end,coalesce(p_metadata,'{}'::jsonb),p_actor_id)
  returning * into v_tx;
  if v_status = 'succeeded' then
    v_delta := case when v_type='refund' then -p_amount else p_amount end;
    v_paid := greatest(0, v_invoice.paid_total + v_delta);
    v_invoice_status := case when v_paid >= v_invoice.total then 'paid' when v_paid > 0 then 'partially_paid' else v_invoice.status end;
    update public.shipment_invoices set paid_total=v_paid,status=v_invoice_status,updated_by=p_actor_id,updated_at=now() where id=v_invoice.id;
    insert into public.shipment_financial_ledger(shipment_id,entry_type,amount,currency,reference,note,recorded_by)
    values(v_invoice.shipment_id,case when v_type='refund' then 'refund' else 'payment' end,case when v_type='refund' then -p_amount else p_amount end,v_invoice.currency,p_provider_reference,'Recorded through production finance control plane',p_actor_id);
    update public.shipments set paid_amount=greatest(0,coalesce(paid_amount,0)+v_delta),updated_at=now() where id=v_invoice.shipment_id;
  end if;
  insert into public.staff_activity_log(staff_id,staff_name,action,target_id,details)
  values(p_actor_id,v_actor.full_name,'record_payment_transaction',v_invoice.shipment_id,jsonb_build_object('invoice_id',p_invoice_id,'amount',p_amount,'type',v_type,'status',v_status,'idempotency_key',v_key));
  return v_tx;
end;
$$;
revoke all on function public.record_payment_transaction(uuid,uuid,numeric,text,text,text,text,text,text,jsonb) from public, anon;
grant execute on function public.record_payment_transaction(uuid,uuid,numeric,text,text,text,text,text,text,jsonb) to authenticated, service_role;

drop trigger if exists shipment_invoices_updated_at on public.shipment_invoices;
create trigger shipment_invoices_updated_at before update on public.shipment_invoices for each row execute function public.set_control_plane_updated_at();
drop trigger if exists payment_transactions_updated_at on public.payment_transactions;
create trigger payment_transactions_updated_at before update on public.payment_transactions for each row execute function public.set_control_plane_updated_at();
