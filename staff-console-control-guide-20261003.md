# Staff Console — Customer Control Guide

## Published changes

- Product commit `979fea2`: premium Customer 360 control surface and account-admin routing.
- Product commit `afbc718`: fixed middleware matching for the actual `/staff-os-v5` route and restored complete Staff asset injection.
- Live middleware response verified with the browser-equivalent `Accept: text/html` header.

## New Customer 360 surface

The Customers module now provides:

- KPI cards for total, active, inactive, Auth-linked customers, and outstanding balance.
- Search by GC code, name, phone, and city.
- Filters for all, active, inactive, and Auth-linked accounts.
- Sorting by newest, name, or outstanding balance.
- Mobile card layout instead of a cramped horizontal table.
- Clear actions for View, Edit, and QR/Barcode.
- Account status shown as a green/red state with a status dot.

## How to control a customer account

1. Open **Staff Console → Customers**.
2. Search using the customer's **GC code** or phone number.
3. Select **View** to inspect identity, shipment history, balance, status, and creation date.
4. Select **Edit** to change name, phone, email, city, delivery location, note, and active state.
5. To disable access, choose **Deactivate**. This archives the customer account and writes an audit event.
6. To restore access, open the inactive customer and choose **Activate**.
7. To change or create the customer's login credential, use **New password** with at least 12 characters and save. The action is sent through the protected `account-admin` function.
8. Use **QR** to print or scan the customer's GC identity.

## Permission model

- **Super Admin:** can create customers, change customer email/password, link or re-link Auth accounts, change GC identity where supported, activate/deactivate, and edit customer data.
- **Admin / Accounting / Operations staff:** can read and update permitted customer profile fields and active state; email, password, GC identity, and account binding remain Super Admin-controlled by backend policy.
- Every create, update, bind, archive, and account-control action is recorded in the audit log.

## Validation

- `npm test` passed.
- JavaScript syntax checks passed for `staff-os-v5.js` and `functions/_middleware.js`.
- `git diff --check` passed.
- Asset validator still reports the existing navigation-fragment warnings for `/dashboard#shipments`, `/#request`, `/track`, `/dashboard#profile`, and `/staff`; no new missing CSS asset was reported.

## Known browser-session limitation

The current Sandbox browser session still collapses the Staff page to a script-less document after navigation, even after service-worker/cache cleanup. The deployed HTML middleware and source route are correct; authenticated CRUD verification should be performed in a fresh browser session/device after login takeover.
