alter table public.shipments add column if not exists operational_status text not null default 'pending';
alter table public.shipments add column if not exists priority text not null default 'normal';
alter table public.shipments add column if not exists assigned_staff_id uuid references public.staff(id) on delete set null;
alter table public.shipments add column if not exists archived_at timestamptz;
create index if not exists shipments_operational_status_idx on public.shipments (operational_status);
create index if not exists shipments_priority_idx on public.shipments (priority);
create index if not exists shipments_assigned_staff_idx on public.shipments (assigned_staff_id);
create index if not exists shipments_archived_at_idx on public.shipments (archived_at);
;
