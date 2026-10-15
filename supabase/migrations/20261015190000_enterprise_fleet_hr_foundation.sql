-- Globall Cloud Enterprise Logistics foundation (2027 roadmap increment).
-- Additive only: fleet and HR foundations. Existing shipment, delivery, finance,
-- customer, warehouse, payment, notification, and audit tables remain authoritative.
-- This migration is designed for review via a feature branch; do not apply to production
-- until the Edge Function/UI workflows and release checks are ready.

create extension if not exists pgcrypto;

-- Fleet registry. Drivers remain authenticated staff with role driver/delivery.
create table if not exists public.fleet_vehicles (
  id uuid primary key default gen_random_uuid(),
  vehicle_code text not null unique,
  plate_number text not null,
  vehicle_type text not null check (vehicle_type in ('car','van','truck')),
  branch text not null check (branch in ('china','dubai','erbil')),
  make text,
  model text,
  model_year integer check (model_year is null or model_year between 1980 and 2100),
  vin text,
  fuel_type text check (fuel_type is null or fuel_type in ('petrol','diesel','hybrid','electric','other')),
  capacity_kg numeric(12,3) check (capacity_kg is null or capacity_kg > 0),
  odometer_km numeric(14,2) not null default 0 check (odometer_km >= 0),
  status text not null default 'active'
    check (status in ('active','inactive','maintenance','retired')),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.staff(id) on delete set null,
  updated_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists fleet_vehicles_plate_number_ci_idx
  on public.fleet_vehicles (lower(trim(plate_number)));
create index if not exists fleet_vehicles_branch_status_idx
  on public.fleet_vehicles(branch, status, vehicle_type);

-- Link current delivery assignments to a vehicle without rewriting prior records.
alter table public.delivery_assignments
  add column if not exists vehicle_id uuid
    references public.fleet_vehicles(id) on delete set null;
create index if not exists delivery_assignments_vehicle_idx
  on public.delivery_assignments(vehicle_id, created_at desc)
  where vehicle_id is not null;

-- Append-only fleet event/telematics ledger; GPS is private to authenticated operations.
create table if not exists public.fleet_vehicle_events (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.fleet_vehicles(id) on delete restrict,
  event_type text not null check (event_type in (
    'location_ping','route_started','route_completed','inspection',
    'maintenance_started','maintenance_completed','fuel_recorded','status_changed'
  )),
  event_at timestamptz not null default now(),
  driver_staff_id uuid references public.staff(id) on delete set null,
  delivery_assignment_id uuid references public.delivery_assignments(id) on delete set null,
  shipment_id text references public.shipments(id) on delete set null,
  latitude numeric(10,7) check (latitude is null or latitude between -90 and 90),
  longitude numeric(10,7) check (longitude is null or longitude between -180 and 180),
  odometer_km numeric(14,2) check (odometer_km is null or odometer_km >= 0),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null))
);
create index if not exists fleet_vehicle_events_vehicle_time_idx
  on public.fleet_vehicle_events(vehicle_id, event_at desc);
create index if not exists fleet_vehicle_events_assignment_idx
  on public.fleet_vehicle_events(delivery_assignment_id, event_at desc)
  where delivery_assignment_id is not null;
create index if not exists fleet_vehicle_events_location_idx
  on public.fleet_vehicle_events(event_at desc)
  where latitude is not null;

-- Maintenance history and cost capture.
create table if not exists public.fleet_maintenance_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.fleet_vehicles(id) on delete restrict,
  maintenance_type text not null check (maintenance_type in (
    'scheduled','repair','inspection','tyres','oil','other'
  )),
  status text not null default 'planned'
    check (status in ('planned','in_progress','completed','cancelled')),
  description text not null,
  provider_name text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  odometer_km numeric(14,2) check (odometer_km is null or odometer_km >= 0),
  cost_amount numeric(14,2) not null default 0 check (cost_amount >= 0),
  cost_currency text not null default 'IQD' check (cost_currency in ('IQD','USD','AED','CNY')),
  invoice_reference text,
  notes text,
  created_by uuid references public.staff(id) on delete set null,
  updated_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (completed_at is null or scheduled_at is null or completed_at >= scheduled_at)
);
create index if not exists fleet_maintenance_vehicle_date_idx
  on public.fleet_maintenance_records(vehicle_id, coalesce(scheduled_at, created_at) desc);
create index if not exists fleet_maintenance_status_idx
  on public.fleet_maintenance_records(status, scheduled_at);

-- Fuel events are separate from maintenance so costs can be reported independently.
create table if not exists public.fleet_fuel_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.fleet_vehicles(id) on delete restrict,
  logged_at timestamptz not null default now(),
  liters numeric(12,3) not null check (liters > 0),
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'IQD' check (currency in ('IQD','USD','AED','CNY')),
  odometer_km numeric(14,2) check (odometer_km is null or odometer_km >= 0),
  station_name text,
  receipt_reference text,
  note text,
  recorded_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists fleet_fuel_vehicle_time_idx
  on public.fleet_fuel_logs(vehicle_id, logged_at desc);
create index if not exists fleet_fuel_cost_reporting_idx
  on public.fleet_fuel_logs(currency, logged_at desc);

-- HR: attendance uses a database-side RPC for trustworthy timestamps.
create table if not exists public.hr_attendance_records (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id) on delete restrict,
  work_date date not null,
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  check_in_source text not null default 'app'
    check (check_in_source in ('app','staff_console','admin_correction','device')),
  check_out_source text
    check (check_out_source is null or check_out_source in ('app','staff_console','admin_correction','device')),
  check_in_note text,
  check_out_note text,
  corrected_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out_at is null or check_out_at >= check_in_at)
);
create index if not exists hr_attendance_staff_date_idx
  on public.hr_attendance_records(staff_id, work_date desc);
create index if not exists hr_attendance_date_idx
  on public.hr_attendance_records(work_date desc);
create unique index if not exists hr_attendance_one_open_shift_idx
  on public.hr_attendance_records(staff_id) where check_out_at is null;

-- Leave requests: staff may create/read their own requests; management records decisions.
create table if not exists public.hr_leave_requests (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id) on delete restrict,
  leave_type text not null check (leave_type in ('annual','sick','unpaid','emergency','other')),
  starts_on date not null,
  ends_on date not null,
  reason text,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','cancelled')),
  reviewed_by uuid references public.staff(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  check ((status = 'pending' and reviewed_at is null) or status <> 'pending')
);
create index if not exists hr_leave_staff_dates_idx
  on public.hr_leave_requests(staff_id, starts_on desc);
create index if not exists hr_leave_review_queue_idx
  on public.hr_leave_requests(status, created_at)
  where status = 'pending';

-- Payroll is private by default. Net pay is computed in the database, not trusted from UI.
create table if not exists public.hr_payroll_periods (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check (status in ('draft','approved','paid','closed')),
  approved_by uuid references public.staff(id) on delete set null,
  approved_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_start, period_end),
  check (period_end >= period_start),
  check (status not in ('approved','paid','closed') or approved_at is not null),
  check (status <> 'paid' or paid_at is not null)
);
create table if not exists public.hr_payroll_entries (
  id uuid primary key default gen_random_uuid(),
  payroll_period_id uuid not null references public.hr_payroll_periods(id) on delete restrict,
  staff_id uuid not null references public.staff(id) on delete restrict,
  base_salary numeric(14,2) not null default 0 check (base_salary >= 0),
  allowances numeric(14,2) not null default 0 check (allowances >= 0),
  deductions numeric(14,2) not null default 0 check (deductions >= 0),
  net_pay numeric(14,2) generated always as (base_salary + allowances - deductions) stored,
  currency text not null default 'IQD' check (currency in ('IQD','USD','AED','CNY')),
  payment_reference text,
  note text,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payroll_period_id, staff_id),
  check (deductions <= base_salary + allowances)
);
create index if not exists hr_payroll_period_status_idx
  on public.hr_payroll_periods(period_start desc, status);
create index if not exists hr_payroll_entries_staff_idx
  on public.hr_payroll_entries(staff_id, payroll_period_id);

-- Shared updated_at trigger with a fixed search_path.
create or replace function public.gc_enterprise_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists fleet_vehicles_touch_updated_at on public.fleet_vehicles;
create trigger fleet_vehicles_touch_updated_at
before update on public.fleet_vehicles
for each row execute function public.gc_enterprise_touch_updated_at();

drop trigger if exists fleet_maintenance_touch_updated_at on public.fleet_maintenance_records;
create trigger fleet_maintenance_touch_updated_at
before update on public.fleet_maintenance_records
for each row execute function public.gc_enterprise_touch_updated_at();

drop trigger if exists hr_attendance_touch_updated_at on public.hr_attendance_records;
create trigger hr_attendance_touch_updated_at
before update on public.hr_attendance_records
for each row execute function public.gc_enterprise_touch_updated_at();

drop trigger if exists hr_leave_requests_touch_updated_at on public.hr_leave_requests;
create trigger hr_leave_requests_touch_updated_at
before update on public.hr_leave_requests
for each row execute function public.gc_enterprise_touch_updated_at();

drop trigger if exists hr_payroll_periods_touch_updated_at on public.hr_payroll_periods;
create trigger hr_payroll_periods_touch_updated_at
before update on public.hr_payroll_periods
for each row execute function public.gc_enterprise_touch_updated_at();

drop trigger if exists hr_payroll_entries_touch_updated_at on public.hr_payroll_entries;
create trigger hr_payroll_entries_touch_updated_at
before update on public.hr_payroll_entries
for each row execute function public.gc_enterprise_touch_updated_at();

-- RLS: no public/anonymous access. Policies check both a real authenticated session
-- and the canonical public.staff identity/role. Existing data/tables are untouched.
alter table public.fleet_vehicles enable row level security;
alter table public.fleet_vehicle_events enable row level security;
alter table public.fleet_maintenance_records enable row level security;
alter table public.fleet_fuel_logs enable row level security;
alter table public.hr_attendance_records enable row level security;
alter table public.hr_leave_requests enable row level security;
alter table public.hr_payroll_periods enable row level security;
alter table public.hr_payroll_entries enable row level security;

create policy fleet_vehicles_staff_read on public.fleet_vehicles
for select to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin','operations','warehouse','warehouse_china',
                     'warehouse_uae','warehouse_erbil','driver','delivery')
  )
);
create policy fleet_vehicles_ops_insert on public.fleet_vehicles
for insert to authenticated
with check (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin','operations')
  )
);
create policy fleet_vehicles_ops_update on public.fleet_vehicles
for update to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin','operations')
  )
)
with check (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin','operations')
  )
);
create policy fleet_vehicles_admin_delete on public.fleet_vehicles
for delete to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin')
  )
);

create policy fleet_events_staff_read on public.fleet_vehicle_events
for select to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin','operations','driver','delivery')
  )
);
create policy fleet_events_insert on public.fleet_vehicle_events
for insert to authenticated
with check (
  (select private.is_real_authenticated_session())
  and (
    exists (
      select 1 from public.staff s
      where s.id = (select auth.uid()) and s.is_active = true
        and s.role in ('admin','super_admin','operations')
    )
    or exists (
      select 1 from public.staff s
      where s.id = (select auth.uid()) and s.is_active = true
        and s.role in ('driver','delivery') and driver_staff_id = s.id
    )
  )
);
-- Event records intentionally have no UPDATE/DELETE policies (append-only ledger).

create policy fleet_maintenance_staff_read on public.fleet_maintenance_records
for select to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin','operations','accountant','finance')
  )
);
create policy fleet_maintenance_ops_insert on public.fleet_maintenance_records
for insert to authenticated
with check (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin','operations')
  )
);
create policy fleet_maintenance_ops_update on public.fleet_maintenance_records
for update to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin','operations')
  )
)
with check (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin','operations')
  )
);

create policy fleet_fuel_finance_read on public.fleet_fuel_logs
for select to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin','operations','accountant','finance')
  )
);
create policy fleet_fuel_ops_insert on public.fleet_fuel_logs
for insert to authenticated
with check (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin','operations','accountant','finance')
  )
);
create policy fleet_fuel_finance_update on public.fleet_fuel_logs
for update to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin','accountant','finance')
  )
)
with check (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin','accountant','finance')
  )
);
create policy fleet_fuel_admin_delete on public.fleet_fuel_logs
for delete to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin')
  )
);

create policy hr_attendance_read_own_or_admin on public.hr_attendance_records
for select to authenticated
using (
  (select private.is_real_authenticated_session())
  and (
    staff_id = (select auth.uid())
    or exists (
      select 1 from public.staff s
      where s.id = (select auth.uid()) and s.is_active = true
        and s.role in ('admin','super_admin')
    )
  )
);
-- Staff cannot spoof timestamps through direct table writes: use the RPC below.
create policy hr_attendance_admin_manage on public.hr_attendance_records
for all to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin')
  )
)
with check (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin')
  )
);

create policy hr_leave_read_own_or_admin on public.hr_leave_requests
for select to authenticated
using (
  (select private.is_real_authenticated_session())
  and (
    staff_id = (select auth.uid())
    or exists (
      select 1 from public.staff s
      where s.id = (select auth.uid()) and s.is_active = true
        and s.role in ('admin','super_admin')
    )
  )
);
create policy hr_leave_request_own_insert on public.hr_leave_requests
for insert to authenticated
with check (
  (select private.is_real_authenticated_session())
  and staff_id = (select auth.uid())
  and status = 'pending'
  and reviewed_by is null and reviewed_at is null
);
create policy hr_leave_admin_update on public.hr_leave_requests
for update to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin')
  )
)
with check (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin')
  )
);

create policy hr_payroll_period_read_finance on public.hr_payroll_periods
for select to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin','accountant','finance')
  )
);
create policy hr_payroll_period_admin_manage on public.hr_payroll_periods
for all to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin')
  )
)
with check (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin')
  )
);

create policy hr_payroll_entries_read_finance on public.hr_payroll_entries
for select to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin','accountant','finance')
  )
);
create policy hr_payroll_entries_admin_manage on public.hr_payroll_entries
for all to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin')
  )
)
with check (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin')
  )
);

-- Server-time attendance RPC. The authenticated employee can only clock themselves in/out.
create or replace function public.gc_record_attendance(p_action text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_staff_id uuid := auth.uid();
  v_action text := lower(trim(coalesce(p_action, '')));
  v_attendance_id uuid;
  v_now timestamptz := now();
  v_today date := (now() at time zone 'Asia/Baghdad')::date;
begin
  if not coalesce(private.is_real_authenticated_session(), false) or v_staff_id is null then
    raise exception 'A real authenticated session is required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.staff s
    where s.id = v_staff_id and s.is_active = true
  ) then
    raise exception 'Active staff record not found' using errcode = '42501';
  end if;

  if v_action = 'check_in' then
    if exists (
      select 1 from public.hr_attendance_records a
      where a.staff_id = v_staff_id and a.check_out_at is null
    ) then
      raise exception 'An open attendance session already exists' using errcode = '23505';
    end if;

    insert into public.hr_attendance_records(staff_id, work_date, check_in_at, check_in_source)
    values (v_staff_id, v_today, v_now, 'app')
    returning id into v_attendance_id;
    return v_attendance_id;
  elsif v_action = 'check_out' then
    update public.hr_attendance_records a
      set check_out_at = v_now, check_out_source = 'app'
      where a.staff_id = v_staff_id and a.check_out_at is null
      returning a.id into v_attendance_id;
    if v_attendance_id is null then
      raise exception 'No open attendance session exists' using errcode = 'P0002';
    end if;
    return v_attendance_id;
  else
    raise exception 'Unsupported attendance action' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.gc_record_attendance(text) from public, anon;
grant execute on function public.gc_record_attendance(text) to authenticated;
revoke all on function public.gc_enterprise_touch_updated_at() from public, anon, authenticated;

-- Explicit table grants; row-level policies remain the authorization boundary.
-- Browser clients do not access these tables directly. The authenticated
-- fleet-hr-admin Edge Function performs actor/role/branch checks before using
-- its server-only service client; this prevents service-role bypass from becoming
-- a client-side authorization bypass.
revoke all on public.fleet_vehicles, public.fleet_vehicle_events,
  public.fleet_maintenance_records, public.fleet_fuel_logs,
  public.hr_attendance_records, public.hr_leave_requests,
  public.hr_payroll_periods, public.hr_payroll_entries from anon, public, authenticated;
grant select, insert, update, delete on public.fleet_vehicles,
  public.fleet_vehicle_events, public.fleet_maintenance_records,
  public.fleet_fuel_logs, public.hr_attendance_records,
  public.hr_leave_requests, public.hr_payroll_periods,
  public.hr_payroll_entries to service_role;
