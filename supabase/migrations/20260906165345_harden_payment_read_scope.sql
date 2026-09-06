drop policy if exists payment_sessions_staff_select on public.payment_sessions;
create policy payment_sessions_scoped_select
on public.payment_sessions
as permissive
for select
to authenticated
using (
  (customer_user_id = (select auth.uid()))
  or exists (
    select 1
    from public.staff s
    where s.id = (select auth.uid())
      and s.is_active = true
      and s.role in ('admin','super_admin','accountant','finance')
  )
);

drop policy if exists payment_transactions_staff_select on public.payment_transactions;
create policy payment_transactions_scoped_select
on public.payment_transactions
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.shipment_invoices i
    where i.id = payment_transactions.invoice_id
      and i.customer_user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.staff s
    where s.id = (select auth.uid())
      and s.is_active = true
      and s.role in ('admin','super_admin','accountant','finance')
  )
);
