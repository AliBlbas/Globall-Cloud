# Globall Cloud — Release Policy

## Production UI stability
- The existing production UI and visual design are protected.
- Feature work must be additive by default.
- No redesign, theme replacement, or broad CSS rewrite is permitted as part of a feature change.

## Safe delivery path
- GitHub is the source-control authority.
- Supabase staging is the verification environment for backend changes.
- Production changes require successful repository and contract validation before release.
- Customer data is never copied into staging for feature verification.

## Change discipline
- Preserve existing routes, user flows, database contracts, and security boundaries unless a change is explicitly required.
- Prefer small, isolated commits so regressions can be identified and reverted safely.
- Service-worker and cache changes must preserve network-first navigation and must not inject or execute legacy recovery scripts.
