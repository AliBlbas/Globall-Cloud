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
The goal is a stable 320px–768px mobile layout without sideways drift or automatic input-focus zoom. Pinch-to-zoom remains available for accessibility; the page itself is not supposed to zoom unexpectedly during normal use.

### Cloudflare
The fix is shipped as a normal static CSS asset so Cloudflare Pages can deploy it through the existing GitHub integration. Cloudflare Pages supports project `_headers` and standard cache directives for these assets.
