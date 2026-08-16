-- Intentionally no permission changes in this migration.
-- Step 4 prepares the public configuration boundary first.
-- Direct app_settings privileges remain until the frontend bridge is deployed
-- and verified, preventing a production pricing regression.
comment on table public.app_settings is 'Internal application settings. Public rate access is being migrated behind the public-config Edge Function.';;
