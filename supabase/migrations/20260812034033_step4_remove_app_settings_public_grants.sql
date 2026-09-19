-- Revoke direct table access only after the public-config Edge Function is live.
-- This migration is intentionally not the production cut-over yet; keep it
-- separate so it can be applied after the frontend verification pass.
-- (No-op marker migration for source control.)
select 1;;
