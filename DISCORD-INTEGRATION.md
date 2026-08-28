# Globall Cloud → Discord

This project now includes a Supabase Edge Function at `supabase/functions/discord-notify` for the Discord server `1515534446122762420`.

## Architecture

- Browser/staff console runs on `https://globall-cloud.pages.dev/`.
- Staff authentication is handled by Supabase Auth.
- `production-bridge.js` observes successful staff control-plane mutations and sends a structured event to the `discord-notify` Edge Function.
- The Edge Function keeps the Discord webhook URL server-side and posts an embed to the configured Discord channel.
- The bridge is best-effort: a Discord outage never blocks a logistics operation.

## Required secret

Create one Discord webhook in the target server/channel and store it only as a Supabase Edge Function secret:

`DISCORD_WEBHOOK_URL=<your Discord webhook URL>`

Do not put the webhook URL in GitHub, frontend JavaScript, or browser local storage.

The Edge Function verifies the webhook's Discord server ID during `health` checks and expects server ID `1515534446122762420`.

## Supported staff events

`transition_shipment`, `upsert_package`, `upsert_customs`, `upsert_consolidation`, `attach_package`, `upsert_invoice`, `record_payment`, `resolve_exception`, `approve_quote`, `record_warehouse_movement`, `upsert_route_leg`, `register_document`, and `upload_document`.

## Test

After the secret is configured, an authenticated staff console action should generate a Discord embed automatically. The Edge Function also exposes an authenticated `health` action that confirms the webhook is attached to the expected server.
