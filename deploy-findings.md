# Deployment Findings

- Supabase project dashboard session is authenticated for project `ahslifnthiwfkmaswjno`.
- The project currently lists 10 deployed Edge Functions; `public-quote` was not present before this attempt.
- The `public-quote` source was entered into the Supabase browser editor and named `public-quote`.
- Clicking Deploy returned a generic HTTP 500 and left the editor on the new-function page; no actionable error appeared in the visible page or browser console.
- The local validation suite passes. The live endpoint was previously confirmed as `404 NOT_FOUND`, so the function is not deployed yet.
- The next recovery path is to inspect Supabase logs/deploy activity, validate required project secrets (`SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY`), and retry with a minimal compatible Edge Function if the browser editor rejects the source.

- Supabase dashboard is now authenticated for the project and SQL Editor is available.
- Edge Functions list still shows 10 functions, so the browser-editor deploy did not create `public-quote`.
- SQL Editor is available for the non-destructive quote contact migration; execution must be followed by a schema verification query.

- The SQL editor content was populated successfully, but the subsequent click used a stale page index and navigated back to the Functions list; the migration has not yet been confirmed as executed.
- The Functions list still shows 10 functions and no `public-quote`, so deployment remains pending.

- The SQL Editor was reopened successfully and the migration query was populated into the fresh editor model. It is ready for the correct Run action.

- A second stale browser index redirected to Realtime instead of executing SQL; the migration still has not been confirmed as applied. The correct path is to reopen SQL Editor, populate the query, then use the current page's Run button index only after the page is inspected.

- The fresh SQL Editor model now contains the 653-character non-destructive migration. The current page exposes the Run button at index 51; the next action will use that current index without navigating away.

- The SQL editor sidebar contains many saved queries with duplicate names. The recent click selected an existing staff query instead of the migration. To avoid further stale-index mistakes, the next retry will open a new SQL query, inject the migration, focus the Monaco editor, and execute it with the editor's Ctrl+Enter shortcut.

- The fresh query now displays the intended migration in the editor. Ctrl+Enter was translated to Meta+Enter by the browser layer and did not produce a confirmed result; the page still says “Click Run to execute your query”. No migration success is confirmed yet.

- The `Add quote request contact and logistics fields` query executed successfully in Supabase SQL Editor. The UI showed `Success. No rows returned`, which is expected for ALTER/CREATE/COMMENT statements. The database schema migration is now confirmed applied.

- The retry deployment succeeded. Supabase now shows `public-quote` at `https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/public-quote`, deployed a few seconds ago. The function settings page is available and `Verify JWT with legacy secret` is currently OFF, which is correct for this public endpoint because the function implements its own origin, validation, honeypot, and rate-limit controls.

- On the public-quote Settings page, the JWT switch is confirmed `aria-checked=false` / `data-state=unchecked`. The Save changes button was enabled and clicked. A fresh smoke test is required to verify gateway propagation; the earlier 401 was from the setting before this confirmed save.

- After saving the JWT setting, the combined smoke script no longer reached the quote assertions because the protected site response timed out while reading HTML. The live site is still behind Cloudflare Access and is not a reliable public smoke target until that access boundary is removed. Supabase endpoint-specific checks should be run separately with a short timeout.

- Cloudflare MCP API fallback was attempted, but the configured session reported `server not found`. Access changes therefore still require the authenticated Cloudflare Dashboard path; no API change was made.
