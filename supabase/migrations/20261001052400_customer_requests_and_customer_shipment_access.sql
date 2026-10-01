-- Customer-owned shipment visibility and real shipment-request intake.
alter table public.quote_requests
  add column if not exists request_type text not null default 'quote',
  add column if not exists cargo_country text,
  add column if not exists cargo_description text,
  add column if not exists cargo_image_path text;

drop policy if exists gc_customer_shipments_select on public.shipments;
create policy gc_customer_shipments_select on public.shipments
  for select to authenticated
  using (
    customer_user_id = auth.uid()
    or exists (
      select 1 from public.customer_directory cd
      where cd.id = shipments.directory_customer_id
        and cd.auth_user_id = auth.uid()
        and cd.is_active = true
    )
  );

insert into storage.buckets(id, name, public)
values ('customer-request-photos', 'customer-request-photos', false)
on conflict (id) do update set public = false;
drop policy if exists gc_customer_request_photo_insert on storage.objects;
create policy gc_customer_request_photo_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'customer-request-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists gc_customer_request_photo_select on storage.objects;
create policy gc_customer_request_photo_select on storage.objects
  for select to authenticated
  using (bucket_id = 'customer-request-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
drop policy if exists gc_customer_request_photo_delete on storage.objects;
create policy gc_customer_request_photo_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'customer-request-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));

update public.gc_warehouse_addresses
set address = case id
  when 'erbil' then 'هەولێر — وەرگرتنی بار تەنها لە نووسینگەی Globall Cloud'
  else address
end,
contact = case id when 'erbil' then 'لەگەڵ ستاف پەیوەندی بکە' else contact end,
updated_at = now()
where id = 'erbil';
