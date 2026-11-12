# SCRM Architecture

> Last verified: 2026-11-12. This document describes the code that is present in the repository. It does not describe planned multi-tenant behaviour as if it were implemented.

## Runtime topology

```
Browser (React 19 + Vite 8 SPA)
  │  HTTPS / JSON + Bearer JWT
  ▼
Express 5 API (Backend/src/server.js)
  ├─ Helmet, CORS allow-list, rate limiters
  ├─ authenticateToken + requirePermission
  ├─ Route modules (auth, leads, contacts, companies, deals, tasks,
  │  activities, catalog, invoices, tickets, emails, attachments,
  │  access, search, views, backup, media, whatsapp, integrations)
  ├─ Sequelize 6 models (Backend/src/db.js)
  ▼
Microsoft SQL Server database "SCRM"
  │
  ├─ Backend/uploads/          local attachment and fallback avatar files
  ├─ Backend/backups/          JSON snapshots created by admins
  └─ Backend/.wwebjs_auth/     WhatsApp Web linked-device session (local only)

External providers
  ├─ SMTP via Nodemailer (Gmail service or SMTP_* configuration)
  ├─ ImageKit direct browser upload, signed server-side
  ├─ Google Identity Services (ID token verified by google-auth-library)
  └─ WhatsApp Web (whatsapp-web.js, experimental local adapter)
```

The frontend is a single-page application. `Frontend/src/App.jsx` lazy-loads the landing, login, signup, and workspace routes. `Dashboard.jsx` is the authenticated shell and owns the module views; Settings and WhatsApp are lazy-loaded sub-chunks.

## Trust boundaries

1. **Browser → API.** The browser is untrusted. Every private route authenticates a JWT and evaluates named permissions. A hidden button or absent navigation link is never treated as authorization.
2. **API → SQL Server.** All queries go through Sequelize parameter binding. Request values such as `owner_id`, `role_id`, and `userId` are not trusted; the server derives identity from the token and applies ownership/scope checks.
3. **API → external providers.** SMTP credentials, the ImageKit private key, Google client configuration, and the WhatsApp session stay server-side. The browser receives only short-lived ImageKit upload credentials and public configuration.
4. **Backups and uploads.** Backup files are admin-only and are written under `Backend/backups/`. Uploaded files are stored under `Backend/uploads/` and resolved by attachment metadata; authenticated routes check permission before serving or mutating them.

## Authentication and session model

- Access tokens are signed JWTs with a short lifetime (`JWT_EXPIRES_IN`).
- Refresh tokens are persisted per user (`users.refresh_token`) and rotated by `/api/auth/refresh`.
- `users.token_version` is embedded in access tokens and compared on every authenticated request. Incrementing it invalidates every existing access token immediately.
- Permission and role changes are resolved from the database on each request, so they take effect on the next request without destroying the session. Suspension and explicit “revoke sessions” increment `token_version` and clear the refresh token.
- TOTP is available through `otplib`; enrollment returns a QR code, recovery codes are stored hashed/JSON-protected, and login issues a short-lived temporary token until the TOTP or recovery code is verified.

## Authorization model

`Backend/src/permissions.js` defines the canonical permission catalogue, role templates, and resolution helpers. Effective permissions combine:

1. the assigned role template,
2. per-user grants (`permission_overrides_json.permissions`),
3. per-user revocations (`permission_overrides_json.revoked`), and
4. record scope (`records.view_all`, `records.edit_all`, `records.delete_all`, `records.view_team`).

`requirePermission` guards API routes. `applyPermissionOverrides` and `accessScope` resolve effective access. Access administration also prevents a non-administrator from granting permissions they do not hold, and prevents the last active administrator from being suspended or demoted.

The frontend mirrors the effective permission list for navigation and section guards (`Frontend/src/utils/access.js`), but the API remains authoritative.

## Data ownership and tenancy

The repository includes `organizations` and `organization_members` tables, but the operational business tables (leads, contacts, companies, deals, tasks, invoices, tickets, attachments, saved views) do **not** carry a required `organization_id`, and route queries are not tenant-filtered. Effective isolation today is by authenticated user and record ownership/scope, not by organization.

Therefore SCRM is currently a **single-workspace CRM with per-user record scope**. It must not be described or sold as a proven multi-tenant product until organization IDs, composite relationship validation, and cross-tenant tests are added.

## Background jobs

- A daily JSON backup scheduler starts with the API (`startDailyBackupScheduler`).
- WhatsApp uses a serialized outbound queue with delays and timeouts.
- No durable job queue exists for email retries, automation runs, or webhook delivery.

## Deployment target

`Backend/Dockerfile`, `docker-compose.yml`, `.env.production.example`, and `DEPLOYMENT.md` describe a container target for the Express API and an external SQL Server. Source and configuration are published; no live production environment is configured in this workspace.

## Known architectural gaps

- Organization-level tenancy is incomplete.
- Email threading groups stored messages; there is no IMAP/Graph two-way mailbox sync.
- Payment gateway integration is absent; payments are recorded manually.
- Google sign-in depends on Google Cloud Console origin/redirect configuration.
- The frontend is code-split by route, but `Dashboard.jsx` remains a large monolithic view and should be decomposed into feature modules.
