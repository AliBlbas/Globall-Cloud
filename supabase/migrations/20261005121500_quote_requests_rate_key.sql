begin;

alter table public.quote_requests
  add column if not exists rate_key text;

create index if not exists quote_requests_rate_key_idx
  on public.quote_requests(rate_key)
  where rate_key is not null;

comment on column public.quote_requests.rate_key is
  'Exact active pricing_rates.rate_key selected by the customer, when available.';

commit;
