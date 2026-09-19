alter table public.shipments add column if not exists step_photos jsonb not null default '{}'::jsonb;

insert into storage.buckets (id, name, public)
values ('shipment-photos', 'shipment-photos', true)
on conflict (id) do nothing;

drop policy if exists "shipment_photos_public_read" on storage.objects;
create policy "shipment_photos_public_read" on storage.objects
  for select using (bucket_id = 'shipment-photos');

drop policy if exists "shipment_photos_staff_write" on storage.objects;
create policy "shipment_photos_staff_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'shipment-photos' and is_staff());

drop policy if exists "shipment_photos_staff_update" on storage.objects;
create policy "shipment_photos_staff_update" on storage.objects
  for update to authenticated using (bucket_id = 'shipment-photos' and is_staff());

drop policy if exists "shipment_photos_staff_delete" on storage.objects;
create policy "shipment_photos_staff_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'shipment-photos' and is_staff());
;
