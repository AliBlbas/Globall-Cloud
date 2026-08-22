-- Globall Cloud: Qicard + FIB payment sessions and settlement control plane
-- Provider secrets never belong in this schema or in browser code.

create table if not exists public.payment_sessions (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.shipment_invoices(id) on delete restrict,
  shipment_id text not null references public.shipments(id) on delete restrict,
  customer_user_id uuid references auth.users(id) on delete set null,
  provider text not null check (provider in ('qicard','fib')),
  status text not null default 'created' check (status in ('created','pending','succeeded','failed','cancelled','expired')),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null check (char_length(currency) = 3),
  idempotency_key text not null,
  provider_request_id text,
  provider_payment_id text,
  provider_status text,
  checkout_url text,
  qr_code text,
  readable_code text,
  expires_at timestamptz,
  last_checked_at timestamptz,
  completed_at timestamptz,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, idempotency_key)
);
create unique index if not exists payment_sessions_provider_payment_idx
  on public.payment_sessions(provider, provider_payment_id)
  where provider_payment_id is not null;
create index if not exists payment_sessions_invoice_idx
  on public.payment_sessions(invoice_id, created_at desc);
create index if not exists payment_sessions_status_idx
  on public.payment_sessions(provider, status, created_at desc);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('qicard','fib')),
  event_key text not null,
  payment_session_id uuid references public.payment_sessions(id) on delete set null,
  signature_valid boolean not null default false,
  provider_status text,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  processing_error text,
  received_at timestamptz not null default now(),
  unique(provider, event_key)
);
create index if not exists payment_webhook_events_session_idx
  on public.payment_webhook_events(payment_session_id, received_at desc);

alter table public.payment_sessions enable row level security;
alter table public.payment_webhook_events enable row level security;
drop policy if exists payment_sessions_staff_select on public.payment_sessions;
create policy payment_sessions_staff_select on public.payment_sessions
  for select to authenticated
  using (public.is_staff() or customer_user_id = auth.uid());
drop policy if exists payment_webhook_events_staff_select on public.payment_webhook_events;
create policy payment_webhook_events_staff_select on public.payment_webhook_events
  for select to authenticated
  using (public.is_staff());

create or replace function public.is_service_role_request()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';
$$;
revoke all on function public.is_service_role_request() from public, anon, authenticated;
grant execute on function public.is_service_role_request() to service_role;

create or replace function public.create_payment_session(
  p_actor_id uuid,
  p_invoice_id uuid,
  p_provider text,
  p_amount numeric,
  p_currency text,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns public.payment_sessions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invoice public.shipment_invoices%rowtype;
  v_existing public.payment_sessions%rowtype;
  v_session public.payment_sessions%rowtype;
  v_provider text := lower(trim(coalesce(p_provider, '')));
  v_currency text := upper(trim(coalesce(p_currency, '')));
  v_amount numeric(14,2) := round(coalesce(p_amount, 0), 2);
  v_due numeric(14,2);
  v_is_staff boolean := false;
  v_staff_role text;
begin
  if p_actor_id is null and not public.is_service_role_request() then
    raise exception 'Authenticated actor or service role required';
  end if;
  if auth.uid() is not null and p_actor_id is not null and auth.uid() <> p_actor_id then
    raise exception 'Actor mismatch';
  end if;
  if v_provider not in ('qicard','fib') then raise exception 'Unsupported payment provider'; end if;
  if v_currency <> 'IQD' then raise exception 'Qicard and FIB payment sessions require IQD'; end if;
  if v_amount <= 0 then raise exception 'Payment amount must be positive'; end if;
  if nullif(trim(p_idempotency_key), '') is null then raise exception 'Idempotency key is required'; end if;
  select * into v_existing from public.payment_sessions
    where provider = v_provider and idempotency_key = trim(p_idempotency_key);
  if found then return v_existing; end if;
  select * into v_invoice from public.shipment_invoices where id = p_invoice_id for update;
  if not found then raise exception 'Invoice not found'; end if;
  if v_invoice.status in ('void','paid') then raise exception 'Invoice is not payable'; end if;
  v_due := greatest(0, round(v_invoice.total - v_invoice.paid_total, 2));
  if v_amount > v_due then raise exception 'Payment amount exceeds invoice balance'; end if;
  if v_invoice.currency <> v_currency then raise exception 'Invoice currency does not match payment currency'; end if;
  if p_actor_id is not null and not public.is_service_role_request() then
    select role into v_staff_role from public.staff where id=p_actor_id and is_active=true;
    v_is_staff := v_staff_role is not null;
    if v_is_staff and v_staff_role not in ('admin','super_admin','accountant') then raise exception 'Finance role required'; end if;
    if not v_is_staff and (v_invoice.customer_user_id is null or v_invoice.customer_user_id <> p_actor_id) then
      raise exception 'Payment actor is not allowed for this invoice';
    end if;
  end if;
  insert into public.payment_sessions(
    invoice_id, shipment_id, customer_user_id, provider, status, amount, currency,
    idempotency_key, metadata, created_by
  ) values (
    v_invoice.id, v_invoice.shipment_id, v_invoice.customer_user_id, v_provider, 'created',
    v_amount, v_currency, trim(p_idempotency_key), coalesce(p_metadata,'{}'::jsonb), p_actor_id
  ) returning * into v_session;
  return v_session;
end;
$$;
revoke all on function public.create_payment_session(uuid,uuid,text,numeric,text,text,jsonb) from public, anon;
grant execute on function public.create_payment_session(uuid,uuid,text,numeric,text,text,jsonb) to authenticated, service_role;

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
  v_actor_name text;
  v_invoice public.shipment_invoices%rowtype;
  v_tx public.payment_transactions%rowtype;
  v_type text := lower(trim(p_transaction_type));
  v_status text := lower(trim(p_status));
  v_provider text := lower(coalesce(nullif(trim(p_provider),''),'manual'));
  v_key text := coalesce(nullif(trim(p_idempotency_key), ''), 'manual-' || gen_random_uuid()::text);
  v_delta numeric(14,2);
  v_paid numeric(14,2);
  v_invoice_status text;
  v_service boolean := p_actor_id is null and public.is_service_role_request();
begin
  if not v_service and p_actor_id is null then raise exception 'Actor required'; end if;
  if auth.uid() is not null and p_actor_id is not null and auth.uid() <> p_actor_id then raise exception 'Actor mismatch'; end if;
  if v_service then
    v_actor_name := 'payment-provider';
  else
    select * into v_actor from public.staff where id = p_actor_id and is_active = true;
    if not found then raise exception 'Active staff account required'; end if;
    if v_actor.role not in ('admin','super_admin','accountant') then raise exception 'Finance role required'; end if;
    v_actor_name := v_actor.full_name;
  end if;
  if p_amount is null or p_amount < 0 then raise exception 'Payment amount must be non-negative'; end if;
  if v_provider <> 'manual' and nullif(trim(p_idempotency_key), '') is null then raise exception 'Provider payments require an idempotency key'; end if;
  if v_type not in ('payment','refund','adjustment') or v_status not in ('pending','succeeded','failed','reversed') then raise exception 'Unsupported transaction state'; end if;
  select * into v_tx from public.payment_transactions where idempotency_key=v_key;
  if found then return v_tx; end if;
  select * into v_invoice from public.shipment_invoices where id=p_invoice_id for update;
  if not found then raise exception 'Invoice not found'; end if;
  if v_status = 'succeeded' and v_provider <> 'manual' and v_invoice.currency <> 'IQD' then raise exception 'Provider settlement requires IQD invoice'; end if;
  insert into public.payment_transactions(invoice_id,shipment_id,provider,provider_reference,transaction_type,status,amount,currency,method,idempotency_key,paid_at,metadata,created_by)
  values(p_invoice_id,v_invoice.shipment_id,v_provider,nullif(trim(p_provider_reference),''),v_type,v_status,p_amount,v_invoice.currency,nullif(trim(p_method),''),v_key,case when v_status='succeeded' then now() else null end,coalesce(p_metadata,'{}'::jsonb),p_actor_id)
  returning * into v_tx;
  if v_status = 'succeeded' then
    v_delta := case when v_type='refund' then -p_amount else p_amount end;
    v_paid := greatest(0, v_invoice.paid_total + v_delta);
    v_invoice_status := case when v_paid >= v_invoice.total then 'paid' when v_paid > 0 then 'partially_paid' else v_invoice.status end;
    update public.shipment_invoices set paid_total=v_paid,status=v_invoice_status,updated_by=p_actor_id,updated_at=now() where id=v_invoice.id;
    insert into public.shipment_financial_ledger(shipment_id,entry_type,amount,currency,reference,note,recorded_by)
    values(v_invoice.shipment_id,case when v_type='refund' then 'refund' else 'payment' end,case when v_type='refund' then -p_amount else p_amount end,v_invoice.currency,p_provider_reference,'Recorded through payment settlement control plane',p_actor_id);
    update public.shipments set paid_amount=greatest(0,coalesce(paid_amount,0)+v_delta),updated_at=now() where id=v_invoice.shipment_id;
  end if;
  insert into public.staff_activity_log(staff_id,staff_name,action,target_id,details)
  values(p_actor_id,v_actor_name,'record_payment_transaction',v_invoice.shipment_id,jsonb_build_object('invoice_id',p_invoice_id,'amount',p_amount,'type',v_type,'status',v_status,'provider',v_provider,'idempotency_key',v_key));
  return v_tx;
end;
$$;
revoke all on function public.record_payment_transaction(uuid,uuid,numeric,text,text,text,text,text,text,jsonb) from public, anon;
grant execute on function public.record_payment_transaction(uuid,uuid,numeric,text,text,text,text,text,text,jsonb) to authenticated, service_role;

create or replace function public.settle_payment_session(
  p_session_id uuid,
  p_status text,
  p_provider_payment_id text default null,
  p_provider_status text default null,
  p_provider_amount numeric default null,
  p_provider_currency text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.payment_sessions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.payment_sessions%rowtype;
  v_status text := lower(trim(coalesce(p_status, 'pending')));
  v_tx public.payment_transactions%rowtype;
begin
  if not public.is_service_role_request() then raise exception 'Payment settlement is server-only'; end if;
  if v_status not in ('pending','succeeded','failed','cancelled','expired') then raise exception 'Unsupported payment session status'; end if;
  select * into v_session from public.payment_sessions where id=p_session_id for update;
  if not found then raise exception 'Payment session not found'; end if;
  if p_provider_amount is not null and round(p_provider_amount,2) <> round(v_session.amount,2) then raise exception 'Provider amount does not match payment session'; end if;
  if p_provider_currency is not null and upper(trim(p_provider_currency)) <> v_session.currency then raise exception 'Provider currency does not match payment session'; end if;
  if v_session.status = 'succeeded' and v_status <> 'succeeded' then return v_session; end if;
  if v_status = 'succeeded' and v_session.status <> 'succeeded' then
    select * into v_tx from public.record_payment_transaction(
      null, v_session.invoice_id, v_session.amount, 'payment', 'succeeded', v_session.provider,
      coalesce(nullif(trim(p_provider_payment_id),''), v_session.provider_payment_id), v_session.provider,
      'payment-session:' || v_session.id::text,
      coalesce(p_metadata,'{}'::jsonb)
    );
  end if;
  update public.payment_sessions set
    status=v_status,
    provider_payment_id=coalesce(nullif(trim(p_provider_payment_id),''),provider_payment_id),
    provider_status=coalesce(nullif(trim(p_provider_status),''),provider_status),
    metadata=coalesce(metadata,'{}'::jsonb) || coalesce(p_metadata,'{}'::jsonb),
    completed_at=case when v_status in ('succeeded','failed','cancelled','expired') then coalesce(completed_at,now()) else completed_at end,
    last_checked_at=now(),
    failure_reason=case when v_status in ('failed','cancelled','expired') then coalesce(p_metadata->>'reason', failure_reason) else null end,
    updated_at=now()
  where id=v_session.id
  returning * into v_session;
  return v_session;
end;
$$;
revoke all on function public.settle_payment_session(uuid,text,text,text,numeric,text,jsonb) from public, anon, authenticated;
grant execute on function public.settle_payment_session(uuid,text,text,text,numeric,text,jsonb) to service_role;

drop trigger if exists payment_sessions_updated_at on public.payment_sessions;
create trigger payment_sessions_updated_at before update on public.payment_sessions for each row execute function public.set_control_plane_updated_at();
