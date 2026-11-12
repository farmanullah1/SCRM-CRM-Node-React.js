# SCRM Feature Gap Matrix

> Last verified: 2026-11-12. Statuses: **Available**, **Partial**, **Blocked**, **Missing**. Evidence refers to the current repository and observed running behaviour.

| Requested capability | Status | Implementation and evidence | Remaining gap |
|---|---|---|---|
| Expanded signup (phone, title, company, department, timezone, avatar, terms) | Available | `Frontend/src/pages/Signup.jsx`, `Backend/src/routes/auth.js`; live signup stored all fields and an ImageKit avatar URL; validation returned 400 for missing workspace/terms, invalid email and weak password. | None observed. |
| Google Sign-In / Sign-Up | Blocked | GIS button and server-side ID-token verification exist (`GoogleSignInButton.jsx`, `routes/auth.js`). The configured client is rejected with HTTP 403 by `accounts.google.com/gsi/button`. | Authorize the exact JavaScript origin and redirect URI in Google Cloud Console. |
| TOTP authenticator, QR enrollment, recovery codes | Available | `routes/twoFactor.js`, `services/twoFactor.js`; live enroll/verify/recovery/replay tests passed. | None observed. |
| Immediate JWT revocation | Available | `token_version` is validated on every request; logout, suspension and admin revoke invalidate active tokens. | None observed. |
| Admin/moderator permission grant and revoke | Available | `routes/access.js`, `SettingsView.jsx`, `AccessManagement.jsx`; live grant made target API `200` and exposed the module; revoke returned `403` and hid it after refresh. | UI polling refreshes on focus/5 seconds when the tab is visible. |
| Configurable roles and permissions | Available | Permission catalogue, system role templates, custom role clone/edit, per-user overrides. | Organization-scoped roles are not implemented. |
| Custom confirmation modal (no `window.confirm`) | Available | `ConfirmDialog.jsx`; alertdialog focus management; grep shows no delete-path native confirm. | None observed. |
| SMTP delivery | Available | Nodemailer Gmail/SMTP transport; real diagnostic accepted by the provider and recorded as `Accepted`. | Inbox placement and bounce handling are not observable from the app. |
| Professional HTML email templates | Available | `services/emailService.js`, `routes/emails.js`; branded header, body, footer and tracking pixel; rendered preview inspected. | Inbox rendering varies by client; test in the target mail client. |
| Email threading | Available | `email_logs.thread_id` and `in_reply_to`; `/api/emails/threads` groups messages and the Outbox has a thread view. | No IMAP/Graph two-way sync; inbound reply ingestion is not automated. |
| Auto-capture from web forms | Available | Public webhook and `/api/site/web-lead` create leads; live webhook created a scored, assigned lead. | No native connector for live chat or social-ad platforms. |
| Lead scoring | Available | `services/leadAutomation.js`; verified score of 45 for the webhook fixture. | Rules are code-configured, not a visual rule builder. |
| Round-robin assignment | Available | `services/leadAutomation.js`; verified owner assignment and assignment notification. | Territory/language/deal-size routing rules are limited. |
| Global search | Available | `/api/search` plus top-bar search; live query returned the captured lead. | Search result ranking is basic. |
| Saved views | Available | `saved_views` model and `SavedViewsBar`; created/listed/deleted a “QA Hot Leads” view. | Views currently target the leads list. |
| Server pagination | Available | Leads, contacts, companies and activities accept `page`/`limit` and return totals; live `page=1&limit=2` returned `totalCount` and two rows. | Some embedded lists (contact activity preview) intentionally use short slices. |
| Forecasting, pipeline weighting, date windows | Available | `/api/reports/forecast` and `ForecastPanel`; live forecast returned weighted pipeline and six buckets. | Weighting uses stage probabilities; no configurable per-stage weights UI. |
| Line-item invoices and tax | Available | `routes/invoices.js`; verified `2 × $500`, 10% tax, total `$1,100`. | No recurring invoices. |
| Invoice PDF | Available | PDF generated server-side; verified `%PDF` header and 2,304-byte file. | Branding is fixed, not template-selectable. |
| Partial payments and credits | Available | `invoice_payments`; verified payment/credit recalculated balance to `$600`. | No gateway reconciliation. |
| Payment gateway | Blocked | No merchant provider or credentials; manual records work. | Implement provider checkout plus signed webhook. |
| Attachments UI and storage | Available | `AttachmentsPanel.jsx`, `routes/attachments.js`; verified invoice/company attachments. Downloads now require authentication. | No virus scanning. |
| Company-level invoices, tickets, attachments | Available | `routes/companies.js`; live company modal showed 1 invoice, 1 ticket and company attachments. | None observed. |
| Notifications | Available | `notifications` model, UI panel; live payment/credit notifications visible. | No email digest or push channel. |
| Audit export | Available | `GET /api/access/audit/export`, CSV blob download. | Export is not yet re-run after the final cleanup. |
| Production deployment target | Available | `Backend/Dockerfile`, `docker-compose.yml`, `.env.production.example`, `DEPLOYMENT.md`. | No live host or SQL Server credentials; nothing deployed. |
| ImageKit media | Available | Signed auth endpoint, direct upload, local fallback. Live avatar upload returned an ImageKit URL. | Test avatar was deleted during cleanup; no ImageKit CDN purge step. |
| Accessible drag-and-drop alternative | Available | Pipeline stage select/menu remains the keyboard alternative to pointer drag. | Drag itself is still pointer-oriented. |
| Catalog, Outbox and Tickets UX | Available | Electric Obsidian cards, filters, empty/error states and responsive tables. | Further visual polish is possible. |
| Automated frontend tests | Available | Vitest + Testing Library; 8 tests for sidebar permissions, confirmation dialog and section guard. | No browser E2E suite or backend integration suite in CI. |
| Organization / tenant isolation | Partial | Tables exist (`organizations`, `organization_members`); business rows are not organization-scoped. | Required before multi-tenant use. |
| Custom objects, approval workflows, e-signature, campaigns, SMS/VoIP | Missing | Not implemented. | Out of current scope. |
| AI summaries, churn prediction, enrichment | Missing | Not implemented. | Out of current scope. |

## Quality gates observed

- Frontend production build: passed; `index` chunk 362 KB / 116 KB gzip, Dashboard 190 KB / 41 KB gzip after route splitting.
- Frontend tests: 8/8 passing.
- Backend syntax checks: passed for touched routes.
- No `window.confirm` on delete paths.
- QA verification records removed before commit.
