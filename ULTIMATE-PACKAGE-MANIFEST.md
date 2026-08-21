# Globall Cloud Ultimate Package

This package combines the hardened Globall Cloud production core with the complete KAML visual concept library.

## Included

- Production-ready static frontend at the package root.
- Supabase migrations, Edge Functions, RLS-oriented backend files, payment flows, tracking, staff portals, driver workflows, notification and logistics control-plane features.
- Security hardening from the latest `Globall-Cloud-2` core, including payment outstanding-balance validation, origin allowlists, generic server errors, and escaped role labels.
- All seven KAML concept variants under `design-library/kaml-concepts/`.
- The three selected KAML concepts already merged into `design-library/kaml-mobile`, `design-library/kaml-kurdish`, and `design-library/kaml-enterprise`.

## Deployment

For Cloudflare Pages Direct Upload, upload this package root. `index.html` is intentionally at the root.

The KAML folders are design references and standalone visual prototypes. They are not wired into the production backend automatically.

## Important

Before production use, apply Supabase migrations, configure Edge Function secrets, deploy the required functions, and run sandbox tests for authentication, tracking, invoices, QiCard/FIB payments, notifications, and document access.
