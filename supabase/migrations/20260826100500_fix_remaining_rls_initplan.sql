-- Preserve existing authorization semantics while allowing PostgreSQL to evaluate
-- stable auth helpers once per statement instead of once per row.

alter policy customer_notification_preferences_insert
  on public.customer_notification_preferences
  with check ((customer_user_id = (select auth.uid())) or (select is_staff()));

alter policy customer_notification_preferences_select
  on public.customer_notification_preferences
  using ((customer_user_id = (select auth.uid())) or (select is_staff()));

alter policy customer_notification_preferences_update
  on public.customer_notification_preferences
  using ((customer_user_id = (select auth.uid())) or (select is_staff()))
  with check ((customer_user_id = (select auth.uid())) or (select is_staff()));

alter policy notification_outbox_customer_select
  on public.notification_outbox
  using ((select is_staff()) or ((customer_user_id = (select auth.uid())) and (channel = 'in_app')));

alter policy payment_sessions_staff_select
  on public.payment_sessions
  using ((select is_staff()) or (customer_user_id = (select auth.uid())));

alter policy quote_requests_customer_insert
  on public.quote_requests
  with check ((select is_staff()) or ((customer_user_id = (select auth.uid())) and (status = 'pending') and (quoted_amount is null) and (quoted_by is null) and (accepted_at is null)));

alter policy shipment_documents_select
  on public.shipment_documents
  using ((document_status <> 'archived') and ((select is_staff()) or (customer_user_id = (select auth.uid())) or is_public));

alter policy shipment_route_legs_select
  on public.shipment_route_legs
  using ((select is_staff()) or exists (
    select 1 from public.shipments s
    where s.id = shipment_route_legs.shipment_id
      and s.customer_user_id = (select auth.uid())
  ));

alter policy staff_permission_grants_admin_delete
  on public.staff_permission_grants
  using ((select private.is_admin()));

alter policy staff_permission_grants_admin_insert
  on public.staff_permission_grants
  with check ((select private.is_admin()) and (granted_by = (select auth.uid())));

alter policy staff_permission_grants_admin_update
  on public.staff_permission_grants
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

alter policy staff_permission_grants_self_or_admin_select
  on public.staff_permission_grants
  using ((staff_id = (select auth.uid())) or (select private.is_admin()));

alter policy staff_profiles_admin_delete
  on public.staff_profiles
  using ((select private.is_admin()));

alter policy staff_profiles_admin_insert
  on public.staff_profiles
  with check ((select private.is_admin()));

alter policy staff_profiles_self_or_admin_select
  on public.staff_profiles
  using ((staff_id = (select auth.uid())) or (select private.is_admin()));

alter policy staff_profiles_self_update
  on public.staff_profiles
  using ((staff_id = (select auth.uid())) and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
  ))
  with check (staff_id = (select auth.uid()));

alter policy "staff tasks create as self"
  on public.staff_tasks
  with check ((created_by = (select auth.uid())) and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and coalesce(s.is_active, s.active) = true
  ));

alter policy "staff tasks delete admin"
  on public.staff_tasks
  using (exists (
    select 1 from public.staff s
    where s.id = (select auth.uid())
      and coalesce(s.is_active, s.active) = true
      and s.role = any (array['admin', 'super_admin'])
  ));

alter policy "staff tasks read own branch"
  on public.staff_tasks
  using (exists (
    select 1 from public.staff s
    where s.id = (select auth.uid())
      and coalesce(s.is_active, s.active) = true
      and (
        s.role = any (array['admin', 'super_admin'])
        or staff_tasks.assignee_id = (select auth.uid())
        or staff_tasks.created_by = (select auth.uid())
        or staff_tasks.branch = coalesce(s.branch, 'all')
        or staff_tasks.branch = 'all'
      )
  ));

alter policy "staff tasks update assigned"
  on public.staff_tasks
  using (exists (
    select 1 from public.staff s
    where s.id = (select auth.uid())
      and coalesce(s.is_active, s.active) = true
      and (
        s.role = any (array['admin', 'super_admin'])
        or staff_tasks.assignee_id = (select auth.uid())
        or staff_tasks.created_by = (select auth.uid())
      )
  ))
  with check (exists (
    select 1 from public.staff s
    where s.id = (select auth.uid())
      and coalesce(s.is_active, s.active) = true
      and (
        s.role = any (array['admin', 'super_admin'])
        or staff_tasks.assignee_id = (select auth.uid())
        or staff_tasks.created_by = (select auth.uid())
      )
  ));

alter policy warehouse_movements_select
  on public.warehouse_movements
  using ((select is_staff()) or exists (
    select 1 from public.shipments s
    where s.id = warehouse_movements.shipment_id
      and s.customer_user_id = (select auth.uid())
  ));
