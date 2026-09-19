# Globall Cloud — Production v3 Release Notes

وەشانی v3 ـی Globall Cloud workflow ـی logistics لە چین و دوبەی بۆ هەولێر و عێراق بە backend ـی Supabase و frontend ـی Cloudflare Pages بەهێز دەکات. ئەم پەکیجە source ـی migration، Edge Function، UI، service worker، CI و runbook ـەکانی release ـی تێدایە.

| بەش | گۆڕانکارییە سەرەکییەکان |
|---|---|
| Warehouse | `warehouse_movements` ledger بە intake/transfer/dispatch/return، scan-code validation، idempotency و package/shipment update |
| Routing | `shipment_route_legs` بۆ multi-leg China → Dubai → Erbil و carrier/tracking milestone |
| Quotes | staff `approve_quote_request`، customer `accept_quote_request`، valid-until، service level، incoterm و dimensional/billable weight |
| Documents | private `shipment-documents` bucket، upload بە 25 MB limit، SHA-256 hash، metadata، `document-access` JWT endpoint و signed URL refresh |
| Reporting | `get_logistics_report` و views ـی `v_shipment_summary`، `v_daily_operations` و `v_financial_summary` |
| Staff UI | Control Plane tabs بۆ quotes، documents، warehouse movements و route legs؛ report panel و forms ـی server-side |
| Customer UI | quote submission ـی وردتر، quote acceptance، document download، invoice balance و payment history |
| Security | CSP بەبێ `unsafe-inline`، هیچ inline event handler ـێک نییە، actor mismatch guards، role checks و private storage |
| Release | service worker cache لە `gc-v37`، CI و `scripts/validate-production.sh` بە checks ـی v3 نوێکراونەتەوە |

## QA result

`bash scripts/validate-production.sh` بە سەرکەوتوویی تەواو بوو و هەموو check ـەکانی JavaScript syntax، CSP، inline-script policy، JWT config، migration existence، advanced RPC/action، document-access، payment guards و secret scan ـەکان `PASS` بوون. هەروەها `esbuild` و `node --check` بۆ `logistics-control-plane`، `document-access`، `control-plane.js` و customer portal script سەرکەوتوون. Browser smoke test ـی unauthenticated لە local static server login boundary ـی دروست و console ـی بێ error نیشان دا؛ تاقیکردنەوەی authenticated پێویستی staging/live test account و deploy ـی migration/function ـەکان هەیە.

## Deploy order

سەرەتا backup بگرە، migration ـەکانی `20260817165537_production_logistics_control_plane.sql` و `20260817222324_logistics_advanced_workflows.sql` لە staging تاقی بکەرەوە و پاشان لە production جێبەجێیان بکە. دواتر `logistics-control-plane`، `document-access`، `integration-webhook` و function ـە پەیوەندیدارەکانی payment deploy بکە، bucket ـی private و server-only secrets دابین بکە، Cloudflare Pages deploy بکە، service worker ـی `gc-v37` activate بکە و E2E test بە staff role ـە جیاوازەکان و customer account جێبەجێ بکە.

> ئەم ZIP ـە migration یان function بە خۆکارانە بۆ live Supabase جێبەجێ ناکات. Deploy ـی production پێویستی backup، staging verification، server secrets و provider sandbox test هەیە.
