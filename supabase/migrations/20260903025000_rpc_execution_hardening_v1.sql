-- Reproducible RPC hardening applied to production.
-- Customer creation is an admin-only SECURITY DEFINER operation.
create or replace function public.create_customer_with_gc(
  p_name text,
  p_phone text default null,
  p_whatsapp_phone text default null,
  p_email text default null,
  p_city text default null,
  p_delivery_location text default null,
  p_preferred_language text default 'ckb',
  p_preferred_contact_channel text default 'whatsapp'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_gc text;
begin
  if not public.is_admin() then
    raise exception 'Admin authorization required';
  end if;
  if nullif(trim(p_name),'') is null then
    raise exception 'Customer name is required';
  end if;
  v_gc := public.generate_gc_customer_code();
  insert into public.customer_directory (
    code,gc_code,normalized_gc_code,name,phone,whatsapp_phone,email,city,delivery_location,
    preferred_language,preferred_contact_channel,customer_status,is_active,total_shipments,total_spend,created_at,updated_at
  ) values (
    v_gc,v_gc,v_gc,trim(p_name),nullif(trim(p_phone),''),nullif(trim(p_whatsapp_phone),''),nullif(trim(p_email),''),
    nullif(trim(p_city),''),nullif(trim(p_delivery_location),''),coalesce(nullif(trim(p_preferred_language),''),'ckb'),
    coalesce(nullif(trim(p_preferred_contact_channel),''),'whatsapp'),'active',true,0,0,now(),now()
  ) returning id into v_id;
  return jsonb_build_object('id',v_id,'gc_code',v_gc,'name',trim(p_name));
end;
$$;
revoke all on function public.create_customer_with_gc(text,text,text,text,text,text,text,text) from public, anon;
grant execute on function public.create_customer_with_gc(text,text,text,text,text,text,text,text) to authenticated, service_role;

-- These RPCs contain their own super-admin checks; the authenticated role needs
-- execute permission so the protected Staff UI can reach them.
grant execute on function public.super_admin_update_customer(uuid,text,text,text,text,text,text,text,boolean,text) to authenticated;
grant execute on function public.super_admin_correct_customer(uuid,text,text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.super_admin_delete_customer(uuid) to authenticated;
grant execute on function public.super_admin_delete_customer(uuid,text) to authenticated;
grant execute on function public.super_admin_set_staff_status(uuid,boolean) to authenticated;
grant execute on function public.super_admin_set_staff_role(uuid,text,text) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
