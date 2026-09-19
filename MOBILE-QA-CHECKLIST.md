# Mobile QA Checklist & Cloudflare Headers — Globall Cloud

تێبینی: ئەم فایلە چەکلیستی تاقیکردنەوە و نموونەی تنظیمی _headers و Cache-Control بۆ Cloudflare Pages دەدات. ئەو پێشنیارەکانە پێویستە لە PR یان release notes یەکەوە بگوازرێن.

## خلاصە
ئامانج: دڵنیابوون لە mobile guardrails بۆ UI ـی RTL-first لە 320px–768px بێ ئەوەی لاپەڕە هۆریزنتال overflow یان auto-zoom پەیدا بکرێت. pinch-to-zoom بۆ ئاکسسیبیلیتی پاشەکەوت دەکرێت.

## Devices to test
- iPhone SE (small)
- iPhone 12 / 13 mini
- iPhone 14 / 15 (regular)
- Android small-screen (Pixel 4a / Galaxy A-series)
- Tablet narrow widths (e.g., 768px)
- Desktop narrow viewport (resize to 768px)

## Manual test cases (high priority)
1. View homepage and 10 key pages on each device; verify no horizontal scroll or sideways overflow.
2. Tap form inputs on narrow screens — ensure inputs >=16px and iOS Safari does not auto-zoom on focus.
3. Double-tap gestures on controls — ensure no accidental zoom (test `touch-action: manipulation`).
4. Long strings (tracking IDs, route names, labels, metadata): verify they wrap or break without widening viewport.
5. Tables and code blocks: confirm they scroll horizontally inside their containers rather than widening the page.
6. Media (images/video/iframes): confirm they stay within viewport (max-width:100%).
7. Check text sizing on iOS: ensure -webkit-text-size-adjust:100% prevents text inflation.
8. Very small devices (<=390px): check tightened spacing and readability.
9. Accessibility checks: keyboard focus order, ARIA labels, and pinch-to-zoom availability.
10. Performance/lightweight CSS: run Lighthouse mobile audit (performance, accessibility, best-practices).

## Automated tests & tools
- Lighthouse (mobile) — record scores before/after.
- WebPageTest for real device emulation and viewport screenshots.
- Visual regression screenshots (Percy, Playwright snapshot, or Storybook chromatic) for these pages/components:
  - Homepage
  - Tracking page
  - Forms (login, checkout/contact)
  - Tables/code-blocks component
- Add E2E Playwright tests that open target pages at widths: 320, 375, 390, 412, 768 and assert no horizontal overflow and that focused inputs don't trigger page zoom.

## Cloudflare Pages: _headers example
Below is an example _headers file suitable for Cloudflare Pages. Adjust paths as needed.

/_headers
  /* Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400

# Static CSS asset: make it long-lived and immutable when filename includes content hash
/assets/tracking-styles.*.css
  Cache-Control: public, max-age=31536000, immutable

# HTML pages: short TTL so updates propagate quickly
/*.html
  Cache-Control: public, max-age=3600, s-maxage=600

# Service worker (if any)
/service-worker.js
  Cache-Control: public, max-age=0, s-maxage=60, must-revalidate


Notes:
- Use a content-hash (e.g., tracking-styles.abc123.css) to allow aggressive caching + immutable.
- Keep HTML TTL short so content updates deploy quickly; static hashed assets can be long-lived.

## CI / Deployment checklist
- Ensure the built CSS filename includes a content hash if you plan to set immutable caching.
- Confirm _headers is included in the deployed artifact for Cloudflare Pages.
- After deploy, run automated Lighthouse checks and visual-diff step in CI; fail the deploy on regressions if desired.

## Monitoring after release
- Instrument analytics to surface unusual pinch/zoom or viewport-related interactions (if available).
- Monitor error logging for layout/overflow JS/CSS issues logged by users.
- Collect screenshots or user reports from real devices for regressions.

## Suggested PR description (copy into PR template)
Add mobile guardrail CSS and Cloudflare _headers for improved mobile layout stability.

What changed:
- Added tracking-styles.css changes to prevent horizontal overflow, iOS text inflation, input auto-zoom, and to make media/tables/code blocks responsive.
- Added mobile QA checklist and example Cloudflare _headers in MOBILE-QA-CHECKLIST.md.

Testing:
- Manual cross-device checks across listed devices.
- Automated Lighthouse and visual regression tests in CI.

