-- Keep warehouse evidence private and enforce the same media limits at Storage as at the Edge Function.
-- The bucket is used by service-role Edge Functions; customer files are exposed only through owner-scoped signed URLs.
BEGIN;

UPDATE storage.buckets
SET file_size_limit = 12582912,
    allowed_mime_types = ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif'
    ]::text[]
WHERE id = 'warehouse-receipts'
  AND public IS FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'warehouse-receipts'
      AND public IS FALSE
      AND file_size_limit = 12582912
      AND allowed_mime_types @> ARRAY[
        'image/jpeg','image/png','image/webp','image/heic','image/heif'
      ]::text[]
      AND cardinality(allowed_mime_types) = 5
  ) THEN
    RAISE EXCEPTION 'warehouse-receipts bucket must exist, remain private, and enforce the approved image type/size limits';
  END IF;
END;
$$;

COMMIT;