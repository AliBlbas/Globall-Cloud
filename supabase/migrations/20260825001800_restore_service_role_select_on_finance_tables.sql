-- Globall Cloud: restore trusted server read access for protected Finance data.
-- Forward-only and idempotent. These grants apply only to service_role;
-- browser clients remain governed by RLS and receive no direct access.

begin;

grant select on table public.shipment_invoices to service_role;
grant select on table public.company_cost_entries to service_role;
grant select on table public.shipment_financial_ledger to service_role;
grant select on table public.payment_transactions to service_role;
grant select on table public.payment_sessions to service_role;

commit;

