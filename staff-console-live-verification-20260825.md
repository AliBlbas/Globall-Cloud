# Staff Console live verification — 2026-08-25

## Deployment

Cloudflare Pages production deployment `7b1ee144-5bd0-4297-a5e0-9c47d6071bce` completed successfully for commit `cc7ffa184e4d2790b71a902f736e6eed0e7674c9` (`fix: harden staff console errors and mobile layout`).

## Live route

`https://globall-cloud.pages.dev/staff-os?tab=overview&ui=repair-v8` returns the Staff Command Center login shell with the expected protected message and email/password fields. No credentials were entered. The unauthenticated route does not expose authenticated navigation or business data.

## Repair scope

The deployed source now includes a server-side bounded fallback for `customer_directory_stats` view permission failures, user-facing error normalization for 401/403/5xx responses, protected diagnostics only in the browser console, retry controls for failed tabs/modules, compact three-column RTL navigation on phone widths, controller v8, Ultra stylesheet v5, and service-worker cache gc-v62.

## Verification limitation

The browser console marker check did not return a usable structured value in the automation output, so asset presence should be confirmed through the HTML/source and release gates rather than claimed from that console result. Authenticated click-through of all Staff OS modules remains unverified without a dedicated synthetic staff account; owner credentials were not used.
