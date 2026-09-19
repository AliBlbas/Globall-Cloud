create or replace function private.set_updated_at() returns trigger language plpgsql set search_path = pg_catalog, public, private as $$ begin new.updated_at = timezone('utc', now()); return new; end; $$;

drop trigger if exists set_updated_at_staff on public.staff;
create trigger set_updated_at_staff before update on public.staff for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at_customer_directory on public.customer_directory;
create trigger set_updated_at_customer_directory before update on public.customer_directory for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at_quote_requests on public.quote_requests;
create trigger set_updated_at_quote_requests before update on public.quote_requests for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at_delivery_assignments on public.delivery_assignments;
create trigger set_updated_at_delivery_assignments before update on public.delivery_assignments for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at_delivery_proofs on public.delivery_proofs;
create trigger set_updated_at_delivery_proofs before update on public.delivery_proofs for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at_logistics_exceptions on public.logistics_exceptions;
create trigger set_updated_at_logistics_exceptions before update on public.logistics_exceptions for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at_app_settings on public.app_settings;
create trigger set_updated_at_app_settings before update on public.app_settings for each row execute function private.set_updated_at();;
