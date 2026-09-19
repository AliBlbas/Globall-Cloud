-- Globall Cloud: production RLS cleanup
-- 1) Make the intentionally service-role-only integration inbox explicit.
drop policy if exists integration_inbox_no_client_access on public.integration_inbox;
create policy integration_inbox_no_client_access
  on public.integration_inbox
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- 2) Consolidate the two authenticated SELECT policies on the financial ledger.
--    This keeps the same customer/staff visibility while removing duplicate
--    permissive-policy evaluation for each row.
drop policy if exists shipment_financial_ledger_customer_select on public.shipment_financial_ledger;
drop policy if exists shipment_financial_ledger_staff_select on public.shipment_financial_ledger;
create policy shipment_financial_ledger_select
  on public.shipment_financial_ledger
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.shipments s
      where s.id = shipment_financial_ledger.shipment_id
        and s.customer_user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.staff st
      where st.id = (select auth.uid())
        and st.is_active = true
    )
  );
