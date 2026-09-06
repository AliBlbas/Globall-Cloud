-- Direct client writes to the shipment financial ledger are finance-controlled.
-- Payment settlement control-plane functions still use service_role/server-side execution.

drop policy if exists shipment_financial_ledger_staff_insert on public.shipment_financial_ledger;

create policy shipment_financial_ledger_finance_insert
on public.shipment_financial_ledger
as permissive
for insert
to authenticated
with check (
  exists (
    select 1
    from public.staff s
    where s.id = (select auth.uid())
      and s.is_active = true
      and s.role in ('admin','super_admin','accountant','finance')
  )
);
