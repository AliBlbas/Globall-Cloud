-- Keep customer cargo photos private and restrict file size/content types.
-- Existing per-user folder RLS policies remain in place.
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'image/gif',
      'image/heic',
      'image/heif'
    ]::text[]
where id = 'customer-request-photos';

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'customer-request-photos') then
    raise exception 'Required private bucket customer-request-photos is missing.';
  end if;
end
$$;
