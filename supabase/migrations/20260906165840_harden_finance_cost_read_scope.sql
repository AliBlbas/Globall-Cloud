drop policy if exists company_costs_staff_select on public.company_costs;
create policy company_costs_finance_select
on public.company_costs
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.staff s
    where s.id = (select auth.uid())
      and s.is_active = true
      and s.role in ('admin','super_admin','accountant','finance')
  )
);

drop policy if exists company_cost_entries_staff_select on public.company_cost_entries;
create policy company_cost_entries_finance_select
on public.company_cost_entries
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.staff s
    where s.id = (select auth.uid())
      and s.is_active = true
      and s.role in ('admin','super_admin','accountant','finance')
  )
);
