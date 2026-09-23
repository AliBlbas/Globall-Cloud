-- Prevent ordinary authenticated customers from inheriting legacy staff-wide ALL policies.
-- Keep staff access intact while preserving existing customer-scoped policies.
alter policy staff_all_customers on public.customer_directory
  using ((select is_staff()))
  with check ((select is_staff()));

alter policy staff_all_shipments on public.shipments
  using ((select is_staff()))
  with check ((select is_staff()));

alter policy staff_all_staff on public.staff
  using ((select is_staff()))
  with check ((select is_staff()));

alter policy staff_all_receipts on public.warehouse_receipts
  using ((select is_staff()))
  with check ((select is_staff()));
