# Staff Console live audit — 2026-08-25

## Public homepage

The production homepage at https://globall-cloud.pages.dev/ loads successfully with the title `Globall Cloud — China · UAE · USA → Erbil Logistics`. The visible public experience includes bilingual KU/EN controls, theme toggle, staff entry point, tracking input, quote/contact calls to action, WhatsApp contact, and route/service navigation. The visual system is dark navy with cyan/gold accents and a dense desktop-to-mobile responsive layout.

## Staff OS unauthenticated route

The production route https://globall-cloud.pages.dev/staff-os?tab=overview loads HTTP 200 and presents the protected Staff Command Center login gate with email/password fields and a login button. No credentials were entered. The `tab` query string does not bypass authentication; the protected shell is not exposed to anonymous users.

## User-provided mobile evidence

The supplied phone screenshots show the Staff OS RTL navigation rendered as a tall single column with excessive vertical space, bilingual labels mixed with English section headings, and the authenticated/error area displaying `Unauthorized`, `Internal server error`, and raw Supabase-style `permission denied for view` JSON. One logistics module also shows `Internal server error` instead of a graceful module-specific recovery state. These are the first targets for remediation: protected data error normalization, retry-safe partial rendering, mobile information density, and consistent Kurdish/English terminology.

## Safety boundary

Do not use the owner password or create production business writes merely to obtain authenticated screenshots. Authenticated verification requires a dedicated synthetic staff account or user-provided error text/screenshots without credentials.
