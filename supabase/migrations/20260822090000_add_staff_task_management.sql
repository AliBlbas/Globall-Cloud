create table if not exists public.staff_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 180),
  description text,
  status text not null default 'todo' check (status in ('todo','in_progress','blocked','review','done','cancelled')),
  priority text not null default 'normal' check (priority in ('critical','high','normal','low')),
  branch text not null default 'all',
  assignee_id uuid references public.staff(id) on delete set null,
  created_by uuid not null references public.staff(id),
  entity_type text check (entity_type is null or entity_type in ('shipment','customer','warehouse_receipt','delivery_assignment','payment','general')),
  entity_id text,
  due_at timestamptz,
  blocked_reason text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_tasks_blocked_reason_check check (status <> 'blocked' or char_length(trim(coalesce(blocked_reason,''))) >= 3),
  constraint staff_tasks_completed_at_check check (status <> 'done' or completed_at is not null)
);

create index if not exists staff_tasks_queue_idx on public.staff_tasks(status, priority, due_at asc nulls last, created_at desc);
create index if not exists staff_tasks_assignee_idx on public.staff_tasks(assignee_id, status, due_at asc nulls last);
create index if not exists staff_tasks_branch_idx on public.staff_tasks(branch, status, due_at asc nulls last);
create index if not exists staff_tasks_entity_idx on public.staff_tasks(entity_type, entity_id) where entity_id is not null;

alter table public.staff_tasks enable row level security;

create policy "staff tasks read own branch" on public.staff_tasks for select to authenticated
using (
  exists (
    select 1 from public.staff s
    where s.id = auth.uid() and coalesce(s.is_active, s.active) = true
      and (s.role in ('admin','super_admin') or staff_tasks.assignee_id = auth.uid() or staff_tasks.created_by = auth.uid() or staff_tasks.branch = coalesce(s.branch,'all') or staff_tasks.branch = 'all')
  )
);

create policy "staff tasks create as self" on public.staff_tasks for insert to authenticated
with check (
  created_by = auth.uid() and exists (
    select 1 from public.staff s where s.id = auth.uid() and coalesce(s.is_active, s.active) = true
  )
);

create policy "staff tasks update assigned" on public.staff_tasks for update to authenticated
using (
  exists (
    select 1 from public.staff s where s.id = auth.uid() and coalesce(s.is_active, s.active) = true
      and (s.role in ('admin','super_admin') or staff_tasks.assignee_id = auth.uid() or staff_tasks.created_by = auth.uid())
  )
)
with check (
  exists (
    select 1 from public.staff s where s.id = auth.uid() and coalesce(s.is_active, s.active) = true
      and (s.role in ('admin','super_admin') or staff_tasks.assignee_id = auth.uid() or staff_tasks.created_by = auth.uid())
  )
);

create policy "staff tasks delete admin" on public.staff_tasks for delete to authenticated
using (exists (select 1 from public.staff s where s.id = auth.uid() and coalesce(s.is_active, s.active) = true and s.role in ('admin','super_admin')));

create trigger set_updated_at_staff_tasks before update on public.staff_tasks
for each row execute function private.set_updated_at();

comment on table public.staff_tasks is 'Role-aware operational task queue for Staff OS; task mutations must be written to staff_activity_log by the authenticated application service.';
comment on column public.staff_tasks.due_at is 'UTC deadline used for SLA and overdue queue calculations.';
