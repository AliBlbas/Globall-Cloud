# Globall Cloud — Production v4 Audit Report

## Executive summary

وەشانی v4 بە تەواوی لەسەر source، schema، Edge Functions، Cloudflare middleware، service worker، CSP، customer/staff UI و production QA پشکنرا. پەکیجی سەرەتایی 247 فایل، 21 HTML، 44 JavaScript، 17 TypeScript، 102 migration و 16 Edge Function ـی هەبوو. SHA-256 ـی ZIP ـی سەرەتایی `3598bd26f06f39f718bdfdb44333fe7ed36cd761ed8e8a91951afcc3662a6799` بوو.

ئەم audit ـە تەنها review نییە؛ کەلێنە production ـەکان چاککران و checks ـی نوێ زیادکران. هیچ migration، Edge Function یان provider secret بۆ live project بە خۆکارانە deploy نەکراوە.

## Findings and corrections

| Severity | Finding | Correction |
|---|---|---|
| High | Service worker دوو asset ـی هەڵەی `/superadmin-elite.css/js` هەبوو، بەڵام ناوی فایلە ڕاستەقینەکە `super-admin-elite` بوو. | ناوی reference چاککرا و asset-integrity gate زیادکرا. |
| High | Staff `process_outbox` بە RPC ـی گشتی claim دەکرد و دەتوانی external channel ـەکانیش بگرێت، پاشان بە هەڵە وەک provider not configured retry بکات. | Migration ـی `20260817222344_notification_dispatch_hardening.sql` و `claim_notification_outbox_channel` زیادکرا؛ staff UI تەنها `in_app` claim دەکات. |
| High | CSP bridge هەر function ـێکی `window` ـی ڕێپێدەدا ئەگەر لە `data-gc-on*` ـدا بانگ بکرێت. | allowlist ـی action ـە پشکنراوەکان زیادکرا و dynamic dispatch سنووردار کرا. |
| Medium | Middleware ـەکە admin enhancement ـەکانی بە شێوەی گشتی inject دەکرد و version ـە stale ـەکانی هەبوو. | Middleware بازنووس کرا بە asset injection ـی idempotent و admin-surface scoped؛ version ـی `20260816-4`. |
| Medium | Notification pipeline بۆ email/WhatsApp/SMS adapter ـی کارا نەبوو. | `notification-dispatch` server-only زیادکرا بە Resend، Meta WhatsApp Cloud API، Twilio و in-app idempotency/retry. |
| Medium | `system-health` تەنها control-plane/payment ـی کۆن پشکنین دەکرد. | checks ـی `advanced_workflows`، `document_vault` و `document_storage` زیادکران. |
| Medium | Service worker cache ـی کۆن دەتوانی runtime asset ـی stale بخاتە browser. | cache version بۆ `gc-v38` bump کرا و brand/mobile/runtime asset ـە نوێکان زیادکران. |

## New production capabilities

`notification-dispatch` بە `NOTIFICATION_WORKER_SECRET` پارێزراوە و لە browser بانگ ناکرێت. Worker rows ـی outbox claim دەکات، provider ـی پێویست بە server secret بەکار دەهێنێت، و بە `complete_notification_outbox` retry/failed state تۆمار دەکات. Missing credentials هیچ fake success ـێک دروست ناکەن.

`document-access` بە JWT و ownership/staff authorization signed URL ـی private document نوێ دەکاتەوە. `system-health` ئێستا schema ـی advanced، document table و bucket ـی private ـیش دەپشکنێت. Control Plane و customer portal ـەکانی پێشوو بە هەمان CSP-safe workflow ماونەتەوە.

## Verification matrix

| Check | Result |
|---|---|
| `scripts/validate-production.sh` | PASS |
| All JavaScript syntax | PASS |
| All 17 Edge Functions bundled and syntax-checked | PASS |
| CSP and inline event checks | PASS |
| Service-worker/middleware asset integrity | PASS؛ 76 service-worker assets، 0 missing |
| JWT/config checks | PASS |
| Migration naming and required migration checks | PASS |
| Notification provider adapter checks | PASS |
| Service-role secret scan | PASS |
| Browser smoke: public page, customer portal, control-plane login boundary | PASS؛ no credentials or live mutation |

## Deployment requirements

پێش production deploy، backup ـی database بگرە و سێ migration ـی control-plane، advanced logistics و notification hardening لە staging replay بکە. دواتر Edge Function ـەکانی `logistics-control-plane`، `document-access`، `notification-dispatch`، payment، webhook و health deploy بکە. `shipment-documents` دەبێت private بێت و secret ـەکانی notification/payment تەنها لە Supabase Edge Function secret store دابنرێن.

Worker ـی notification دەبێت لە scheduler/heartbeat ـێکی server-side و protected ـەوە بە header ـی `x-notification-worker-secret` بانگ بکرێت. Browser، Cloudflare public page و customer portal نابێت ئەم secret ـە ببینن. پاش deploy، `system-health` دەبێت `status: ok` و هەموو check ـە نوێکان `true` بگەڕێنێتەوە، پاشان provider sandbox test و role-based E2E test جێبەجێ بکرێت.

> ئەم audit ـە دڵنیایی لە source و local QA دەدات؛ دڵنیایی لە live production تەنها دوای deploy ـی migration/function، دابینکردنی secrets و authenticated E2E ـی staging/live بەدەست دێت.
