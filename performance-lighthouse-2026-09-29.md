# Globall Cloud — Lighthouse Final Audit

**Date:** 2026-09-29  
**Live URL:** https://globall-cloud.pages.dev/  
**Release tested:** `acc83cf`  
**Tool:** Lighthouse `12.8.2`, headless Chromium, simulated throttling  
**Important:** These are controlled lab scores, not field p75 scores from Erbil/UAE users. A single Lighthouse run can vary because of edge response, third-party fonts, and runtime initialization.

## Executive result

The previous Performance Diagnosis was correct about the main direction, but the new Lighthouse run found an additional issue: **the Cloudflare middleware is injecting several legacy CSS and JavaScript assets after the new homepage bundle is loaded**. Therefore, the homepage still has a large render-blocking waterfall even though the source HTML now has only three local CSS layers.

The new homepage CSS bundle is live and valid, but it is not yet the complete critical path because runtime/middleware assets are still added:

- `enterprise-shell-v2026.css`
- `gc-home-final-2026.css`
- `globall-realistic-design-20260919.css`
- `site-polish.css`
- `gc-theme-sync.css`
- `gc-production-ui-20260927.css`
- `gc-homepage-prebundle-20260929.css`
- `gc-homepage-postbundle-20260929.css`
- Google Fonts stylesheet
- `gc-csp-scripts/index-inline-2.js`
- Supabase UMD client
- Leaflet, which is still initialized during the Lighthouse idle window

## Lighthouse scores

| Route / mode | Performance | Accessibility | Best Practices | SEO |
|---|---:|---:|---:|---:|
| Homepage — mobile simulated | **18** | 96 | 89 | 92 |
| Homepage — desktop simulated | **14** | 96 | 93 | 92 |
| Traffic Analytics — mobile simulated | **65** | 95 | 89 | 92 |
| Customer Portal — mobile simulated | **71** | 99 | 93 | 92 |

## Core Web Vitals and timing

| Route / mode | FCP | LCP | Speed Index | TBT | CLS | TTI | Root document response |
|---|---:|---:|---:|---:|---:|---:|---:|
| Homepage — mobile | 3.9s | 5.4s | 11.1s | 1,400ms | 0.45 | 12.2s | 630ms |
| Homepage — desktop | 3.9s | 4.5s | 11.2s | 1,190ms | 0.286 | 17.9s | 590ms |
| Traffic Analytics — mobile | 2.5s | 8.3s | 7.6s | 40ms | 0 | 8.3s | 640ms |
| Customer Portal — mobile | 3.1s | 6.0s | 3.3s | 10ms | 0.069 | 6.1s | 370ms |

### Target comparison

| Metric | Recommended target | Current worst result |
|---|---:|---:|
| TTFB | ≤ 800ms | 640ms in this run; earlier sandbox samples were higher |
| FCP | ≤ 1.8s | 3.9s |
| LCP | ≤ 2.5s | 8.3s on Traffic Analytics |
| INP/TBT diagnostic | low | Homepage TBT 1,400ms |
| CLS | ≤ 0.10 | Homepage mobile 0.45 |

## Findings by route

### Homepage

The homepage is the urgent priority. Its performance score is low on both mobile and desktop despite optimized WebP/AVIF assets and CSS bundling.

Most important Lighthouse findings:

1. **Render-blocking resources:** estimated savings of about 610ms mobile and 790ms desktop.
2. **Document request latency:** estimated savings of about 530ms.
3. **Forced reflow:** large style/layout cost.
4. **Main-thread work:** about 19.3s in the mobile simulation, dominated by:
   - Other: 9.46s
   - Style and Layout: 7.74s
   - Rendering: 1.17s
5. **Unused JavaScript:** approximately 105KiB, mainly:
   - Supabase UMD client: about 45KiB unused
   - `index-inline-2.js`: about 38KiB unused
   - Leaflet: about 25KiB unused during part of the run
6. **Layout shift:** CLS 0.45 mobile and 0.286 desktop, which is now worse than the earlier diagnostic sample.

### Traffic Analytics

The dashboard has good interaction efficiency: TBT is only 40ms and CLS is 0. But the main visual is painted late:

- LCP: 8.3s
- Speed Index: 7.6s
- LCP request discovery is flagged
- Root document response: 640ms

This suggests that the dashboard's dominant visual is being created or revealed too late rather than blocked by heavy JavaScript execution.

### Customer Portal

This is currently the strongest of the three tested surfaces:

- Performance: 71
- Accessibility: 99
- Best Practices: 93
- TBT: 10ms
- CLS: 0.069

The remaining main issue is LCP at 6.0s and a render-blocking CSS chain estimated at 1.12s. The portal should be optimized after the homepage middleware path is fixed.

## What the audit changes in the plan

### P0 — Stop duplicate legacy asset injection

The homepage source bundle is not the entire runtime bundle. The middleware and bootstrap layer add legacy assets after HTML delivery. The next change should inspect and narrow `functions/_middleware.js`, `public-route-bootstrap.js`, and `public-core-recovery.js` so that the homepage does not load both the new experience and the legacy recovery stack during a normal healthy request.

Do not remove the recovery path entirely. It should be conditional on a failed health/runtime check, not loaded on every successful homepage visit.

### P0 — Keep Leaflet out of the Lighthouse critical window

The current lazy map waits for idle time with a 1.8s timeout. Lighthouse still reaches that timeout and loads Leaflet. For the homepage overview map, use one of these safer approaches:

- initialize only after the map enters the viewport with `IntersectionObserver`, without an unconditional timeout; or
- initialize on explicit user interaction; or
- render a static route poster and reserve Leaflet for the tracking page.

Tracking URLs with a real shipment ID should continue to initialize immediately.

### P1 — Reduce style/layout recalculation

The homepage still has many overlapping visual rules, and Lighthouse reports forced reflow. After removing duplicate injected CSS, rerun Lighthouse before deleting any more visual layers. Then remove only layers that are demonstrably redundant.

### P1 — Fix the homepage CLS regression

CLS 0.45 on mobile is not acceptable. Inspect the LCP element and the late-injected middleware styles/scripts. Reserve stable dimensions for:

- the hero visual/map shell
- injected announcement/navigation elements
- fonts and late style changes
- any dynamic recovery shell

### P1 — Fix Analytics LCP discovery

The analytics dashboard should provide a static, dimensioned first visual in HTML/CSS and defer chart drawing until after the first paint. The first dashboard chart or hero visual should not depend on a late JavaScript measurement.

## Conclusion

The image optimization, static asset cache policy, homepage CSS bundling, and map lazy-loading changes are present in the latest release and verified live. However, Lighthouse proves that the runtime still adds legacy assets and that the lazy map's timeout is too eager for a strict first-load audit.

The next highest-value release is therefore **middleware/runtime asset de-duplication plus removal of the unconditional map timeout**, followed by a new Lighthouse run. The performance score should not be judged as fixed until the homepage reaches at least:

- mobile Performance ≥ 70 as an intermediate milestone
- mobile LCP ≤ 2.5s
- mobile CLS ≤ 0.10
- mobile TBT ≤ 200ms
- no duplicate legacy CSS/JS on the normal homepage path

## Post-change re-audit — Map IntersectionObserver release

**Release:** `69f982d`  
**Verified live:** `live-logistics-map.js` contains `IntersectionObserver`; the previous `requestIdleCallback`/900ms fallback is absent.

After replacing the unconditional idle timeout with viewport intersection (`rootMargin: 200px`) and explicit user intent listeners (`pointerdown`, `focusin`, `click`, `touchstart`):

| Metric | Before this release | After this release |
|---|---:|---:|
| Homepage mobile Performance | 18 | **29** |
| FCP | 3.9s | **3.0s** |
| Speed Index | 11.1s | **4.2s** |
| Root document response | 630ms | **110ms** |
| Main-thread work | 19.3s | 12.1s |
| LCP | 5.4s | 5.9s |
| CLS | 0.45 | 0.302 |
| TBT | 1,400ms | 1,730ms |

The run-to-run variance is significant, but the improvement in first-paint and Speed Index is clear. The latest unused-JavaScript list no longer includes Leaflet; it is now dominated by Supabase UMD and `index-inline-2.js`. This confirms that the map is no longer part of the initial Lighthouse critical JavaScript path.

The next bottleneck is therefore the middleware/runtime legacy stack and homepage layout shift, not map loading.
