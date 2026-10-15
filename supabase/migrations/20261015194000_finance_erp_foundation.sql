-- Globall Cloud Finance ERP foundation.
-- Append-only double-entry ledger; does not replace existing shipment invoices,
-- payments, cash entries, or company-cost tables. New journals are posted through
-- service-role-only RPCs after the Edge Function authenticates the staff actor.

create extension if not exists pgcrypto;

create table if not exists public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  account_code text not null unique,
  name_en text not null,
  name_ckb text not null,
  account_type text not null check (account_type in ('asset','liability','equity','revenue','expense')),
  parent_account_id uuid references public.finance_accounts(id) on delete restrict,
  is_cash_account boolean not null default false,
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (account_code ~ '^[0-9]{3,8}$'),
  check (parent_account_id is null or parent_account_id <> id),
  check (not is_cash_account or account_type = 'asset')
);
create index if not exists finance_accounts_type_active_idx
  on public.finance_accounts(account_type, is_active, account_code);
create index if not exists finance_accounts_parent_idx
  on public.finance_accounts(parent_account_id) where parent_account_id is not null;

insert into public.finance_accounts(account_code,name_en,name_ckb,account_type,is_cash_account,is_system)
values
 ('1000','Cash on Hand','پارەی نەقد','asset',true,true),
 ('1010','Bank Accounts','هەژماری بانکی','asset',true,true),
 ('1100','Accounts Receivable','پارەی ماوە لە کڕیاران','asset',false,true),
 ('1200','Inventory / In-Transit Goods','کۆگا و کاڵای لە ڕێگادا','asset',false,true),
 ('2000','Accounts Payable','قەرزی کۆمپانیا','liability',false,true),
 ('2100','Customer Advances','پێشەکی کڕیاران','liability',false,true),
 ('3000','Owner Equity','سەرمایەی خاوەنکار','equity',false,true),
 ('4000','Shipment Revenue','داهاتی گواستنەوە','revenue',false,true),
 ('4100','Customs Revenue','داهاتی گومرگ','revenue',false,true),
 ('4200','Service Revenue','داهاتی خزمەتگوزاری','revenue',false,true),
 ('5000','International Shipping Expense','تێچووی گواستنەوەی نێودەوڵەتی','expense',false,true),
 ('5100','Customs Expense','خەرجی گومرگ','expense',false,true),
 ('5200','Fuel Expense','خەرجی سووتەمەنی','expense',false,true),
 ('5300','Warehouse Rent','کرێی کۆگا','expense',false,true),
 ('5400','Salaries and Wages','مووچە و کرێی کار','expense',false,true),
 ('5500','Vehicle Maintenance','چاکسازیی ئۆتۆمبێل','expense',false,true),
 ('5600','Office and Operating Expense','خەرجی ئۆفیس و کارگێڕی','expense',false,true),
 ('5700','Payment Processing Fees','کرێی پرۆسێسکردنی پارەدان','expense',false,true)
on conflict (account_code) do nothing;

create table if not exists public.finance_periods (
  id uuid primary key default gen_random_uuid(),
  period_name text not null unique,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'open' check (status in ('open','closed')),
  created_by uuid references public.staff(id) on delete set null,
  closed_by uuid references public.staff(id) on delete set null,
  closed_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  check ((status = 'open' and closed_at is null and closed_by is null) or (status = 'closed' and closed_at is not null))
);
create index if not exists finance_periods_dates_status_idx
  on public.finance_periods(starts_on, ends_on, status);

create table if not exists public.finance_journal_entries (
  id uuid primary key default gen_random_uuid(),
  journal_number text not null unique,
  entry_date date not null,
  branch text not null check (branch in ('china','dubai','erbil')),
  period_id uuid not null references public.finance_periods(id) on delete restrict,
  description text not null,
  reference text,
  source_type text not null default 'manual'
    check (source_type in ('manual','expense','shipment_invoice','payment','payroll','customs','fuel','maintenance','adjustment','reversal')),
  source_id text,
  status text not null default 'draft' check (status in ('draft','posted','reversed')),
  created_by uuid not null references public.staff(id) on delete restrict,
  posted_by uuid references public.staff(id) on delete restrict,
  posted_at timestamptz,
  reversed_by uuid references public.staff(id) on delete restrict,
  reversed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'draft' and posted_at is null) or (status in ('posted','reversed') and posted_at is not null)),
  check ((status <> 'reversed') or (reversed_by is not null and reversed_at is not null))
);
create index if not exists finance_journal_entries_date_branch_idx
  on public.finance_journal_entries(entry_date desc, branch, status);
create index if not exists finance_journal_entries_period_idx
  on public.finance_journal_entries(period_id, status, entry_date);
create index if not exists finance_journal_entries_source_idx
  on public.finance_journal_entries(source_type, source_id)
  where source_id is not null;

create table if not exists public.finance_journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.finance_journal_entries(id) on delete restrict,
  line_number integer not null check (line_number > 0),
  account_id uuid not null references public.finance_accounts(id) on delete restrict,
  memo text,
  debit_iqd numeric(18,2) not null default 0 check (debit_iqd >= 0),
  credit_iqd numeric(18,2) not null default 0 check (credit_iqd >= 0),
  transaction_currency text not null default 'IQD' check (transaction_currency in ('IQD','USD','AED','CNY')),
  transaction_amount numeric(18,4),
  exchange_rate_to_iqd numeric(18,8),
  created_at timestamptz not null default now(),
  unique (journal_entry_id, line_number),
  check ((debit_iqd > 0 and credit_iqd = 0) or (credit_iqd > 0 and debit_iqd = 0)),
  check (
    (transaction_currency = 'IQD' and (transaction_amount is null or transaction_amount >= 0))
    or
    (transaction_currency <> 'IQD' and transaction_amount is not null and transaction_amount >= 0
      and exchange_rate_to_iqd is not null and exchange_rate_to_iqd > 0)
  )
);
create index if not exists finance_journal_lines_entry_idx
  on public.finance_journal_lines(journal_entry_id, line_number);
create index if not exists finance_journal_lines_account_idx
  on public.finance_journal_lines(account_id, journal_entry_id);

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

drop trigger if exists finance_accounts_touch_updated_at on public.finance_accounts;
create trigger finance_accounts_touch_updated_at before update on public.finance_accounts
for each row execute function public.gc_finance_touch_updated_at();
drop trigger if exists finance_periods_touch_updated_at on public.finance_periods;
create trigger finance_periods_touch_updated_at before update on public.finance_periods
for each row execute function public.gc_finance_touch_updated_at();
drop trigger if exists finance_journal_entries_touch_updated_at on public.finance_journal_entries;
create trigger finance_journal_entries_touch_updated_at before update on public.finance_journal_entries
for each row execute function public.gc_finance_touch_updated_at();

create or replace function public.gc_finance_assert_actor(p_actor_id uuid, p_branch text, p_admin_only boolean default false)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_branch text;
  v_target text := lower(trim(coalesce(p_branch,'')));
begin
  if v_target = 'uae' then v_target := 'dubai'; end if;
  if v_target not in ('china','dubai','erbil') then
    raise exception 'Invalid finance branch' using errcode = '22023';
  end if;
  select s.role, lower(trim(coalesce(s.branch,''))) into v_role, v_branch
  from public.staff s where s.id = p_actor_id and s.is_active = true;
  if v_role is null or v_role not in ('admin','super_admin','accountant','finance') then
    raise exception 'Active finance role is required' using errcode = '42501';
  end if;
  if p_admin_only and v_role not in ('admin','super_admin') then
    raise exception 'Administrator role is required' using errcode = '42501';
  end if;
  if v_branch = 'uae' then v_branch := 'dubai'; end if;
  if v_role not in ('admin','super_admin') and v_branch <> 'all' and v_branch <> v_target then
    raise exception 'Finance branch access denied' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.gc_finance_create_period(
  p_actor_id uuid, p_period_name text, p_starts_on date, p_ends_on date, p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_period public.finance_periods%rowtype;
begin
  perform public.gc_finance_assert_actor(p_actor_id, coalesce((select s.branch from public.staff s where s.id=p_actor_id),'erbil'), true);
  if p_period_name is null or length(trim(p_period_name)) < 3 or length(trim(p_period_name)) > 40 then
    raise exception 'Valid period name is required' using errcode = '22023';
  end if;
  if p_starts_on is null or p_ends_on is null or p_ends_on < p_starts_on then
    raise exception 'Valid period dates are required' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.finance_periods p
    where daterange(p.starts_on,p.ends_on,'[]') && daterange(p_starts_on,p_ends_on,'[]')
  ) then
    raise exception 'Finance periods cannot overlap' using errcode = '23505';
  end if;
  insert into public.finance_periods(period_name,starts_on,ends_on,status,created_by,note)
  values(trim(p_period_name),p_starts_on,p_ends_on,'open',p_actor_id,nullif(trim(coalesce(p_note,'')),''))
  returning * into v_period;
  insert into public.staff_activity_log(staff_id,staff_name,action,target_id,details)
  select p_actor_id, s.full_name, 'finance_period_created', v_period.id::text,
    jsonb_build_object('period_name',v_period.period_name,'starts_on',v_period.starts_on,'ends_on',v_period.ends_on)::text
  from public.staff s where s.id=p_actor_id;
  return to_jsonb(v_period);
end;
$$;

create or replace function public.gc_finance_close_period(p_actor_id uuid, p_period_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_period public.finance_periods%rowtype;
begin
  select * into v_period from public.finance_periods where id=p_period_id for update;
  if not found then raise exception 'Finance period not found' using errcode = 'P0002'; end if;
  perform public.gc_finance_assert_actor(p_actor_id, 'erbil', true);
  if v_period.status <> 'open' then raise exception 'Finance period is already closed' using errcode = '23514'; end if;
  if exists(select 1 from public.finance_journal_entries e where e.period_id=v_period.id and e.status='draft') then
    raise exception 'Post or cancel all draft journals before closing the period' using errcode = '23514';
  end if;
  update public.finance_periods set status='closed',closed_by=p_actor_id,closed_at=now()
  where id=p_period_id returning * into v_period;
  insert into public.staff_activity_log(staff_id,staff_name,action,target_id,details)
  select p_actor_id, s.full_name, 'finance_period_closed', v_period.id::text,
    jsonb_build_object('period_name',v_period.period_name)::text
  from public.staff s where s.id=p_actor_id;
  return to_jsonb(v_period);
end;
$$;

create or replace function public.gc_finance_create_journal(
  p_actor_id uuid,
  p_entry_date date,
  p_branch text,
  p_description text,
  p_lines jsonb,
  p_reference text default null,
  p_source_type text default 'manual',
  p_source_id text default null,
  p_post boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_period public.finance_periods%rowtype;
  v_entry public.finance_journal_entries%rowtype;
  v_line jsonb;
  v_account_id uuid;
  v_debit numeric(18,2);
  v_credit numeric(18,2);
  v_total_debit numeric(18,2) := 0;
  v_total_credit numeric(18,2) := 0;
  v_line_no integer := 0;
  v_journal_number text;
  v_status text;
begin
  perform public.gc_finance_assert_actor(p_actor_id,p_branch,false);
  if p_entry_date is null or p_description is null or length(trim(p_description))=0 or length(trim(p_description))>1000 then
    raise exception 'Entry date and description are required' using errcode = '22023';
  end if;
  if p_source_type not in ('manual','expense','shipment_invoice','payment','payroll','customs','fuel','maintenance','adjustment','reversal') then
    raise exception 'Unsupported journal source type' using errcode = '22023';
  end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) < 2 or jsonb_array_length(p_lines) > 100 then
    raise exception 'Journal requires between 2 and 100 lines' using errcode = '22023';
  end if;
  select * into v_period
  from public.finance_periods p
  where p.status='open' and p_starts_on is not null
    and p_entry_date between p.starts_on and p.ends_on
  order by p.starts_on desc limit 1 for update;
  if not found then raise exception 'No open finance period covers the entry date' using errcode = '23514'; end if;

  for v_line in select value from jsonb_array_elements(p_lines) loop
    begin
      v_account_id := (v_line->>'account_id')::uuid;
      v_debit := coalesce(nullif(v_line->>'debit_iqd','')::numeric,0);
      v_credit := coalesce(nullif(v_line->>'credit_iqd','')::numeric,0);
    exception when others then
      raise exception 'Invalid journal line format' using errcode = '22023';
    end;
    if v_debit < 0 or v_credit < 0 or not ((v_debit > 0 and v_credit = 0) or (v_credit > 0 and v_debit = 0)) then
      raise exception 'Each journal line must contain either a positive debit or a positive credit' using errcode = '22023';
    end if;
    if not exists(select 1 from public.finance_accounts a where a.id=v_account_id and a.is_active=true) then
      raise exception 'A journal account is inactive or unavailable' using errcode = '23503';
    end if;
    v_total_debit := v_total_debit + v_debit;
    v_total_credit := v_total_credit + v_credit;
  end loop;
  if v_total_debit <= 0 or round(v_total_debit,2) <> round(v_total_credit,2) then
    raise exception 'Journal is not balanced in IQD' using errcode = '23514';
  end if;
  v_journal_number := 'GCJ-' || to_char(p_entry_date,'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  v_status := case when p_post then 'posted' else 'draft' end;
  insert into public.finance_journal_entries(journal_number,entry_date,branch,period_id,description,reference,source_type,source_id,status,created_by,posted_by,posted_at)
  values(v_journal_number,p_entry_date,case when lower(trim(p_branch))='uae' then 'dubai' else lower(trim(p_branch)) end,
    v_period.id,trim(p_description),nullif(trim(coalesce(p_reference,'')),''),p_source_type,nullif(trim(coalesce(p_source_id,'')),''),v_status,p_actor_id,
    case when p_post then p_actor_id else null end,case when p_post then now() else null end)
  returning * into v_entry;

  for v_line in select value from jsonb_array_elements(p_lines) loop
    v_line_no := v_line_no + 1;
    v_account_id := (v_line->>'account_id')::uuid;
    v_debit := coalesce(nullif(v_line->>'debit_iqd','')::numeric,0);
    v_credit := coalesce(nullif(v_line->>'credit_iqd','')::numeric,0);
    insert into public.finance_journal_lines(journal_entry_id,line_number,account_id,memo,debit_iqd,credit_iqd,transaction_currency,transaction_amount,exchange_rate_to_iqd)
    values(v_entry.id,v_line_no,v_account_id,nullif(trim(coalesce(v_line->>'memo','')),''),
      v_debit,v_credit,coalesce(nullif(v_line->>'transaction_currency',''),'IQD'),
      nullif(v_line->>'transaction_amount','')::numeric,nullif(v_line->>'exchange_rate_to_iqd','')::numeric);
  end loop;

  insert into public.staff_activity_log(staff_id,staff_name,action,target_id,details)
  select p_actor_id,s.full_name,case when p_post then 'finance_journal_posted' else 'finance_journal_draft_created' end,
    v_entry.id::text,jsonb_build_object('journal_number',v_entry.journal_number,'branch',v_entry.branch,
      'debit_iqd',v_total_debit,'credit_iqd',v_total_credit,'period_id',v_period.id)::text
  from public.staff s where s.id=p_actor_id;

  return jsonb_build_object(
    'entry',to_jsonb(v_entry),
    'lines',(select coalesce(jsonb_agg(to_jsonb(l) order by l.line_number),'[]'::jsonb) from public.finance_journal_lines l where l.journal_entry_id=v_entry.id)
  );
end;
$$;

create or replace function public.gc_finance_post_journal(p_actor_id uuid, p_journal_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entry public.finance_journal_entries%rowtype;
  v_debit numeric(18,2);
  v_credit numeric(18,2);
begin
  select * into v_entry from public.finance_journal_entries where id=p_journal_id for update;
  if not found then raise exception 'Journal entry not found' using errcode='P0002'; end if;
  perform public.gc_finance_assert_actor(p_actor_id,v_entry.branch,false);
  if v_entry.status <> 'draft' then raise exception 'Only draft journals can be posted' using errcode='23514'; end if;
  if not exists(select 1 from public.finance_periods p where p.id=v_entry.period_id and p.status='open' and v_entry.entry_date between p.starts_on and p.ends_on) then
    raise exception 'Finance period is closed' using errcode='23514';
  end if;
  select coalesce(sum(debit_iqd),0),coalesce(sum(credit_iqd),0)
    into v_debit,v_credit from public.finance_journal_lines where journal_entry_id=p_journal_id;
  if v_debit <= 0 or round(v_debit,2) <> round(v_credit,2) then raise exception 'Journal is not balanced in IQD' using errcode='23514'; end if;
  update public.finance_journal_entries set status='posted',posted_by=p_actor_id,posted_at=now()
  where id=p_journal_id returning * into v_entry;
  insert into public.staff_activity_log(staff_id,staff_name,action,target_id,details)
  select p_actor_id,s.full_name,'finance_journal_posted',v_entry.id::text,
    jsonb_build_object('journal_number',v_entry.journal_number,'debit_iqd',v_debit,'credit_iqd',v_credit)::text
  from public.staff s where s.id=p_actor_id;
  return jsonb_build_object('entry',to_jsonb(v_entry),'debit_iqd',v_debit,'credit_iqd',v_credit);
end;
$$;

create or replace function public.gc_finance_report(
  p_actor_id uuid, p_from_date date, p_to_date date, p_branch text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_branch text := nullif(lower(trim(coalesce(p_branch,''))),'');
  v_revenue numeric(18,2) := 0;
  v_expenses numeric(18,2) := 0;
  v_cashflow numeric(18,2) := 0;
  v_assets numeric(18,2) := 0;
  v_liabilities numeric(18,2) := 0;
  v_equity numeric(18,2) := 0;
  v_entries bigint := 0;
  v_monthly jsonb := '[]'::jsonb;
  v_branches jsonb := '[]'::jsonb;
begin
  if p_from_date is null or p_to_date is null or p_to_date < p_from_date then
    raise exception 'Valid reporting date range is required' using errcode='22023';
  end if;
  if v_branch='uae' then v_branch:='dubai'; end if;
  perform public.gc_finance_assert_actor(p_actor_id,coalesce(v_branch,(select case when lower(trim(coalesce(s.branch,'')))='uae' then 'dubai' when lower(trim(coalesce(s.branch,''))) in ('china','dubai','erbil') then lower(trim(s.branch)) else 'erbil' end from public.staff s where s.id=p_actor_id)),false);
  if v_branch is not null and not exists (
    select 1 from public.staff s where s.id=p_actor_id and s.role in ('admin','super_admin')
      or s.id=p_actor_id and (lower(trim(coalesce(s.branch,'')))='all'
      or (case when lower(trim(coalesce(s.branch,'')))='uae' then 'dubai' else lower(trim(coalesce(s.branch,''))) end)=v_branch)
  ) then raise exception 'Finance branch access denied' using errcode='42501'; end if;

  select
    coalesce(sum(case when a.account_type='revenue' then l.credit_iqd-l.debit_iqd else 0 end),0),
    coalesce(sum(case when a.account_type='expense' then l.debit_iqd-l.credit_iqd else 0 end),0),
    coalesce(sum(case when a.is_cash_account then l.debit_iqd-l.credit_iqd else 0 end),0)
  into v_revenue,v_expenses,v_cashflow
  from public.finance_journal_entries e
  join public.finance_journal_lines l on l.journal_entry_id=e.id
  join public.finance_accounts a on a.id=l.account_id
  where e.status='posted' and e.entry_date between p_from_date and p_to_date
    and (v_branch is null or e.branch=v_branch);

  select coalesce(sum(case when a.account_type='asset' then l.debit_iqd-l.credit_iqd else 0 end),0),
         coalesce(sum(case when a.account_type='liability' then l.credit_iqd-l.debit_iqd else 0 end),0),
         coalesce(sum(case when a.account_type='equity' then l.credit_iqd-l.debit_iqd else 0 end),0)
    into v_assets,v_liabilities,v_equity
  from public.finance_journal_entries e
  join public.finance_journal_lines l on l.journal_entry_id=e.id
  join public.finance_accounts a on a.id=l.account_id
  where e.status='posted' and e.entry_date <= p_to_date
    and (v_branch is null or e.branch=v_branch);

  select count(*) into v_entries from public.finance_journal_entries e
  where e.status='posted' and e.entry_date between p_from_date and p_to_date
    and (v_branch is null or e.branch=v_branch);

  select coalesce(jsonb_agg(jsonb_build_object('month',x.month,'revenue_iqd',x.revenue_iqd,'expenses_iqd',x.expenses_iqd,'profit_iqd',x.revenue_iqd-x.expenses_iqd) order by x.month),'[]'::jsonb)
    into v_monthly
  from (
    select to_char(e.entry_date,'YYYY-MM') as month,
      coalesce(sum(case when a.account_type='revenue' then l.credit_iqd-l.debit_iqd else 0 end),0) as revenue_iqd,
      coalesce(sum(case when a.account_type='expense' then l.debit_iqd-l.credit_iqd else 0 end),0) as expenses_iqd
    from public.finance_journal_entries e
    join public.finance_journal_lines l on l.journal_entry_id=e.id
    join public.finance_accounts a on a.id=l.account_id
    where e.status='posted' and e.entry_date between p_from_date and p_to_date
      and (v_branch is null or e.branch=v_branch)
    group by to_char(e.entry_date,'YYYY-MM')
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object('branch',x.branch,'revenue_iqd',x.revenue_iqd,'expenses_iqd',x.expenses_iqd,'profit_iqd',x.revenue_iqd-x.expenses_iqd,'cashflow_iqd',x.cashflow_iqd) order by x.branch),'[]'::jsonb)
    into v_branches
  from (
    select e.branch,
      coalesce(sum(case when a.account_type='revenue' then l.credit_iqd-l.debit_iqd else 0 end),0) as revenue_iqd,
      coalesce(sum(case when a.account_type='expense' then l.debit_iqd-l.credit_iqd else 0 end),0) as expenses_iqd,
      coalesce(sum(case when a.is_cash_account then l.debit_iqd-l.credit_iqd else 0 end),0) as cashflow_iqd
    from public.finance_journal_entries e
    join public.finance_journal_lines l on l.journal_entry_id=e.id
    join public.finance_accounts a on a.id=l.account_id
    where e.status='posted' and e.entry_date between p_from_date and p_to_date
      and (v_branch is null or e.branch=v_branch)
    group by e.branch
  ) x;

  return jsonb_build_object(
    'from_date',p_from_date,'to_date',p_to_date,'branch',v_branch,
    'revenue_iqd',v_revenue,'expenses_iqd',v_expenses,'profit_iqd',v_revenue-v_expenses,
    'net_cashflow_iqd',v_cashflow,'asset_balance_iqd',v_assets,'liability_balance_iqd',v_liabilities,
    'equity_balance_iqd',v_equity,'posted_entries',v_entries,'monthly_trend',v_monthly,'branch_comparison',v_branches
  );
end;
$$;

-- Tables are visible read-only to real authenticated finance staff via RLS.
alter table public.finance_accounts enable row level security;
alter table public.finance_periods enable row level security;
alter table public.finance_journal_entries enable row level security;
alter table public.finance_journal_lines enable row level security;

create policy finance_accounts_read on public.finance_accounts
for select to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists(select 1 from public.staff s where s.id=(select auth.uid()) and s.is_active=true
    and s.role in ('admin','super_admin','accountant','finance'))
);
create policy finance_periods_read on public.finance_periods
for select to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists(select 1 from public.staff s where s.id=(select auth.uid()) and s.is_active=true
    and s.role in ('admin','super_admin','accountant','finance'))
);
create policy finance_journal_entries_read on public.finance_journal_entries
for select to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists(select 1 from public.staff s where s.id=(select auth.uid()) and s.is_active=true
    and s.role in ('admin','super_admin','accountant','finance')
    and (s.role in ('admin','super_admin') or lower(trim(coalesce(s.branch,'')))='all'
      or (case when lower(trim(coalesce(s.branch,'')))='uae' then 'dubai' else lower(trim(coalesce(s.branch,''))) end)=finance_journal_entries.branch))
);
create policy finance_journal_lines_read on public.finance_journal_lines
for select to authenticated
using (
  (select private.is_real_authenticated_session())
  and exists(
    select 1 from public.finance_journal_entries e join public.staff s on s.id=(select auth.uid())
    where e.id=finance_journal_lines.journal_entry_id and s.is_active=true
      and s.role in ('admin','super_admin','accountant','finance')
      and (s.role in ('admin','super_admin') or lower(trim(coalesce(s.branch,'')))='all'
        or (case when lower(trim(coalesce(s.branch,'')))='uae' then 'dubai' else lower(trim(coalesce(s.branch,''))) end)=e.branch)
  )
);

revoke all on public.finance_accounts,public.finance_periods,public.finance_journal_entries,public.finance_journal_lines from anon,public,authenticated;
grant select on public.finance_accounts,public.finance_periods,public.finance_journal_entries,public.finance_journal_lines to authenticated;
grant select,insert,update,delete on public.finance_accounts,public.finance_periods,public.finance_journal_entries,public.finance_journal_lines to service_role;

revoke all on function public.gc_finance_touch_updated_at() from public,anon,authenticated;
revoke all on function public.gc_finance_assert_actor(uuid,text,boolean) from public,anon,authenticated;
revoke all on function public.gc_finance_create_period(uuid,text,date,date,text) from public,anon,authenticated;
revoke all on function public.gc_finance_close_period(uuid,uuid) from public,anon,authenticated;
revoke all on function public.gc_finance_create_journal(uuid,date,text,text,jsonb,text,text,text,boolean) from public,anon,authenticated;
revoke all on function public.gc_finance_post_journal(uuid,uuid) from public,anon,authenticated;
revoke all on function public.gc_finance_report(uuid,date,date,text) from public,anon,authenticated;
grant execute on function public.gc_finance_assert_actor(uuid,text,boolean) to service_role;
grant execute on function public.gc_finance_create_period(uuid,text,date,date,text) to service_role;
grant execute on function public.gc_finance_close_period(uuid,uuid) to service_role;
grant execute on function public.gc_finance_create_journal(uuid,date,text,text,jsonb,text,text,text,boolean) to service_role;
grant execute on function public.gc_finance_post_journal(uuid,uuid) to service_role;
grant execute on function public.gc_finance_report(uuid,date,date,text) to service_role;
