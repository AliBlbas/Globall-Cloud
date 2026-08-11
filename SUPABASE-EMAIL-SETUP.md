# Globall Cloud — Supabase Auth Email Setup

## Production issue found

Supabase Auth is currently failing to hand off Auth emails because the SMTP host was configured as the website URL (`https://globall-cloud.pages.dev/`) instead of an SMTP server hostname.

The production configuration must use a real SMTP provider. Do not put a URL such as `https://globall-cloud.pages.dev/` in the SMTP Host field.

## Required fields

Configure these in Supabase Dashboard → Authentication → Emails → SMTP Settings:

- SMTP Host — provider hostname only, for example `smtp.example.com`
- SMTP Port — the provider's SMTP port, commonly 587 or 465
- SMTP User — SMTP username from the provider
- SMTP Password — SMTP password/app password from the provider
- Sender Email — verified address on the sending domain
- Sender Name — `Globall Cloud`

## Recommended production options

Supabase supports providers such as Resend, AWS SES, Postmark, Twilio SendGrid, ZeptoMail, and Brevo. Use the exact SMTP values supplied by the selected provider. Do not guess them or commit SMTP credentials to GitHub.

## Redirect / URL configuration

The Auth Site URL should be the canonical production site URL. Add the exact production callback/redirect URLs used by the application to the Auth redirect allow-list.

## Verification checklist

1. Save the SMTP configuration in Supabase.
2. Confirm the Auth logs no longer show SMTP connection/configuration errors.
3. Test password recovery for a real customer email.
4. Test email confirmation for a new customer.
5. Confirm the recovery link returns to the production site and completes the password update.
6. Confirm Super Admin password login still works independently from email delivery.

## Security

Never commit SMTP passwords, API keys, Supabase service-role keys, or provider secrets to the repository. Supabase documents custom SMTP as the production path for Auth emails and recommends configuring SPF, DKIM, and DMARC for the sending domain.
