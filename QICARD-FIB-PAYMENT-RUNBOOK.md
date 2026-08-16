# ڕێنمایی Payment ـی Globall Cloud — Qicard و FIB

ئەم وەشانە payment ـەکان بە شێوەی **server-side** جێبەجێ دەکات. Browser تەنها invoice balance، payment link، QR و status دەبینێت؛ هیچ password، client secret، terminal credential یان private key لە browser bundle ـدا نییە.

## Flow ـی کاروباری

| قۆناغ | Qicard | FIB |
|---|---|---|
| دروستکردن | `POST /api/v1/payment` بە terminal header و Basic Auth | OAuth2 Client Credentials، پاشان `POST /protected/v1/payments` |
| پیشاندانی پارەدان | `formUrl` ـی provider | QR، readable code و app link |
| پشتڕاستکردنەوە | `X-Signature` ـی RSA لە webhook و status re-query | callback ـی `id/status` و status re-query بە Bearer token |
| دۆخی کۆتایی | `SUCCESS` → succeeded، `FAILED`/`AUTHENTICATION_FAILED` → failed | `PAID` → succeeded، `DECLINED` → failed |
| ledger | تەنها دوای amount/currency match و settlement RPC | تەنها دوای amount/currency match و settlement RPC |

## Secret ـە پێویستەکان

ئەم secret ـانە تەنها لە Supabase Edge Function secrets دابنێ؛ لە `.html`، `.js`، GitHub source یان Cloudflare public variables دانەبنێ:

```text
QICARD_API_BASE_URL=https://uat-sandbox-3ds-api.qi.iq
QICARD_USERNAME=...
QICARD_PASSWORD=...
QICARD_TERMINAL_ID=...
QICARD_WEBHOOK_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...
FIB_API_BASE_URL=https://fib.stage.fib.iq
FIB_CLIENT_ID=...
FIB_CLIENT_SECRET=...
FIB_CALLBACK_URL=https://<your-public-domain>/functions/v1/payment-webhook/fib
PAYMENT_FINISH_URL=https://globall-cloud.pages.dev/payment-checkout.html
PAYMENT_WORKER_SECRET=...
```

لە production ـدا `QICARD_API_BASE_URL` و `FIB_API_BASE_URL` بە host ـی live ـی ئەو provider ـە بگۆڕە کە merchant account ـەکەت بۆی چالاک کراوە. Sandbox default ـەکان تەنها بۆ integration test ـن.

## Deploy order

یەکەم backup ـی داتابەیس بگرە و migration ـی `20260816120000_qicard_fib_payment_sessions.sql` جێبەجێ بکە. دووەم، ئەم function ـانە deploy بکە: `payment-checkout`، `payment-webhook`، `payment-reconcile` و `system-health`. سێیەم، secret ـەکان دابنێ. چوارەم، URL ـی webhook ـەکان لە panel ـی Qicard و FIB ڕێکبخە و پشکنە کە بە HTTPS و accessible ـن. پێنجەم، Cloudflare Pages ـی frontend deploy بکە و sandbox transaction ـی هەر دوو provider جێبەجێ بکە.

## Security و reconciliation

Qicard webhook بە `X-Signature` ـی RSA-SHA256 پشکنین دەکرێت. FIB callback بە خۆی بەڵگەی settlement نییە؛ backend دۆخی payment لە FIB status endpoint دووبارە دەخوێنێتەوە. هەر دوو provider لە `payment_webhook_events` بە event key یەکجار هەڵدەگیرێن و `payment_sessions` بە `(provider,idempotency_key)` پارێزراوە.

`settle_payment_session` پێش ledger update بڕ و currency ـی provider لەگەڵ invoice بەراورد دەکات. ئەگەر mismatch، provider credentials نەبوون، status ـی نادیار، یان signature ـی هەڵە هەبێت، invoice بە paid ناگۆڕدرێت. `payment-reconcile` بۆ session ـە pending ـەکان status polling دەکات و session ـی بەسەرچوو بە expired نیشان دەدات.

## تاقیکردنەوەی sandbox

لە sandbox ـدا invoice ـێک بە `currency = IQD` دروست بکە. لە `payment-checkout.html?invoice_id=<id>` Qicard و FIB بە جیا تاقی بکەرەوە. دڵنیابە لەوەی create payment session هەمان idempotency key بە دووبارەکردنەوە payment ـێکی نوێ دروست ناکات، callback ـی دووبارە تەنها `duplicate` دەگەڕێنێتەوە، amount mismatch reject دەکرێت، و browser redirect بە تەنیا invoice ناگۆڕێت بۆ paid.

### سەرچاوەکان

[1] [QiCard API Features](https://developers-gate.qi.iq/docs/getting-started/api-features) — REST API و webhooks.

[2] [QiCard Create Payment](https://developers-gate.qi.iq/docs/api-endpoints/create-payment) — request/response و `formUrl`.

[3] [QiCard Basic Authentication](https://developers-gate.qi.iq/docs/api-auth/basic-auth) — Basic Auth و terminal header.

[4] [QiCard Webhook Verification](https://developers-gate.qi.iq/docs/webhook-guide/message-verification) — RSA-SHA256 و `X-Signature`.

[5] [QiCard Enable Webhooks](https://developers-gate.qi.iq/docs/webhook-guide/webhook-setup) — HTTPS callback و HTTP 200.

[6] [FIB Web Payments](https://fib.iq/integrations/web-payments/) — OAuth2، create/status/cancel، IQD، QR و callback.
