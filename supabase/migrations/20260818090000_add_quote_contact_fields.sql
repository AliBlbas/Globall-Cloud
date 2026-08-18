-- Add contact fields required by the public quote workflow.
-- Non-destructive: existing quote records remain intact.
alter table public.quote_requests
  add column if not exists customer_email text,
  add column if not exists service_level text default 'standard',
  add column if not exists incoterm text;

create index if not exists quote_requests_customer_email_idx
  on public.quote_requests(lower(customer_email));

comment on column public.quote_requests.customer_email is 'Customer contact email captured at quote intake; not a credential.';
comment on column public.quote_requests.service_level is 'Requested service level: standard, express, or priority.';
comment on column public.quote_requests.incoterm is 'Requested Incoterm such as EXW, FOB, CIF, or DDP.';
