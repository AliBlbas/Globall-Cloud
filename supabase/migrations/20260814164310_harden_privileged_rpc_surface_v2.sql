create schema if not exists private;

create or replace function private.admin_list_customers()
returns table(id uuid, email text, full_name text, phone text, created_at timestamptz, shipment_count bigint)
language sql security definer
set search_path = public, pg_temp
as $$
  select cd.id, cd.email, cd.name as full_name, cd.phone, cd.created_at,
         coalesce(count(s.id), 0)::bigint as shipment_count
  from public.customer_directory cd
  left join public.shipments s
    on s.directory_customer_id = cd.id or s.customer_user_id = cd.auth_user_id
  where coalesce(cd.is_active, true) = true and is_staff()
  group by cd.id, cd.email, cd.name, cd.phone, cd.created_at
  order by cd.created_at desc;
$$;

grant execute on function private.admin_list_customers() to public;

create or replace function private.advance_delivery_assignment(p_assignment_id uuid, p_next_status text, p_note text default null)
returns public.delivery_assignments
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := (select auth.uid());
  v_assignment public.delivery_assignments;
  v_staff public.staff;
  v_ship public.shipments;
  v_now timestamptz := now();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_assignment from public.delivery_assignments where id=p_assignment_id for update;
  if not found then raise exception 'Assignment not found'; end if;
  select * into v_staff from public.staff where id=v_assignment.assigned_staff_id and is_active=true;
  if not found then raise exception 'Assigned staff is inactive or missing'; end if;
  if not exists (
    select 1 from public.staff actor
    where actor.id=v_uid and actor.is_active=true
      and (actor.id=v_assignment.assigned_staff_id or actor.role='super_admin')
  ) then raise exception 'Not authorized for this delivery'; end if;
  if p_next_status not in ('assigned','accepted','picked_up','out_for_delivery','delivered','failed','cancelled') then raise exception 'Invalid delivery status'; end if;
  if p_next_status='accepted' and v_assignment.status <> 'assigned' then raise exception 'Invalid transition'; end if;
  if p_next_status='picked_up' and v_assignment.status <> 'accepted' then raise exception 'Invalid transition'; end if;
  if p_next_status='out_for_delivery' and v_assignment.status <> 'picked_up' then raise exception 'Invalid transition'; end if;
  if p_next_status='delivered' and v_assignment.status <> 'out_for_delivery' then raise exception 'Invalid transition'; end if;
  if p_next_status in ('failed','cancelled') and v_assignment.status in ('delivered','cancelled') then raise exception 'Invalid transition'; end if;
  update public.delivery_assignments
    set status=p_next_status,
        pickup_at=case when p_next_status='picked_up' and pickup_at is null then v_now else pickup_at end,
        delivered_at=case when p_next_status='delivered' then coalesce(delivered_at,v_now) else delivered_at end,
        note=coalesce(p_note,note), updated_at=v_now
    where id=p_assignment_id returning * into v_assignment;
  update public.shipments
    set operational_status=case p_next_status
      when 'accepted' then 'assigned' when 'picked_up' then 'picked_up'
      when 'out_for_delivery' then 'out_for_delivery' when 'delivered' then 'delivered'
      when 'failed' then 'delayed' when 'cancelled' then 'cancelled' else operational_status end,
      tracking_updated_at=v_now
    where id=v_assignment.shipment_id returning * into v_ship;
  insert into public.shipment_events(shipment_id,event_type,status,note,occurred_at,created_by,created_by_name,metadata)
    values(v_assignment.shipment_id,'delivery_status',p_next_status,p_note,v_now,v_uid,v_staff.full_name,jsonb_build_object('assignment_id',v_assignment.id));
  insert into public.staff_activity_log(staff_id,staff_name,action,target_id,details,created_at)
    select v_uid,actor.full_name,'delivery_status_changed',v_assignment.shipment_id,coalesce(p_note,'status='||p_next_status),v_now from public.staff actor where actor.id=v_uid;
  if v_ship.customer_user_id is not null then
    insert into public.customer_notifications(customer_user_id,shipment_id,kind,title,body,action_url)
      values(v_ship.customer_user_id,v_ship.id,'shipment',case p_next_status when 'picked_up' then 'بارەکەت وەرگیرا' when 'out_for_delivery' then 'بارەکەت لە ڕێگادایە' when 'delivered' then 'بارەکەت گەیشت' else 'نوێکردنەوەی بار' end,coalesce(p_note,'Status updated to '||p_next_status),'/tracking.html?tracking='||v_ship.id);
  end if;
  return v_assignment;
end;
$$;

grant execute on function private.advance_delivery_assignment(uuid,text,text) to public;

create or replace function private.complete_delivery(p_shipment_id text, p_receiver_name text, p_receiver_phone text, p_note text default null, p_latitude numeric default null, p_longitude numeric default null, p_photo_urls jsonb default '[]'::jsonb, p_signature_url text default null)
returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := (select auth.uid());
  v_staff public.staff;
  v_assignment public.delivery_assignments;
  v_proof uuid;
  v_now timestamptz := now();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_staff from public.staff where id=v_uid and is_active=true;
  if not found then raise exception 'Staff access required'; end if;
  select * into v_assignment from public.delivery_assignments where shipment_id=p_shipment_id and status in ('assigned','accepted','picked_up','out_for_delivery') order by created_at desc limit 1 for update;
  if not found then raise exception 'Active delivery assignment not found'; end if;
  if v_assignment.assigned_staff_id <> v_uid and v_staff.role <> 'super_admin' then raise exception 'Not authorized for this delivery'; end if;
  if nullif(trim(coalesce(p_receiver_name,'')),'') is null then raise exception 'Receiver name is required'; end if;
  insert into public.delivery_proofs(shipment_id,delivered_at,receiver_name,receiver_phone,signature_url,photo_urls,note,latitude,longitude,created_by)
    values(p_shipment_id,v_now,trim(p_receiver_name),nullif(trim(coalesce(p_receiver_phone,'')),''),p_signature_url,coalesce(p_photo_urls,'[]'::jsonb),p_note,p_latitude,p_longitude,v_uid)
    on conflict (shipment_id) do update set delivered_at=excluded.delivered_at,receiver_name=excluded.receiver_name,receiver_phone=excluded.receiver_phone,signature_url=excluded.signature_url,photo_urls=excluded.photo_urls,note=excluded.note,latitude=excluded.latitude,longitude=excluded.longitude,created_by=excluded.created_by,updated_at=v_now
    returning id into v_proof;
  update public.delivery_assignments set status='delivered',delivered_at=v_now,proof_id=v_proof,updated_at=v_now where id=v_assignment.id;
  update public.shipments set operational_status='delivered',tracking_updated_at=v_now,current_location_label=coalesce(current_location_label,'Delivered') where id=p_shipment_id;
  insert into public.shipment_events(shipment_id,event_type,status,location,note,occurred_at,created_by,created_by_name,metadata)
    values(p_shipment_id,'delivered','delivered','Delivery',p_note,v_now,v_uid,v_staff.full_name,jsonb_build_object('proof_id',v_proof,'assignment_id',v_assignment.id));
  insert into public.customer_notifications(customer_user_id,shipment_id,kind,title,body,action_url)
    select s.customer_user_id,s.id,'shipment_status','Shipment delivered','Your shipment has been delivered.','/tracking.html?tracking='||s.id from public.shipments s where s.id=p_shipment_id and s.customer_user_id is not null;
  insert into public.staff_activity_log(staff_id,staff_name,action,target_id,details) values(v_uid,v_staff.full_name,'complete_delivery',p_shipment_id,jsonb_build_object('proof_id',v_proof,'receiver_name',trim(p_receiver_name)));
  return v_proof;
end;
$$;

grant execute on function private.complete_delivery(text,text,text,text,numeric,numeric,jsonb,text) to public;

-- Public RPC names remain unchanged for frontend compatibility, but wrappers run as invoker.
create or replace function public.admin_list_customers()
returns table(id uuid, email text, full_name text, phone text, created_at timestamptz, shipment_count bigint)
language sql security invoker
set search_path = public, pg_temp
as $$
  select * from private.admin_list_customers();
$$;

create or replace function public.advance_delivery_assignment(p_assignment_id uuid, p_next_status text, p_note text default null)
returns public.delivery_assignments
language sql security invoker
set search_path = public, pg_temp
as $$
  select * from private.advance_delivery_assignment(p_assignment_id, p_next_status, p_note);
$$;

create or replace function public.complete_delivery(p_shipment_id text, p_receiver_name text, p_receiver_phone text, p_note text default null, p_latitude numeric default null, p_longitude numeric default null, p_photo_urls jsonb default '[]'::jsonb, p_signature_url text default null)
returns uuid
language sql security invoker
set search_path = public, pg_temp
as $$
  select private.complete_delivery(p_shipment_id, p_receiver_name, p_receiver_phone, p_note, p_latitude, p_longitude, p_photo_urls, p_signature_url);
$$;

revoke execute on function public.admin_list_customers() from anon, authenticated, public;
grant execute on function public.admin_list_customers() to authenticated;
revoke execute on function public.advance_delivery_assignment(uuid,text,text) from anon, authenticated, public;
grant execute on function public.advance_delivery_assignment(uuid,text,text) to authenticated;
revoke execute on function public.complete_delivery(text,text,text,text,numeric,numeric,jsonb,text) from anon, authenticated, public;
grant execute on function public.complete_delivery(text,text,text,text,numeric,numeric,jsonb,text) to authenticated;
;
