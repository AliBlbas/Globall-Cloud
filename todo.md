# Globall Cloud Deployment TODO

- [x] Audit current GitHub repository, release ZIP, Cloudflare Access behavior, and Pages-related configuration
- [x] Identify and fix the root cause of GitHub Actions startup failures
- [x] Validate production-integrity checks against the current Cloudflare Access protection model
- [x] Ensure the GitHub repository contains the intended release package and required deployment files
- [ ] Verify Cloudflare Pages source repository, production branch, and build settings (Cloudflare Dashboard security verification still blocks access)
- [x] Verify Cloudflare Access policy behavior and preserve secure internal access
- [x] Run repository validation and GitHub Actions verification after fixes (local validation passes; hosted runner remains unavailable)
- [x] Confirm live site response and document any remaining manual Cloudflare action

- [ ] Reconnect Cloudflare Pages Git integration after the dashboard shows the repository as Disconnected
- [ ] Configure Cloudflare Pages for the repository's static root: no build command or `exit 0`, output directory `/`, production branch `main`
- [ ] Trigger and verify a new Cloudflare Pages deployment from the reconnected GitHub repository

- [ ] Make the public site and quote-request flow accessible without Cloudflare Access email login
- [ ] Require email/password authentication only for customer accounts, request history, and private dashboards
- [ ] Preserve public submission of quote requests while associating later account access securely
- [ ] Verify public browsing, quote request submission, and protected account entry after the auth-boundary change

# Production Platform Roadmap

- [x] Define public, customer, staff, finance, and super-admin roles and route boundaries
- [x] Choose production architecture and data ownership model for frontend, API, database, storage, and authentication
- [ ] Establish secure server-side environment configuration and secrets handling
- [ ] Create durable schema for customers, quote requests, shipments, invoices, documents, messages, audit logs, and staff roles
- [ ] Implement email/password customer authentication and protected account sessions
- [ ] Keep public browsing and quote-request submission accessible without site-wide Cloudflare Access
- [ ] Build customer quote history, shipment tracking, documents, notifications, and profile workflows
- [ ] Build internal operations dashboard for quotes, shipments, exceptions, documents, and customer communication
- [ ] Build CRM, pricing, finance, staff, and approval workflows with role-based permissions
- [ ] Add validation, rate limiting, audit logging, error handling, and secure database policies
- [ ] Add automated tests, end-to-end smoke tests, monitoring, backups, and deployment checks
- [ ] Execute staged release and verify public quote flow plus protected account flow in production

- [x] Restore all release assets referenced by HTML files but missing from the Git tree, starting with customer portal and CSP external scripts
- [x] Re-run package validation after restoring missing runtime assets

- [x] Deploy the new Supabase `public-quote` Edge Function to project `ahslifnthiwfkmaswjno`
- [x] Run live public quote smoke tests after the Edge Function is deployed
- [x] Provide or connect Supabase deployment credentials without placing secrets in the repository

# Production-Ready Expansion Acceptance Criteria

- [x] Define measurable acceptance criteria for availability, correctness, security, performance, and recovery
- [ ] Complete backend deployment so live endpoints are not dependent on local files or unavailable runners
- [ ] Verify database migrations and RLS policies against real Supabase data access paths
- [ ] Verify public quote creation, customer login, staff login, and account-scoped data access end to end
- [ ] Verify operations, CRM, shipment, finance, document, messaging, and notification workflows with real integrations
- [ ] Add failure handling, idempotency, rate limiting, audit logs, backups, monitoring, and rollback procedures
- [ ] Run release gates with no known failing tests, missing assets, undeployed functions, or broken production routes
- [x] Inspect uploaded Globall-Cloud-Unified(3).zip archive contents and release structure
- [x] Compare uploaded archive against the GitHub main branch and production architecture
- [x] Run static security, secret-leak, asset, and deployment validation on the uploaded archive
- [x] Report archive findings and any required corrections
- [x] Compare uploaded ZIP and current release capabilities across frontend, backend, auth, data, security, and deployment
- [x] Produce a weighted production-readiness comparison and recommend the safer baseline
- [x] Identify ZIP-only modules with the largest project-relevant differences
- [x] Rank ZIP modules by integration value, dependency risk, and recommended sequence
- [x] Inspect notification-dispatch function and notification outbox/RPC contracts
- [x] Design an isolated notification integration boundary without changing public quote or customer auth
- [x] Define notification migration, worker secrets, trigger, idempotency tests, and rollback checks
- [x] Implement isolated notification-dispatch integration slice without changing public quote or customer auth
- [x] Add notification schema/RPC migration and server-only worker boundary
- [x] Add notification idempotency/concurrency tests and run repository validation
- [ ] Apply notification worker migration to the target Supabase project after review and backup
- [ ] Configure NOTIFICATION_WORKER_SECRET and deploy notification-dispatch worker
- [ ] Run a live in-app notification claim/complete smoke test
