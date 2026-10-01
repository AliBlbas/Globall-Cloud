# Globall Cloud — Performance Diagnosis

**Date:** 2026-09-29  
**Scope:** Homepage, Traffic Analytics, Customer Portal  
**Method:** repeated `curl` timing samples, source/asset audit, live browser Web Vitals, cache/header review

## Executive summary

The main slowdown is not one isolated JavaScript error. It is a combination of four high-impact issues:

1. **The homepage eagerly loads three very large PNG images** (about 4.1–4.8 MB each; roughly 12.4 MB total) even though only one is needed above the fold.
2. **The homepage has 24 separate CSS files** (about 190 KB uncompressed locally), many of them successive visual override layers. They are render-blocking and increase style recalculation and network scheduling work.
3. **HTML, CSS and JS are deliberately configured as `no-store` / `no-cache`, and the service worker requests assets with `cache: 'no-store'`.** Returning visitors therefore lose most browser-cache benefits.
4. **Measured TTFB is high and variable** from the sandbox network: homepage samples ranged from **1.94s to 3.36s**, with total time around **2.29s–3.68s**. This must be confirmed from the target region using RUM because the measurement includes network/TLS conditions.

## Measurements

| Route | TTFB sample | Total sample | HTML bytes |
|---|---:|---:|---:|
| `/` | 2.52s | 2.87s | 30,973 |
| `/traffic-analytics` | 2.52s | 3.14s | 19,731 |
| `/customer-portal` | 2.63s | 3.29s | 19,849 |

Repeated homepage TTFB samples: **3.36s, 2.51s, 2.27s, 1.94s, 3.30s**.

Live browser session on the analytics route reported:

- **LCP:** 5,512ms
- **FCP:** 5,512ms
- **TTFB:** 2,942ms
- **INP:** 2,536ms (this can be distorted by the test browser/session, but it is still a warning signal)
- **CLS:** 0.053 (good)

These numbers show that the largest problem is early server/network response plus the time needed before the main visual becomes paintable. CLS is not the main problem.

## Root causes

### P0 — Oversized images above the fold

The homepage contains these 2560×1440 PNGs:

| Asset | Approx. size | Current behavior |
|---|---:|---|
| `gc-air-freight-hero.png` | 4.12 MB | `loading="eager"`; also used in the studio visual |
| `gc-sea-freight-hero.png` | 4.77 MB | `loading="eager"` |
| `gc-land-freight-hero.png` | 4.12 MB | `loading="eager"` |

The same images are reused later for service cards, but the browser receives the full-resolution PNGs. For a typical mobile card, 2560×1440 is substantially larger than necessary.

**Fix:** create AVIF/WebP variants at realistic display sizes (for example 640px card, 960px studio, and 1440px desktop hero), use `<picture>` with responsive `srcset`/`sizes`, and set only the true above-the-fold hero/studio image to `fetchpriority="high"`. Set below-fold service-card images to `loading="lazy"` and `decoding="async"`.

### P0 — CSS override chain

The homepage currently declares **24 stylesheet links**. The visual system is spread across many files such as redesign, master, production, visual refresh, signature, advanced, landing, service and quick-quote layers.

**Impact:** each stylesheet can block first render; the browser must parse and recalculate a large cascade; duplicate selectors make regressions difficult to diagnose.

**Fix:** compile the stable public styles into one production CSS file, keep one small critical-CSS block for the first viewport, and load optional section styles after first paint. Remove superseded override layers only after visual regression testing.

### P0 — Cache policy disables repeat-visit performance

Current policy includes:

- HTML: `no-store, max-age=0, must-revalidate`
- CSS/JS: `no-cache, must-revalidate`
- Service worker: `fetch(..., { cache: 'no-store' })` for scripts, styles and images

This is safe against stale UI but expensive. Query-string versioning already exists in the assets, so immutable caching can be used safely.

**Fix:**

- HTML: `Cache-Control: public, max-age=0, must-revalidate` or short edge caching if appropriate.
- Versioned CSS/JS/images: `Cache-Control: public, max-age=31536000, immutable`.
- Service worker: use normal browser/cache-first behavior for hashed/versioned static assets; keep network-first only for HTML and live API responses.
- Bump the service-worker cache name on releases and retain a network fallback.

### P1 — High TTFB / edge response

The sandbox measured approximately 2–3.4 seconds before the first byte. DNS and TCP connect were low, while TLS and server response timing were much higher. This points to one or more of: edge/origin cold start, deployment/runtime processing, route fallback behavior, or measurement-region latency.

**Fix and verification sequence:**

1. Capture `navigation` timing from real users by country/device, separating `domainLookupEnd`, `connectEnd`, `secureConnectionStart`, `requestStart`, `responseStart` and `responseEnd`.
2. Check Cloudflare Pages cache status and deployment-region behavior for `/`, `/traffic-analytics` and `/customer-portal`.
3. Ensure static routes resolve directly to static files without a function/redirect chain.
4. Move any public-config/health call out of the critical render path; start it after first paint.
5. Inspect Supabase/edge calls for cold starts or slow unauthenticated requests. Do not block the homepage on analytics, map or pricing data.
6. If TTFB remains above 800ms for Iraq/UAE users after static caching, use a regional edge strategy or a lightweight cached response layer.

### P1 — Render-blocking font and early scripts

The homepage loads Google Fonts as a blocking stylesheet and has several scripts before the main content. Three scripts are not marked `defer` in the early document portion. Font requests can delay text paint, and early recovery/bootstrap scripts compete with CSS and images.

**Fix:** self-host the required Vazirmatn/JetBrains Mono subsets or preload only the exact WOFF2 files; use `font-display: swap`; add `preconnect` only for unavoidable third-party origins. Mark non-critical scripts `defer` or move them after the main content. Keep only route/bootstrap logic needed before interaction in the head.

### P1 — Map and third-party work

The homepage includes a live Leaflet map and external tile requests. Maps are visually useful but should not delay the first meaningful hero paint.

**Fix:** render a static route placeholder/poster in the first viewport, initialize Leaflet after `load` or after user intent/IntersectionObserver, and lazy-load map tiles when the map section enters the viewport. Keep tracking functionality intact.

### P2 — Analytics dashboard measurement limitations

LCP, FCP, INP and TTFB are currently measured locally in the browser. The displayed score is useful for diagnosis but is not a statistically reliable production score yet. INP needs real interactions and a representative sample; a single browser run can be noisy.

**Fix:** send aggregated, privacy-safe RUM buckets (not raw browsing data) to a protected endpoint, segment by route/country/device, and report p75 values. Keep the local check as a developer diagnostic.

## Recommended implementation order

1. **Convert and resize the three freight PNGs** to AVIF/WebP with responsive sources. This is likely the largest LCP win.
2. **Make only the real first-viewport visual high priority**; lazy-load the remaining cards and route imagery.
3. **Consolidate the 24 homepage CSS files** into a stable public bundle and critical CSS.
4. **Change cache policy for versioned static assets** and update the service worker to cache them normally.
5. **Defer map initialization and non-critical scripts.**
6. **Investigate TTFB by region** using RUM and Cloudflare cache/origin logs; target p75 TTFB under 800ms.
7. **Re-test with mobile throttling** and compare p75 LCP/FCP/TTFB/INP after each change.

## Targets

| Metric | Good target | Current diagnostic signal |
|---|---:|---:|
| TTFB | ≤ 800ms | ~1.94–3.36s sandbox samples |
| FCP | ≤ 1.8s | 5.51s browser sample |
| LCP | ≤ 2.5s | 5.51s browser sample |
| INP | ≤ 200ms | 2.54s browser sample; needs representative RUM |
| CLS | ≤ 0.10 | 0.053, currently good |

## Important caution

Do not delete the existing visual CSS layers in one step. They contain overlapping fixes for mobile, customer portal and landing sections. Consolidate them through a visual regression pass at desktop and mobile widths, then remove superseded layers gradually.

## Bottom line

The safest high-impact first release is **image optimization + lazy loading + immutable cache for versioned assets**. This should reduce the amount of work before LCP without changing business behavior. The second release should address CSS consolidation and TTFB/RUM investigation. The current data supports these priorities, but TTFB should be re-measured from Erbil/Iraq and UAE devices before assigning blame solely to Cloudflare or Supabase.
