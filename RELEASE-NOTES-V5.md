# Globall Cloud — Production v5 Hardened Release

ئەم پەکیجە وەشانی v4 ـی ناردراوی بە audit و hardening ـی نوێ بۆ production logistics بەرەو v5 دەبات. گۆڕانکارییەکان لەسەر shipment lifecycle، warehouse، route legs، customs، finance، documents، Qicard/FIB، notification outbox و customer/staff portals دانراون.

## v5 hardening

Middleware ـی Cloudflare ئێستا admin-only assets تەنها لە admin surfaces ـەکان inject دەکات، duplicate injection ڕێگری لێکراوە و version ـی یەکگرتوو `20260816-4` بەکاردێت. CSP bridge بە allowlist ـی action ـە پشکنراوەکان سنووردار کراوە. Service worker بۆ `gc-v38` نوێکرایەوە و هەموو 76 asset ـی تێدا بە filesystem پشکنراون؛ broken `super-admin-elite` reference چاککراوە.

Notification workflow ـی server-only بە `notification-dispatch` زیادکراوە. Worker بە `NOTIFICATION_WORKER_SECRET` دەچێت، outbox row ـەکان claim و retry دەکات، in-app بە idempotency دەنێرێت، و provider ـەکانی Resend، Meta WhatsApp Cloud API و Twilio پشتیوانی دەکات. Staff control plane بە migration ـی `20260818090000_notification_dispatch_hardening.sql` تەنها in-app rows claim دەکات، بۆ ئەوەی external notification بە اشتباه لە staff UI ـەوە نەبێت.

Health endpoint ـی `system-health` ئێستا advanced workflows، document vault و private storage bucket ـیش پشکنین دەکات. Document access بە JWT ownership/staff check signed URL ـی نوێی یەک کاتژمێر دروست دەکات.

## Verification

`bash scripts/validate-production.sh`، asset integrity، full JavaScript syntax، bundle/parse ـی هەموو Edge Function ـەکان و browser smoke test ـەکانی public page، customer portal و control-plane login boundary بە سەرکەوتوویی تەواو بوون. هیچ credential ـێک داخڵ نەکرا و هیچ mutation ـێکی live ئەنجام نەدرا.

## Logistics and notification contract review

پاش release ـی v5، audit ـێکی تایبەت بۆ logistics و Notifications کرا. Migration ـی `20260818130000_logistics_notifications_contract_hardening.sql` event key، external fan-out، stale worker recovery، RLS ـی channel، ETA exception hardening و schema-consistent legacy surfaces زیاد دەکات. `notification-dispatch` تەنها external channels claim دەکات و staff control-plane تەنها `in_app` rows بەڕێوەدەبات. Browser smoke و regression QA دووبارە سەرکەوتووانە تەواو بوون.

## Deployment gate

پێش deploy backup بگرە، migration ـەکانی `20260816090000_production_logistics_control_plane.sql`، `20260817090000_logistics_advanced_workflows.sql`، `20260818090000_notification_dispatch_hardening.sql` و `20260818130000_logistics_notifications_contract_hardening.sql` لە staging replay بکە، Edge Function ـەکان deploy بکە، private bucket و server-only secrets دابین بکە، scheduler/heartbeat ـی protected بۆ notification dispatcher دابین بکە، پاشان Cloudflare Pages deploy و `system-health` و role-based/provider sandbox E2E test جێبەجێ بکە.

> ئەم ZIP ـە source ـی production ـە؛ بە خۆکارانە بۆ live Supabase deploy ناکرێت و هیچ provider secret ـێکی تێدا نییە.
