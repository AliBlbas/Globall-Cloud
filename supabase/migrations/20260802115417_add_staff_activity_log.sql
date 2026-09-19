create table if not exists public.staff_activity_log (
  id bigint generated always as identity primary key,
  staff_id uuid references public.staff(id) on delete set null,
  staff_name text,
  action text not null,
  target_id text,
  details text,
  created_at timestamptz not null default now()
);

alter table public.staff_activity_log enable row level security;

drop policy if exists staff_activity_log_select on public.staff_activity_log;
create policy staff_activity_log_select on public.staff_activity_log
  for select to authenticated using (is_staff());

drop policy if exists staff_activity_log_insert on public.staff_activity_log;
create policy staff_activity_log_insert on public.staff_activity_log
  for insert to authenticated with check (is_staff());

grant select, insert on public.staff_activity_log to authenticated;
grant usage, select on sequence public.staff_activity_log_id_seq to authenticated;

create index if not exists staff_activity_log_created_at_idx on public.staff_activity_log(created_at desc);
;
