-- Globall Cloud logistics and notification contract hardening.
-- This migration unifies notification producers, prevents duplicate in-app rows,
-- enables external fan-out, recovers stale workers, and fixes automated ETA exceptions.

alter table public.customer_notifications
  add column if not exists event_key text;

drop policy if exists notification_outbox_customer_select on public.notification_outbox;
create policy notification_outbox_customer_select on public.notification_outbox
  for select to authenticated using (
    public.is_staff()
    or (customer_user_id = auth.uid() and channel = 'in_app')
  );

create unique index if not exists customer_notifications_event_key_uidx
  on public.customer_notifications(customer_user_id, event_key)
  where event_key is not null;

create table if not exists public.customer_notification_preferences (
  customer_user_id uuid primary key references auth.users(id) on delete cascade,
  email_enabled boolean not null default false,
  whatsapp_enabled boolean not null default false,
  sms_enabled boolean not null default false,
  in_app_enabled boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  updated_at timestamptz not null default now()
);
alter table public.customer_notification_preferences enable row level security;
drop policy if exists customer_notification_preferences_select on public.customer_notification_preferences;
create policy customer_notification_preferences_select on public.customer_notification_preferences
  for select to authenticated using (customer_user_id = auth.uid() or public.is_staff());
drop policy if exists customer_notification_preferences_insert on public.customer_notification_preferences;
create policy customer_notification_preferences_insert on public.customer_notification_preferences
  for insert to authenticated with check (customer_user_id = auth.uid() or public.is_staff());
drop policy if exists customer_notification_preferences_update on public.customer_notification_preferences;
create policy customer_notification_preferences_update on public.customer_notification_preferences
  for update to authenticated using (customer_user_id = auth.uid() or public.is_staff())
  with check (customer_user_id = auth.uid() or public.is_staff());
create trigger customer_notification_preferences_updated_at
before update on public.customer_notification_preferences
for each row execute function public.set_control_plane_updated_at();

alter table public.logistics_exceptions
  alter column created_by drop not null;
alter table public.logistics_exceptions
  add column if not exists created_source text not null default 'manual';
alter table public.logistics_exceptions
  drop constraint if exists logistics_exceptions_created_source_chk;
alter table public.logistics_exceptions
  add constraint logistics_exceptions_created_source_chk
  check (created_source in ('manual','system','integration'));

-- Recovery is performed before a new claim so a crashed worker cannot leave rows
-- permanently stuck in processing.
create or replace function public.claim_notification_outbox_channel(
  p_channel text,
  p_limit integer default 50
)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_channel not in ('in_app', 'email', 'whatsapp', 'sms') then
    raise exception 'Unsupported notification channel';
  end if;

  update public.notification_outbox
     set status = case when attempts >= 5 then 'failed' else 'pending' end,
         next_attempt_at = now(),
         last_error = left(coalesce(last_error, 'Recovered stale processing item'), 500),
         updated_at = now()
   where status = 'processing'
     and updated_at < now() - interval '15 minutes';

  return query
  with picked as (
    select id
      from public.notification_outbox
     where status = 'pending'
       and channel = p_channel
       and next_attempt_at <= now()
       and attempts < 5
     order by created_at
     for update skip locked
     limit greatest(1, least(coalesce(p_limit, 50), 200))
  )
  update public.notification_outbox n
     set status = 'processing',
         attempts = n.attempts + 1,
         updated_at = now()
    from picked
   where n.id = picked.id
  returning n.*;
end;
$$;

create or replace function public.claim_notification_outbox_external(
  p_limit integer default 50
)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.notification_outbox
     set status = case when attempts >= 5 then 'failed' else 'pending' end,
         next_attempt_at = now(),
         last_error = left(coalesce(last_error, 'Recovered stale processing item'), 500),
         updated_at = now()
   where status = 'processing'
     and updated_at < now() - interval '15 minutes';

  return query
  with picked as (
    select id
      from public.notification_outbox
     where status = 'pending'
       and channel in ('email', 'whatsapp', 'sms')
       and next_attempt_at <= now()
       and attempts < 5
     order by created_at
     for update skip locked
     limit greatest(1, least(coalesce(p_limit, 50), 200))
  )
  update public.notification_outbox n
     set status = 'processing',
         attempts = n.attempts + 1,
         updated_at = now()
    from picked
   where n.id = picked.id
  returning n.*;
end;
$$;

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
     and status = 'processing'
  returning * into v_row;
  if not found then raise exception 'Notification outbox item is not in processing state'; end if;
  return v_row;
end;
$$;

revoke all on function public.claim_notification_outbox_channel(text, integer) from public, anon, authenticated;
revoke all on function public.claim_notification_outbox_external(integer) from public, anon, authenticated;
revoke all on function public.complete_notification_outbox(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.claim_notification_outbox_channel(text, integer) to service_role;
grant execute on function public.claim_notification_outbox_external(integer) to service_role;
grant execute on function public.complete_notification_outbox(uuid, boolean, text) to service_role;

-- Inserts the customer-facing in-app notification once and fans out only the
-- external channels. The direct row is the in-app record; no second in-app row
-- is created in the outbox.
create or replace function public.enqueue_customer_notification(
  p_customer_user_id uuid,
  p_shipment_id text,
  p_event_key text,
  p_title text,
  p_body text,
  p_action_url text default null,
  p_payload jsonb default '{}'::jsonb
)
returns public.customer_notifications
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_notification public.customer_notifications%rowtype;
  v_email text;
  v_phone text;
  v_email_enabled boolean := false;
  v_whatsapp_enabled boolean := false;
  v_sms_enabled boolean := false;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb) || jsonb_build_object(
    'title', left(coalesce(p_title, 'Globall Cloud update'), 180),
    'body', left(coalesce(p_body, ''), 4000),
    'action_url', coalesce(p_action_url, '/customer-portal.html')
  );
begin
  if p_customer_user_id is null then return null; end if;
  if nullif(trim(coalesce(p_event_key, '')), '') is null then raise exception 'Notification event key is required'; end if;

  insert into public.customer_notifications(
    customer_user_id, shipment_id, kind, event_key, title, body, action_url
  ) values (
    p_customer_user_id, p_shipment_id, split_part(p_event_key, ':', 1), p_event_key,
    left(coalesce(p_title, 'Globall Cloud update'), 180),
    left(coalesce(p_body, ''), 4000),
    coalesce(p_action_url, '/customer-portal.html')
  ) on conflict do nothing;

  select * into v_notification
    from public.customer_notifications
   where customer_user_id = p_customer_user_id
     and event_key = p_event_key
   limit 1;

  select
    coalesce(nullif(trim(s.customer_email), ''), u.email),
    coalesce(nullif(trim(s.customer_phone), ''), nullif(trim(u.phone), '')),
    coalesce(p.email_enabled, false), coalesce(p.whatsapp_enabled, false), coalesce(p.sms_enabled, false)
    into v_email, v_phone, v_email_enabled, v_whatsapp_enabled, v_sms_enabled
    from auth.users u
    left join public.shipments s on s.id = p_shipment_id
    left join public.customer_notification_preferences p on p.customer_user_id = u.id
   where u.id = p_customer_user_id;

  if v_email_enabled and v_email is not null then
    insert into public.notification_outbox(customer_user_id, shipment_id, channel, event_key, recipient, payload)
    values (p_customer_user_id, p_shipment_id, 'email', p_event_key, v_email, v_payload)
    on conflict (event_key, channel) do nothing;
  end if;
  if v_phone is not null and (v_whatsapp_enabled or v_sms_enabled) then
    if v_whatsapp_enabled then
      insert into public.notification_outbox(customer_user_id, shipment_id, channel, event_key, recipient, payload)
      values (p_customer_user_id, p_shipment_id, 'whatsapp', p_event_key, v_phone, v_payload)
      on conflict (event_key, channel) do nothing;
    end if;
    if v_sms_enabled then
      insert into public.notification_outbox(customer_user_id, shipment_id, channel, event_key, recipient, payload)
      values (p_customer_user_id, p_shipment_id, 'sms', p_event_key, v_phone, v_payload)
      on conflict (event_key, channel) do nothing;
    end if;
  end if;
  return v_notification;
end;
$$;
revoke all on function public.enqueue_customer_notification(uuid, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.enqueue_customer_notification(uuid, text, text, text, text, text, jsonb) to service_role;

-- Existing legacy producers insert directly into customer_notifications. This
-- trigger preserves their in-app behavior while adding external fan-out.
create or replace function public.fanout_customer_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text;
  v_phone text;
  v_email_enabled boolean := false;
  v_whatsapp_enabled boolean := false;
  v_sms_enabled boolean := false;
  v_event_key text := coalesce(nullif(trim(new.event_key), ''), 'customer_notification:' || new.id::text);
  v_payload jsonb := jsonb_build_object(
    'title', left(new.title, 180),
    'body', left(coalesce(new.body, ''), 4000),
    'action_url', coalesce(new.action_url, '/customer-portal.html')
  );
begin
  if new.customer_user_id is null then return new; end if;
  if new.event_key is null then
    update public.customer_notifications set event_key = v_event_key where id = new.id;
  end if;
  select
    coalesce(nullif(trim(s.customer_email), ''), u.email),
    coalesce(nullif(trim(s.customer_phone), ''), nullif(trim(u.phone), '')),
    coalesce(p.email_enabled, false), coalesce(p.whatsapp_enabled, false), coalesce(p.sms_enabled, false)
    into v_email, v_phone, v_email_enabled, v_whatsapp_enabled, v_sms_enabled
    from auth.users u
    left join public.shipments s on s.id = new.shipment_id
    left join public.customer_notification_preferences p on p.customer_user_id = u.id
   where u.id = new.customer_user_id;
  if v_email_enabled and v_email is not null then
    insert into public.notification_outbox(customer_user_id, shipment_id, channel, event_key, recipient, payload)
    values (new.customer_user_id, new.shipment_id, 'email', v_event_key, v_email, v_payload)
    on conflict (event_key, channel) do nothing;
  end if;
  if v_phone is not null and (v_whatsapp_enabled or v_sms_enabled) then
    if v_whatsapp_enabled then
      insert into public.notification_outbox(customer_user_id, shipment_id, channel, event_key, recipient, payload)
      values (new.customer_user_id, new.shipment_id, 'whatsapp', v_event_key, v_phone, v_payload)
      on conflict (event_key, channel) do nothing;
    end if;
    if v_sms_enabled then
      insert into public.notification_outbox(customer_user_id, shipment_id, channel, event_key, recipient, payload)
      values (new.customer_user_id, new.shipment_id, 'sms', v_event_key, v_phone, v_payload)
      on conflict (event_key, channel) do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists customer_notifications_external_fanout_trg on public.customer_notifications;
create trigger customer_notifications_external_fanout_trg
after insert on public.customer_notifications
for each row execute function public.fanout_customer_notification();
revoke all on function public.fanout_customer_notification() from public, anon, authenticated;
grant execute on function public.fanout_customer_notification() to service_role;

-- Replace the main shipment transition producer so the direct row and external
-- fan-out share one deterministic event key.
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
  v_event_key text;
begin
  if auth.uid() is not null and auth.uid() <> p_actor_id then raise exception 'Actor mismatch'; end if;
  select * into v_actor from public.staff where id = p_actor_id and is_active = true;
  if not found then raise exception 'Active staff account required'; end if;
  if p_shipment_id is null or length(trim(p_shipment_id)) = 0 then raise exception 'Shipment id is required'; end if;
  if v_status not in ('pending','booked','received_origin','in_transit','at_transit_hub','customs','out_for_delivery','delivered','exception','on_hold','cancelled','archived') then raise exception 'Unsupported shipment status'; end if;
  if p_idempotency_key is not null then
    select * into v_existing from public.shipment_status_history where shipment_id = p_shipment_id and idempotency_key = p_idempotency_key limit 1;
    if found then select * into v_shipment from public.shipments where id = p_shipment_id; return v_shipment; end if;
  end if;
  select * into v_shipment from public.shipments where id = p_shipment_id for update;
  if not found then raise exception 'Shipment not found'; end if;
  v_from_status := v_shipment.operational_status;
  v_from_step := coalesce(v_shipment.current_step_index, 0);
  if v_step < v_from_step then raise exception 'Shipment step cannot move backwards'; end if;
  if v_step > v_from_step + 1 and v_actor.role not in ('admin','super_admin') then raise exception 'Shipment step cannot skip ahead'; end if;
  if v_status = 'delivered' and not exists (select 1 from public.delivery_proofs dp where dp.shipment_id = p_shipment_id) then raise exception 'Delivery proof is required before delivered status'; end if;
  update public.shipments set operational_status = v_status, current_step_index = v_step, current_location_label = coalesce(nullif(trim(p_location_code), ''), current_location_label), tracking_updated_at = v_now, state_version = coalesce(state_version, 0) + 1, updated_at = v_now, step_dates = jsonb_set(coalesce(step_dates, '{}'::jsonb), array[v_status], to_jsonb(v_now), true) where id = p_shipment_id returning * into v_shipment;
  insert into public.shipment_status_history(shipment_id, from_status, to_status, from_step, to_step, location_code, note, metadata, changed_by, changed_by_name, idempotency_key, occurred_at) values(p_shipment_id, v_from_status, v_status, v_from_step, v_step, nullif(trim(p_location_code), ''), nullif(trim(p_note), ''), coalesce(p_metadata, '{}'::jsonb), p_actor_id, v_actor.full_name, p_idempotency_key, v_now);
  insert into public.shipment_events(shipment_id, event_type, status, location, note, occurred_at, created_by, created_by_name, metadata) values(p_shipment_id, 'status_change', v_status, nullif(trim(p_location_code), ''), nullif(trim(p_note), ''), v_now, p_actor_id, v_actor.full_name, jsonb_build_object('state_version', v_shipment.state_version, 'metadata', coalesce(p_metadata, '{}'::jsonb)));
  if v_shipment.customer_user_id is not null then
    v_event_key := format('shipment:%s:status:%s', p_shipment_id, v_shipment.state_version);
    perform public.enqueue_customer_notification(v_shipment.customer_user_id, p_shipment_id, v_event_key, 'Shipment status updated', format('Shipment %s is now %s.', p_shipment_id, replace(v_status, '_', ' ')), '/?track=' || replace(p_shipment_id, ' ', '%20'), jsonb_build_object('status', v_status, 'step', v_step, 'location', p_location_code, 'note', p_note));
  end if;
  insert into public.staff_activity_log(staff_id, staff_name, action, target_id, details) values(p_actor_id, v_actor.full_name, 'transition_shipment', p_shipment_id, jsonb_build_object('from_status', v_from_status, 'to_status', v_status, 'from_step', v_from_step, 'to_step', v_step, 'idempotency_key', p_idempotency_key));
  return v_shipment;
end;
$$;
revoke all on function public.record_shipment_transition(uuid, text, text, integer, text, text, jsonb, text) from public, anon;
grant execute on function public.record_shipment_transition(uuid, text, text, integer, text, text, jsonb, text) to authenticated, service_role;

-- Quote approval now uses the same notification contract.
create or replace function public.approve_quote_request(
  p_actor_id uuid,
  p_quote_id uuid,
  p_quoted_amount numeric,
  p_currency text default 'USD',
  p_valid_until timestamptz default null,
  p_notes text default null
)
returns public.quote_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor public.staff%rowtype;
  v_quote public.quote_requests%rowtype;
  v_currency text := upper(trim(coalesce(p_currency, 'USD')));
  v_valid_until timestamptz := coalesce(p_valid_until, now() + interval '7 days');
begin
  if auth.uid() is not null and auth.uid() <> p_actor_id then raise exception 'Actor mismatch'; end if;
  select * into v_actor from public.staff where id = p_actor_id and is_active = true;
  if not found then raise exception 'Active staff account required'; end if;
  if v_actor.role not in ('admin','super_admin','staff') then raise exception 'Operations role required'; end if;
  if p_quoted_amount is null or p_quoted_amount <= 0 then raise exception 'Quoted amount must be greater than zero'; end if;
  if v_currency not in ('USD','IQD','AED','CNY') then raise exception 'Unsupported quote currency'; end if;
  if v_valid_until <= now() then raise exception 'Quote validity must be in the future'; end if;
  select * into v_quote from public.quote_requests where id = p_quote_id for update;
  if not found then raise exception 'Quote request not found'; end if;
  if v_quote.status not in ('pending','reviewing','quoted') then raise exception 'Quote cannot be approved in current state'; end if;
  update public.quote_requests set status='quoted', quoted_amount=round(p_quoted_amount,2), currency=v_currency, dimensional_weight_kg=round(public.calculate_dimensional_weight(v_quote.weight_kg,v_quote.volume_cbm,v_quote.transport_mode),3), billable_weight_kg=round(greatest(coalesce(v_quote.weight_kg,0),public.calculate_dimensional_weight(v_quote.weight_kg,v_quote.volume_cbm,v_quote.transport_mode)),3), valid_until=v_valid_until, quoted_by=p_actor_id, quoted_at=now(), decision_note=nullif(trim(coalesce(p_notes,'')),''), updated_at=now() where id=p_quote_id returning * into v_quote;
  if v_quote.customer_user_id is not null then
    perform public.enqueue_customer_notification(v_quote.customer_user_id, null, format('quote:%s:quoted', v_quote.id), 'Quote ready for review', format('Your quote request is ready: %s %s, valid until %s.', v_quote.quoted_amount, v_quote.currency, to_char(v_quote.valid_until, 'YYYY-MM-DD')), '/customer-portal.html#quotes', jsonb_build_object('quote_id', v_quote.id, 'amount', v_quote.quoted_amount, 'currency', v_quote.currency, 'valid_until', v_quote.valid_until));
  end if;
  insert into public.staff_activity_log(staff_id, staff_name, action, target_id, details) values(p_actor_id, v_actor.full_name, 'approve_quote_request', v_quote.id::text, jsonb_build_object('amount', v_quote.quoted_amount, 'currency', v_quote.currency, 'valid_until', v_quote.valid_until));
  return v_quote;
end;
$$;
revoke all on function public.approve_quote_request(uuid, uuid, numeric, text, timestamptz, text) from public, anon;
grant execute on function public.approve_quote_request(uuid, uuid, numeric, text, timestamptz, text) to authenticated, service_role;

-- Automated ETA exception creation must satisfy the table's severity contract
-- and retain an explicit system source instead of a fake staff identity.
create or replace function public.detect_eta_sla_breaches()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  inserted_count integer := 0;
begin
  insert into public.logistics_exceptions(shipment_id, severity, title, note, status, created_by, created_source, due_at)
  select s.id, case when now() - s.eta > interval '24 hours' then 'critical' else 'high' end, 'Shipment ETA breached', 'The shipment ETA has passed by more than 2 hours while it is not yet delivered.', 'open', null, 'system', now() + interval '2 hours'
    from public.shipments s
   where s.archived_at is null and s.eta is not null and s.eta < now() - interval '2 hours' and coalesce(s.current_step_index,0) < 5 and coalesce(s.operational_status,'') not in ('delivered','cancelled','closed')
     and not exists (select 1 from public.logistics_exceptions le where le.shipment_id=s.id and le.status='open' and le.title='Shipment ETA breached');
  get diagnostics inserted_count = row_count;
  insert into public.customer_notifications(customer_user_id, shipment_id, kind, title, body, action_url)
  select s.customer_user_id, s.id, 'eta_breach', 'Shipment delivery update', 'Your shipment ETA has passed by more than 2 hours. Our operations team is reviewing the delay.', '/?track=' || replace(s.id, ' ', '%20')
    from public.shipments s
   where s.archived_at is null and s.customer_user_id is not null and s.eta is not null and s.eta < now() - interval '2 hours' and coalesce(s.current_step_index,0) < 5 and coalesce(s.operational_status,'') not in ('delivered','cancelled','closed')
     and not exists (select 1 from public.customer_notifications cn where cn.customer_user_id=s.customer_user_id and cn.shipment_id=s.id and cn.kind='eta_breach' and cn.created_at > now() - interval '24 hours');
  return inserted_count;
end;
$$;
revoke all on function public.detect_eta_sla_breaches() from public, anon, authenticated;
grant execute on function public.detect_eta_sla_breaches() to service_role;
