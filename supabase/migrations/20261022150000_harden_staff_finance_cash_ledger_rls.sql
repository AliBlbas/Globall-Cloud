-- Harden the staff cash/loan/transfer ledgers.
-- The prior permissive "block_anonymous" policies only checked for a real
-- authenticated session. Because permissive policies are OR-combined, they
-- could bypass the role-scoped finance policies once table privileges were granted.
-- Make the session check restrictive so it is ANDed with role-specific policies.

begin;

-- Browser clients must not have destructive table privileges. Anonymous access is
-- denied entirely; authenticated clients receive only the operations governed by RLS.
revoke all privileges on table
  public.ledger_cash_entries,
  public.ledger_loans,
  public.ledger_transfers
from anon;

revoke all privileges on table
  public.ledger_cash_entries,
  public.ledger_loans,
  public.ledger_transfers
from authenticated;

grant select, insert on table
  public.ledger_cash_entries,
  public.ledger_loans,
  public.ledger_transfers
to authenticated;

-- Require a genuine authenticated session in addition to each table's
-- role-specific SELECT/INSERT policy. Restrictive policies are AND-combined.
drop policy if exists ledger_cash_entries_block_anonymous on public.ledger_cash_entries;
create policy ledger_cash_entries_require_real_session
on public.ledger_cash_entries
as restrictive
for all
to authenticated
using ((select private.is_real_authenticated_session()))
with check ((select private.is_real_authenticated_session()));

drop policy if exists ledger_loans_block_anonymous on public.ledger_loans;
create policy ledger_loans_require_real_session
on public.ledger_loans
as restrictive
for all
to authenticated
using ((select private.is_real_authenticated_session()))
with check ((select private.is_real_authenticated_session()));

drop policy if exists ledger_transfers_block_anonymous on public.ledger_transfers;
create policy ledger_transfers_require_real_session
on public.ledger_transfers
as restrictive
for all
to authenticated
using ((select private.is_real_authenticated_session()))
with check ((select private.is_real_authenticated_session()));

-- Finance staff are authorized to create entries, matching the policy names and
-- the role model used by shipment_financial_ledger. UPDATE/DELETE remain ungranted.
drop policy if exists ledger_cash_entries_finance_insert on public.ledger_cash_entries;
create policy ledger_cash_entries_finance_insert
on public.ledger_cash_entries
as permissive
for insert
to authenticated
with check (
  exists (
    select 1
    from public.staff s
    where s.id = (select auth.uid())
      and s.is_active = true
      and s.role in ('admin', 'super_admin', 'accountant', 'finance')
  )
);

drop policy if exists ledger_loans_finance_insert on public.ledger_loans;
create policy ledger_loans_finance_insert
on public.ledger_loans
as permissive
for insert
to authenticated
with check (
  exists (
    select 1
    from public.staff s
    where s.id = (select auth.uid())
      and s.is_active = true
      and s.role in ('admin', 'super_admin', 'accountant', 'finance')
  )
);

drop policy if exists ledger_transfers_finance_insert on public.ledger_transfers;
create policy ledger_transfers_finance_insert
on public.ledger_transfers
as permissive
for insert
to authenticated
with check (
  exists (
    select 1
    from public.staff s
    where s.id = (select auth.uid())
      and s.is_active = true
      and s.role in ('admin', 'super_admin', 'accountant', 'finance')
  )
);

commit;
