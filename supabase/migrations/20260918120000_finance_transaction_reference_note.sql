begin;

-- Finance UI already collects a reference and note, but the legacy ledger did not persist them.
-- Additive, nullable columns keep existing production rows intact.
alter table public.finance_transactions
  add column if not exists reference text,
  add column if not exists note text;

create index if not exists finance_transactions_reference_idx
  on public.finance_transactions(reference)
  where reference is not null;

commit;
