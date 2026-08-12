-- Step 5: tighten GraphQL/Data API exposure for the staff table.
-- Apply only after Staff OS login/session verification has passed in the live site
-- with the updated staff-auth-fix.js.
-- The internal admin console already reads staff through account-admin using
-- a server-side service client, so removing this direct authenticated SELECT
-- is the intended end state.
revoke select on table public.staff from authenticated;
