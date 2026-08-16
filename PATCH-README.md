# Globall Cloud — CSP Patch Release

ئەم وەشانە بۆ چارەسەرکردنی CSP و inline script ئامادە کراوە. هەموو executable inline `<script>` ـەکانی HTML بۆ `gc-csp-scripts/` گوازراونەتەوە، هەموو inline event attribute ـەکان بۆ `data-gc-on*` گۆڕاون، و `gc-csp-bridge.js` بە شێوەیەکی non-eval event ـە کۆنەکان بە external JavaScript پەیوەندیدەکات.

## گۆڕانکارییە سەرەکییەکان

| بەش | ئەنجام |
|---|---|
| CSP | `script-src` بەبێ `unsafe-inline` ماوەتەوە |
| Inline scripts | ١٥ script block بۆ فایلە external ـە versioned ـەکان گوازراونەتەوە |
| Inline HTML events | ٠ event attribute ـی کۆنی HTML ماوە |
| Event compatibility | `gc-csp-bridge.js` بەبێ `eval` کاردەکات |
| Service worker | asset ـە نوێکان لە cache list زیاد کراون |
| Fonts | origin ـەکانی Google Fonts لە policy ـدا ڕێگەپێدراون |
| Redirect page | inline redirect script لابراوە؛ meta refresh ماوەتەوە |

## چۆنیەتی deploy

ناوەڕۆکی ناوەڕاستی ئەم archive ـە (`Globall-Cloud-main/`) وەک root ـی Cloudflare Pages publish بکە. پێویستە `_headers`، `sw.js`، `gc-csp-bridge.js` و هەموو directory ـی `gc-csp-scripts/` لە root ـدا بمێنن. ئەگەر deployment ـەکە service worker ـی کۆن هەڵگرت، cache version ـی `20260816-1` و service worker update ـەکە بە browser hard reload دووبارە verify بکە.

## Verification ـی جێبەجێکراو

پێش ساختنی ZIP، ٤٢ فایلەی JavaScript بە `node --check` پشکنراون و هیچ syntax error ـێک نەماوە. پشکنینی ٢٤٦ HTML reference، لەوانە ٨٦ local reference، هیچ asset/page ـی ونبووی نەدۆزییەوە. هیچ executable inline script و هیچ static HTML inline event attribute ـێک نەماوە. وەشانی patch لەسەر سێرڤەرێکی local بە هەمان CSP ـی enforce کراوی `_headers` بارکرا؛ پەیجی سەرەکی و `logistics-os.html` باربوون، گۆڕینی زمان کاریکرد و browser console هیچ output ـێکی نەدا.

ئەم verification ـە signed-out و public ـە. دوای deploy ـی Cloudflare Pages پێویستە بە هەژماری تاقیکردنەوەی customer، staff، warehouse و driver role-by-role smoke test بکرێت، بە تایبەتی Auth، RLS، upload/POD، GPS، notification و Edge Function ـەکان.

## سنووری ئەم patch ـە

ئەم archive ـە کێشەی CSP و inline JavaScript چارەسەر دەکات. Payment gateway، provider webhook، carrier integration و business workflow ـە نەکراوەکان بەخۆکار لەم patch ـەدا دروست نەکراون و پێویستیان بە implementation ـی جیاواز هەیە.
