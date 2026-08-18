# Globall Cloud — Production v4 Release Notes

وەشانی v4 audit و hardening ـی تەواوی source ـی logistics ـی Globall Cloud ـە. ئەم وەشانە کەلێنەکانی service worker، middleware، CSP bridge، notification outbox و observability چاک دەکات و workflow ـی notification ـی ڕاستەقینە بۆ email، WhatsApp، SMS و in-app زیاد دەکات.

| بەش | ئەنجامی v4 |
|---|---|
| Source audit | 247 فایل پشکنرا؛ 21 HTML، 44 JS، 17 TS، 102 SQL migration و 16 Edge Function |
| Middleware | admin enhancement تەنها لە admin surfaces؛ injection idempotent؛ version `20260816-4` |
| CSP bridge | allowlist ـی action ـەکانی legacy بۆ ڕێگری لە arbitrary `window` dispatch |
| Service worker | cache version `gc-v38`؛ 76 asset ـی پشکنراو؛ broken `super-admin-elite` reference چاککرا |
| Notifications | `notification-dispatch` بە secret، Resend، Meta WhatsApp Cloud API، Twilio و retry-aware outbox |
| Outbox security | `20260818090000_notification_dispatch_hardening.sql`؛ staff تەنها `in_app` claim دەکات |
| Health | advanced workflow، document vault و private storage checks زیادکران |
| Documents | JWT ownership/staff check و one-hour signed URL refresh بە `document-access` |
| QA | production validation، full Edge Function compile، asset integrity و browser smoke PASS |

## Provider secrets

لە Supabase Edge Function secret store ئەمانە دابین بکە، نەک لە HTML/JavaScript: `NOTIFICATION_WORKER_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` و secret ـەکانی Qicard/FIB. هەر provider ـێک کە secret ـی نەبێت بە retryable error مامەڵەی لەگەڵ دەکرێت و fake success نانێدرێت.

## Release order

Backup بگرە؛ migration ـەکانی `20260816090000_production_logistics_control_plane.sql`، `20260817090000_logistics_advanced_workflows.sql` و `20260818090000_notification_dispatch_hardening.sql` لە staging و پاشان production جێبەجێ بکە. Edge Function ـەکانی control plane، document access، notification dispatcher، payment/webhook و health deploy بکە. Scheduler/heartbeat ـێکی server-side و protected بۆ `notification-dispatch` دابین بکە، Cloudflare Pages deploy بکە، `gc-v38` activate بکە و authenticated role-based/provider sandbox E2E تاقی بکەرەوە.

> ZIP ـەکە source ـی deploy-ready ـە؛ بە خۆکارانە بۆ live Supabase deploy ناکرێت و پێویستی بە secrets، scheduler و E2E ـی staging/live هەیە.
