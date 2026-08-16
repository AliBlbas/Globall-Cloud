drop policy if exists "staff permissions admin write" on public.staff_permissions;

create policy "staff permissions admin insert"
on public.staff_permissions
for insert
to authenticated
with check (is_admin());

create policy "staff permissions admin update"
on public.staff_permissions
for update
to authenticated
using (is_admin())
with check (is_admin());

create policy "staff permissions admin delete"
on public.staff_permissions
for delete
to authenticated
using (is_admin());;
