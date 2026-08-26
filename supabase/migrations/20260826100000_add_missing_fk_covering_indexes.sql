-- Add covering indexes for foreign-key columns identified by Supabase performance advisors.
-- This migration changes only query planning; it does not alter data, policies, or write semantics.

create index if not exists company_cost_entries_recorded_by_idx
  on public.company_cost_entries(recorded_by);

create index if not exists exchange_rates_created_by_idx
  on public.exchange_rates(created_by);

create index if not exists exchange_rates_updated_by_idx
  on public.exchange_rates(updated_by);

create index if not exists payment_sessions_created_by_idx
  on public.payment_sessions(created_by);

create index if not exists payment_sessions_customer_user_id_idx
  on public.payment_sessions(customer_user_id);

create index if not exists payment_sessions_shipment_id_idx
  on public.payment_sessions(shipment_id);

create index if not exists pricing_rates_created_by_idx
  on public.pricing_rates(created_by);

create index if not exists pricing_rates_updated_by_idx
  on public.pricing_rates(updated_by);

create index if not exists quote_requests_accepted_by_idx
  on public.quote_requests(accepted_by);

create index if not exists quote_requests_quoted_by_idx
  on public.quote_requests(quoted_by);

create index if not exists shipment_documents_verified_by_idx
  on public.shipment_documents(verified_by);

create index if not exists shipment_manifests_created_by_idx
  on public.shipment_manifests(created_by);

create index if not exists shipment_manifests_updated_by_idx
  on public.shipment_manifests(updated_by);

create index if not exists shipment_route_legs_created_by_idx
  on public.shipment_route_legs(created_by);

create index if not exists shipment_route_legs_updated_by_idx
  on public.shipment_route_legs(updated_by);

create index if not exists staff_permission_grants_granted_by_idx
  on public.staff_permission_grants(granted_by);

create index if not exists staff_tasks_created_by_idx
  on public.staff_tasks(created_by);

create index if not exists warehouse_movements_receipt_id_idx
  on public.warehouse_movements(receipt_id);

create index if not exists warehouse_movements_scanned_by_idx
  on public.warehouse_movements(scanned_by);
