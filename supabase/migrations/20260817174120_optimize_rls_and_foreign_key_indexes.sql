create index if not exists consolidation_batches_created_by_idx on public.consolidation_batches(created_by);
create index if not exists consolidation_batches_updated_by_idx on public.consolidation_batches(updated_by);
create index if not exists consolidation_items_created_by_idx on public.consolidation_items(created_by);
create index if not exists notification_outbox_shipment_id_idx on public.notification_outbox(shipment_id);
create index if not exists payment_transactions_created_by_idx on public.payment_transactions(created_by);
create index if not exists reconciliation_runs_started_by_idx on public.reconciliation_runs(started_by);
create index if not exists shipment_customs_cases_created_by_idx on public.shipment_customs_cases(created_by);
create index if not exists shipment_customs_cases_updated_by_idx on public.shipment_customs_cases(updated_by);
create index if not exists shipment_invoices_created_by_idx on public.shipment_invoices(created_by);
create index if not exists shipment_invoices_customer_user_id_idx on public.shipment_invoices(customer_user_id);
create index if not exists shipment_invoices_updated_by_idx on public.shipment_invoices(updated_by);
create index if not exists shipment_packages_created_by_idx on public.shipment_packages(created_by);
create index if not exists shipment_status_history_changed_by_idx on public.shipment_status_history(changed_by);

alter policy "notification_outbox_customer_select" on public.notification_outbox using ((select is_staff()) or (customer_user_id = (select auth.uid())));
alter policy "payment_transactions_staff_select" on public.payment_transactions using ((select is_staff()) or exists (select 1 from public.shipment_invoices i where i.id = payment_transactions.invoice_id and i.customer_user_id = (select auth.uid())));
alter policy "shipment_invoices_staff_select" on public.shipment_invoices using ((select is_staff()) or (customer_user_id = (select auth.uid())));
alter policy "shipment_packages_staff_select" on public.shipment_packages using ((select is_staff()) or exists (select 1 from public.shipments s where s.id = shipment_packages.shipment_id and s.customer_user_id = (select auth.uid())));
alter policy "shipment_status_history_staff_select" on public.shipment_status_history using ((select is_staff()) or exists (select 1 from public.shipments s where s.id = shipment_status_history.shipment_id and s.customer_user_id = (select auth.uid())));

drop policy if exists "shipment_packages_staff_write" on public.shipment_packages;
create policy "shipment_packages_staff_insert" on public.shipment_packages for insert to authenticated with check ((select is_staff()));
create policy "shipment_packages_staff_update" on public.shipment_packages for update to authenticated using ((select is_staff())) with check ((select is_staff()));
create policy "shipment_packages_staff_delete" on public.shipment_packages for delete to authenticated using ((select is_staff()));
