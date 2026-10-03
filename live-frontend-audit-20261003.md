# Globall Cloud Live Frontend Audit

**Date:** 2026-10-03  
**Authoritative branch:** `Product`  
**Verified deployment commit:** `9c5b11a`

## Executive result

The live public shell and Staff OS login route were inspected. The Staff OS route initially booted into a loading shell and then collapsed to a script-less document in the Sandbox browser session, preventing safe authenticated CRUD testing. The repository-side runtime repair was deployed and the live bundle now contains the repair markers, but the current browser session still reproduces the script-less state before login.

## Verified repairs

- **Staff app-shell preservation:** Staff OS rendering now writes into the existing `#app` root instead of replacing the entire document body. This preserves the rescue shell and compatibility hooks.
- **Compatibility login selectors:** the compatibility bridge now supports both legacy `email/password` IDs and the canonical `loginEmail/loginPassword` IDs, and recognizes `/staff-os-v5` routes.
- **Rate activation controls:** the Staff OS rate editor now exposes `چالاک / ناچالاک`, converts the value to boolean, and sends normalized transit-day values to `operations-v4`.
- **Repository validation:** `node --check` passed for the changed JavaScript files and `git diff --check` passed.
- **Deployment verification:** Cloudflare Pages reported Product commit `9c5b11afdc1ac83948d913d3ba0970ede5095a19`; the live Staff OS bundle contains `renderSurface`, `name="is_active"`, and `loginEmail` markers.

## Authenticated CRUD test status

Not completed because the browser session removes the document after the loading phase: the browser DOM becomes an `<html>` element containing only the theme-toggle text, with no `<body>`, scripts, or `#app`. This is reproducible on clean and direct Staff OS route attempts and remains after unregistering the browser service worker and clearing browser cache storage.

No customer account or pricing record was changed during this audit.

## Next safe test sequence

1. Open Staff Console in a fresh browser session/device where the page remains interactive.
2. Log in through the user-controlled takeover; do not transmit credentials in chat.
3. Read-only verify Customers and Pricing first.
4. Use a designated test customer and a designated test rate only.
5. Test customer activation/deactivation, customer profile edit, rate amount edit, rate active/inactive toggle, and rate restoration.
6. Confirm each result in the UI and audit log, then verify the public quote calculator consumes only active rates.

## Files changed by this pass

- `staff-os-v5.js`
- `staff-os-compat.js`
