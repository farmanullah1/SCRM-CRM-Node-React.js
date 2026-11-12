# SCRM Integrations

> Last verified: 2026-11-12. Never commit `.env`, provider secrets, session directories, or generated backup files.

## SMTP / transactional email

**Code:** `Backend/src/services/emailService.js`, `Backend/src/routes/emails.js`.

**Configuration** (`Backend/.env`):

```env
GMAIL_USER=...
GMAIL_APP_PASS=...
# or a generic SMTP relay:
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM="SCRM Team <noreply@example.com>"
```

**Behaviour:**

- Gmail service transport is used when `GMAIL_USER`/`GMAIL_APP_PASS` are present; otherwise the service reads the SMTP variables.
- A send is reported successful only after the provider accepts the message. If SMTP is not configured, the route returns a configuration error; there is **no simulated success mode**.
- Messages are rendered through the branded HTML layout with the SCRM header, body, footer and tracking pixel.
- `GET /api/auth/smtp/status` reports connection/sender state.
- `POST /api/emails/send` records the send in `email_logs`; failures surface an error.
- Admin test delivery is available in Settings → Email & SMTP.
- Open tracking uses a 1×1 GIF served by `/api/emails/track/:pixelId`. This is approximate; mail privacy proxies may prefetch or block it.

**Verified:** a real diagnostic message to the configured Gmail address was accepted by the provider and recorded as `Accepted`. Exact HTML was rendered and visually inspected. Actual inbox placement is outside app control.

**Do not claim:** guaranteed inbox delivery, read receipts, or bounce processing.

## Google Identity Services

**Code:** `Frontend/src/components/GoogleSignInButton.jsx`, `Frontend/src/pages/Login.jsx`, `Backend/src/routes/auth.js`.

**Configuration:**

```env
# Frontend
VITE_GOOGLE_CLIENT_ID=...
```

The server verifies the returned Google ID token with `google-auth-library`. The client ID must match the one configured in Google Cloud Console.

**Current status: Blocked.** The GIS button iframe returns HTTP 403 because the configured OAuth client has not authorized the current JavaScript origin/redirect URI. Add the exact local and production origins in Google Cloud Console, then re-test the interactive flow. Server-side handling of missing/invalid credentials already returns 400/401 rather than a fake login.

## ImageKit

**Code:** `Backend/src/routes/media.js`, `Frontend/src/services/api.js`, `Frontend/src/components/SettingsView.jsx`.

**Configuration** (`Backend/.env`):

```env
imageKit_public=...
imageKit_private=...
imagekit_name=...
```

The server returns a short-lived signature; the browser uploads directly to ImageKit. Profile images fall back to local `/uploads/avatars` and `/uploads/covers` storage when ImageKit is not configured. Business attachments never use ImageKit; they use the authenticated attachment route.

**Verified:** signup avatar upload produced an ImageKit URL under `scrm/avatars/`. The verification avatar was deleted from ImageKit after testing.

## WhatsApp Web

**Code:** `Backend/src/whatsapp/`, `Backend/src/routes/whatsapp.js`, `Frontend/src/components/WhatsAppPanel.jsx`.

**Configuration:** `WHATSAPP_ENABLED`, `WA_SESSION_DIR`, queue/timeout/delay variables, capture toggles.

This is a local linked-device adapter using `whatsapp-web.js`. The session directory is a credential and must not be committed. It is experimental; it is not the official WhatsApp Business Cloud API. Inbound messages are logged and can create notifications. Sending is queued and delayed.

## Payments

**Status: Blocked.** No merchant provider or credentials are configured. Manual payments and credits are stored in `invoice_payments` and update invoice balances. A production gateway needs:

1. provider account and API keys,
2. server-created checkout session,
3. signed webhook verification,
4. idempotent payment recording,
5. reconciliation and refund handling.

Do not add a client-side "payment successful" shortcut.

## Public lead capture

**Code:** `Backend/src/routes/webleads.js`, `Backend/src/services/leadAutomation.js`.

Public web-form submissions create `web_leads` and leads, compute a score, and assign an owner by round-robin. The route is intentionally public but validated and rate-limited by the shared API limiter. Social-ad and live-chat connectors are not implemented; those platforms can post to the same webhook.

## Backup and deployment

- `GET /api/backup/download` and `POST /api/backup/snapshot` are admin-only; downloads now use the authenticated API client.
- Dumps exclude passwords, refresh tokens, TOTP secrets/codes, recovery codes and reset tokens.
- `Backend/Dockerfile`, `docker-compose.yml`, `.env.production.example`, and `DEPLOYMENT.md` provide a container deployment target for Express plus an external SQL Server.
- No live production host is configured; deploying requires host credentials, a SQL Server instance, and production environment values.
