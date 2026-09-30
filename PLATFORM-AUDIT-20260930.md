# پشکنین و چاکسازیی Globall Cloud

**بەروار:** 2026-09-30  
**قۆناغ:** گۆڕانکارییەکان بۆ review لە PR #106 ـدان؛ **merge و production deploy نەکراوە**.

## سنووری کار

پشکنینی کۆدی customer portal، نرخدان و quote، staff console، ڕێگەپێدانی دارایی، workflow ـی کۆگا، و backend/API ـەکانیان کرا. هەروەها پەڕەی سەرەکی و پەیوەندی tracking بە ماڵپەڕەکە هەڵسەنگێنرا. هەموو نوێکارییەکان لە branch ـی پێداچوونەوەدان؛ هیچ داتای کریار، پسووڵە، پارەدان یان ڕێکخستنی production دەستکاری نەکراوە.

## چاکسازییە گەیەنراوەکان

### پەڕەی سەرەکی و جیاکردنەوەی tracking
- tracking-form/panel ـی ناو landing page لابرا؛ ڕێڕەوی تایبەتی `/track` و لینکی گەیشتن بە tracking ماون.
- کارتی خزمەتگوزاریی **Air / Sea / Land** بە وێنەی تایبەت و WebP ـی optimizeکراو، responsive و expandable زیاد کرا.
- ڕەنگ و contrast ـی heading ـەکان دوای باربوونی theme چاک کرا.

### Customer portal و بەڕێوەبردنی هەژمار
- دووجار خوێندنەوەی request body لە `customer-self` لابرا؛ ئەمە ڕێگری لە جێبەجێبوونی هەندێک POST ـی profile و quote دەکرد.
- دۆخی save و پەیامی سەرکەوتن لە profile editor بەجێ دەمێنێتەوە دوای نوێکردنەوەی UI.
- Admin دەتوانێت زانیارییە ئاساییەکانی کریار نوێ بکاتەوە کاتێک email ناگۆڕێت؛ گۆڕینی email، password یان GC identity بۆ Super Admin سنووردار کراوە.
- Home ـی mobile dock لە customer portal ـدا دەمێنێتەوە و بۆ پەڕەی مارکێتینگ ناپەڕێتەوە.

### Quote، نرخدان و Staff Console
- action ـی `calculate` لە account-admin router ـدا چالاک کرا و نرخدان بۆ quote ـی کریار بە route ـی دروستەوە بەسترا.
- هەژمارکردن CBM ـی پاشەکەوتکراوی داواکاریی کریاریش بەکار دەهێنێت؛ email ـی داواکار بۆ staff پیشان دەدرێت.
- quote inbox دەتوانێت پێشنیاری نرخ لە rate ـە چالاکەکان دروست بکات و approval لە ڕێگەی RPC ـی پارێزراوەوە بکات؛ status و validity پشکنین دەکرێن.
- دروستکردنی هەژماری کریار لەو flow ـەدا تەنها بۆ Super Admin ماوەتەوە.

### دارایی و ڕێگەپێدانی staff
- خوێندنەوەی finance ledger و invoice/payment لە backend سنووردار کرا؛ finance roles هەمان دەستگەیشتنی پێویستیان هەیە.
- amount ـی shipment و balance/ledger ـی پەیوەندیدار بۆ staff ـی نافاینەنس لە API response و staff UI ـدا دەشاردرێتەوە.
- logistics control plane role-gate، branch scoping و driver assignment scoping ـی بۆ shipment ـەکان بەدەست هێنا؛ quote/invoice/payment reads جیاوازە سنووردار کراون.
- logistics control tower amount ـی outstanding و ژمارەی payment-risk بۆ non-finance ناشارێتەوە؛ بۆیان `null` دەگەڕێنێتەوە.
- لە legacy `operations-admin` ـدا shipment amount تەنها بە finance/admin دەگۆڕدرێت و amount لە وەڵامی non-finance دەسڕدرێتەوە؛ authorization rejection وەڵامی HTTP 403 دەدات.

### کۆگا و بەڵگەی وەرگرتن
- upload ـی وێنە پێش upload ـکردن validation دەکرێت؛ ئەگەر upload یان insert شکست بهێنێت، فایلە نیمچەبارکراوەکان پاک دەکرێنەوە.
- UI بە دروستی نیشان دەدات shipment-link شکستی هێناوە و WhatsApp بە شێوەی ئۆتۆماتیکی نە نێردراوە/نە queue کراوە.
- وەڵامی signed-photo بە شێوەی تایپ‌کراو پێشکەش دەکرێت.

### سنووری RPC ـی نرخ
- migration ـی PR دەستگەیشتنی مستقیم anon/authenticated بە pricing RPC ـی `SECURITY DEFINER` دەگرێت؛ public quote ـەکان هێشتا لە Edge Function ـی پارێزراو و rate-limited دەڕۆن.

## معماری و سێرڤیس

Frontend ـەکە Cloudflare Pages ـە و backend/auth/database/Edge Functions ـەکان Supabase ـن. لەم چاکسازییەدا سێرڤەری نوێی VPS یان background worker ـی بێ پێداویستی زیاد نەکراوە. لە کۆدی پشکنراودا هۆکارێک نەدۆزرایەوە کە بۆ ئەم workflow ـانە پێویستی بە سێرڤەری درێژخایەنی جیاواز بسەلمێنێت؛ Cloudflare Pages + Supabase دەتوانێت ئەم معمارییە بەردەوام بگرێت. ئەگەر دواتر notification queue، cron یان provider integration ـی بەرهەمهێنانی درێژخایەن پێویست بوو، پێش چالاککردنی لە production پێویستە schedule/provider ـەکان و secret ـەکان جیاواز verify بکرێن.

## پشتڕاستکردنەوە

- `npm test` — سەرکەوتوو: syntax ـی 429 JavaScript و 46 TypeScript، contract/security assertions و production contracts.
- `git diff --check` — سەرکەوتوو.
- Cloudflare Pages build لە کۆپییەکی پاک و isolated — سەرکەوتوو؛ homepage، Staff Console و سێ WebP ـی Air/Sea/Land لە output ـدا پشتڕاست کران.
- Deno checks: `operations-v4`، `operations-admin`، `logistics-control-plane`، `logistics-control-tower`، `warehouse-receiving` و `customer-self` هیچ diagnostic ـێکیان نەما. `account-admin` هێشتا diagnostic ـی TypeScript ـی پەیوەندیدار بە schema inference ـی `never` هەیە؛ لە Product baseline ـدا 108 diagnostic هەبوو، لە checkout ـی ئێستادا 102 ماوە و هەموویان لە هەمان فایلن. ئەمە بەڵگەی ئەوە نییە کە production runtime هەڵەیە، بەڵام پاککردنەوەی تایپی generated Supabase schema جۆرێکی جیاوازی کارە و لەم PR ـەدا بە مەترسیی کەم نەکرایەوە.
- E2E ـی نووسین لەسەر user ـی ڕاستەقینە یان live finance/customer data نەکرا؛ هیچ test credential ـێکی دیاریکراو بۆ ئەوە بەردەست نەبوو و نووسین لە production scope نەبوو.

## قۆناغی داهاتوو

1. PR #106 پێداچوونەوە و CI ـی خۆی تەواو بکات.
2. پێش deploy، لە staging یان بە test account ـی دیاریکراو smoke test بکرێت: customer profile edit، quote→calculate→approve، finance visibility، branch/driver scoping، و warehouse photo→shipment-link.
3. دوای review، ئەگەر خاوەن پرۆژە داوای کرد، deployment بۆ قۆناغێکی جیاواز دابنرێت. **لەم قۆناغەدا PR merge و production deploy نەکراوە.**
