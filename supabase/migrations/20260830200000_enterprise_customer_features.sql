-- Enterprise customer-facing logistics features: insurance and consolidation requests.
create extension if not exists pgcrypto;

create table if not exists public.shipment_insurance (
  id uuid primary key default gen_random_uuid(),
  shipment_id text not null unique references public.shipments(id) on delete cascade,
  customer_user_id uuid references auth.users(id) on delete set null,
  premium numeric(12,2) not null default 2 check (premium >= 0),
  currency text not null default 'USD' check (currency in ('USD','IQD')),
  insured_value numeric(14,2),
  status text not null default 'active' check (status in ('active','claimed','cancelled')),
  purchased_by uuid references auth.users(id) on delete set null,
  purchased_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists shipment_insurance_customer_idx on public.shipment_insurance(customer_user_id,purchased_at desc);

create table if not exists public.consolidation_requests (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid references auth.users(id) on delete set null,
  shipment_ids text[] not null,
  from_hub text,
  to_hub text default 'erbil',
  estimated_saving numeric(12,2),
  currency text not null default 'USD' check (currency in ('USD','IQD','AED','CNY')),
  status text not null default 'requested' check (status in ('requested','reviewing','approved','scheduled','completed','rejected','cancelled')),
  note text,
  created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists consolidation_requests_customer_idx on public.consolidation_requests(customer_user_id,created_at desc);
create index if not exists consolidation_requests_status_idx on public.consolidation_requests(status,created_at desc);

alter table public.shipment_insurance enable row level security;
alter table public.consolidation_requests enable row level security;

drop policy if exists shipment_insurance_select_owner_staff on public.shipment_insurance;
create policy shipment_insurance_select_owner_staff on public.shipment_insurance for select to authenticated using (public.is_staff() or customer_user_id = auth.uid());
drop policy if exists consolidation_requests_select_owner_staff on public.consolidation_requests;
create policy consolidation_requests_select_owner_staff on public.consolidation_requests for select to authenticated using (public.is_staff() or customer_user_id = auth.uid());

create or replace function public.purchase_shipment_insurance(p_actor_id uuid,p_shipment_id text,p_premium numeric default 2,p_currency text default 'USD')
returns public.shipment_insurance language plpgsql security definer set search_path=public,pg_temp as $$
declare v_shipment public.shipments%rowtype; v_row public.shipment_insurance%rowtype; v_customer uuid; v_currency text := upper(trim(coalesce(p_currency,'USD')));
begin
  if auth.uid() is not null and auth.uid() <> p_actor_id then raise exception 'Actor mismatch'; end if;
  select * into v_shipment from public.shipments where id=p_shipment_id for update;
  if not found then raise exception 'Shipment not found'; end if;
  v_customer := v_shipment.customer_user_id;
  if auth.uid() is not null and auth.uid() <> v_customer and not public.is_staff() then raise exception 'Not allowed'; end if;
  if p_premium is null or p_premium < 0 then raise exception 'Invalid premium'; end if;
  if v_currency not in ('USD','IQD') then raise exception 'Unsupported insurance currency'; end if;
  insert into public.shipment_insurance(shipment_id,customer_user_id,premium,currency,insured_value,purchased_by)
  values(p_shipment_id,v_customer,p_premium,v_currency,v_shipment.total_amount,p_actor_id)
  on conflict (shipment_id) do update set premium=excluded.premium,currency=excluded.currency,status='active',purchased_by=excluded.purchased_by,purchased_at=now()
  returning * into v_row;
  return v_row;
end;$$;
revoke all on function public.purchase_shipment_insurance(uuid,text,numeric,text) from public,anon;
grant execute on function public.purchase_shipment_insurance(uuid,text,numeric,text) to authenticated,service_role;

create or replace function public.request_consolidation(p_customer_id uuid,p_shipment_ids text[],p_from_hub text default null,p_to_hub text default 'erbil',p_note text default null)
returns public.consolidation_requests language plpgsql security definer set search_path=public,pg_temp as $$
declare v_row public.consolidation_requests%rowtype; v_ids text[]:=coalesce(p_shipment_ids,'{}'::text[]); v_valid_count integer; v_owner_count integer;
begin
  if auth.uid() is not null and auth.uid() <> p_customer_id then raise exception 'Actor mismatch'; end if;
  if cardinality(v_ids) < 2 or cardinality(v_ids) > 20 then raise exception 'Choose between 2 and 20 shipments'; end if;
  select count(*) into v_valid_count from public.shipments s where s.id=any(v_ids) and s.archived_at is null;
  if v_valid_count <> cardinality(v_ids) then raise exception 'One or more shipments were not found'; end if;
  select count(*) into v_owner_count from public.shipments s where s.id=any(v_ids) and s.customer_user_id=p_customer_id;
  if v_owner_count <> cardinality(v_ids) then raise exception 'Shipment ownership mismatch'; end if;
  insert into public.consolidation_requests(customer_user_id,shipment_ids,from_hub,to_hub,note,created_by)
  values(p_customer_id,v_ids,p_from_hub,coalesce(nullif(trim(p_to_hub),''),'erbil'),nullif(trim(coalesce(p_note,'')),''),p_customer_id)
  returning * into v_row;
  return v_row;
end;$$;
revoke all on function public.request_consolidation(uuid,text[],text,text,text) from public,anon;
grant execute on function public.request_consolidation(uuid,text[],text,text,text) to authenticated,service_role;

create or replace function public.review_consolidation_request(p_actor_id uuid,p_request_id uuid,p_status text,p_saving numeric default null,p_currency text default 'USD',p_note text default null)
returns public.consolidation_requests language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor public.staff%rowtype; v_row public.consolidation_requests%rowtype;
begin
  if auth.uid() is not null and auth.uid() <> p_actor_id then raise exception 'Actor mismatch'; end if;
  select * into v_actor from public.staff where id=p_actor_id and is_active=true;
  if not found or v_actor.role not in ('admin','super_admin','operations','accountant') then raise exception 'Staff role required'; end if;
  if p_status not in ('reviewing','approved','scheduled','completed','rejected','cancelled') then raise exception 'Invalid consolidation status'; end if;
  update public.consolidation_requests set status=p_status,estimated_saving=p_saving,currency=upper(coalesce(p_currency,'USD')),note=coalesce(nullif(trim(coalesce(p_note,'')),''),note),reviewed_by=p_actor_id,reviewed_at=now(),updated_at=now() where id=p_request_id returning * into v_row;
  if not found then raise exception 'Request not found'; end if;
  return v_row;
end;$$;
revoke all on function public.review_consolidation_request(uuid,uuid,text,numeric,text,text) from public,anon;
grant execute on function public.review_consolidation_request(uuid,uuid,text,numeric,text,text) to authenticated,service_role;
