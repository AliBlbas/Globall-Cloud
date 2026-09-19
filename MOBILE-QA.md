# Mobile QA — Globall Cloud

## 2026-08-11

The public site's `tracking-styles.css` now adds a global mobile guardrail layer for the existing RTL-first UI.

### Fixed
- Prevent horizontal page overflow with `max-width:100%`, `min-width:0`, and `overflow-x:clip`.
- Prevent iOS text inflation with `-webkit-text-size-adjust:100%`.
- Keep media elements inside the viewport.
- Prevent accidental double-tap interaction zoom on controls with `touch-action:manipulation`.
- Keep form controls at `16px` or larger on narrow screens so iOS Safari does not auto-zoom a focused input.
- Make long tracking IDs, route names, labels, and metadata wrap instead of forcing the viewport wider.
- Make tables and code blocks scroll inside themselves rather than widening the page.
- Add tighter spacing for very small devices (<=390px).

### Intent
The goal is a stable 320px–768px mobile layout without sideways drift or automatic input-focus zoom. Pinch-to-zoom remains available for accessibility; the page itself is not supposed to zoom unexpectedly when a control receives focus. These changes are intended to be conservative — they constrain layout flow and sizing only where necessary to prevent viewport shifts, while preserving readable type and user-scalability for accessibility.

If you maintain components or templates that set explicit widths, font-sizes, or non-wrapping styles, review those places first (tables, tracking IDs, dashboard tiles, and code snippets). Prefer responsive patterns: percent-based max-width, word-break/wrap, and internal scroll for overflowed blocks.

### Testing & QA
- Manual device testing: iPhone SE, iPhone 12/13 mini, iPhone 14/15, common Android small devices (Pixel 4a / Galaxy A-series), and narrow tablet widths (768px).
- Verify there is no horizontal scrolling or layout overflow across pages and key components (tables, forms, code blocks, tracking pages).
- Focus form controls on iOS Safari to confirm the viewport does not zoom; ensure focused inputs have at least 16px font size.
- Test double-tap and tap interactions for controls to ensure `touch-action: manipulation` prevents accidental zoom on interactive controls.
- Run Lighthouse (mobile) and WebPageTest profiles before/after changes for regressions.
- Add visual regression snapshots for landing/tracking/forms/tables to detect layout drift.

For a ready checklist and suggested Playwright tests, see MOBILE-QA-CHECKLIST.md in this repository.

### Cloudflare
The fix is shipped as a normal static CSS asset so Cloudflare Pages can deploy it through the existing GitHub integration. Cloudflare Pages supports a project `_headers` file and standard Cache-Control directives; use a content-hashed filename for `tracking-styles.css` when possible so the asset can be cached aggressively (immutable).

Recommended _headers entries (example):

```
/_headers
  /* Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400

/assets/tracking-styles.*.css
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=3600, s-maxage=600

/service-worker.js
  Cache-Control: public, max-age=0, s-maxage=60, must-revalidate
```

Notes:
- Use short TTL for HTML so updates propagate quickly; use long immutable caching for content-hashed assets.
- Confirm `_headers` is included in the project build output that Cloudflare Pages deploys.
- After deployment, run smoke checks (visual diffs and Lighthouse) in CI and monitor analytics for unusual zoom/overflow events.

---

If you'd like, I can:
- Open a PR that updates this file with the improved text and links to MOBILE-QA-CHECKLIST.md (already added), or
- Create example Playwright tests and a CI job to run Lighthouse + visual-diff on deploy.
