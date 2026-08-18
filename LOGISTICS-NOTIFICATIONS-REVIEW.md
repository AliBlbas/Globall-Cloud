# پێداچوونەوەی Logistics و Notifications — Globall Cloud

## کورتەی ئەنجام

فایلەکانی بەڕێوەبردنی logistics و Notifications لە source ـی وەشانی v4 بە وردی پشکنراون. پشکنینەکە schema، migration، RPC، Edge Function، control surfaces، customer-facing Logistics OS، Operations Command Center، Warehouse OS، RLS، CSP، retry و provider dispatch ـی گرتەوە.

چند کێشەی production-level دۆزرایەوە و چاککران، بە تایبەتی **claim ـکردنی channel ـی هەڵە لە notification worker، duplicate in-app notification، stuck processing rows، schema drift لە surface ـە کۆنەکان، owner filter ـی notification، staff boundary و RLS exposure ـی external outbox rows**.

## کەلێنە سەرەکییەکان و چاکسازی

| پلە | کێشە | چاکسازی |
|---|---|---|
| بەرز | `notification-dispatch` بە `claim_notification_outbox` هەموو channel ـەکانی claim دەکرد، لەوانەش `in_app`. | Worker ئێستا تەنها `claim_notification_outbox_external` بەکاردێنێت؛ `in_app` بۆ staff control-plane جێهێڵراوە. |
| بەرز | `notification_outbox` ـی customer هەموو channel ـەکان، recipient و provider payload ـی دەبینین. | RLS نوێکراوە؛ customer تەنها `in_app` row ـەکانی خۆی دەبینێت، staff دەتوانێت هەموو row ـەکان ببینێت. |
| بەرز | external notification بێ preference/consent دەتوانێت provider cost و message spam دروست بکات. | `customer_notification_preferences` زیادکرا؛ email/WhatsApp/SMS بە default داخراون و تەنها بە opt-in ـی customer چالاک دەبن. |
| بەرز | `record_shipment_transition` و `approve_quote_request` هەردوو direct notification و in-app outbox ـیان دروست دەکردن، کە duplicate دەتوانێت دروست بکات. | `enqueue_customer_notification` و `event_key` ـی deterministic زیادکران؛ customer notification بە unique event contract پارێزراوە. |
| بەرز | Worker ئەگەر provider message ـی وەرگرتبێت بەڵام success acknowledgement شکستی هێنا، دەتوانێت هەمان message دووبارە بنێرێت. | provider delivery و acknowledgement جیاکرانەوە؛ ack failure ئێستا `ack_failed` ـە و بە هەڵە failed نانوسرێت. Resend ـیش `Idempotency-Key` وەردەگرێت. |
| بەرز | rows ـی `processing` لە crash دوای claim دەتوانن بۆ هەمیشە stuck بمێنن. | claim RPC ـەکان rows ـی پازدە خولەکەی processing recovery دەکەن؛ attempts ـی زیاتر لە 5 بە failed دادەنرێت. |
| مامناوەند | direct notification producer ـە کۆنەکان external fan-out ـیان نەبوو. | trigger ـی `fanout_customer_notification` بۆ email، WhatsApp و SMS زیادکرا؛ event key ـی legacy ـیش deterministic ـە. |
| مامناوەند | `detect_eta_sla_breaches()` بە severity ـی `warning` کاردەکرد، لەگەڵ constraint ـی table ناکۆک بوو؛ هەروەها `created_by` ـی system notification پێویستی بە ڕوونکردنەوە هەبوو. | severity بۆ `high`/`critical` ڕێکخرا؛ `created_by` nullable کرا و `created_source = 'system'` زیادکرا. |
| مامناوەند | `logistics-os` notification query ـی owner filter ـی نەبوو، key ـی Supabase ـی کۆنی هەبوو و quote ـی field ـی کۆنی بەکاردەهێنا. | key یەکخرا، `customer_user_id` filter زیادکرا، quote contract بۆ `origin_key/dest_key/transport_mode/status=pending` نوێکراوە، و HTML escaping زیادکرا. |
| مامناوەند | Operations Command Center و Exception Engine field ـە کۆنەکانی `origin/destination/mode/status` و `user_id` بەکاردەهێنا. | field ـەکان بۆ `origin_key/dest_key/transport_mode/operational_status/document_status/customer_user_id` گۆڕدران. |
| نزم | Warehouse OS بە `is_active !== false` row ـی null بە staff دادەنەنا. | guard بۆ `is_active === true` ڕاستکرا. |

## فایلە گۆڕدراوەکان

| فایل | جۆری گۆڕانکاری |
|---|---|
| `supabase/migrations/20260818130000_logistics_notifications_contract_hardening.sql` | event key، notification fan-out، external claim، stale recovery، RLS، preferences/opt-in، ETA hardening و transition/quote RPC replacement |
| `supabase/functions/notification-dispatch/index.ts` | external-only claim، provider/ack separation، attempts output و email idempotency |
| `operations-exception-engine.js` | notification/document owner filter و schema field alignment |
| `gc-csp-scripts/logistics-os-inline-1.js` | publishable key، owner filter، quote contract، safe escaping و guest boundary |
| `gc-csp-scripts/operations-command-center-inline-1.js` | staff-only boundary، key، schema fields، quote contract و operational status |
| `operations-command-center.html` | transport mode value بۆ `land` |
| `gc-csp-scripts/warehouse-os-inline-1.js` | exact active-staff guard |
| `scripts/validate-production.sh` | migration، worker، legacy surface و contract checks |
| `.github/workflows/production-integrity.yml` | migration و notification/legacy surface checks |
| `PRODUCTION-RELEASE.md` | deployment order، worker behavior و E2E checklist |
| `QA-BROWSER-SMOKE-LOGISTICS-NOTIFICATIONS.md` | browser evidence بۆ Logistics OS و Operations Command Center |

## QA ـی جێبەجێکراو

| تاقیکردنەوە | ئەنجام |
|---|---|
| `bash scripts/validate-production.sh` | PASS؛ هەموو checks ـەکان سەرکەوتوون |
| JS syntax بۆ هەموو فایلەکان | PASS |
| Bundle/parse بۆ هەموو Edge Function ـەکان | PASS |
| Notification provider/config checks | PASS |
| External-only worker claim | PASS |
| Customer owner filter و legacy schema checks | PASS |
| Asset integrity و CSP checks | PASS |
| Browser smoke بۆ Logistics OS | PASS؛ guest داتا نابینێت |
| Browser smoke بۆ Operations Command Center | PASS؛ staff-only boundary لە guest ـدا کارا بوو |

## پێویستییەکانی deploy

Migration ـە نوێیەکە دەبێت دوای backup لە staging replay بکرێت و پاشان لە production جێبەجێ بکرێت. دواتر `notification-dispatch` deploy بکە و scheduler/heartbeat ـێکی server-side بە `NOTIFICATION_WORKER_SECRET` دابین بکە. Provider secret ـەکانی Resend، WhatsApp Cloud API و Twilio تەنها لە Supabase secret store دابنرێن.

پێش چالاککردنی provider ـەکان، authenticated E2E test بە customer، staff، operations، accountant و admin جێبەجێ بکە؛ بەتایبەتی پشکنینی duplicate event، stale processing recovery، invalid recipient، provider timeout، ack failure، RLS ـی external rows، ETA breach و quote approval. هیچ migration یان function ـێک لەم پێداچوونەوەیەدا بۆ live project بە خۆکارانە deploy نەکراوە.
