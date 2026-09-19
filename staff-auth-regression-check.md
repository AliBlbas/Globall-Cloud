# Staff Auth Regression Checks

Target: `/staff` -> `/staff-os.html` Staff OS.

- No session: login gate is shown.
- Invalid credentials: remains on login; no redirect loop.
- Valid staff credentials: authentication stays on Staff OS; no self-redirect to `/staff-os?gc_auth=1`.
- Refresh with valid session: restores Staff OS from the persisted Supabase session.
- Non-staff authenticated account: signed out and shown the login gate with a forbidden message.
- MFA: successful TOTP verification enters Staff OS without changing route; failed code remains on MFA step.
- Staff verification uses RLS-scoped `staff` access; no service-role key is used in the browser.
