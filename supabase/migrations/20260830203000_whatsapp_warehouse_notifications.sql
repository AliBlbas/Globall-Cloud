-- Automatically enqueue WhatsApp when warehouse intake is created.
create or replace function public.enqueue_warehouse_whatsapp()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_phone text; v_code text; v_body text; v_title text; v_event text; v_media text;
begin
  v_phone:=nullif(trim(coalesce(new.directory_phone,'')),'');
  if v_phone is null then return new; end if;
  if v_phone !~ '^\\+' then
    v_phone:=case when left(regexp_replace(v_phone,'\\D','','g'),1)='0' then '+964'||substr(regexp_replace(v_phone,'\\D','','g'),2) else '+964'||regexp_replace(v_phone,'\\D','','g') end;
  end if;
  v_code:=coalesce(nullif(trim(new.gc_code_detected),''),nullif(trim(new.scan_code),''),nullif(trim(new.batch_code),''));
  v_title:='Globall Cloud — کۆگای وەرگرت';
  v_body:=format('سڵاو، %s. کاڵاکەت لە کۆگای %s وەرگیرا. کۆد: %s. %s',coalesce((select name from public.customer_directory c where c.id=new.directory_customer_id limit 1),'بەڕێز'),coalesce(new.location,'—'),coalesce(v_code,'—'),case when jsonb_array_length(coalesce(new.photos,'[]'::jsonb))>0 then format('%s وێنەی بەڵگە هەیە.',jsonb_array_length(new.photos)) else '' end);
  v_event:='warehouse:whatsapp:'||new.id::text;
  v_media:=case when jsonb_typeof(coalesce(new.photos,'[]'::jsonb))='array' and jsonb_array_length(coalesce(new.photos,'[]'::jsonb))>0 then new.photos->>0 else null end;
  insert into public.notification_outbox(customer_user_id,shipment_id,channel,event_key,recipient,payload)
  values(new.directory_customer_id::uuid,new.shipment_id,'whatsapp',v_event,v_phone,jsonb_build_object('title',v_title,'body',v_body,'template_name',coalesce((select value from public.app_settings where key='whatsapp_template_name' limit 1),'globall_warehouse_received'),'template_language',coalesce((select value from public.app_settings where key='whatsapp_template_language' limit 1),'ckb'),'media_url',v_media,'gc_code',v_code,'warehouse',new.location,'cartons',coalesce((new.ai_detected_items->0->>'cartons')::integer,0)) )
  on conflict (event_key,channel) do nothing;
  return new;
exception when others then
  raise notice 'warehouse whatsapp enqueue failed: %',sqlerrm; return new;
end;$$;
revoke all on function public.enqueue_warehouse_whatsapp() from public,anon,authenticated;
grant execute on function public.enqueue_warehouse_whatsapp() to service_role;
drop trigger if exists trg_warehouse_whatsapp on public.warehouse_receipts;
create trigger trg_warehouse_whatsapp after insert on public.warehouse_receipts for each row execute function public.enqueue_warehouse_whatsapp();

insert into public.app_settings(key,value) values('whatsapp_business_phone','+9647507577137') on conflict(key) do update set value=excluded.value;
insert into public.app_settings(key,value) values('whatsapp_template_name','globall_warehouse_received') on conflict(key) do nothing;
insert into public.app_settings(key,value) values('whatsapp_template_language','ckb') on conflict(key) do nothing;
