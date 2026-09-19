create table if not exists public.app_settings (
  key text primary key,
  value numeric not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.app_settings enable row level security;

grant select on public.app_settings to anon, authenticated;
grant insert, update on public.app_settings to authenticated;

create policy "app settings public read" on public.app_settings
  for select
  using (key = 'usd_iqd_rate');

create policy "app settings staff write" on public.app_settings
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.staff s
      where s.id = (select auth.uid())
        and s.role in ('admin', 'super_admin')
        and s.is_active = true
    )
  );

create policy "app settings staff update" on public.app_settings
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.staff s
      where s.id = (select auth.uid())
        and s.role in ('admin', 'super_admin')
        and s.is_active = true
    )
  )
  with check (
    exists (
      select 1
      from public.staff s
      where s.id = (select auth.uid())
        and s.role in ('admin', 'super_admin')
        and s.is_active = true
    )
  );

insert into public.app_settings (key, value)
values ('usd_iqd_rate', 1500)
on conflict (key) do nothing;
;
