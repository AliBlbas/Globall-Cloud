alter table public.shipments
  add column if not exists tracking_id text,
  add column if not exists customer_user_id uuid,
  add column if not exists customer_phone text,
  add column if not exists customer_email text,
  add column if not exists notes text,
  add column if not exists origin_key text,
  add column if not exists dest_key text,
  add column if not exists route text,
  add column if not exists type text,
  add column if not exists customer_gc_code text,
  add column if not exists directory_customer_id uuid,
  add column if not exists branch text,
  add column if not exists batch_code text,
  add column if not exists total_amount numeric not null default 0,
  add column if not exists paid_amount numeric not null default 0,
  add column if not exists current_step_index integer not null default 0,
  add column if not exists step_dates jsonb not null default '{}'::jsonb,
  add column if not exists eta timestamptz,
  add column if not exists items_count integer,
  add column if not exists volume_cbm numeric,
  add column if not exists transport_mode text,
  add column if not exists origin_warehouse text,
  add column if not exists destination_warehouse text,
  add column if not exists cargo_description text,
  add column if not exists carton_count integer,
  add column if not exists actual_weight_kg numeric,
  add column if not exists length_cm numeric,
  add column if not exists width_cm numeric,
  add column if not exists height_cm numeric,
  add column if not exists volumetric_weight_kg numeric,
  add column if not exists chargeable_weight_kg numeric,
  add column if not exists step_photos jsonb not null default '[]'::jsonb,
  add column if not exists current_location_label text,
  add column if not exists tracking_updated_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists currency text not null default 'USD',
  add column if not exists external_reference text,
  add column if not exists priority text default 'normal',
  add column if not exists assigned_staff_id uuid,
  add column if not exists operational_status text;

update public.shipments
set tracking_id = coalesce(tracking_id, tracking_number),
    origin_key = coalesce(origin_key, lower(origin)),
    dest_key = coalesce(dest_key, lower(destination)),
    origin_warehouse = coalesce(origin_warehouse, origin),
    destination_warehouse = coalesce(destination_warehouse, destination),
    actual_weight_kg = coalesce(actual_weight_kg, weight_kg),
    chargeable_weight_kg = coalesce(chargeable_weight_kg, weight_kg),
    current_location_label = coalesce(current_location_label, destination),
    tracking_updated_at = coalesce(tracking_updated_at, created_at)
where true;

create unique index if not exists shipments_tracking_id_unique_idx
  on public.shipments (tracking_id) where tracking_id is not null;
create index if not exists shipments_customer_gc_code_idx on public.shipments(customer_gc_code);
create index if not exists shipments_directory_customer_id_idx on public.shipments(directory_customer_id);
create index if not exists shipments_operational_status_idx on public.shipments(operational_status);
create index if not exists shipments_eta_idx on public.shipments(eta);

create or replace function public.sync_shipment_contract_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare c record;
begin
  if new.tracking_id is null or btrim(new.tracking_id) = '' then new.tracking_id := new.tracking_number; end if;
  if new.tracking_number is null or btrim(new.tracking_number) = '' then new.tracking_number := new.tracking_id; end if;
  if new.transport_mode is null and new.type is not null then new.transport_mode := lower(new.type); end if;
  if new.type is null and new.transport_mode is not null then new.type := lower(new.transport_mode); end if;
  if new.directory_customer_id is not null then
    select id,gc_code,code,name,phone,email,auth_user_id into c from public.customer_directory where id = new.directory_customer_id limit 1;
    if c.id is not null then
      new.customer_gc_code := coalesce(new.customer_gc_code,c.gc_code,c.code);
      new.customer_user_id := coalesce(new.customer_user_id,c.auth_user_id);
      new.customer_name := coalesce(nullif(new.customer_name,''),c.name);
      new.customer_phone := coalesce(new.customer_phone,c.phone);
      new.customer_email := coalesce(new.customer_email,c.email);
    end if;
  end if;
  new.tracking_updated_at := coalesce(new.tracking_updated_at, now());
  return new;
end;
$$;
revoke execute on function public.sync_shipment_contract_identity() from public, anon, authenticated;
drop trigger if exists sync_shipment_contract_identity on public.shipments;
create trigger sync_shipment_contract_identity before insert or update on public.shipments for each row execute function public.sync_shipment_contract_identity();

alter table public.shipments enable row level security;
drop policy if exists "Public Read Shipments" on public.shipments;
drop policy if exists shipments_staff_select on public.shipments;
drop policy if exists shipments_customer_select on public.shipments;
create policy shipments_staff_select on public.shipments for select to authenticated using (is_staff());
create policy shipments_customer_select on public.shipments for select to authenticated using (customer_user_id = (select auth.uid()));
