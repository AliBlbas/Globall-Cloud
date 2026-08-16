-- These two policies had no role check at all (qual = true), meaning ANY
-- authenticated user (any signed-up customer, not just staff) could
-- read/write/delete the entire customer_directory and shipments tables.
-- Correct staff/admin access is already provided by the other existing
-- policies on these tables (customer_directory_staff_all, directory_admin_all,
-- shipments_select_staff_all, shipments_admin_all, etc.), so dropping these
-- buggy duplicates removes the hole without any loss of legitimate access.
drop policy if exists "staff_all_customers" on public.customer_directory;
drop policy if exists "staff_all_shipments" on public.shipments;;
