-- Canonical customer identity rule: a populated GC code identifies exactly one customer.
-- The application normalizes input to uppercase GC-* before lookup and write.
create unique index if not exists customer_directory_gc_code_ci_uidx
  on public.customer_directory (lower(trim(gc_code)))
  where gc_code is not null and length(trim(gc_code)) > 0;

comment on index public.customer_directory_gc_code_ci_uidx is
  'One case-insensitive, trimmed GC code per customer; recognition resolves to this canonical identity.';
