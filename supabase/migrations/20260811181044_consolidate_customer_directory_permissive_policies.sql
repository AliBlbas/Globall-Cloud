-- Consolidate overlapping PERMISSIVE policies on customer_directory into one policy per command.
-- Net effect on access is unchanged: each new policy's condition is the OR of every
-- condition that previously applied to that command (staff_all + the relevant "own" policy).

drop policy if exists customer_directory_staff_all on public.customer_directory;
drop policy if exists customer_directory_select_own on public.customer_directory;
drop policy if exists customer_directory_update_own on public.customer_directory;

create policy customer_directory_select
on public.customer_directory
for select
to authenticated
using (
  is_staff()
  or (auth_user_id = (select auth.uid()))
  or (id = (select auth.uid()))
);

create policy customer_directory_insert
on public.customer_directory
for insert
to authenticated
with check (is_staff());

create policy customer_directory_update
on public.customer_directory
for update
to authenticated
using (
  is_staff()
  or (auth_user_id = (select auth.uid()))
  or (id = (select auth.uid()))
)
with check (
  is_staff()
  or (auth_user_id = (select auth.uid()))
  or (id = (select auth.uid()))
);

create policy customer_directory_delete
on public.customer_directory
for delete
to authenticated
using (is_staff());;
