# SCRM Security Review

> Review date: 2026-11-12. Scope: current repository state. This is an engineering review, not a penetration test or certification.

## Implemented controls

| Control | Implementation | Evidence |
|---|---|---|
| Password storage | bcrypt with per-password salt | `Backend/src/routes/auth.js` |
| Authentication | short-lived JWT access token plus persisted rotating refresh token | `Backend/src/middleware/auth.js`, `routes/auth.js` |
| Immediate revocation | `token_version` checked on every authenticated request; suspension and “revoke sessions” increment it and clear refresh tokens | `middleware/auth.js`, `routes/access.js` |
| TOTP MFA | `otplib` secret + QR enrollment, 8 recovery codes, replay rejection | `routes/twoFactor.js`, `services/twoFactor.js` |
| Access control | named permissions, role templates, per-user grants/revocations, record scope | `permissions.js`, `middleware/auth.js`, `services/accessScope.js` |
| Privilege escalation guards | non-admin cannot grant permissions they lack; last active admin cannot be suspended/demoted | `routes/access.js` |
| Frontend section guard | direct URLs to ungranted modules redirect to dashboard; API still authoritative | `Frontend/src/utils/access.js`, `pages/Dashboard.jsx` |
| Request hardening | Helmet, JSON body size limit, CORS allow-list, general and auth rate limits | `src/server.js`, `middleware/security.js` |
| CORS method correctness | PATCH included, otherwise admin access saves failed in browsers while passing server-side tests | `src/server.js` |
| Upload validation | 15 MB limit, MIME allow-list, blocked executable/script extensions | `routes/attachments.js` |
| Attachment authorization | list/upload/download require `attachments.*` plus parent-record access | `routes/attachments.js` |
| Attachment download | authenticated `/api/attachments/:id/download`; business files are no longer served by public `/uploads` | `routes/attachments.js`, `src/server.js` |
| Backup secret scrubbing | JSON dumps exclude password hashes, refresh tokens, TOTP secrets/codes, recovery codes and reset tokens | `routes/backup.js` |
| Audit trail | auth, access changes, record mutations, email sends, uploads, backups and exports write `activity_logs` | `middleware/auth.js`, route modules |
| Audit export | permission-gated CSV export via authenticated blob request | `routes/access.js`, `Frontend/src/services/api.js` |
| Email safety | SMTP credentials stay server-side; no simulated-send success path | `services/emailService.js` |

## Findings and status

### F1 — Business attachments were publicly served (High; fixed)

`app.use("/uploads", express.static(...))` served every uploaded file without authentication. Attachment filenames were random, but invoice/contract files could still be read by anyone who obtained a URL.

**Fix:** only `/uploads/avatars` and `/uploads/covers` remain static. Business attachments are downloaded through `GET /api/attachments/:id/download`, which authenticates, checks `attachments.view`, validates the parent record, and then streams the file. The attachments UI now uses an authenticated blob download.

**Verification:** backend syntax check and browser/UI inspection; an unauthenticated request to a business-file URL no longer resolves through the static mount. Automated API coverage for this route is still recommended.

### F2 — Backup dumps leaked MFA material (High; fixed)

`generateFullDatabaseDump()` excluded `password` and `refresh_token` but serialized `two_factor_secret`, `two_factor_pending_secret`, `recovery_codes_json`, `two_factor_code`, and `reset_password_token`.

**Fix:** all of those fields are excluded from user records in both downloads and snapshots.

**Verification:** code inspection; the same function feeds `/api/backup/download`, `/api/backup/snapshot`, and the daily scheduler.

### F3 — Access administration failed in browsers (High; fixed)

The admin UI issued `PATCH /api/access/users/:id`, but CORS only allowed GET/POST/PUT/DELETE. API-only tests passed because Node requests have no browser preflight.

**Fix:** `PATCH` added to `Access-Control-Allow-Methods`. The grant/revoke flow was repeated from the admin UI and produced `403 → 200 → 403` on the affected user's token.

### F4 — Backup download link bypassed the JWT (Medium; fixed)

The Security page used a plain `<a href="/api/backup/download">`. The browser cannot attach the Bearer token, so the admin-only route rejected it.

**Fix:** the page now calls the API through the authenticated client with `responseType: "blob"` and saves the returned file.

### F5 — Organization tenancy is incomplete (High; open)

`organizations` and `organization_members` exist, but operational tables have no required `organization_id` and route queries are not tenant-scoped. Cross-organization access is not prevented because organizations are not part of the data path.

**Required work:** migration for organization ownership, composite relationship validation, tenant-scoped query helpers, and cross-tenant tests. Do not advertise multi-tenancy before this lands.

### F6 — Google sign-in is blocked by provider configuration (External; open)

The GIS button iframe returns HTTP 403 with the configured client ID. The app already verifies Google ID tokens server-side. The Google Cloud OAuth client must authorize the exact JavaScript origins and redirect URIs for local and production hosts.

### F7 — No payment provider (Blocked; by credentials)

Manual payments and credits work and are permission-controlled. There is no gateway session, webhook signature verification, or reconciliation because no merchant credentials were supplied.

### F8 — WhatsApp uses a local linked-device session (Medium; operational risk)

`Backend/.wwebjs_auth/` must be treated as a secret. It is local to the server and is not committed. Session loss requires QR relinking. This adapter is experimental and should not be presented as an official WhatsApp Business API integration.

### F9 — No independent penetration test or load test (Open)

The work includes build checks, API/browser verification, and automated frontend tests, but no third-party security assessment, dependency audit, or sustained load test.

## Verification performed

- `npm run build` → exit 0; route-level splitting removed the >500 KB warning.
- `npm test` → 8 tests passing (permission sidebar, confirmation dialog, section guard).
- Backend `node --check` on touched routes.
- Live grant/revoke from admin UI: target token `403 → 200 → 403`; target navigation changed after permission resolution.
- TOTP enroll, TOTP login, recovery login, replay rejection, logout invalidation, admin session revocation.
- `grep window.confirm` → no delete path uses native confirmation.
- Database cleanup: QA users, records, notifications, audit rows, uploads and ImageKit test avatar removed.

## Residual risks

- Backup files on disk are JSON and not encrypted at rest by the application.
- The API serves profile images publicly; do not upload sensitive images as avatars/covers.
- `Dashboard.jsx` remains a large module; permission checks are centralized, but future views must use the same guard rather than ad-hoc checks.
- Email open tracking is approximate: image proxies and privacy clients can prefetch or block the pixel.
