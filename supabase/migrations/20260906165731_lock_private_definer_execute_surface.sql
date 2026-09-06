do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.prosecdef = true
  loop
    execute format('revoke execute on function %s from public, anon', r.signature);
    if r.signature::text not in (
      'private.admin_list_customers()',
      'private.sync_staff_email()'
    ) then
      execute format('grant execute on function %s to authenticated', r.signature);
    end if;
  end loop;
end
$$;
