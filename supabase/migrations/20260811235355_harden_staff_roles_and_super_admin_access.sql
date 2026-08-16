create or replace function public.is_staff()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.staff s
    where s.id = auth.uid()
      and s.is_active = true
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.staff s
    where s.id = auth.uid()
      and s.is_active = true
      and s.role in ('admin','super_admin')
  );
$$;

revoke all on function public.is_staff() from anon;
grant execute on function public.is_staff() to authenticated;

revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;
;
