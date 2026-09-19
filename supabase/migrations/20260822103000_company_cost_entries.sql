-- Executive finance costs. This is intentionally separate from shipment_financial_ledger:
-- shipment charges are customer-facing ledger entries, not company operating costs.
create table if not exists public.company_cost_entries (
  id uuid primary key default gen_random_uuid(),
  category text not null check (length(trim(category)) between 2 and 80),
  description text,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'USD' check (currency in ('USD','IQD','AED','CNY')),
  branch text,
  route_key text,
  occurred_at timestamptz not null default now(),
  recorded_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists company_cost_entries_period_idx on public.company_cost_entries(occurred_at desc, currency);
create index if not exists company_cost_entries_route_idx on public.company_cost_entries(route_key, occurred_at desc);
alter table public.company_cost_entries enable row level security;
drop policy if exists company_cost_entries_staff_select on public.company_cost_entries;
create policy company_cost_entries_staff_select on public.company_cost_entries for select to authenticated using (public.is_staff());
drop policy if exists company_cost_entries_finance_insert on public.company_cost_entries;
create policy company_cost_entries_finance_insert on public.company_cost_entries for insert to authenticated with check (exists (select 1 from public.staff s where s.id = (select auth.uid()) and s.is_active = true and s.role in ('admin','super_admin','accountant')));
drop trigger if exists company_cost_entries_updated_at on public.company_cost_entries;
create trigger company_cost_entries_updated_at before update on public.company_cost_entries for each row execute function public.set_control_plane_updated_at();
