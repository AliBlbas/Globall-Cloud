-- Globall Cloud v3 advanced logistics workflows
-- Route legs, warehouse chain-of-custody, quote lifecycle, document vault metadata,
-- manifests, server-side reporting, and hardened RPC surfaces.

create extension if not exists pgcrypto;

-- Quote lifecycle audit fields.
alter table public.quote_requests
  add column if not exists quoted_by uuid references public.staff(id) on delete set null,
  add column if not exists quoted_at timestamptz,
  add column if not exists accepted_by uuid references auth.users(id) on delete set null,
  add column if not exists accepted_at timestamptz,
  add column if not exists decision_note text,
  add column if not exists service_level text default 'standard',
  add column if not exists incoterm text,
  add column if not exists dimensional_weight_kg numeric(12,3),
  add column if not exists billable_weight_kg numeric(12,3);

create index if not exists quote_requests_lifecycle_idx
  on public.quote_requests(status, valid_until, updated_at desc);

-- Multi-leg routing from China/UAE through hubs to Erbil/Iraq.
create table if not exists public.shipment_route_legs (
  id uuid primary key default gen_random_uuid(),
  shipment_id text not null references public.shipments(id) on delete cascade,
  leg_number integer not null check (leg_number > 0),
  from_hub text not null,
  to_hub text not null,
  transport_mode text not null default 'air' check (transport_mode in ('air','sea','land','courier')),
  carrier_name text,
  tracking_number text,
  status text not null default 'planned' check (status in ('planned','booked','departed','arrived','exception','cancelled')),
  planned_departure timestamptz,
  planned_arrival timestamptz,
  actual_departure timestamptz,
  actual_arrival timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.staff(id) on delete set null,
  updated_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shipment_id, leg_number)
);
create index if not exists shipment_route_legs_shipment_idx
  on public.shipment_route_legs(shipment_id, leg_number);
create index if not exists shipment_route_legs_status_idx
  on public.shipment_route_legs(status, planned_departure);

-- Immutable operational movement ledger for package and shipment custody.
create table if not exists public.warehouse_movements (
  id uuid primary key default gen_random_uuid(),
  shipment_id text references public.shipments(id) on delete cascade,
  package_id uuid references public.shipment_packages(id) on delete set null,
  receipt_id bigint references public.warehouse_receipts(id) on delete set null,
  from_hub text,
  to_hub text not null,
  movement_type text not null check (movement_type in ('intake','transfer','dispatch','return')),
  scanned_by uuid references public.staff(id) on delete set null,
  scanned_at timestamptz not null default now(),
  scan_code text,
  idempotency_key text unique,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (shipment_id is not null or package_id is not null)
);
create index if not exists warehouse_movements_shipment_idx
  on public.warehouse_movements(shipment_id, scanned_at desc);
create index if not exists warehouse_movements_package_idx
  on public.warehouse_movements(package_id, scanned_at desc);
create index if not exists warehouse_movements_hub_idx
  on public.warehouse_movements(to_hub, movement_type, scanned_at desc);

-- Consolidation manifest for a physical batch movement.
create table if not exists public.shipment_manifests (
  id uuid primary key default gen_random_uuid(),
  manifest_number text not null unique,
  batch_id uuid references public.consolidation_batches(id) on delete set null,
  origin_hub text not null,
  destination_hub text not null,
  transport_mode text not null default 'air' check (transport_mode in ('air','sea','land','courier')),
  carrier_name text,
  tracking_reference text,
  status text not null default 'draft' check (status in ('draft','issued','departed','arrived','closed','cancelled')),
  total_packages integer not null default 0,
  total_weight_kg numeric(14,3) not null default 0,
  planned_departure timestamptz,
  actual_departure timestamptz,
  planned_arrival timestamptz,
  actual_arrival timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.staff(id) on delete set null,
  updated_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shipment_manifests_status_idx
  on public.shipment_manifests(status, planned_departure);
create index if not exists shipment_manifests_batch_idx
  on public.shipment_manifests(batch_id);

-- Document vault metadata for storage integrity and verification workflows.
alter table public.shipment_documents
  add column if not exists file_path text,
  add column if not exists mime_type text,
  add column if not exists file_size_bytes bigint,
  add column if not exists sha256 text,
  add column if not exists document_status text not null default 'uploaded',
  add column if not exists version integer not null default 1,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references public.staff(id) on delete set null;

alter table public.shipment_documents
  drop constraint if exists shipment_documents_document_status_chk;
alter table public.shipment_documents
  add constraint shipment_documents_document_status_chk
  check (document_status in ('uploaded','verified','rejected','archived'));

create index if not exists shipment_documents_status_idx
  on public.shipment_documents(shipment_id, document_status, created_at desc);
create index if not exists shipment_documents_sha_idx
  on public.shipment_documents(sha256) where sha256 is not null;

-- Harden existing customer policies before adding the new RPC-controlled surfaces.
drop policy if exists quote_requests_customer_insert on public.quote_requests;
create policy quote_requests_customer_insert on public.quote_requests
  for insert to authenticated with check (
    public.is_staff()
    or (customer_user_id = auth.uid() and status = 'pending' and quoted_amount is null and quoted_by is null and accepted_at is null)
  );
drop policy if exists quote_requests_staff_update on public.quote_requests;
create policy quote_requests_staff_update on public.quote_requests
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists shipment_documents_select on public.shipment_documents;
create policy shipment_documents_select on public.shipment_documents
  for select to authenticated using (
    document_status <> 'archived' and (public.is_staff() or customer_user_id = auth.uid() or is_public)
  );

-- RLS for new operational resources. Writes are intentionally RPC-controlled.
alter table public.shipment_route_legs enable row level security;
alter table public.warehouse_movements enable row level security;
alter table public.shipment_manifests enable row level security;

drop policy if exists shipment_route_legs_select on public.shipment_route_legs;
create policy shipment_route_legs_select on public.shipment_route_legs
  for select to authenticated using (
    public.is_staff() or exists (
      select 1 from public.shipments s
      where s.id = shipment_route_legs.shipment_id and s.customer_user_id = auth.uid()
    )
  );
drop policy if exists warehouse_movements_select on public.warehouse_movements;
create policy warehouse_movements_select on public.warehouse_movements
  for select to authenticated using (
    public.is_staff() or exists (
      select 1 from public.shipments s
      where s.id = warehouse_movements.shipment_id and s.customer_user_id = auth.uid()
    )
  );
drop policy if exists shipment_manifests_staff_select on public.shipment_manifests;
create policy shipment_manifests_staff_select on public.shipment_manifests
  for select to authenticated using (public.is_staff());

drop trigger if exists shipment_route_legs_updated_at on public.shipment_route_legs;
create trigger shipment_route_legs_updated_at
before update on public.shipment_route_legs
for each row execute function public.set_control_plane_updated_at();
drop trigger if exists shipment_manifests_updated_at on public.shipment_manifests;
create trigger shipment_manifests_updated_at
before update on public.shipment_manifests
for each row execute function public.set_control_plane_updated_at();

-- Standardized volumetric-weight calculation. Values are kg per CBM.
create or replace function public.calculate_dimensional_weight(
  p_weight_kg numeric,
  p_volume_cbm numeric,
  p_transport_mode text default 'air'
)
returns numeric
language sql
immutable
set search_path = public, pg_temp
as $$
  select greatest(0, coalesce(p_volume_cbm, 0)) * case lower(coalesce(p_transport_mode, 'air'))
    when 'air' then 167
    when 'sea' then 333
    when 'land' then 250
    when 'courier' then 200
    else 167
  end;
$$;
revoke all on function public.calculate_dimensional_weight(numeric,numeric,text) from public, anon;
grant execute on function public.calculate_dimensional_weight(numeric,numeric,text) to authenticated, service_role;

-- Quote approval is staff-only; the actor must match the authenticated user.
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
  if auth.uid() is not null and auth.uid() <> p_actor_id then
    raise exception 'Actor mismatch';
  end if;
  select * into v_actor from public.staff where id = p_actor_id and is_active = true;
  if not found then raise exception 'Active staff account required'; end if;
  if v_actor.role not in ('admin','super_admin','staff') then
    raise exception 'Operations role required';
  end if;
  if p_quoted_amount is null or p_quoted_amount <= 0 then
    raise exception 'Quoted amount must be greater than zero';
  end if;
  if v_currency not in ('USD','IQD','AED','CNY') then
    raise exception 'Unsupported quote currency';
  end if;
  if v_valid_until <= now() then raise exception 'Quote validity must be in the future'; end if;

  select * into v_quote from public.quote_requests where id = p_quote_id for update;
  if not found then raise exception 'Quote request not found'; end if;
  if v_quote.status not in ('pending','reviewing','quoted') then
    raise exception 'Quote cannot be approved in current state';
  end if;

  update public.quote_requests
  set status = 'quoted', quoted_amount = round(p_quoted_amount, 2), currency = v_currency,
      dimensional_weight_kg = round(public.calculate_dimensional_weight(v_quote.weight_kg, v_quote.volume_cbm, v_quote.transport_mode), 3),
      billable_weight_kg = round(greatest(coalesce(v_quote.weight_kg, 0), public.calculate_dimensional_weight(v_quote.weight_kg, v_quote.volume_cbm, v_quote.transport_mode)), 3),
      valid_until = v_valid_until, quoted_by = p_actor_id, quoted_at = now(),
      decision_note = nullif(trim(coalesce(p_notes, '')), ''), updated_at = now()
  where id = p_quote_id
  returning * into v_quote;

  if v_quote.customer_user_id is not null then
    insert into public.customer_notifications(customer_user_id, kind, title, body, action_url)
    values (
      v_quote.customer_user_id, 'quote_ready', 'Quote ready for review',
      format('Your quote request is ready: %s %s, valid until %s.', v_quote.quoted_amount, v_quote.currency, to_char(v_quote.valid_until, 'YYYY-MM-DD')),
      '/customer-portal.html#quotes'
    );
    insert into public.notification_outbox(customer_user_id, channel, event_key, recipient, payload)
    values (
      v_quote.customer_user_id, 'in_app', format('quote:%s:quoted', v_quote.id), null,
      jsonb_build_object('quote_id', v_quote.id, 'amount', v_quote.quoted_amount, 'currency', v_quote.currency, 'valid_until', v_quote.valid_until)
    ) on conflict (event_key, channel) do nothing;
  end if;

  insert into public.staff_activity_log(staff_id, staff_name, action, target_id, details)
  values (p_actor_id, v_actor.full_name, 'approve_quote_request', v_quote.id::text,
          jsonb_build_object('amount', v_quote.quoted_amount, 'currency', v_quote.currency, 'valid_until', v_quote.valid_until));
  return v_quote;
end;
$$;
revoke all on function public.approve_quote_request(uuid,uuid,numeric,text,timestamptz,text) from public, anon;
grant execute on function public.approve_quote_request(uuid,uuid,numeric,text,timestamptz,text) to authenticated, service_role;

-- Customer acceptance is separate from staff approval and cannot be forged by a client.
create or replace function public.accept_quote_request(
  p_customer_id uuid,
  p_quote_id uuid
)
returns public.quote_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quote public.quote_requests%rowtype;
begin
  if auth.uid() is not null and auth.uid() <> p_customer_id then raise exception 'Actor mismatch'; end if;
  select * into v_quote from public.quote_requests where id = p_quote_id for update;
  if not found then raise exception 'Quote request not found'; end if;
  if v_quote.customer_user_id <> p_customer_id then raise exception 'Quote ownership mismatch'; end if;
  if v_quote.status <> 'quoted' or v_quote.valid_until is null or v_quote.valid_until <= now() then
    raise exception 'Quote is not available for acceptance';
  end if;
  update public.quote_requests
  set status = 'accepted', accepted_by = p_customer_id, accepted_at = now(), updated_at = now()
  where id = p_quote_id
  returning * into v_quote;
  return v_quote;
end;
$$;
revoke all on function public.accept_quote_request(uuid,uuid) from public, anon;
grant execute on function public.accept_quote_request(uuid,uuid) to authenticated, service_role;

-- Warehouse movement RPC with barcode/package validation and idempotency.
create or replace function public.record_warehouse_movement(
  p_actor_id uuid,
  p_shipment_id text default null,
  p_package_id uuid default null,
  p_receipt_id bigint default null,
  p_from_hub text default null,
  p_to_hub text default null,
  p_movement_type text default 'transfer',
  p_scan_code text default null,
  p_notes text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_idempotency_key text default null
)
returns public.warehouse_movements
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor public.staff%rowtype;
  v_package public.shipment_packages%rowtype;
  v_movement public.warehouse_movements%rowtype;
  v_shipment_id text := nullif(trim(p_shipment_id), '');
  v_type text := lower(trim(coalesce(p_movement_type, 'transfer')));
  v_to_hub text := lower(nullif(trim(coalesce(p_to_hub, '')), ''));
  v_from_hub text := lower(nullif(trim(coalesce(p_from_hub, '')), ''));
  v_status text;
begin
  if auth.uid() is not null and auth.uid() <> p_actor_id then raise exception 'Actor mismatch'; end if;
  select * into v_actor from public.staff where id = p_actor_id and is_active = true;
  if not found then raise exception 'Active staff account required'; end if;
  if v_actor.role not in ('admin','super_admin','staff') then raise exception 'Operations role required'; end if;
  if v_to_hub is null then raise exception 'Destination hub is required'; end if;
  if v_type not in ('intake','transfer','dispatch','return') then raise exception 'Unsupported movement type'; end if;
  if p_idempotency_key is not null then
    select * into v_movement from public.warehouse_movements where idempotency_key = p_idempotency_key;
    if found then return v_movement; end if;
  end if;

  if p_package_id is not null then
    select * into v_package from public.shipment_packages where id = p_package_id for update;
    if not found then raise exception 'Package not found'; end if;
    if v_shipment_id is null then v_shipment_id := v_package.shipment_id; end if;
    if v_package.shipment_id <> v_shipment_id then raise exception 'Package does not belong to shipment'; end if;
    if p_scan_code is not null and upper(trim(p_scan_code)) not in (upper(v_package.package_code), upper(coalesce(v_package.barcode, ''))) then
      raise exception 'Package scan code mismatch';
    end if;
  end if;
  if v_shipment_id is null then raise exception 'Shipment or package is required'; end if;
  if not exists (select 1 from public.shipments where id = v_shipment_id) then raise exception 'Shipment not found'; end if;

  v_status := case v_type when 'dispatch' then 'in_transit' when 'return' then 'received' else 'received' end;
  insert into public.warehouse_movements(
    shipment_id, package_id, receipt_id, from_hub, to_hub, movement_type,
    scanned_by, scanned_at, scan_code, idempotency_key, notes, metadata
  ) values (
    v_shipment_id, p_package_id, p_receipt_id, v_from_hub, v_to_hub, v_type,
    p_actor_id, now(), nullif(upper(trim(coalesce(p_scan_code, ''))), ''), p_idempotency_key,
    nullif(trim(coalesce(p_notes, '')), ''), coalesce(p_metadata, '{}'::jsonb)
  ) returning * into v_movement;

  if p_package_id is not null then
    update public.shipment_packages
    set current_hub = v_to_hub, status = v_status, updated_at = now()
    where id = p_package_id;
  end if;
  update public.shipments
  set current_location_label = v_to_hub, tracking_updated_at = now(), updated_at = now()
  where id = v_shipment_id;
  insert into public.shipment_events(shipment_id, event_type, status, location, note, occurred_at, created_by, created_by_name, metadata)
  values (v_shipment_id, 'warehouse_movement', v_type, v_to_hub, v_movement.notes, now(), p_actor_id, v_actor.full_name,
          jsonb_build_object('movement_id', v_movement.id, 'package_id', p_package_id, 'from_hub', v_from_hub, 'to_hub', v_to_hub));
  insert into public.staff_activity_log(staff_id, staff_name, action, target_id, details)
  values (p_actor_id, v_actor.full_name, 'record_warehouse_movement', v_shipment_id,
          jsonb_build_object('movement_id', v_movement.id, 'movement_type', v_type, 'to_hub', v_to_hub, 'package_id', p_package_id));
  return v_movement;
end;
$$;
revoke all on function public.record_warehouse_movement(uuid,text,uuid,bigint,text,text,text,text,text,jsonb,text) from public, anon;
grant execute on function public.record_warehouse_movement(uuid,text,uuid,bigint,text,text,text,text,text,jsonb,text) to authenticated, service_role;

-- Route-leg upsert keeps carrier and milestone dates auditable.
create or replace function public.upsert_shipment_route_leg(
  p_actor_id uuid,
  p_shipment_id text,
  p_leg_number integer,
  p_from_hub text,
  p_to_hub text,
  p_transport_mode text default 'air',
  p_carrier_name text default null,
  p_tracking_number text default null,
  p_status text default 'planned',
  p_planned_departure timestamptz default null,
  p_planned_arrival timestamptz default null,
  p_actual_departure timestamptz default null,
  p_actual_arrival timestamptz default null,
  p_notes text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.shipment_route_legs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor public.staff%rowtype;
  v_leg public.shipment_route_legs%rowtype;
  v_status text := lower(trim(coalesce(p_status, 'planned')));
  v_mode text := lower(trim(coalesce(p_transport_mode, 'air')));
begin
  if auth.uid() is not null and auth.uid() <> p_actor_id then raise exception 'Actor mismatch'; end if;
  select * into v_actor from public.staff where id = p_actor_id and is_active = true;
  if not found then raise exception 'Active staff account required'; end if;
  if v_actor.role not in ('admin','super_admin','staff') then raise exception 'Operations role required'; end if;
  if p_leg_number is null or p_leg_number <= 0 then raise exception 'Leg number is required'; end if;
  if not exists (select 1 from public.shipments where id = p_shipment_id) then raise exception 'Shipment not found'; end if;
  if v_status not in ('planned','booked','departed','arrived','exception','cancelled') then raise exception 'Unsupported leg status'; end if;
  if v_mode not in ('air','sea','land','courier') then raise exception 'Unsupported transport mode'; end if;
  insert into public.shipment_route_legs(
    shipment_id, leg_number, from_hub, to_hub, transport_mode, carrier_name, tracking_number,
    status, planned_departure, planned_arrival, actual_departure, actual_arrival,
    notes, metadata, created_by, updated_by
  ) values (
    p_shipment_id, p_leg_number, lower(trim(p_from_hub)), lower(trim(p_to_hub)), v_mode,
    nullif(trim(coalesce(p_carrier_name, '')), ''), nullif(trim(coalesce(p_tracking_number, '')), ''),
    v_status, p_planned_departure, p_planned_arrival,
    case when v_status = 'departed' and p_actual_departure is null then now() else p_actual_departure end,
    case when v_status = 'arrived' and p_actual_arrival is null then now() else p_actual_arrival end,
    nullif(trim(coalesce(p_notes, '')), ''), coalesce(p_metadata, '{}'::jsonb), p_actor_id, p_actor_id
  )
  on conflict (shipment_id, leg_number) do update set
    from_hub=excluded.from_hub, to_hub=excluded.to_hub, transport_mode=excluded.transport_mode,
    carrier_name=excluded.carrier_name, tracking_number=excluded.tracking_number, status=excluded.status,
    planned_departure=excluded.planned_departure, planned_arrival=excluded.planned_arrival,
    actual_departure=coalesce(excluded.actual_departure, public.shipment_route_legs.actual_departure),
    actual_arrival=coalesce(excluded.actual_arrival, public.shipment_route_legs.actual_arrival),
    notes=excluded.notes, metadata=excluded.metadata, updated_by=p_actor_id, updated_at=now()
  returning * into v_leg;
  insert into public.shipment_events(shipment_id, event_type, status, location, note, occurred_at, created_by, created_by_name, metadata)
  values (p_shipment_id, 'route_leg_update', v_status, v_leg.to_hub, v_leg.notes, now(), p_actor_id, v_actor.full_name,
          jsonb_build_object('leg_id', v_leg.id, 'leg_number', v_leg.leg_number, 'tracking_number', v_leg.tracking_number));
  return v_leg;
end;
$$;
revoke all on function public.upsert_shipment_route_leg(uuid,text,integer,text,text,text,text,text,text,timestamptz,timestamptz,timestamptz,timestamptz,text,jsonb) from public, anon;
grant execute on function public.upsert_shipment_route_leg(uuid,text,integer,text,text,text,text,text,text,timestamptz,timestamptz,timestamptz,timestamptz,text,jsonb) to authenticated, service_role;

-- Registration RPC: Edge Function uploads bytes to private storage, then calls this.
create or replace function public.register_shipment_document(
  p_actor_id uuid,
  p_shipment_id text,
  p_document_type text,
  p_title text,
  p_file_url text,
  p_file_path text default null,
  p_mime_type text default null,
  p_file_size_bytes bigint default null,
  p_sha256 text default null,
  p_is_public boolean default false
)
returns public.shipment_documents
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor public.staff%rowtype;
  v_shipment public.shipments%rowtype;
  v_doc public.shipment_documents%rowtype;
begin
  if auth.uid() is not null and auth.uid() <> p_actor_id then raise exception 'Actor mismatch'; end if;
  select * into v_actor from public.staff where id = p_actor_id and is_active = true;
  if not found then raise exception 'Active staff account required'; end if;
  if v_actor.role not in ('admin','super_admin','staff') then raise exception 'Operations role required'; end if;
  select * into v_shipment from public.shipments where id = p_shipment_id;
  if not found then raise exception 'Shipment not found'; end if;
  if nullif(trim(coalesce(p_title, '')), '') is null or nullif(trim(coalesce(p_file_url, '')), '') is null then
    raise exception 'Document title and URL are required';
  end if;
  insert into public.shipment_documents(
    shipment_id, customer_user_id, document_type, title, file_url, is_public, created_by,
    file_path, mime_type, file_size_bytes, sha256, document_status, version
  ) values (
    p_shipment_id, v_shipment.customer_user_id, lower(trim(p_document_type)), trim(p_title), trim(p_file_url),
    coalesce(p_is_public, false), p_actor_id, nullif(trim(coalesce(p_file_path, '')), ''),
    nullif(trim(coalesce(p_mime_type, '')), ''), p_file_size_bytes, nullif(lower(trim(coalesce(p_sha256, ''))), ''),
    'uploaded', 1
  ) returning * into v_doc;
  insert into public.staff_activity_log(staff_id, staff_name, action, target_id, details)
  values (p_actor_id, v_actor.full_name, 'register_shipment_document', p_shipment_id,
          jsonb_build_object('document_id', v_doc.id, 'document_type', v_doc.document_type, 'file_path', v_doc.file_path));
  return v_doc;
end;
$$;
revoke all on function public.register_shipment_document(uuid,text,text,text,text,text,text,bigint,text,boolean) from public, anon;
grant execute on function public.register_shipment_document(uuid,text,text,text,text,text,text,bigint,text,boolean) to authenticated, service_role;

-- Server-side operational report; detail tables remain unavailable to anonymous users.
create or replace function public.get_logistics_report(
  p_actor_id uuid,
  p_from_date date default (current_date - 30),
  p_to_date date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor public.staff%rowtype;
  v_from timestamptz := p_from_date::timestamptz;
  v_to timestamptz := (p_to_date + 1)::timestamptz;
  v_result jsonb;
begin
  if auth.uid() is not null and auth.uid() <> p_actor_id then raise exception 'Actor mismatch'; end if;
  select * into v_actor from public.staff where id = p_actor_id and is_active = true;
  if not found then raise exception 'Active staff account required'; end if;
  if v_actor.role not in ('admin','super_admin','accountant','staff') then raise exception 'Reporting role required'; end if;
  if p_from_date is null or p_to_date is null or p_from_date > p_to_date then raise exception 'Invalid reporting period'; end if;

  select jsonb_build_object(
    'period', jsonb_build_object('from', p_from_date, 'to', p_to_date),
    'shipments', (select jsonb_build_object(
      'total', count(*),
      'delivered', count(*) filter (where operational_status = 'delivered'),
      'in_transit', count(*) filter (where operational_status in ('in_transit','at_transit_hub','out_for_delivery')),
      'exceptions', count(*) filter (where operational_status in ('exception','on_hold')),
      'revenue_usd', coalesce(sum(total_amount),0),
      'outstanding_usd', coalesce(sum(greatest(coalesce(total_amount,0)-coalesce(paid_amount,0),0)),0)
    ) from public.shipments where created_at >= v_from and created_at < v_to),
    'quotes', (select jsonb_build_object(
      'total', count(*),
      'pending', count(*) filter (where status in ('pending','reviewing')),
      'quoted', count(*) filter (where status = 'quoted'),
      'accepted', count(*) filter (where status = 'accepted'),
      'rejected', count(*) filter (where status = 'rejected')
    ) from public.quote_requests where created_at >= v_from and created_at < v_to),
    'warehouse', (select jsonb_build_object(
      'movements', count(*),
      'packages', count(distinct package_id),
      'intake', count(*) filter (where movement_type = 'intake'),
      'transfer', count(*) filter (where movement_type = 'transfer'),
      'dispatch', count(*) filter (where movement_type = 'dispatch'),
      'return', count(*) filter (where movement_type = 'return')
    ) from public.warehouse_movements where scanned_at >= v_from and scanned_at < v_to),
    'finance', (select jsonb_build_object(
      'invoiced_usd', coalesce(sum(total),0),
      'invoice_paid_usd', coalesce(sum(paid_total),0),
      'invoice_outstanding_usd', coalesce(sum(greatest(total-paid_total,0)),0)
    ) from public.shipment_invoices where created_at >= v_from and created_at < v_to),
    'exceptions', (select jsonb_build_object(
      'total', count(*),
      'open', count(*) filter (where status not in ('resolved','closed')),
      'critical', count(*) filter (where lower(coalesce(severity,'')) = 'critical')
    ) from public.logistics_exceptions where created_at >= v_from and created_at < v_to)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.get_logistics_report(uuid,date,date) from public, anon;
grant execute on function public.get_logistics_report(uuid,date,date) to authenticated, service_role;

-- Service-role-only aggregate views for scheduled exports and BI integrations.
create or replace view public.v_shipment_summary as
select
  coalesce(s.operational_status, 'unknown') as operational_status,
  coalesce(s.origin_hub, s.origin_key) as origin_hub,
  coalesce(s.transit_hub, '') as transit_hub,
  coalesce(s.destination_hub, s.dest_key) as destination_hub,
  count(*)::bigint as shipment_count,
  coalesce(sum(s.weight_kg),0)::numeric as total_weight_kg,
  coalesce(sum(s.total_amount),0)::numeric as total_amount_usd,
  coalesce(sum(s.paid_amount),0)::numeric as paid_amount_usd,
  coalesce(sum(greatest(coalesce(s.total_amount,0)-coalesce(s.paid_amount,0),0)),0)::numeric as outstanding_amount_usd,
  min(s.eta) as earliest_eta,
  max(s.tracking_updated_at) as last_tracking_update
from public.shipments s
where s.archived_at is null
group by coalesce(s.operational_status, 'unknown'), coalesce(s.origin_hub, s.origin_key), coalesce(s.transit_hub, ''), coalesce(s.destination_hub, s.dest_key);

create or replace view public.v_daily_operations as
select
  (s.created_at at time zone 'Asia/Baghdad')::date as operation_date,
  count(*)::bigint as shipment_count,
  count(*) filter (where s.operational_status = 'delivered')::bigint as delivered_count,
  count(*) filter (where s.operational_status in ('exception','on_hold'))::bigint as exception_count,
  coalesce(sum(s.weight_kg),0)::numeric as total_weight_kg,
  coalesce(sum(s.total_amount),0)::numeric as revenue_usd,
  coalesce(sum(greatest(coalesce(s.total_amount,0)-coalesce(s.paid_amount,0),0)),0)::numeric as outstanding_usd
from public.shipments s
group by (s.created_at at time zone 'Asia/Baghdad')::date
order by operation_date desc;

create or replace view public.v_financial_summary as
select
  i.currency,
  count(*)::bigint as invoice_count,
  coalesce(sum(i.total),0)::numeric as invoiced_amount,
  coalesce(sum(i.paid_total),0)::numeric as paid_amount,
  coalesce(sum(greatest(i.total-i.paid_total,0)),0)::numeric as outstanding_amount,
  coalesce((select sum(pt.amount) from public.payment_transactions pt where pt.currency = i.currency and pt.status = 'succeeded' and pt.transaction_type = 'payment'),0)::numeric as settled_payment_amount
from public.shipment_invoices i
group by i.currency;

revoke all on public.v_shipment_summary, public.v_daily_operations, public.v_financial_summary from anon, authenticated;
grant select on public.v_shipment_summary, public.v_daily_operations, public.v_financial_summary to service_role;

-- Storage bucket for private shipment documents. Actual object writes are service-side.
insert into storage.buckets(id, name, public)
values ('shipment-documents', 'shipment-documents', false)
on conflict (id) do update set public = false;

drop policy if exists shipment_documents_storage_staff_read on storage.objects;
create policy shipment_documents_storage_staff_read on storage.objects
  for select to authenticated using (bucket_id = 'shipment-documents' and public.is_staff());
drop policy if exists shipment_documents_storage_staff_write on storage.objects;
create policy shipment_documents_storage_staff_write on storage.objects
  for insert to authenticated with check (bucket_id = 'shipment-documents' and public.is_staff());
