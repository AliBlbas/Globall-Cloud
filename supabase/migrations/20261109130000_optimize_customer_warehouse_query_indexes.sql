-- Optimize the high-volume customer, warehouse, and driver query paths.
-- All indexes are idempotent so this migration is safe to re-run in a recovered environment.
-- Keep the indexed columns narrow: these are lookup/order indexes, not covering indexes.

-- Warehouse receiving resolves candidate shipments by customer directory or GC code,
-- then returns the newest candidates first.
create index if not exists shipments_directory_customer_created_idx
  on public.shipments (directory_customer_id, created_at desc)
  where directory_customer_id is not null;

create index if not exists shipments_customer_gc_created_idx
  on public.shipments (customer_gc_code, created_at desc)
  where customer_gc_code is not null;

-- Staff directory and driver views load a staff member's newest shipments/assignments.
create index if not exists shipments_assigned_staff_created_idx
  on public.shipments (assigned_staff_id, created_at desc)
  where assigned_staff_id is not null;

create index if not exists delivery_assignments_driver_created_idx
  on public.delivery_assignments (assigned_staff_id, created_at desc)
  where status in ('assigned', 'accepted', 'picked_up', 'out_for_delivery');

-- Customer portal lists are scoped by user and sorted newest first.
create index if not exists customer_notifications_customer_created_idx
  on public.customer_notifications (customer_user_id, created_at desc);

create index if not exists shipment_documents_customer_created_idx
  on public.shipment_documents (customer_user_id, created_at desc)
  where customer_user_id is not null;

create index if not exists shipment_invoices_customer_created_idx
  on public.shipment_invoices (customer_user_id, created_at desc)
  where customer_user_id is not null;

create index if not exists finance_transactions_gc_created_idx
  on public.finance_transactions (gc_code, created_at desc)
  where gc_code is not null;

comment on index public.shipments_directory_customer_created_idx is
  'Supports warehouse candidate lookup by directory_customer_id ordered by newest shipment.';
comment on index public.shipments_customer_gc_created_idx is
  'Supports warehouse candidate lookup by customer_gc_code ordered by newest shipment.';
comment on index public.customer_notifications_customer_created_idx is
  'Supports customer portal notification feed ordered by newest notification.';
comment on index public.finance_transactions_gc_created_idx is
  'Supports customer portal finance history lookup by GC code ordered by newest transaction.';
