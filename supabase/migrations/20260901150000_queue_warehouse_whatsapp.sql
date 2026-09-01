create or replace function public.queue_warehouse_whatsapp() returns trigger language plpgsql security definer set search_path=public as $$
declare customer_uid uuid; recipient_phone text;
begin
 if new.directory_customer_id is null then return new; end if;
 select auth_user_id, coalesce(phone, phone2, whatsapp_phone) into customer_uid, recipient_phone from public.customer_directory where id=new.directory_customer_id limit 1;
 if customer_uid is null or recipient_phone is null or btrim(recipient_phone)='' then return new; end if;
 insert into public.notification_outbox(customer_user_id,shipment_id,channel,event_key,recipient,payload,status,attempts,next_attempt_at)
 values(customer_uid,new.shipment_id,'whatsapp','warehouse_receipt:'||new.id::text,recipient_phone,jsonb_build_object('template_key','warehouse_receipt','message',coalesce(new.whatsapp_message,'Globall Cloud: warehouse receipt received'),'gc_code',coalesce(new.gc_code_detected,new.gc_code),'batch_code',new.batch_code,'warehouse',new.location,'photos',coalesce(new.photos,'[]'::jsonb),'carton_count',new.carton_count),'queued',0,now())
 on conflict (event_key,channel) do nothing;
 return new;
end $$;

drop trigger if exists trg_queue_warehouse_whatsapp on public.warehouse_receipts;
create trigger trg_queue_warehouse_whatsapp after insert on public.warehouse_receipts for each row execute function public.queue_warehouse_whatsapp();