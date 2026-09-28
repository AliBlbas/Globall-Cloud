# v4 inventory

| Metric | Value |
|---|---:|
| SHA-256 | `3598bd26f06f39f718bdfdb44333fe7ed36cd761ed8e8a91951afcc3662a6799` |
| Total files | 247 |
| HTML files | 21 |
| JavaScript files | 44 |
| TypeScript files | 17 |
| SQL migrations | 102 |
| Edge Functions | 16 |

## Root files
CONTROL-PLANE-SMOKE.md
CSP-MIGRATION.md
INVENTORY-V4.md
MOBILE-QA.md
PACKAGE-MANIFEST.txt
PATCH-README.md
PAYMENT-PACKAGE-MANIFEST.txt
PRODUCTION-QA.md
PRODUCTION-RELEASE.md
PRODUCTION-UPGRADE-REPORT.md
QA-BROWSER-SMOKE-V3.md
QICARD-FIB-PAYMENT-RUNBOOK.md
README.md
RELEASE-NOTES-V3.md
SECURITY.md
SUPABASE-EMAIL-SETUP.md
SYSTEM_STATUS.md
_headers
accounts-console-script.js
accounts-console.html
admin-console-enhanced.css
admin-console-enhanced.js
admin-dashboard.js
browser-compat.css
command-center.css
command-center.html
control-plane.css
control-plane.html
control-plane.js
customer-portal.html
database-schema.js
driver-portal-mobile.css
driver-portal.html
driver-portal.js
driver-workspace.html
form-validation-styles.css
form-validation.js
gc-csp-bridge.js
hero-banner.jpg
index.html
live-logistics-map.css
live-logistics-map.js
logistics-os.html
logo-fix.css
logo-icon-original.png
logo-icon.png
logo-icon.svg
management.html
manifest.json
mobile-elite.css
mobile-final.css
mobile-polish.css
og-image-original.jpg
og-image.jpg
operations-command-center.html
operations-control-v2.html
operations-control.html
operations-events.js
operations-exception-engine.js
operations-suite.html
payment-checkout.css
payment-checkout.html
payment-checkout.js
payment-gateway.js
price-calculator.js
production-brand-repair.js
production-bridge.js
production-mobile-hotfix.css
robots.txt
runtime-guard.js
safari-compat-elite.css
site-polish.css
sitemap.xml
staff-auth-fix.js
staff-os.html
staff-portal.html
styles.css
super-admin-command-center.css
super-admin-command-center.html
super-admin-command-center.js
super-admin-elite.css
super-admin-elite.js
superadmin-staff-actions.js
superadmin.css
superadmin.html
superadmin.js
sw.js
system-status.html
tracking-enhanced.js
tracking-integration.html
tracking-styles.css
translations.js
ux-polish.css
warehouse-os.html
webhook-handler.js
whatsapp-messenger.js

## Latest migrations
20260813045336_bind_staff_auth_identity.sql
20260813105749_restore_authenticated_staff_data_access.sql
20260813131058_remove_duplicate_staff_permissions_select_policy.sql
20260814025447_tighten_staff_permissions_select_policy.sql
20260814163933_harden_graphql_surface.sql
20260814164310_harden_privileged_rpc_surface_v2.sql
20260815165617_add_production_updated_at_triggers.sql
20260815173645_add_live_tracking_timestamp_guard.sql
20260815174041_add_stale_shipment_monitoring.sql
20260815174340_add_eta_sla_monitoring.sql
20260815174541_add_delivery_proof_completion_automation.sql
20260815174711_add_warehouse_chain_of_custody_fields.sql
20260815174820_add_driver_delivery_session_fields.sql
20260815180031_lock_down_delivery_proof_completion_rpc.sql
20260815180052_remove_public_execution_delivery_proof_rpc.sql
20260815183631_harden_public_exchange_rate_rpc.sql
20260815184109_revoke_unused_public_rate_rpc.sql
20260816090000_production_logistics_control_plane.sql
20260816120000_qicard_fib_payment_sessions.sql
20260817090000_logistics_advanced_workflows.sql

## Edge Functions
account-admin
account-self-password
account-self-profile
document-access
driver-gps
integration-webhook
lg-track-shipment
logistics-control-plane
operations-admin
payment-checkout
payment-reconcile
payment-webhook
public-config
public-message
public-track
system-health
