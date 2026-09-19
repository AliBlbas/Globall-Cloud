-- Globall Cloud production hardening: close legacy direct table access.
-- Server-side Edge Functions / RPCs remain the intended access boundary.
alter table public.customers enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.settings enable row level security;
revoke all on table public.customers, public.exchange_rates, public.finance_transactions, public.pricing_rules, public.settings from anon, authenticated;
do $$
declare r record;
begin
  for r in select * from (values ('customers'::text),('exchange_rates'::text),('finance_transactions'::text),('pricing_rules'::text),('settings'::text)) t(table_name) loop
    execute format('drop policy if exists gc_server_only on public.%I', r.table_name);
    execute format('create policy gc_server_only on public.%I as restrictive for all to anon,authenticated using (false) with check (false)', r.table_name);
  end loop;
end $$;
