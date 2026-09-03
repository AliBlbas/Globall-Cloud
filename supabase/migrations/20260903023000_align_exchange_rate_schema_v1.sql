-- Keep the existing USD/IQD source columns used by FX workers while exposing
-- the richer contract consumed by account-admin. The trigger keeps both shapes synchronized.

alter table public.exchange_rates add column if not exists base_currency text default 'USD';
alter table public.exchange_rates add column if not exists quote_currency text default 'IQD';
alter table public.exchange_rates add column if not exists rate numeric;
alter table public.exchange_rates add column if not exists effective_from date;
alter table public.exchange_rates add column if not exists effective_to date;
alter table public.exchange_rates add column if not exists is_active boolean default true;
alter table public.exchange_rates add column if not exists source_note text;
alter table public.exchange_rates add column if not exists updated_by uuid;
alter table public.exchange_rates add column if not exists updated_at timestamptz default now();

update public.exchange_rates
set base_currency=coalesce(nullif(upper(trim(base_currency)),''),'USD'),
    quote_currency=coalesce(nullif(upper(trim(quote_currency)),''),'IQD'),
    rate=coalesce(rate,usd_to_iqd),
    effective_from=coalesce(effective_from,effective_on,current_date),
    is_active=coalesce(is_active,true),
    source_note=coalesce(source_note,source),
    updated_at=coalesce(updated_at,created_at,now());

create or replace function public.sync_exchange_rates_compat()
returns trigger
language plpgsql
set search_path=public,pg_catalog,pg_temp
as $$
begin
  if tg_op='INSERT' then
    new.base_currency := coalesce(nullif(upper(trim(new.base_currency)),''),'USD');
    new.quote_currency := coalesce(nullif(upper(trim(new.quote_currency)),''),'IQD');
    new.usd_to_iqd := coalesce(new.usd_to_iqd,new.rate);
    new.rate := coalesce(new.rate,new.usd_to_iqd);
    new.effective_from := coalesce(new.effective_from,new.effective_on,current_date);
    new.effective_on := coalesce(new.effective_on,new.effective_from,current_date);
    new.is_active := coalesce(new.is_active,true);
    new.source_note := coalesce(new.source_note,new.source);
    new.source := coalesce(new.source,new.source_note,'manual');
    new.updated_at := coalesce(new.updated_at,now());
    return new;
  end if;

  if new.rate is distinct from old.rate and new.usd_to_iqd is not distinct from old.usd_to_iqd then
    new.usd_to_iqd := new.rate;
  elsif new.usd_to_iqd is distinct from old.usd_to_iqd and new.rate is not distinct from old.rate then
    new.rate := new.usd_to_iqd;
  end if;

  if new.source_note is distinct from old.source_note and new.source is not distinct from old.source then
    new.source := new.source_note;
  elsif new.source is distinct from old.source and new.source_note is not distinct from old.source_note then
    new.source_note := new.source;
  end if;

  if new.effective_from is distinct from old.effective_from and new.effective_on is not distinct from old.effective_on then
    new.effective_on := new.effective_from;
  elsif new.effective_on is distinct from old.effective_on and new.effective_from is not distinct from old.effective_from then
    new.effective_from := new.effective_on;
  end if;

  new.base_currency := coalesce(nullif(upper(trim(new.base_currency)),''),old.base_currency,'USD');
  new.quote_currency := coalesce(nullif(upper(trim(new.quote_currency)),''),old.quote_currency,'IQD');
  new.is_active := coalesce(new.is_active,old.is_active,true);
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.sync_exchange_rates_compat() from public,anon,authenticated;
drop trigger if exists trg_exchange_rates_compat on public.exchange_rates;
create trigger trg_exchange_rates_compat
before insert or update on public.exchange_rates
for each row execute function public.sync_exchange_rates_compat();
