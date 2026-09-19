-- Consolidate overlapping PERMISSIVE policies on staff into one policy per command.
-- staff_select_all (is_staff) already implies broader read access than staff self-read,
-- so it's folded into the new select policy alongside admin and self conditions.

drop policy if exists staff_admin_all on public.staff;
drop policy if exists staff_user_write_own on public.staff;
drop policy if exists staff_select_all on public.staff;

create policy staff_select
on public.staff
for select
to authenticated
using (
  is_admin()
  or (id = (select auth.uid()))
  or is_staff()
);

create policy staff_insert
on public.staff
for insert
to authenticated
with check (
  is_admin()
  or (id = (select auth.uid()))
);

create policy staff_update
on public.staff
for update
to authenticated
using (
  is_admin()
  or (id = (select auth.uid()))
)
with check (
  is_admin()
  or (id = (select auth.uid()))
);

create policy staff_delete
on public.staff
for delete
to authenticated
using (
  is_admin()
  or (id = (select auth.uid()))
);;
