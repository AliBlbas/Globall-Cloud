create or replace function public.protect_customer_identity_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user <> 'service_role' and (
    new.code is distinct from old.code
    or new.gc_code is distinct from old.gc_code
    or new.email is distinct from old.email
  ) then
    raise exception 'Customer identity fields are managed by Super Admin only';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_customer_identity_fields on public.customer_directory;
create trigger trg_protect_customer_identity_fields
before update on public.customer_directory
for each row
execute function public.protect_customer_identity_fields();;
