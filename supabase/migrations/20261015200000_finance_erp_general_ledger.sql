-- Globall Cloud Finance ERP foundation: chart of accounts + balanced general ledger.
-- Additive-only migration. It does not rewrite historical payment/cost records.
-- Existing operational sources remain authoritative until an explicit, audited posting
-- adapter is implemented for each source (invoices, settlements, costs, payroll).

create extension if not exists pgcrypto;
create sequence if not exists public.finance_journal_number_seq;

create table if not exists public.finance_chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  account_code text not null unique,
  account_name text not null,
  account_type text not null check (account_type in ('asset','liability','equity','revenue','expense')),
  normal_balance text not null check (normal_balance in ('debit','credit')),
  parent_account_id uuid references public.finance_chart_of_accounts(id) on delete restrict,
  is_cash_equivalent boolean not null default false,
  can_post boolean not null default true,
  is_active boolean not null default true,
  is_system boolean not null default false,
  description text,
  created_by uuid references public.staff(id) on delete set null,
  updated_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (account_code ~ '^[A-Z0-9][A-Z0-9._-]{1,31}$'),
  check (length(trim(account_name)) between 2 and 160),
  check (normal_balance = case when account_type in ('asset','expense') then 'debit' else 'credit' end),
  check (parent_account_id is null or parent_account_id <> id),
  check (not is_cash_equivalent or account_type = 'asset')
);
create index if not exists finance_coa_parent_idx
  on public.finance_chart_of_accounts(parent_account_id)
  where parent_account_id is not null;
create index if not exists finance_coa_type_active_idx
  on public.finance_chart_of_accounts(account_type, is_active, account_code);

create table if not exists public.finance_accounting_periods (
  id uuid primary key default gen_random_uuid(),
  period_name text not null unique,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'open' check (status in ('open','closed','locked')),
  closed_by uuid references public.staff(id) on delete set null,
  closed_at timestamptz,
  note text,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  check ((status = 'open' and closed_at is null) or (status <> 'open' and closed_at is not null))
);
create index if not exists finance_period_dates_status_idx
  on public.finance_accounting_periods(starts_on, ends_on, status);

create table if not exists public.finance_journal_entries (
  id uuid primary key default gen_random_uuid(),
  entry_number text not null unique
    default ('JE-' || to_char(current_date, 'YYYY') || '-' ||
      lpad(nextval('public.finance_journal_number_seq')::text, 8, '0')),
  entry_date date not null default (now() at time zone 'Asia/Baghdad')::date,
  accounting_period_id uuid not null references public.finance_accounting_periods(id) on delete restrict,
  branch text not null check (branch in ('corporate','china','dubai','erbil')),
  description text not null,
  source_type text not null default 'manual' check (source_type in (
    'manual','shipment_invoice','payment_settlement','company_expense',
    'fuel_expense','vehicle_maintenance','payroll','opening_balance','adjustment','reversal'
  )),
  source_reference text,
  idempotency_key text unique,
  status text not null default 'draft' check (status in ('draft','posted')),
  created_by uuid not null references public.staff(id) on delete restrict,
  posted_by uuid references public.staff(id) on delete restrict,
  posted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(description)) between 3 and 500),
  check ((status = 'draft' and posted_by is null and posted_at is null)
      or (status = 'posted' and posted_by is not null and posted_at is not null))
);
create index if not exists finance_journals_date_branch_idx
  on public.finance_journal_entries(entry_date desc, branch, status);
create index if not exists finance_journals_period_status_idx
  on public.finance_journal_entries(accounting_period_id, status, entry_date);
create index if not exists finance_journals_source_idx
  on public.finance_journal_entries(source_type, source_reference)
  where source_reference is not null;

create table if not exists public.finance_journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.finance_journal_entries(id) on delete restrict,
  line_number integer not null check (line_number > 0),
  account_id uuid not null references public.finance_chart_of_accounts(id) on delete restrict,
  description text,
  debit_iqd numeric(18,2) not null default 0 check (debit_iqd >= 0),
  credit_iqd numeric(18,2) not null default 0 check (credit_iqd >= 0),
  source_currency text check (source_currency is null or source_currency in ('IQD','USD','AED','CNY')),
  source_amount numeric(18,4) check (source_amount is null or source_amount >= 0),
  fx_rate_to_iqd numeric(18,8) check (fx_rate_to_iqd is null or fx_rate_to_iqd > 0),
  created_at timestamptz not null default now(),
  unique (journal_entry_id, line_number),
  check ((debit_iqd > 0 and credit_iqd = 0) or (credit_iqd > 0 and debit_iqd = 0)),
  check (
    (source_currency is null and source_amount is null and fx_rate_to_iqd is null)
    or
    (source_currency is not null and source_amount is not null and fx_rate_to_iqd is not null)
  )
);
create index if not exists finance_journal_lines_entry_idx
  on public.finance_journal_lines(journal_entry_id, line_number);
create index if not exists finance_journal_lines_account_idx
  on public.finance_journal_lines(account_id, journal_entry_id);

-- Minimal operational chart of accounts. Finance can add a company's local accounts later.
insert into public.finance_chart_of_accounts
  (account_code, account_name, account_type, normal_balance, is_cash_equivalent, is_system)
values
  ('1000','Cash on Hand','asset','debit',true,true),
  ('1010','Bank Accounts','asset','debit',true,true),
  ('1100','Accounts Receivable','asset','debit',false,true),
  ('1200','Prepaid Freight and Duties','asset','debit',false,true),
  ('2000','Accounts Payable','liability','credit',false,true),
  ('2100','Customer Advances','liability','credit',false,true),
  ('3000','Owner Equity','equity','credit',false,true),
  ('3100','Retained Earnings','equity','credit',false,true),
  ('4000','Shipment Revenue','revenue','credit',false,true),
  ('4100','Customs Handling Revenue','revenue','credit',false,true),
  ('4200','Service Revenue','revenue','credit',false,true),
  ('5000','International Freight Cost','expense','debit',false,true),
  ('5100','Customs and Clearance Cost','expense','debit',false,true),
  ('6000','Employee Salaries','expense','debit',false,true),
  ('6100','Warehouse and Office Rent','expense','debit',false,true),
  ('6200','Fuel Expense','expense','debit',false,true),
  ('6300','Vehicle Maintenance Expense','expense','debit',false,true),
  ('6400','Utilities and Administration','expense','debit',false,true)
on conflict (account_code) do nothing;

-- Shared timestamp trigger.
create or replace function public.gc_finance_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists finance_coa_touch_updated_at on public.finance_chart_of_accounts;
create trigger finance_coa_touch_updated_at
before update on public.finance_chart_of_accounts
for each row execute function public.gc_finance_touch_updated_at();

drop trigger if exists finance_period_touch_updated_at on public.finance_accounting_periods;
create trigger finance_period_touch_updated_at
before update on public.finance_accounting_periods
for each row execute function public.gc_finance_touch_updated_at();

drop trigger if exists finance_journal_touch_updated_at on public.finance_journal_entries;
create trigger finance_journal_touch_updated_at
before update on public.finance_journal_entries
for each row execute function public.gc_finance_touch_updated_at();

-- Reject modifications to posted journals and to their lines. Draft lines take a lock on
-- the header so posting cannot race with a concurrent insert/update/delete.
create or replace function public.gc_finance_guard_journal_entry()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'posted' then
      raise exception 'Posted journal entries are immutable; use a reversal journal'
        using errcode = '55000';
    end if;
    return old;
  end if;

  if old.status = 'posted' then
    raise exception 'Posted journal entries are immutable; use a reversal journal'
      using errcode = '55000';
  end if;
  return new;
end;
$$;

create or replace function public.gc_finance_guard_journal_line()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_entry_id uuid;
  v_status text;
  v_account_active boolean;
  v_account_can_post boolean;
begin
  v_entry_id := case when tg_op = 'DELETE' then old.journal_entry_id else new.journal_entry_id end;

  select j.status into v_status
  from public.finance_journal_entries j
  where j.id = v_entry_id
  for update;

  if not found then
    raise exception 'Journal entry not found' using errcode = '23503';
  end if;
  if v_status <> 'draft' then
    raise exception 'Lines may only be changed while a journal is draft'
      using errcode = '55000';
  end if;

  if tg_op <> 'DELETE' then
    select a.is_active, a.can_post into v_account_active, v_account_can_post
    from public.finance_chart_of_accounts a where a.id = new.account_id;
    if not coalesce(v_account_active, false) or not coalesce(v_account_can_post, false) then
      raise exception 'Journal lines require an active posting account' using errcode = '23514';
    end if;
    return new;
  end if;
  return old;
end;
$$;

drop trigger if exists finance_journal_entry_immutable on public.finance_journal_entries;
create trigger finance_journal_entry_immutable
before update or delete on public.finance_journal_entries
for each row execute function public.gc_finance_guard_journal_entry();

drop trigger if exists finance_journal_line_guard on public.finance_journal_lines;
create trigger finance_journal_line_guard
before insert or update or delete on public.finance_journal_lines
for each row execute function public.gc_finance_guard_journal_line();

-- Only the posting RPC can transition a draft journal into a posted journal. It validates
-- the live session, finance role, open period, active posting accounts and balanced totals.
create or replace function public.gc_post_finance_journal(p_journal_entry_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_entry public.finance_journal_entries%rowtype;
  v_period public.finance_accounting_periods%rowtype;
  v_line_count bigint;
  v_debits numeric(18,2);
  v_credits numeric(18,2);
begin
  if v_actor is null or not coalesce(private.is_real_authenticated_session(), false) then
    raise exception 'A real authenticated session is required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.staff s
    where s.id = v_actor and s.is_active = true
      and s.role in ('admin','super_admin','accountant','finance')
  ) then
    raise exception 'Finance permission required' using errcode = '42501';
  end if;

  select * into v_entry
  from public.finance_journal_entries
  where id = p_journal_entry_id
  for update;

  if not found then
    raise exception 'Journal entry not found' using errcode = 'P0002';
  end if;
  if v_entry.status <> 'draft' then
    raise exception 'Only a draft journal can be posted' using errcode = '55000';
  end if;

  select * into v_period
  from public.finance_accounting_periods
  where id = v_entry.accounting_period_id
  for update;

  if not found or v_period.status <> 'open'
     or v_entry.entry_date < v_period.starts_on or v_entry.entry_date > v_period.ends_on then
    raise exception 'Journal date must belong to an open accounting period' using errcode = '23514';
  end if;

  select count(*), coalesce(sum(l.debit_iqd),0), coalesce(sum(l.credit_iqd),0)
    into v_line_count, v_debits, v_credits
  from public.finance_journal_lines l
  where l.journal_entry_id = v_entry.id;

  if v_line_count < 2 then
    raise exception 'A journal must contain at least two lines' using errcode = '23514';
  end if;
  if v_debits <= 0 or v_debits <> v_credits then
    raise exception 'Journal is not balanced in IQD: debit % / credit %', v_debits, v_credits
      using errcode = '23514';
  end if;
  if exists (
    select 1 from public.finance_journal_lines l
    join public.finance_chart_of_accounts a on a.id = l.account_id
    where l.journal_entry_id = v_entry.id and (not a.is_active or not a.can_post)
  ) then
    raise exception 'Journal contains a disabled or non-posting account' using errcode = '23514';
  end if;

  update public.finance_journal_entries
  set status = 'posted', posted_by = v_actor, posted_at = now()
  where id = v_entry.id;

  insert into public.staff_activity_log(staff_id, action, target_id, details)
  values (
    v_actor,
    'finance_journal_posted',
    v_entry.entry_number,
    format('Journal posted; branch=%s; date=%s; total_iqd=%s', v_entry.branch, v_entry.entry_date, v_debits)
  );

  return v_entry.id;
end;
$$;

revoke all on function public.gc_finance_touch_updated_at() from public, anon, authenticated;
revoke all on function public.gc_finance_guard_journal_entry() from public, anon, authenticated;
revoke all on function public.gc_finance_guard_journal_line() from public, anon, authenticated;
revoke all on function public.gc_post_finance_journal(uuid) from public, anon;
grant execute on function public.gc_post_finance_journal(uuid) to authenticated;

alter table public.finance_chart_of_accounts enable row level security;
alter table public.finance_accounting_periods enable row level security;
alter table public.finance_journal_entries enable row level security;
alter table public.finance_journal_lines enable row level security;

-- Explicit grants: RLS is the row authorization boundary.
revoke all on public.finance_chart_of_accounts, public.finance_accounting_periods,
  public.finance_journal_entries, public.finance_journal_lines from anon, public;
grant select, insert, update, delete on public.finance_chart_of_accounts,
  public.finance_accounting_periods, public.finance_journal_entries,
  public.finance_journal_lines to authenticated;

create policy finance_coa_read on public.finance_chart_of_accounts
for select to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists (select 1 from public.staff s where s.id = (select auth.uid())
    and s.is_active = true and s.role in ('admin','super_admin','accountant','finance'))
);
create policy finance_coa_admin_insert on public.finance_chart_of_accounts
for insert to authenticated
with check (
  (select private.is_real_authenticated_session())
  and exists (select 1 from public.staff s where s.id = (select auth.uid())
    and s.is_active = true and s.role in ('admin','super_admin'))
);
create policy finance_coa_admin_update on public.finance_chart_of_accounts
for update to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists (select 1 from public.staff s where s.id = (select auth.uid())
    and s.is_active = true and s.role in ('admin','super_admin'))
)
with check (
  (select private.is_real_authenticated_session())
  and exists (select 1 from public.staff s where s.id = (select auth.uid())
    and s.is_active = true and s.role in ('admin','super_admin'))
);

create policy finance_period_read on public.finance_accounting_periods
for select to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists (select 1 from public.staff s where s.id = (select auth.uid())
    and s.is_active = true and s.role in ('admin','super_admin','accountant','finance'))
);
create policy finance_period_admin_insert on public.finance_accounting_periods
for insert to authenticated
with check (
  (select private.is_real_authenticated_session())
  and created_by = (select auth.uid())
  and exists (select 1 from public.staff s where s.id = (select auth.uid())
    and s.is_active = true and s.role in ('admin','super_admin'))
);
create policy finance_period_admin_update on public.finance_accounting_periods
for update to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists (select 1 from public.staff s where s.id = (select auth.uid())
    and s.is_active = true and s.role in ('admin','super_admin'))
)
with check (
  (select private.is_real_authenticated_session())
  and exists (select 1 from public.staff s where s.id = (select auth.uid())
    and s.is_active = true and s.role in ('admin','super_admin'))
);

create policy finance_journal_read on public.finance_journal_entries
for select to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists (select 1 from public.staff s where s.id = (select auth.uid())
    and s.is_active = true and s.role in ('admin','super_admin','accountant','finance'))
);
create policy finance_journal_insert_draft on public.finance_journal_entries
for insert to authenticated
with check (
  (select private.is_real_authenticated_session())
  and created_by = (select auth.uid())
  and status = 'draft' and posted_by is null and posted_at is null
  and exists (select 1 from public.staff s where s.id = (select auth.uid())
    and s.is_active = true and s.role in ('admin','super_admin','accountant','finance'))
);

create policy finance_journal_lines_read on public.finance_journal_lines
for select to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists (select 1 from public.staff s where s.id = (select auth.uid())
    and s.is_active = true and s.role in ('admin','super_admin','accountant','finance'))
);
create policy finance_journal_lines_insert_draft on public.finance_journal_lines
for insert to authenticated
with check (
  (select private.is_real_authenticated_session())
  and exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active = true
      and s.role in ('admin','super_admin','accountant','finance')
  )
  and exists (
    select 1 from public.finance_journal_entries j
    where j.id = journal_entry_id and j.status = 'draft'
      and j.created_by = (select auth.uid())
  )
);
create policy finance_journal_lines_update_draft on public.finance_journal_lines
for update to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists (select 1 from public.staff s where s.id = (select auth.uid())
    and s.is_active = true and s.role in ('admin','super_admin','accountant','finance'))
  and exists (select 1 from public.finance_journal_entries j
    where j.id = journal_entry_id and j.status = 'draft' and j.created_by = (select auth.uid()))
)
with check (
  (select private.is_real_authenticated_session())
  and exists (select 1 from public.staff s where s.id = (select auth.uid())
    and s.is_active = true and s.role in ('admin','super_admin','accountant','finance'))
  and exists (select 1 from public.finance_journal_entries j
    where j.id = journal_entry_id and j.status = 'draft' and j.created_by = (select auth.uid()))
);
create policy finance_journal_lines_delete_draft on public.finance_journal_lines
for delete to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists (select 1 from public.staff s where s.id = (select auth.uid())
    and s.is_active = true and s.role in ('admin','super_admin','accountant','finance'))
  and exists (select 1 from public.finance_journal_entries j
    where j.id = journal_entry_id and j.status = 'draft' and j.created_by = (select auth.uid()))
);

-- Read-only reporting surfaces. security_invoker preserves base-table RLS.
create or replace view public.finance_trial_balance
with (security_invoker = true)
as
select
  j.branch,
  j.accounting_period_id,
  p.period_name,
  a.id as account_id,
  a.account_code,
  a.account_name,
  a.account_type,
  sum(l.debit_iqd)::numeric(18,2) as debit_total_iqd,
  sum(l.credit_iqd)::numeric(18,2) as credit_total_iqd,
  sum(l.debit_iqd - l.credit_iqd)::numeric(18,2) as net_debit_iqd
from public.finance_journal_entries j
join public.finance_accounting_periods p on p.id = j.accounting_period_id
join public.finance_journal_lines l on l.journal_entry_id = j.id
join public.finance_chart_of_accounts a on a.id = l.account_id
where j.status = 'posted'
group by j.branch, j.accounting_period_id, p.period_name, a.id, a.account_code, a.account_name, a.account_type;

create or replace view public.finance_profit_loss_by_month
with (security_invoker = true)
as
select
  date_trunc('month', j.entry_date)::date as month_start,
  j.branch,
  a.account_type,
  a.id as account_id,
  a.account_code,
  a.account_name,
  sum(case when a.account_type = 'revenue'
    then l.credit_iqd - l.debit_iqd
    else l.debit_iqd - l.credit_iqd end)::numeric(18,2) as amount_iqd
from public.finance_journal_entries j
join public.finance_journal_lines l on l.journal_entry_id = j.id
join public.finance_chart_of_accounts a on a.id = l.account_id
where j.status = 'posted' and a.account_type in ('revenue','expense')
group by date_trunc('month', j.entry_date)::date, j.branch, a.account_type,
  a.id, a.account_code, a.account_name;

create or replace view public.finance_cash_movement_by_month
with (security_invoker = true)
as
select
  date_trunc('month', j.entry_date)::date as month_start,
  j.branch,
  a.id as account_id,
  a.account_code,
  a.account_name,
  sum(l.debit_iqd - l.credit_iqd)::numeric(18,2) as net_cash_movement_iqd
from public.finance_journal_entries j
join public.finance_journal_lines l on l.journal_entry_id = j.id
join public.finance_chart_of_accounts a on a.id = l.account_id
where j.status = 'posted' and a.is_cash_equivalent = true
group by date_trunc('month', j.entry_date)::date, j.branch, a.id, a.account_code, a.account_name;

grant select on public.finance_trial_balance, public.finance_profit_loss_by_month,
  public.finance_cash_movement_by_month to authenticated;

comment on table public.finance_chart_of_accounts is
  'Enterprise GL chart of accounts. IQD is the functional ledger currency.';
comment on table public.finance_journal_entries is
  'Accounting journal header. Posted entries are immutable; corrections require a separate reversing journal.';
comment on table public.finance_journal_lines is
  'Balanced general-ledger lines in IQD; original foreign currency amounts/rates may be retained for traceability.';
comment on function public.gc_post_finance_journal(uuid) is
  'Posts a draft journal only after authenticated finance-role, open-period, active-account, and debit-credit balance checks.';
