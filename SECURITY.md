# Security Policy

Globall Cloud handles customer identity, shipment data, warehouse evidence, delivery operations, and location updates. Security changes must preserve Supabase Auth, Row Level Security, origin restrictions, audit logging, and the separation between browser-safe publishable keys and server-only secrets.

## Supported Versions

| Version | Supported |
|---|---|
| `main` | Yes |
| Released snapshots | Security fixes are evaluated case by case |
| Unreleased or abandoned branches | No |

## Reporting a Vulnerability

Please do not open a public issue for a suspected vulnerability. Report it privately to the repository owner through the GitHub Security Advisories workflow or the private contact channel maintained by the Globall Cloud team. Include the affected URL or function, reproduction steps, impact, and any relevant request/response evidence. Do not include real customer data, passwords, access tokens, service-role keys, or private shipment identifiers in the report.

The maintainers should acknowledge a report within seven days, investigate with the smallest necessary access, and coordinate a remediation or mitigation before public disclosure. If a report is not accepted as a vulnerability, the response should explain the reasoning and identify any safe hardening alternative.

## Secret-handling requirements

Never commit `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_SECRET_KEYS`, `sb_secret_` values, payment credentials, or private access tokens. Server-only variables may be referenced by Edge Function source, but their values must be configured in Supabase secrets and must never be emitted to browser bundles, logs, CI output, or error responses.
