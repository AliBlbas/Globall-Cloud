-- Decision: keep shipment access company-wide, no branch restriction.
-- These four legacy policies were the only place branch-scoping was ever
-- enforced, and they're already fully subsumed by the is_staff()-scoped
-- policies below -- every staff member already gets unconditional CRUD via
-- shipments_select_staff_all / shipments_insert_staff /
-- shipments_update_staff_only / shipments_delete_staff_only, so removing
-- these changes no effective permission. Just removes dead weight and the
-- misleading appearance of branch enforcement that wasn't actually active.
drop policy if exists "shipments delete" on public.shipments;
drop policy if exists "shipments insert" on public.shipments;
drop policy if exists "shipments update" on public.shipments;
drop policy if exists "shipments read" on public.shipments;

-- Decision: non-admin staff should see the full staff directory, not just
-- their own row. staff_admin_all (is_admin(), full CRUD) and
-- staff_user_write_own (own row, full CRUD) already exist; this adds
-- read-only visibility into every staff row for any staff member.
create policy staff_select_all
  on public.staff
  for select
  to authenticated
  using (is_staff());
;
