# Globall Cloud Mobile Audit · 2026-10-03

## Reviewed public surfaces
- Homepage: `/`
- Customer dashboard: `/dashboard`
- Tracking: `/track`
- Customer login page: `/login.html` (the extensionless `/login` route is currently protected by Cloudflare Access in the public response)
- Customer registration: `/register`
- Staff OS: `/staff`

## Findings
- The public experience has many historical CSS layers; the final mobile override must load last to prevent contradictory breakpoints.
- Homepage mobile needs a tighter header, a two-action hero, a full-width tracking field, compact transport cards, and less dense intelligence sections.
- Customer dashboard needs a mobile section navigator, compact two-column KPI cards, a clear next-action card, full-width form controls, and a fixed safe-area-aware mobile dock.
- Tracking needs a stacked form, 50px touch targets, readable help text, compact map/details sections, and safe-area-aware toast placement.
- Login and register need consistent panel width, 16px controls, stronger mobile vertical rhythm, and stacked links on narrow screens.
- Staff OS needs a final shared overflow/touch-target layer while preserving its existing operational shell and navigation.

## Implemented direction
- One shared `gc-mobile-excellence-20261003.css` loaded last on all primary routes.
- Signature cyan is reserved for primary actions and active states; navy surfaces remain calm and professional.
- All mobile interactions use at least 46–50px touch targets, safe-area spacing, overflow protection, readable typography, and reduced-motion support.
- Dashboard receives a five-item mobile dock: home, shipments, new request, rates, and support.
