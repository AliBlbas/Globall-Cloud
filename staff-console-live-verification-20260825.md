
## Follow-up deployment verification

Cloudflare Pages deployment `d0605a6f-8433-4c85-96ba-5e119403a589` completed successfully for commit `7fe6e737854f141bb010d3760a54d7e8470c57ed` (`fix: improve staff console recovery and mobile density`).

The live route `https://globall-cloud.pages.dev/staff-os?tab=overview&release=7fe6e73` returned HTTP 200 and displayed the protected Staff Command Center login shell with email/password inputs and the Kurdish protected-access message. No credentials were entered. The rendered unauthenticated shell contained no raw `permission denied for view` or `Internal server error` text.

The browser console inspection again returned no structured value in the automation output, so the source/release-gate checks remain the authoritative asset-version evidence for controller v9, Ultra stylesheet v6, and gc-v63. Authenticated click-through remains unverified without a dedicated synthetic staff account; owner credentials were not used.

## Shipment timeline route verification

The live route `https://globall-cloud.pages.dev/staff-os?tab=shipments&release=9e9c916` returned the protected login shell. Browser inspection confirmed the deployed controller URL `staff-os-console.js?v=20260825-10`, Ultra stylesheet URL `staff-os-ultra.css?v=20260825-7`, and `loginGateVisible: true`; no shipment data was exposed before authentication. The source now routes the selected shipment timeline to the protected `logistics-control-plane` `kind=events` read model, with shipment ID and branch/archived ownership checks.
