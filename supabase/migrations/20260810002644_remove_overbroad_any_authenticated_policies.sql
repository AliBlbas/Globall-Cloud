-- SECURITY FIX: these three policies grant ALL (select/insert/update/delete)
-- to role `authenticated` with no condition (qual/check = true). That means
-- any logged-in user -- customers included, not just staff -- currently has
-- unrestricted read/write on these tables. Each table already has narrower
-- policies that cover legitimate staff/admin access, so removing the blanket
-- grant does not remove any intended capability except where noted below.

-- staff: staff_admin_all (admins) + staff_user_write_own (own row) already
-- cover legitimate access.
drop policy if exists "staff_all_staff" on public.staff;

-- staff_activity_log: staff_activity_log_select / staff_activity_log_insert
-- (both is_staff()) already cover legitimate access. Losing UPDATE/DELETE
-- for everyone is desirable for an activity log (append-only).
drop policy if exists "allow_all_auth" on public.staff_activity_log;

-- warehouse_receipts: staff_all_receipts was the ONLY policy granting UPDATE,
-- so add a narrow staff-only UPDATE policy to replace that legitimate part
-- before dropping the blanket grant.
create policy warehouse_receipts_staff_update
  on public.warehouse_receipts
  for update
  to authenticated
  using (is_staff())
  with check (is_staff());

drop policy if exists "staff_all_receipts" on public.warehouse_receipts;
;
