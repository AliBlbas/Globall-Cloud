# Globall Cloud Deployment Audit Findings

- GitHub repository: https://github.com/AliBlbas/Globall-Cloud
- Current main commit after repair: 321b66bd433cb4a4c7d610ce43c18352ede8495b
- Supplied ZIP checksum and repository ZIP checksum matched before repair.
- Live site: https://globall-cloud.pages.dev/
- Live site redirects through Cloudflare Access and returns the Access login page; HTTP behavior observed as 302 to the Access login domain followed by 200.
- Live site Access page includes `Cloudflare Access` and `Log in to All Workers`.
- Local repository validation passes: `npm test` reports 37 JavaScript files OK, required production files present, unified package valid, no browser secret markers, and production wiring aligned.
- Local live smoke test passes when using a User-Agent: site is Access-protected and Supabase public-config returns HTTP 200 with a non-empty `usd_iqd_rate` value.
- GitHub Actions originally had `allowed_actions: local_only`; it was changed to `selected` with patterns for actions/checkout, actions/setup-node, github/codeql-action, and supabase/setup-cli. Current repository policy reports `enabled: true`, `allowed_actions: selected`, `sha_pinning_required: false`.
- GitHub Pages configuration is enabled and built at https://aliblbas.github.io/Globall-Cloud/ with source branch `main`, root path `/`, legacy build type. This is separate from the Cloudflare Pages URL.
- Custom workflow jobs still fail before any steps run: `runner_id: 0`, empty runner name, `steps: []`, and failure within about two seconds. This persisted after changing ubuntu-24.04 to ubuntu-latest and after the Actions allowlist repair, indicating a GitHub-hosted runner/account/repository-level availability issue rather than a repository test failure.
- Recent Pages build deployment runs report success, but that is GitHub Pages, not proof of the Cloudflare Pages Git integration.
