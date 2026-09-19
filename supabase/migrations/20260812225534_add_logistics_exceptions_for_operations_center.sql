create table if not exists public.logistics_exceptions (
  id bigserial primary key,
  shipment_id text null,
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  title text not null,
  note text,
  status text not null default 'open' check (status in ('open','acknowledged','resolved','closed')),
  created_by uuid not null references auth.users(id) on delete restrict,
  assigned_to uuid null references auth.users(id) on delete set null,
  due_at timestamptz null,
  resolved_at timestamptz null,
  resolved_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists logistics_exceptions_open_idx on public.logistics_exceptions(status,severity,created_at desc);
create index if not exists logistics_exceptions_shipment_idx on public.logistics_exceptions(shipment_id,created_at desc);
alter table public.logistics_exceptions enable row level security;
drop policy if exists logistics_exceptions_staff_all on public.logistics_exceptions;
create policy logistics_exceptions_staff_all on public.logistics_exceptions for all to authenticated using (is_staff()) with check (is_staff() and created_by = auth.uid());
;
