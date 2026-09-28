# Globall Cloud — Production Upgrade Report

## کورتەی بڕیار

وەشانی نوێی پڕۆژەکە لەسەر وەشانی CSP ـی پێشوو دروست کراوە و بنەمای backend ـی لۆجستیکی بە شێوەی production ـتر بەهێز کراوە. ئەم پەکەجەیە تەنها UI ـی نیشاندان نییە؛ migration، RPC ـی پارێزراو، Edge Function ـی authenticated، HMAC webhook intake، outbox، audit trail و staff control plane ـی کارپێکراوی تێدایە.

## گۆڕانکارییە سەرەکییەکان

| بەش | زیادکراو یان چاککراو |
|---|---|
| Shipment lifecycle | `record_shipment_transition` بە state version، step monotonicity، delivery-proof guard، idempotency، timeline و customer notification |
| Warehouse و package | `shipment_packages`، package code، barcode، weight/dimensions، hub و status |
| Consolidation | `consolidation_batches` و `consolidation_items` بۆ کۆکردنەوەی بار لە چین/دوبەی و گواستنەوە بۆ عێراق |
| Customs | `shipment_customs_cases` بۆ declaration، HS codes، duty، broker، document completeness و hold |
| Finance | `shipment_invoices`، `payment_transactions`، `reconciliation_runs` و update ـی `shipment_financial_ledger` بە idempotency |
| Exceptions و SLA | RPC ـی `resolve_logistics_exception` و بەستنی کار بە audit trail |
| Notifications | `notification_outbox`، channel-specific claim/complete RPC، retry، idempotent `in_app` و `notification-dispatch` بۆ Resend/Meta WhatsApp/Twilio؛ provider ـەکان fake ناکرێن |
| Integrations | `integration-webhook` بە HMAC-SHA256 و unique `(provider,event_id)` لە `integration_inbox` |
| Monitoring | `system-health` ئێستا control-plane، outbox/inbox، advanced workflows، document vault و private storage ـیش پشکنین دەکات |
| Frontend | `control-plane.html`، `control-plane.js` و `control-plane.css` بە sidebar، login boundary، shipment/package/customs/consolidation/finance/exception/outbox views |
| CSP | پەڕەکان هیچ inline executable script یان inline event attribute ـێکیان نییە؛ `script-src` بەبێ `unsafe-inline` ماوەتەوە و CSP bridge بە allowlist ـی action پارێزراوە |
| CI و release | `production-integrity.yml`، `scripts/validate-production.sh` و `scripts/validate-assets.py` نوێکرانەوە؛ cache بۆ `gc-v38` bump کرا و `PRODUCTION-RELEASE.md` و audit report زیادکران |

## ئەنجامی verification

لە local release gate ـدا `node --check` بۆ هەموو JavaScript ـەکان و bundle/parse ـی هەموو Edge Function ـەکان بە esbuild سەرکەوتوو بوو. Asset integrity ـەکە 76 service-worker asset ـی پشکنین کرد و هیچ missing asset ـێکی نەدۆزییەوە. QA ـی CSP، service worker، JWT config، migration existence، notification adapters، middleware references و secret scan هەموویان `PASS` بوون.

لە browser smoke test ـدا `control-plane.html` لەسەر CSP ـی enforce کراو بە `200 OK` کرایەوە. Login boundary و ڕووکاری کۆنسۆڵ بە دروستی نیشان دران، و لە browser console ـدا هیچ CSP violation یان runtime error ـێک نەبینرا. ئەم تاقیکردنەوەیە credentials داخڵ نەکرد و هیچ mutation ـێکی live ئەنجام نەدرا.

## پەیکەری پەکەج

وەشانی source ـی چاککراو لە root ـی ئەم پەکیجەیە. migration ـە سەرەکییەکان `20260816090000_production_logistics_control_plane.sql`، `20260817090000_logistics_advanced_workflows.sql` و `20260818090000_notification_dispatch_hardening.sql` ـن. API ـە گرنگەکان لە `logistics-control-plane`، `document-access`، `notification-dispatch`، `integration-webhook` و `system-health` ـدان.

## کەلێنەکانی پێویستی deploy ـی ڕاستەقینە

ئەم پەکەجەیە هێشتا بە خۆکارانە migration یان Edge Function ـەکان بۆ live Supabase جێبەجێ ناکات. پێویستە migration ـەکان جێبەجێ بکرێن، functions deploy بکرێن و `INTEGRATION_WEBHOOK_SECRET`، `NOTIFICATION_WORKER_SECRET` و provider credentials لە server-side secret store دابنرێن. Worker ـی notification پێویستی بە scheduler/heartbeat ـی protected هەیە.

دوای deploy، پێویستە بە staff ـی role ـە جیاوازەکان E2E تاقی بکرێتەوە: admin، super_admin، accountant، operations/warehouse و customer. بە تایبەتی delivered بەبێ POD، provider payment بەبێ idempotency key، customs بە documents ـی ناتەواو و webhook بە signature ـی هەڵە دەبێت reject بکرێن.

## ڕێنمایی کۆتایی

پێش deploy کردن، `PRODUCTION-RELEASE.md` بخوێنەوە و بە ڕیزبەندیی backup → migration → Edge Functions → server secrets → Cloudflare Pages → health check جێبەجێ بکە. سڕینەوەی migration بۆ rollback بەبێ backup پێشنیار ناکرێت، چونکە status history، ledger، outbox و integration audit داتای کاروبارییەکانن.
