# Supabase integration — Globall Cloud

Globall Cloud is deployed as a static Cloudflare Pages application, not a Next.js App Router application.

Therefore the Next.js-specific files from the generic Supabase guide (`page.tsx`, `utils/supabase/server.ts`, and Next middleware) are intentionally not copied into this repository: they would not execute in the current architecture.

## Production implementation

- Browser client: `production-bridge.js`
- Shared module entry: `assets/js/supabase.js`
- Supabase URL: `https://ahslifnthiwfkmaswjno.supabase.co`
- Browser credential: publishable key only
- Session persistence: enabled
- Automatic token refresh: enabled
- OAuth callback/session URL detection: enabled
- PKCE flow: enabled
- Auth state is exposed through `gc:auth-state` and `window.gcAuth`
- Server/service-role credentials remain inside Supabase Edge Functions and are never placed in browser code

## Local environment

Use `.env.example` as the template. Do not commit `.env.local` or any service-role key.

## Why `@supabase/ssr` is not installed here

`@supabase/ssr` is designed for SSR frameworks such as Next.js. This repository does not have a Next.js runtime. Adding it without converting the application to Next.js would create dead code and could break the existing locked-dependency/Cloudflare validation flow.

The existing browser client already provides the required production session behavior through `@supabase/supabase-js` loaded by the production bridge.
