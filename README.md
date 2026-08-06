# Globall Cloud

Globall Cloud is a logistics platform for shipping from China and the UAE to Iraq.

## Live stack
- Frontend: static website on Cloudflare Pages
- Backend: Supabase (Postgres, Auth, Storage, RLS, RPC)
- Staff tools: customer directory, shipment tracking, receipts, and messages

## Main data model
- `customer_directory`
- `shipments`
- `warehouse_receipts`
- `messages`
- `staff`
- `lg_orders`, `lg_shipments`, `lg_routes`, `lg_tracking_events`

## How the app works
- Customers can request quotes and track shipments.
- Signed-in users can view their own shipments.
- Staff log in through the admin area and use Supabase Auth + MFA.
- Dashboard analytics read directly from the live Supabase database.

## Important Supabase RPCs
- `find_directory_customer_by_phone`
- `track_shipment`
- `admin_list_customers_public`
- `admin_list_shipments_public`
- `admin_upsert_customer_public`
- `admin_delete_customer_public`
- `admin_upsert_shipment_public`
- `admin_delete_shipment_public`

## Project files
- `index.html` — main website and portal
- `admin-dashboard.js` — analytics engine
- `database-schema.js` — schema reference

## Notes
- Keep RLS enabled on public tables.
- Use the publishable Supabase key in the frontend.
- Never expose the service role key in browser code.
