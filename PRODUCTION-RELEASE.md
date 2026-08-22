# Globall Cloud — Production Release Runbook

ئەم وەشانە چاکسازییەکانی **CSP، Control Plane، shipment lifecycle، package traceability، multi-leg routing، warehouse chain-of-custody، quote lifecycle، document vault، consolidation، customs، finance ledger، notification outbox، real notification providers و webhook intake** لەخۆدەگرێت. ئەم فایلە ڕێگای جێبەجێکردنی production ـە؛ کۆپی‌کردنی فایلەکان بۆ Cloudflare بە تەنیا بەڵگەی deploy ـی backend نییە.

## پێش deploy

پێویستە backup ـی داتابەیس و snapshot ـی migration ـی live هەبێت. پێش ئەوەی migration ـەکە جێبەجێ بکرێت، دڵنیابە لەوەی `shipments`، `staff`، `delivery_proofs`، `shipment_events`، `logistics_exceptions`، `shipment_financial_ledger` و `customer_notifications` لە live project ـدا بوونیان هەیە. Migration ـە نوێیەکە لەسەر ئەو schema ـە بنیات نراوە.

## ڕیزبەندیی deploy

| قۆناغ | کار | دڵنیابوون |
|---|---|---|
| ١ | `20260817165537_production_logistics_control_plane.sql`، `20260817222324_logistics_advanced_workflows.sql`، `20260817222344_notification_dispatch_hardening.sql` و `20260817222449_logistics_notifications_contract_hardening.sql` لە Supabase production جێبەجێ بکە | هەموو table، view، policy و RPC ـەکان بەبێ error دروست بن؛ claim ـی notification channel-safe بێت |
| ٢ | Edge Function ـەکانی `logistics-control-plane`، `document-access`، `notification-dispatch`، `integration-webhook` و `system-health` deploy بکە | action ـەکانی `approve_quote`، `record_warehouse_movement`، `upload_document` و `get_report` لە logs ـدا بەبێ error بن؛ document-access signed URL نوێ بکاتەوە و notification-dispatch retry ـی دروست هەبێت |
| ٣ | bucket ـی private ـی `shipment-documents` و server-only secret ـەکان دابین بکە | `NOTIFICATION_WORKER_SECRET`، Resend/WhatsApp/Twilio credentials و payment secrets تەنها لە Edge Function secret store بن؛ هیچ secret ـێک لە browser bundle نەبێت |
| ٤ | ناوەڕۆکی `Globall-Cloud-main` بۆ Cloudflare Pages deploy بکە | `control-plane.html`، `customer-portal.html` و asset ـە versioned ـەکان 200 بن |
| ٥ | browser cache/service worker پاک و activate بکە | `gc-v38` لە service worker کارا بێت و middleware ـی `20260816-4` asset ـی admin تەنها لە admin surface ـەکان inject بکات |
| ٦ | `/functions/v1/system-health` بخوێنەوە | `status: ok` و `control_plane`, `notification_outbox`, `integration_inbox`, `advanced_workflows`, `document_vault`, `document_storage` هەموویان `true` بن |

## API ـە نوێکان

`logistics-control-plane` بە JWT ـی Supabase پارێزراوە. `transition_shipment` دۆخی shipment بە monotonic step، delivery-proof gate، idempotency key، timeline event، customer notification و staff audit تۆمار دەکات. `upsert_package`، `upsert_customs`، `upsert_consolidation`، `attach_package`، `upsert_invoice`، `record_payment`، `resolve_exception`، `approve_quote`، `record_warehouse_movement`، `upsert_route_leg`، `upload_document` و `get_report` هەموویان role check و server-side RPC بەکار دەهێنن. List ـەکانی `quotes`، `documents`، `movements` و `route_legs` بە pagination ـی staff-only بەردەستن.

`integration-webhook` JWT ـی user ناوێت، بەڵام بە `x-webhook-signature` ـی HMAC-SHA256 پشکنراوە. هەر event ـێک بە `(provider, event_id)` تەنها جارێک وەردەگیرێت و پاشان لە `integration_inbox` هەڵدەگیرێت. Payload ـی provider بە خۆکارانە status ناگۆڕێت؛ adapter ـی تایبەتی provider پێویستە پێش processing ـی business logic زیاد بکرێت.

## Payment و notification

Payment ـی کارتی ڕاستەوخۆ لەم وەشانەدا چالاک نییە. `record_payment` بۆ manual transaction و provider callback ـی پشتڕاستکراو ledger و invoice balance نوێ دەکاتەوە. Provider ـەکان پێویستیان بە server-side credential و idempotency key هەیە. `notification-dispatch` بە `NOTIFICATION_WORKER_SECRET` پارێزراوە و تەنها external channels claim دەکات؛ `in_app` بە staff control-plane و channel-specific claim بەڕێوەدەچێت. Email لە Resend، WhatsApp لە Meta Cloud API و SMS لە Twilio ـەوە دەنێردرێن، و ئەگەر credential نەبێت ریکۆردەکان retryable دەمێننەوە و fake success دروست ناکرێت.

## تاقیکردنەوەی پێش release

لە root ـی پڕۆژە ئەمە جێبەجێ بکە:

پێش deploy ـی migration، backup ـی database بگرە و لە staging ـدا migration ـەکان replay بکە. `shipment-documents` private bucket ـە؛ `document-access` URL ـی signed ـی یەک کاتژمێر دروست دەکات، نەک public URL. Worker ـی notification دەبێت لە scheduler/heartbeat ـێکی پارێزراوەوە بانگ بکرێت، نەک لە browser.

```bash
./scripts/validate-production.sh
node --check control-plane.js
node --check gc-csp-scripts/customer-portal-inline-1.js
node --check gc-csp-bridge.js
npx --yes esbuild supabase/functions/logistics-control-plane/index.ts --bundle --format=esm --platform=neutral --external:npm:* --outfile=/tmp/logistics-control-plane.js
npx --yes esbuild supabase/functions/notification-dispatch/index.ts --bundle --format=esm --platform=neutral --external:npm:* --outfile=/tmp/notification-dispatch.js
npx --yes esbuild supabase/functions/integration-webhook/index.ts --format=esm --platform=neutral --outfile=/tmp/integration-webhook.js
npx --yes esbuild supabase/functions/system-health/index.ts --format=esm --platform=neutral --outfile=/tmp/system-health.js
```

لە browser ـدا بە staff ـی role ـە جیاوازەکان تاقی بکەرەوە: admin، super_admin، accountant، warehouse/operations و customer. بەتایبەتی ئەمانە پشکنە: گۆڕینی state بە idempotency key، ڕێگری لە delivered بەبێ POD، package ـی دووبارە attach ـکراو، warehouse scan ـی هەڵە، quote approval و customer acceptance، signed document download و signed URL refresh، report date range، notification provider sandbox delivery، duplicate in-app event، stale processing recovery، legacy logistics surface owner filtering، quote mode contract، customs بە documents ـی ناتەواو، provider payment بەبێ idempotency key، و exception ـی چارەسەرکراو.

## Rollback

Rollback ـی frontend بە گەڕاندنەوەی Cloudflare deployment ـی پێشوو دەکرێت. Rollback ـی Edge Function بە deploy ـکردنی version ـی پێشووە. Migration ـەکە **down migration ـی خۆکار نییە**، چونکە سڕینەوەی ledger، event history یان outbox داتای کاروباری لەناودەبات؛ rollback ـی schema تەنها دوای backup و پشکنینی DBA دەکرێت.
