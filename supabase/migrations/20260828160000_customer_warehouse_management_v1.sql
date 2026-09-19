create extension if not exists pgcrypto;

create table if not exists public.warehouse_locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  country_code text not null check (country_code in ('CN','US','AE','IQ')),
  city text not null,
  name text not null,
  address_line text not null,
  contact_name text,
  contact_phone text,
  postal_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_warehouse_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_directory(id) on delete cascade,
  warehouse_id uuid not null references public.warehouse_locations(id),
  label text,
  recipient_name text,
  recipient_phone text,
  instructions text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(customer_id, warehouse_id)
);

alter table public.customer_directory add column if not exists normalized_gc_code text;
alter table public.customer_directory add column if not exists whatsapp_phone text;
alter table public.customer_directory add column if not exists preferred_language text not null default 'ckb';
alter table public.customer_directory add column if not exists preferred_contact_channel text not null default 'whatsapp';
alter table public.customer_directory add column if not exists customer_status text not null default 'active';
alter table public.customer_directory add column if not exists last_shipment_at timestamptz;
alter table public.customer_directory add column if not exists total_shipments integer not null default 0;
alter table public.customer_directory add column if not exists total_spend numeric not null default 0;

update public.customer_directory
set normalized_gc_code = upper(trim(coalesce(gc_code, code)))
where normalized_gc_code is null and coalesce(gc_code, code) is not null;

create unique index if not exists customer_directory_normalized_gc_code_uq
on public.customer_directory(normalized_gc_code)
where normalized_gc_code is not null;

create index if not exists customer_directory_phone_idx on public.customer_directory(phone);
create index if not exists customer_directory_name_idx on public.customer_directory using gin (to_tsvector('simple', coalesce(name,'')));
create index if not exists customer_warehouse_addresses_customer_idx on public.customer_warehouse_addresses(customer_id);
create index if not exists customer_warehouse_addresses_warehouse_idx on public.customer_warehouse_addresses(warehouse_id);

insert into public.warehouse_locations (code,country_code,city,name,address_line,is_active)
values
 ('CN-GZ','CN','Guangzhou','Global Cloud China Warehouse','Guangzhou, China',true),
 ('AE-DXB','AE','Dubai','Global Cloud UAE Warehouse','Dubai, United Arab Emirates',true),
 ('US-LAX','US','Los Angeles','Global Cloud USA Warehouse','Los Angeles, USA',true),
 ('IQ-EBL','IQ','Erbil','Global Cloud Erbil Office / Warehouse','Erbil, Kurdistan Region, Iraq',true)
on conflict (code) do update set name=excluded.name,address_line=excluded.address_line,is_active=true,updated_at=now();

alter table public.warehouse_locations enable row level security;
alter table public.customer_warehouse_addresses enable row level security;

drop policy if exists warehouse_locations_public_read on public.warehouse_locations;
create policy warehouse_locations_public_read on public.warehouse_locations for select to anon, authenticated using (is_active = true);

drop policy if exists customer_warehouse_addresses_customer_read on public.customer_warehouse_addresses;
create policy customer_warehouse_addresses_customer_read on public.customer_warehouse_addresses for select to authenticated using (exists (select 1 from public.customer_directory cd where cd.id = customer_warehouse_addresses.customer_id and cd.auth_user_id = auth.uid()));

drop policy if exists customer_warehouse_addresses_staff_read on public.customer_warehouse_addresses;
create policy customer_warehouse_addresses_staff_read on public.customer_warehouse_addresses for select to authenticated using (exists (select 1 from public.staff s where s.id = auth.uid() and s.is_active = true));

create or replace function public.normalize_customer_gc_code()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.gc_code is null or btrim(new.gc_code) = '' then
    if new.code is not null and btrim(new.code) <> '' then new.gc_code := upper(btrim(new.code)); end if;
  else
    new.gc_code := upper(btrim(new.gc_code));
  end if;
  new.normalized_gc_code := new.gc_code;
  return new;
end;
$$;

drop trigger if exists trg_normalize_customer_gc_code on public.customer_directory;
create trigger trg_normalize_customer_gc_code before insert or update of code,gc_code on public.customer_directory for each row execute function public.normalize_customer_gc_code();

create or replace function public.touch_customer_warehouse_record()
returns trigger language plpgsql
as $$ begin new.updated_at := now(); return new; end; $$;

drop trigger if exists trg_touch_customer_warehouse_address on public.customer_warehouse_addresses;
create trigger trg_touch_customer_warehouse_address before update on public.customer_warehouse_addresses for each row execute function public.touch_customer_warehouse_record();

drop trigger if exists trg_touch_warehouse_location on public.warehouse_locations;
create trigger trg_touch_warehouse_location before update on public.warehouse_locations for each row execute function public.touch_customer_warehouse_record();

create or replace function public.next_customer_gc_code()
returns text language plpgsql security definer set search_path = public
as $$
declare n bigint;
begin
  select coalesce(max((regexp_match(upper(coalesce(normalized_gc_code,gc_code,code)), '^GC-([0-9]+)$'))[1]::bigint),0) + 1 into n
  from public.customer_directory;
  return 'GC-' || n::text;
end;
$$;
