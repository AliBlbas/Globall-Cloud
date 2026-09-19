-- Remove a byte-for-byte duplicate index on shipment_financial_ledger.
drop index if exists public.idx_shipment_financial_ledger_customer_lookup;
