# Control Plane browser smoke findings

- Local static server responded `200 OK` for `/control-plane.html`.
- The response included the production-style CSP with `script-src 'self'` plus the approved CDN origins, and no `unsafe-inline` in `script-src`.
- The login shell rendered correctly with the staff sign-in form, mobile-first dark operations layout, and no broken local assets observed.
- Browser console showed no output, CSP violation, or JavaScript runtime error during initial load.
- The unauthenticated state correctly kept the protected application shell hidden and displayed the login boundary.

This smoke test did not submit credentials or mutate live data. Authenticated role/E2E verification must be run after deploying the migration and Edge Functions to the target Supabase project.
