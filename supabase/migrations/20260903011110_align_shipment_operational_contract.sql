set local lock_timeout = '5s';

alter table if exists public.shipments
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists customer_email text,
  add column if not exists notes text,
  add column if not exists origin_key text,
  add column if not exists dest_key text,
  add column if not exists weight_kg numeric,
  add column if not exists volume_cbm numeric,
  add column if not exists items_count integer default 0,
  add column if not exists total_amount numeric default 0,
  add column if not exists paid_amount numeric default 0,
  add column if not exists current_step_index integer default 0,
  add column if not exists step_dates jsonb default '{}'::jsonb,
  add column if not exists eta timestamptz,
  add column if not exists customer_user_id uuid,
  add column if not exists directory_customer_id uuid,
  add column if not exists step_photos jsonb default '{}'::jsonb,
  add column if not exists batch_code text,
  add column if not exists branch text,
  add column if not exists operational_status text,
  add column if not exists priority text default 'normal',
  add column if not exists current_location_label text,
  add column if not exists tracking_updated_at timestamptz,
  add column if not exists service_level text,
  add column if not exists incoterm text,
  add column if not exists origin_hub text,
  add column if not exists transit_hub text,
  add column if not exists destination_hub text,
  add column if not exists state_version integer default 1,
  add column if not exists archived_at timestamptz,
  add column if not exists external_reference text;

update public.shipments
set
  weight_kg = coalesce(weight_kg, actual_weight_kg),
  volume_cbm = coalesce(
    volume_cbm,
    case
      when coalesce(length_cm,0) > 0 and coalesce(width_cm,0) > 0 and coalesce(height_cm,0) > 0
      then (length_cm * width_cm * height_cm) / 1000000
      else null
    end
  ),
  items_count = coalesce(items_count, carton_count, 0),
  total_amount = coalesce(total_amount, 0),
  paid_amount = coalesce(paid_amount, 0),
  current_step_index = coalesce(current_step_index, 0),
  step_dates = coalesce(step_dates, '{}'::jsonb),
  step_photos = coalesce(step_photos, '{}'::jsonb),
  operational_status = coalesce(operational_status, status),
  priority = coalesce(priority, 'normal'),
  tracking_updated_at = coalesce(tracking_updated_at, updated_at),
  state_version = coalesce(state_version, 1);

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname='shipments_customer_user_id_fkey'
      and conrelid='public.shipments'::regclass
  ) then
    alter table public.shipments
      add constraint shipments_customer_user_id_fkey
      foreign key (customer_user_id) references auth.users(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='shipments_directory_customer_id_fkey'
      and conrelid='public.shipments'::regclass
  ) then
    alter table public.shipments
      add constraint shipments_directory_customer_id_fkey
      foreign key (directory_customer_id) references public.customer_directory(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='shipments_priority_check'
      and conrelid='public.shipments'::regclass
  ) then
    alter table public.shipments
      add constraint shipments_priority_check
      check (priority is null or priority in ('critical','high','normal','low'));
  end if;
end $$;

create index if not exists shipments_customer_user_id_idx on public.shipments(customer_user_id);
create index if not exists shipments_directory_customer_id_idx on public.shipments(directory_customer_id);
create index if not exists shipments_external_reference_idx on public.shipments(external_reference);
create index if not exists shipments_batch_code_idx on public.shipments(batch_code);
create index if not exists shipments_branch_idx on public.shipments(branch);
create index if not exists shipments_tracking_id_idx on public.shipments(tracking_id);
