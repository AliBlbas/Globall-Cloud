-- These functions exist only as table triggers; clients must not execute them as RPCs.
revoke execute on function public.assign_customer_gc_identity() from public, anon, authenticated;
revoke execute on function public.prevent_customer_directory_code_update() from public, anon, authenticated;
