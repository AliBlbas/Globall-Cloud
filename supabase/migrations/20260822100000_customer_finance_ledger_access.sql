-- Customer finance visibility: expose only ledger entries for the caller's own shipments.
-- Amounts remain sourced from the production ledger; no demo or derived financial rows are inserted.

alter table public.shipment_financial_ledger enable row level security;

drop policy if exists shipment_financial_ledger_customer_select on public.shipment_financial_ledger;
create policy shipment_financial_ledger_customer_select
on public.shipment_financial_ledger
for select to authenticated
using (
  exists (
    select 1
    from public.shipments s
    where s.id = shipment_financial_ledger.shipment_id
      and s.customer_user_id = (select auth.uid())
  )
);

create index if not exists idx_shipment_financial_ledger_customer_lookup
on public.shipment_financial_ledger (shipment_id, created_at desc);
