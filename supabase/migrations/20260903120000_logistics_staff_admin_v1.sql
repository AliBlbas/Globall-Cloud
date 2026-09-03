create or replace function public.get_staff_directory_v2(p_actor_id uuid)
returns table(
  id uuid,
  full_name text,
  role text,
  branch text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  email text,
  phone text,
  shipment_count bigint,
  open_task_count bigint,
  customer_count bigint,
  activity_count bigint
)
language plpgsql
security definer
set search_path=public,pg_catalog,pg_temp
as $$
begin
  if not exists(select 1 from public.staff where id=p_actor_id and is_active=true and role='super_admin') then
    raise exception 'Super admin permission required';
  end if;
  return query
  select
    s.id,
    s.full_name,
    s.role,
    s.branch,
    s.is_active,
    s.created_at,
    s.updated_at,
    au.email,
    au.phone,
    coalesce((select count(*) from public.shipments sh where sh.assigned_staff_id=s.id),0),
    coalesce((select count(*) from public.staff_tasks st where st.assignee_id=s.id and lower(coalesce(st.status,''))<>'completed'),0),
    coalesce((select count(*) from public.customer_directory cd where cd.manager_staff_id=s.id),0),
    coalesce((select count(*) from public.staff_activity_log al where al.staff_id=s.id),0)
  from public.staff s
  left join auth.users au on au.id=s.id
  order by s.is_active desc, lower(coalesce(s.full_name,au.email,'')), s.created_at asc;
end;
$$;
revoke all on function public.get_staff_directory_v2(uuid) from public;
grant execute on function public.get_staff_directory_v2(uuid) to service_role;
