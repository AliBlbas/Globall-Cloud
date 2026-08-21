# Production Integration Findings

## Official sources checked

- QiCard Payment Gateway API Features: https://developers-gate.qi.iq/docs/getting-started/api-features
  - QiCard exposes a REST API for merchant card-payment transactions and related operations.
  - QiCard documents webhooks/events for instant notifications after payment events.
  - Merchant payment options and permissions are configured by QiCard's Payment Gateway team for each merchant terminal.

- FIB Web Payments: https://fib.iq/integrations/web-payments/
  - FIB provides sandbox and production flows for web payments.
  - Production credentials are issued by FIB after the integration request process.
  - Authentication uses OAuth2 Client Credentials with `client_id` and `client_secret`.
  - The documented flow includes authorization, payment creation, status checking, and cancellation.
  - Payment creation supports IQD and can return payment ID, QR code, readable code, business/corporate app links, expiry, and an optional status callback URL.
  - HTTPS is required for API requests and callbacks.

- WhatsApp Business Platform Webhooks: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview
  - Meta sends JSON webhooks for incoming messages, outgoing-message status, calls, account events, and related WhatsApp Business events.
  - Production requires a real webhook endpoint and the relevant WhatsApp permissions, including `whatsapp_business_messaging` for message/call webhooks and `whatsapp_business_management` for other webhook fields.
  - Webhook endpoints must handle retries and duplicate deliveries; Meta may retry failed deliveries for up to seven days.
  - Meta documents payloads up to 3 MB and supports mTLS as an additional security layer.

## Production constraint

The repository contains server-side adapters for QiCard, FIB, Resend, WhatsApp Cloud API, and Twilio, but live operation requires the user's actual provider credentials and completed merchant/provider onboarding. No provider credential should be invented, copied from documentation examples, or committed to the repository.
