# Globall Cloud Production Architecture

## Product boundary

The public website remains accessible without a site-wide login. Visitors can browse routes, services, tracking guidance, contact information, and submit a shipping quote request. A quote request collects the minimum operational fields required for follow-up and is stored server-side.

Customer accounts are private. A customer can create or use an email/password account to view their own quote history, shipment records, invoices, documents, messages, notifications, and profile. Customer authentication is implemented with Supabase Auth and enforced through database row-level security and server-side authorization checks; it is not delegated to Cloudflare Access.

Internal operations are private. Staff users are authenticated through Supabase Auth and authorized through the `staff` table and role checks. The operational surface includes shipment control, warehouse receipts, exceptions, documents, customer communication, and audit history. Administrative actions require `admin` or `super_admin` permissions, while finance actions require the appropriate finance role.

## Roles and route boundaries

| Surface | Access | Core capabilities |
| --- | --- | --- |
| Public website | Anonymous | Browse services, routes, tracking instructions, contact, quote request |
| Customer account | Authenticated customer | Quote history, shipment tracking, documents, invoices, messages, profile |
| Staff operations | Authenticated active staff | Quotes, shipments, warehouse, exceptions, customer support, documents |
| Finance | Staff with finance permission | Pricing, invoices, payments, outstanding balances, financial reports |
| Admin | `admin` or `super_admin` | Staff, roles, settings, approvals, audit logs, system controls |

## System architecture

The frontend is deployed as a static Cloudflare Pages application. Cloudflare Pages serves the public HTML, CSS, JavaScript, images, and protected application shells. Cloudflare Access must not protect the entire hostname because it would block public quote requests. The application itself controls access to private pages.

Supabase is the backend system of record. Supabase Auth manages customer and staff identities. Postgres stores customers, quote requests, shipments, tracking events, documents, invoices, messages, staff roles, and audit records. Row-level security limits customer reads to records owned by the authenticated user and limits staff mutations to authorized roles. Supabase Edge Functions handle privileged operations, validation, notifications, webhooks, and integrations where browser-side access would be unsafe.

The browser uses the public Supabase publishable key only. Service-role credentials remain server-side inside Edge Functions or other managed secrets. Public quote submission uses a narrowly scoped endpoint with validation, rate limiting, spam protection, and audit metadata.

## Core data domains

The existing database foundation includes `customer_directory`, `shipments`, `messages`, `staff`, `warehouse_receipts`, and logistics tracking tables. The next schema revision should add first-class `quote_requests`, `quote_items`, `shipment_documents`, `invoices`, `payments`, `customer_messages`, `notifications`, `audit_logs`, and explicit permission mappings. Existing logistics tables should be retained and migrated incrementally rather than replaced destructively.

## Security rules

Anonymous users may create a quote request but may not read operational data. Customers may read only their own account-linked records. Staff access is granted only to active staff records and is checked server-side. Admin and finance operations require explicit role checks. Every privileged mutation records actor, action, entity, timestamp, and request metadata in an audit log. Secrets, service-role keys, and payment credentials never enter static frontend files or Git history.

## Delivery sequence

The implementation will proceed in vertical slices. First, the public/private boundary and account authentication are made correct. Second, quote intake and customer history are made durable. Third, internal operations and CRM surfaces are connected to the same database model. Fourth, finance, documents, notifications, and integrations are hardened. Each slice must pass local validation, focused tests, and a production smoke check before the next slice begins.
