# Customer Portal shipment detail live verification

Date: 2026-08-25

Cloudflare Pages deployment `404f189d` for commit `56b0e325fd9f6ccdc07050e8c0c742e6026cd094` completed successfully for the existing `globall-cloud` project. The live route `https://globall-cloud.pages.dev/customer-portal?verify=20260825-attachment11&release=56b0e32` loaded the existing Customer Portal shell.

The live page served `gc-csp-scripts/customer-portal-inline-1.js?v=20260825-2`, and the new detail containers `detailPackages`, `detailDocuments`, `detailFinance`, and `detailEvidence` were present in the DOM. The unauthenticated portal state remained intact: the login prompt was visible, no session was created, no customer data was exposed, and no production write was performed.

The protected Supabase `customer-self` Edge Function is version 2 with JWT verification enabled. It now returns packages only for the already ownership-filtered shipment IDs of the authenticated customer. The response selects existing package fields only and does not change any schema or write behavior.

A previous authenticated Staff OS session was not reused for Customer Portal verification because the Customer Portal has its own auth client and no customer credentials were entered. Therefore, the authenticated package rendering requires a dedicated synthetic customer account for a full click-through test.
