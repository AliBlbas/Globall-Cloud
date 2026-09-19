-- Consolidate overlapping PERMISSIVE policies on messages for the authenticated role.
-- messages_insert_anyone (anon+authenticated, with_check true) is untouched: it already
-- covers everything messages_admin_all granted for INSERT, so no separate insert policy
-- is needed for admins.

drop policy if exists messages_admin_all on public.messages;
drop policy if exists messages_select_staff on public.messages;

create policy messages_select
on public.messages
for select
to authenticated
using (is_admin() or is_staff());

create policy messages_update
on public.messages
for update
to authenticated
using (is_admin())
with check (is_admin());

create policy messages_delete
on public.messages
for delete
to authenticated
using (is_admin());;
