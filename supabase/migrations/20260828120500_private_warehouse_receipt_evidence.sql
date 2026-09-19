-- Warehouse receipt photos are customer evidence and must not be anonymously readable.
update storage.buckets
set public = false
where id = 'warehouse-receipts';

drop policy if exists warehouse_receipts_public_read on storage.objects;

create policy warehouse_receipts_staff_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'warehouse-receipts'
  and is_staff()
);
