#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

failures=0
check() {
  local label="$1"
  shift
  if "$@"; then
    printf 'PASS %s\n' "$label"
  else
    printf 'FAIL %s\n' "$label"
    failures=$((failures + 1))
  fi
}

check "control-plane JavaScript syntax" node --check control-plane.js
check "all JavaScript syntax" bash -c 'while IFS= read -r -d "" file; do node --check "$file"; done < <(find . -type f -name "*.js" -not -path "./.git/*" -print0)'
check "service-worker and middleware asset integrity" python3 scripts/validate-assets.py
check "control-plane has no executable inline script" bash -c '! grep -qE "<script[^>]*>([^<]|$)" control-plane.html'
check "control-plane has no inline event attributes" bash -c '! grep -qiE "\s(on(click|change|submit|keydown|keyup|input|load|error|focus|blur|mouseover|mouseout))\s*=" control-plane.html'
check "payment checkout has no executable inline script" bash -c '! grep -qE "<script[^>]*>([^<]|$)" payment-checkout.html'
check "payment checkout has no inline event attributes" bash -c '! grep -qiE "\s(on(click|change|submit|keydown|keyup|input|load|error|focus|blur|mouseover|mouseout))\s*=" payment-checkout.html'
check "customer portal has no executable inline script" bash -c '! grep -qE "<script[^>]*>([^<]|$)" customer-portal.html'
check "customer portal has no inline event attributes" bash -c '! grep -qiE "\s(on(click|change|submit|keydown|keyup|input|load|error|focus|blur|mouseover|mouseout))\s*=" customer-portal.html'
check "CSP has same-origin script policy" grep -q "script-src 'self'" _headers
check "CSP script policy excludes unsafe-inline" bash -c '! grep -qE "script-src[^;]*unsafe-inline" _headers'
check "service worker contains control-plane, customer and payment assets" bash -c 'grep -q "control-plane.html" sw.js && grep -q "control-plane.js" sw.js && grep -q "customer-portal.html" sw.js && grep -q "payment-checkout.html" sw.js && grep -q "payment-checkout.js" sw.js && grep -q "gc-v68" sw.js'
check "Supabase customer and logistics functions are JWT-protected" bash -c 'grep -q "\[functions.logistics-control-plane\]" supabase/config.toml && grep -q "\[functions.customer-self\]" supabase/config.toml && grep -q "verify_jwt = true" supabase/config.toml'
check "payment functions and public callback config exist" bash -c 'grep -q "\[functions.payment-checkout\]" supabase/config.toml && grep -q "\[functions.payment-webhook\]" supabase/config.toml && grep -q "QICARD_WEBHOOK_PUBLIC_KEY" supabase/functions/payment-webhook/index.ts'
check "control-plane migration exists" test -f supabase/migrations/20260817165537_production_logistics_control_plane.sql
check "advanced logistics migration exists" test -f supabase/migrations/20260817222324_logistics_advanced_workflows.sql
check "notification hardening migration exists" test -f supabase/migrations/20260817222344_notification_dispatch_hardening.sql
check "logistics notification contract migration exists" test -f supabase/migrations/20260817222449_logistics_notifications_contract_hardening.sql
check "advanced logistics RPCs exist" bash -c 'grep -q "approve_quote_request" supabase/migrations/20260817222324_logistics_advanced_workflows.sql && grep -q "record_warehouse_movement" supabase/migrations/20260817222324_logistics_advanced_workflows.sql && grep -q "get_logistics_report" supabase/migrations/20260817222324_logistics_advanced_workflows.sql'
check "advanced control-plane actions exist" bash -c 'grep -q "approve_quote" supabase/functions/logistics-control-plane/index.ts && grep -q "record_warehouse_movement" supabase/functions/logistics-control-plane/index.ts && grep -q "upload_document" supabase/functions/logistics-control-plane/index.ts && grep -q "get_report" supabase/functions/logistics-control-plane/index.ts'
check "staff outbox is in-app only" grep -q "claim_notification_outbox_channel.*p_channel: 'in_app'" supabase/functions/logistics-control-plane/index.ts
check "document access endpoint is JWT-protected" bash -c 'grep -q "\[functions.document-access\]" supabase/config.toml && grep -q "verify_jwt = true" supabase/config.toml && test -f supabase/functions/document-access/index.ts'
check "notification dispatch worker is server-only" bash -c 'grep -q "\[functions.notification-dispatch\]" supabase/config.toml && grep -q "verify_jwt = false" supabase/config.toml && grep -q "NOTIFICATION_WORKER_SECRET" supabase/functions/notification-dispatch/index.ts && test -f supabase/functions/notification-dispatch/index.ts'
check "notification provider adapters exist" bash -c 'grep -q "RESEND_API_KEY" supabase/functions/notification-dispatch/index.ts && grep -q "WHATSAPP_ACCESS_TOKEN" supabase/functions/notification-dispatch/index.ts && grep -q "TWILIO_AUTH_TOKEN" supabase/functions/notification-dispatch/index.ts'
check "notification worker claims external channels only" grep -q "claim_notification_outbox_external" supabase/functions/notification-dispatch/index.ts
check "legacy logistics notification owner filter" grep -q "eq('customer_user_id',u.id)" gc-csp-scripts/logistics-os-inline-1.js
check "legacy operations schema fields" bash -c 'grep -q "origin_key" gc-csp-scripts/operations-command-center-inline-1.js && grep -q "document_status" gc-csp-scripts/operations-command-center-inline-1.js && grep -q "customer_user_id" operations-exception-engine.js'
check "payment migration exists" test -f supabase/migrations/20260817222119_qicard_fib_payment_sessions.sql
check "payment provider adapters exist" bash -c 'test -f supabase/functions/_shared/payment-providers.ts && grep -q "qicardCreate" supabase/functions/_shared/payment-providers.ts && grep -q "fibCreate" supabase/functions/_shared/payment-providers.ts'
check "transition and outbox RPCs exist" bash -c 'grep -q "record_shipment_transition" supabase/migrations/20260817165537_production_logistics_control_plane.sql && grep -q "claim_notification_outbox" supabase/migrations/20260817165537_production_logistics_control_plane.sql'
check "notification contract RPCs exist" bash -c 'grep -q "enqueue_customer_notification" supabase/migrations/20260817222449_logistics_notifications_contract_hardening.sql && grep -q "fanout_customer_notification" supabase/migrations/20260817222449_logistics_notifications_contract_hardening.sql && grep -q "detect_eta_sla_breaches" supabase/migrations/20260817222449_logistics_notifications_contract_hardening.sql'
check "notification preference opt-in and outbox privacy" bash -c 'grep -q "customer_notification_preferences" supabase/migrations/20260817222449_logistics_notifications_contract_hardening.sql && grep -q "channel = '\''in_app'\''" supabase/migrations/20260817222449_logistics_notifications_contract_hardening.sql && grep -q "email_enabled" supabase/migrations/20260817222449_logistics_notifications_contract_hardening.sql'
check "payment settlement guards exist" bash -c 'grep -q "settle_payment_session" supabase/migrations/20260817222119_qicard_fib_payment_sessions.sql && grep -q "Provider amount does not match" supabase/migrations/20260817222119_qicard_fib_payment_sessions.sql && grep -q "payment_webhook_events" supabase/migrations/20260817222119_qicard_fib_payment_sessions.sql'
check "public WhatsApp CTA uses approved conversion link" bash -c 'grep -q "https://wa.me/message/4P6O3FXDR4HUA1" index.html && grep -q "data-gc-event=\"whatsapp_cta_click\"" index.html'
check "staff routes and auth bridge" bash -c 'grep -q "^/staff /staff-os.html 200$" _redirects && grep -q "^/staff/ /staff-os.html 200$" _redirects && grep -q "staff-auth-fix.js" functions/_middleware.js && grep -qF "staff(?:-os)?" staff-auth-fix.js'
  check "analytics bridge, read-only data hub, and staff auth assets are wired and cached" bash -c 'grep -q "site-analytics.js?v=20260824-1" index.html && grep -q "site-analytics.js?v=20260824-1" sw.js && test -f site-analytics.js && grep -q "control-plane-data-hub.js?v=20260825-1" control-plane.html && grep -q "control-plane-data-hub.js?v=20260825-1" sw.js && test -f control-plane-data-hub.js && grep -q "staff-auth-fix.js?v=20260825-7" sw.js && grep -q "staff-os-console.js?v=20260825-13" sw.js && grep -q "staff-os-ultra.css?v=20260825-11" sw.js && grep -q "staff-os-ultra.css?v=20260825-11" staff-os.html && grep -q "staff-os-premium.css?v=20260825-2" sw.js && grep -q "customer-portal-inline-1.js?v=20260825-1" sw.js && grep -q "customer-portal-inline-1.js?v=20260825-1" customer-portal.html && test -f staff-auth-fix.js && test -f staff-os-console.js && test -f gc-csp-scripts/customer-portal-inline-1.js'
check "logistics alerts, shipment events, and Shipment 360 contracts" bash -c "grep -q 'data-go=\"alerts\"' staff-os-console.js && grep -q 'logisticsApi.*alerts' staff-os-console.js && grep -q \"logisticsApi('events'\" staff-os-console.js && grep -q 'data-shipment-360' staff-os-console.js && grep -q 'scopedKinds' supabase/functions/logistics-control-plane/index.ts && grep -q 'shipmentId.*scopedKinds' supabase/functions/logistics-control-plane/index.ts && grep -q 'detect_logistics_operational_alerts' supabase/migrations/20260825070000_add_logistics_alert_notifications.sql && grep -q 'staff_notifications_staff_dedupe_uidx' supabase/migrations/20260825070000_add_logistics_alert_notifications.sql && grep -q \"kind === 'alerts'\" supabase/functions/logistics-control-plane/index.ts"
check "no hardcoded service-role secret" bash -c '! grep -RnoE "(service_role[_-]?key|SUPABASE_SERVICE_ROLE_KEY).*=(.*)(eyJ|sb_secret_)" --include="*.js" --include="*.ts" --include="*.html" --include="*.sql" --exclude-dir=.git .'

if (( failures > 0 )); then
  printf '%s checks failed\n' "$failures" >&2
  exit 1
fi
printf 'All production checks passed.\n'
