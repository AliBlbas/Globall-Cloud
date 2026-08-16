# Browser smoke — v3

- Local static server: `http://127.0.0.1:4173`.
- `control-plane.html` returned successfully with the staff login boundary and the new source HTML loaded.
- The initial browser viewport showed the unauthenticated login shell; no navigation action was attempted and no live credentials or mutation were used.
- Console inspection returned no console output or visible runtime error.
- The local static smoke test does not validate authenticated Supabase calls; that requires staging/live deployment with a test staff account.

A second unauthenticated reload after the visibility fix showed only the email, password, and login controls in the viewport; the sign-out button was hidden. The browser console again returned no output or visible runtime error.
