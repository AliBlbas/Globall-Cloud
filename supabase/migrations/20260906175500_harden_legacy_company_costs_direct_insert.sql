-- Legacy company cost writes remain service/control-plane friendly,
-- but direct authenticated inserts are restricted to finance-capable staff.

drop policy if exists company_costs_staff_insert on public.company_costs;

create policy company_costs_finance_insert
on public.company_costs
as permissive
for insert
to authenticated
with check (
  (select public.is_admin())
  or exists (
    select 1
    from public.staff s
    where s.id = (select auth.uid())
      and s.is_active = true
      and s.role in ('accountant','finance')
  )
);
