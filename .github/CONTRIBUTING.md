# Contributing to Globall Cloud

Thanks for contributing to Globall Cloud.

## Working model
- Keep changes focused on the relevant module or feature.
- Prefer small, reviewable pull requests.
- Update documentation when behavior, architecture, or rollout steps change.
- Keep production safety and auditability in mind when touching logistics or payment workflows.

## Repository workflow
1. Create a feature branch from the active development branch.
2. Keep changes scoped to a single topic or milestone.
3. Add or update documentation for new capabilities.
4. Submit a PR with a clear rationale, expected outcome, and risks.
5. Ensure the issue or roadmap item is linked in the PR description.

## Labels
Use labels such as:
- `epic`
- `enhancement`
- `high`
- `medium`
- `infra`

## Roadmap references
- See `roadmap.md` for the phased enterprise expansion roadmap.
- Follow the module priorities before expanding into optional AI and mobile capabilities.

## Before merging
- Confirm the change aligns with the roadmap and operating model.
- Validate security-sensitive changes against auth, RLS, and payment safety rules.
- Avoid broad rewrites of production logistics workflows unless the scope is intentional and reviewed.
