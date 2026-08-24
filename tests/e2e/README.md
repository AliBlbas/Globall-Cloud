# Globall Cloud E2E Test Harness

ئەم harness ـە بە Node.js و `fetch` کار دەکات و پێویستی بە dependency ـی زیادە نییە. ئامانجی ئەوەیە پەیوەندیی نێوان live frontend، Supabase Auth، `account-admin`، RLS و service contracts بپشکنێت بەبێ ئەوەی بە شێوەی بنەڕەتی data ـی production بنووسێت.

## جۆرەکانی تاقیکردنەوە

| Mode | Credential | Write | Scope |
|---|---|---:|---|
| `public` | هیچ | نەخێر | public routes، assets، public Edge Functions، system health، API 401 و anonymous table denial |
| `staff` | یەک staff test user | نەخێر | Supabase password login، self-profile، role gates، dashboard lists، quotes calculate، finance read، notifications، chat read |
| `staff-2` | دوو staff test user | نەخێر | هەمان read suite بۆ هەردوو session و هەڵسەنگاندنی role access؛ message realtime بە browser/provider credentials پێویستی هەیە |
| `mutations` | هیچ | نەخێر | بە ئەنقەست disabled ـە تا staging fixture reset/cleanup contract زیاد بکرێت |

## Environment

فایلێکی `.env` دروست مەکە لە repository ـدا. Variable ـەکان لە shell، CI secret یان secret manager دابین بکە:

```bash
export GC_SITE_URL=https://globall-cloud.pages.dev
export SUPABASE_URL=https://ahslifnthiwfkmaswjno.supabase.co
export SUPABASE_ANON_KEY='your-publishable-or-legacy-anon-key'
export E2E_STAFF_EMAIL='staff-test@example.com'
export E2E_STAFF_PASSWORD='use-a-dedicated-test-password'
export E2E_STAFF_2_EMAIL='second-staff-test@example.com'
export E2E_STAFF_2_PASSWORD='use-a-dedicated-test-password'
```

`SUPABASE_SERVICE_ROLE_KEY` بۆ `public` و `staff` mode پێویست نییە و harness ـەکە هیچ service-role secret ـێک لە output چاپ ناکات. `mutations` mode لە کۆدی ئێستا بە ئەنقەست ڕەت دەکرێتەوە؛ چونکە API ـی production بۆ chat و quote delete/reset ـی safe نییە. پاش دروستکردنی staging fixture reset ـی پەسەندکراو، دەتوانرێت بە `E2E_ALLOW_MUTATIONS=1` و `E2E_TARGET=staging` چالاک بکرێت.

## Run

```bash
npm run test:e2e:public
npm run test:e2e:staff
npm run test:e2e:staff:two
npm run test:e2e:mutations
```

`staff` mode بە default تەنها read-only ـە. بۆ login ـی دوو staff، هەردوو credential ـەکان دابین بکە. ئەگەر test user ـێک role ـی بەرپرسیار نەبێت، harness بە شێوەی چاوەڕوانکراو `403` بۆ feature ـە role-gated ـەکان وەک finance یان administration قبوڵ دەکات و `500` بە failure دادەنێت.

## Safety contract

لە production ـدا هیچ quote، task، message، notification یان finance update بە شێوەی خۆکار دروست ناکرێت. `npm run test:e2e:mutations` بە ئەنقەست fail-fast ـە تا project ـێکی disposable/staging و fixture reset ـی پەسەندکراو زیاد بکرێت. Chat message ـەکان بە policy ـی production delete ناکرێن، بۆیە mutation suite نابێت لە production message بنێرێت.

## What this proves

ئەم harness ـە API contract، Auth، RLS، role gates و data-shape پشکنێت. Realtime presence و دوو-browser message delivery بە API تەنها بە تەواوی ناپشکنرێت؛ بۆ ئەوە پێویستە دوو browser context بە Playwright یان دوو browser ـی test بە credential ـی test لە staging بەکاربهێنرێت. هەروەها payment provider، Gmail و WhatsApp callback ـەکان پێویستیان بە sandbox credentials و webhook replay ـی تایبەت هەیە.
