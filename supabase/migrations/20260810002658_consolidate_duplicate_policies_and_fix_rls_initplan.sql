-- Part 1: drop policies that are provably redundant with another policy
-- already on the same table (verified against is_staff()/is_admin()
-- definitions and each policy's own USING/CHECK text -- no change in
-- effective access, just fewer policies for Postgres to evaluate per query).

-- messages: two identical INSERT(true) policies for anon+authenticated
drop policy if exists "public can insert messages" on public.messages;
-- messages: inline "EXISTS(select 1 from staff where staff.id = auth.uid())"
-- is exactly what is_staff() does -- duplicate of messages_select_staff
drop policy if exists "staff can read messages" on public.messages;

-- staff: three identical SELECT (id = auth.uid()) policies, all already
-- covered by staff_user_write_own (ALL, id = auth.uid())
drop policy if exists "staff can read own" on public.staff;
drop policy if exists "staff_select_own" on public.staff;
drop policy if exists "staff_user_select_own" on public.staff;
-- staff: INSERT (id = auth.uid()) already covered by staff_user_write_own (ALL)
drop policy if exists "staff insert own" on public.staff;

-- customer_directory: is_admin() implies is_staff() (an admin has a staff
-- row too), so directory_admin_all is a strict subset of
-- customer_directory_staff_all
drop policy if exists "directory_admin_all" on public.customer_directory;

-- shipments: identical condition already covered by shipments_user_rw_own (ALL)
drop policy if exists "shipments_select_customer_own" on public.shipments;
-- shipments: is_admin() implies is_staff(); the four shipments_*_staff_only /
-- shipments_select_staff_all / shipments_insert_staff policies (all
-- is_staff()-scoped, one per command) already cover everything this ALL
-- policy grants admins
drop policy if exists "shipments_admin_all" on public.shipments;

-- Part 2: fix "Auth RLS Initialization Plan" warnings on the policies that
-- remain -- wrap auth.uid() as (select auth.uid()) so Postgres evaluates it
-- once per statement instead of re-evaluating it for every row.

alter policy "staff_user_write_own" on public.staff
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter policy "shipments_user_rw_own" on public.shipments
  using (customer_user_id = (select auth.uid()))
  with check (customer_user_id = (select auth.uid()));

alter policy "shipments_insert_customer" on public.shipments
  with check (customer_user_id is null or customer_user_id = (select auth.uid()));

alter policy "customer_directory_select_own" on public.customer_directory
  using (auth_user_id = (select auth.uid()) or id = (select auth.uid()));

alter policy "customer_directory_update_own" on public.customer_directory
  using (auth_user_id = (select auth.uid()) or id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()) or id = (select auth.uid()));
;
