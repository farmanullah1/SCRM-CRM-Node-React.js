# SCRM UI/UX Repair & Production Readiness Audit

**Document:** Implementation audit and release record  
**Date:** November 11, 2026  
**Product:** SCRM — Secure · Supply · Social · Software · Small · Site  
**Repository:** `https://github.com/farmanullah1/SCRM-CRM-Node-React.js.git`  
**Reference specification:** `SCRM_UI_UX_BUGFIX_AND_PRODUCTION_READINESS_PROMPT.md`

---

## 1. Executive summary

The workspace had been tested and the top navigation accumulated twelve destinations in a
horizontal bar, driven only by local React state. Pages could not be bookmarked, refreshed or
reached with the browser history, and several screens were unusable at laptop and phone widths.

This pass replaced that bar with a grouped, collapsible side navigation driven by React Router,
added a real Settings area (profile media, security, SMTP diagnostics, account/sign-out), fixed
the authenticated and public-only route guards, repaired two backend endpoints that returned 500,
removed customer-facing technology-stack promotion, and added a document-flow footer and shared
dialog keyboard behaviour.

**Status:** the navigation, settings, profile media, SMTP diagnostics, guards, footer, responsive
shell and copy repairs are implemented and verified. Two-step verification remains email-OTP only;
authenticator TOTP, recovery codes and step-up authentication are **not** implemented. Several
form-level and account-level items from the specification remain outstanding; they are listed in
section 6 rather than presented as complete.

---

## 2. Root causes and repairs

| ID | Reported issue | Root cause | Repair | Status |
|---|---|---|---|---|
| NAV-01 | Sidebar destinations did not navigate; no URL state | Navigation was a horizontal button bar backed by `useState("dashboard")`; no route per destination | Added `WorkspaceShell`, `WorkspaceSidebar` and URL routes `/app/:section`; active state comes from `NavLink`; all former `setActiveTab` calls now navigate | **Fixed** |
| NAV-02 | Mobile navigation unusable | No drawer, backdrop or scroll lock | Off-canvas sidebar under 900px with scrim, Escape close, body scroll lock, close-on-navigate, focusable only while open | **Fixed** |
| NAV-03 | Refresh/direct URL failed | Only `/app` was registered | Route is `/app/:section?/:tab?` with an unknown-section redirect to `/app/dashboard` | **Fixed** |
| AUTH-01 | Sign-out in the main navigation | Sign-out button lived in the top bar | Removed from navigation; sign-out is in Settings → Security and Settings → Account with a confirmation dialog, server logout call, local token clearing and redirect message | **Fixed** (see token-revocation note) |
| AUTH-02 | Signed-in users could open login/signup | Guard returned `null` while restoring and redirect target was fixed | `PublicOnlyRoute` shows a branded restore state and redirects to `/app/dashboard`; `ProtectedRoute` passes a validated internal `returnTo`; Login restores it | **Fixed** |
| PROF-01 | No avatar/cover support | No columns, endpoints or UI | Additive `avatar_url`, `cover_url`, `bio` columns; Multer upload/delete endpoints with type and size validation; Settings uploader with preview, remove and initials fallback | **Implemented**; crop/re-encode not done |
| MFA-01 | Incomplete two-step verification | Only email OTP existed | Existing OTP toggle surfaced truthfully in Settings → Security; dedicated enrolment, TOTP, recovery codes, step-up and attempt lockout were not built | **Partial — remaining** |
| SMTP-01 | No admin SMTP verification or test send | Credentials existed but no diagnostic API/UI | Added admin-only `GET /api/auth/smtp/status` and `POST /api/auth/smtp/test` with sanitised errors; Settings → Email & SMTP shows non-secret metadata, connection state and a real test send | **Fixed** |
| MOD-01…09 | Named forms/modals cramped or inconsistent | Large single-file dashboard with ad-hoc modal markup | Shared Escape/focus-trap/return-focus behaviour applied to every workspace dialog; modal sizing and mobile one-column fallback added | **Partial — layout regrouping, assignee/timezone and guided CSV mapping remain** |
| UI-01 | Layout broke at narrow/wide widths | Fixed top bar, unconstrained tables, no drawer | New grid shell, collapsible sidebar, 390px/430px/1440px checks with zero horizontal overflow, contained table scrolling, modal height cap | **Fixed for verified widths** |
| UI-02 | Missing workspace footer | No footer in authenticated layout | `AppFooter` in normal document flow with dynamic year and six-pillar line | **Fixed** |
| COPY-01 | Customer-facing stack promotion | Landing page architecture card, footer and security cards named database/framework libraries | Replaced with data-ownership, deployment, access, security and communication benefits; workspace security card now describes controls, not libraries | **Fixed** (frontend scan clean) |
| DATA-01 | Invoices and tickets pages returned 500 | `invoices` and `tickets` had models and routes but no tables or Contact associations | Added idempotent `CREATE TABLE` blocks and `Contact ↔ Invoice/Ticket` associations | **Fixed** |
| DATA-02 | Companies page crashed | API returns `{ companies }`, dashboard treated it as an array | Normalised response before rendering | **Fixed** |
| MEDIA-01 | Uploaded avatar did not render | Relative URL resolved against Vite origin; Helmet sent `Cross-Origin-Resource-Policy: same-origin` | Frontend resolves upload paths against the API origin; Helmet now allows cross-origin image resources | **Fixed** |

---

## 3. Implemented navigation map

| Label | Route | Group |
|---|---|---|
| Dashboard | `/app/dashboard` | Workspace |
| Leads | `/app/leads` | CRM |
| Contacts | `/app/contacts` | CRM |
| Companies | `/app/companies` | CRM |
| Pipeline | `/app/pipeline` | Sales |
| Catalog | `/app/catalog` | Sales |
| Invoices | `/app/invoices` | Sales |
| Tasks | `/app/tasks` | Productivity |
| Activity Log | `/app/activities` | Productivity |
| Outbox | `/app/outbox` | Productivity |
| Tickets | `/app/tickets` | Support |
| Settings | `/app/settings/profile` | Account |
| Security & backup (admin) | `/app/security` | System |

Settings sub-routes: `/app/settings/profile`, `/app/settings/security`, `/app/settings/email`
(admin), `/app/settings/account`.

---

## 4. Verification evidence

| Check | Command / method | Result |
|---|---|---|
| Backend integration suite | `cd Backend && node --test tests/api.test.js` | **13/13 passed**, exit 0 |
| Frontend production build | `cd Frontend && npm run build` | **Passed** (bundle ≈536 kB, chunk-size warning only) |
| Lint | `cd Frontend && npm run lint` | **0 errors**, 61 warnings (pre-existing complexity/unused warnings across legacy dashboard code) |
| Click-through navigation | Browser loop over every sidebar link | All 12 destinations changed URL and rendered content (dashboard, leads, contacts, companies, pipeline, catalog, invoices, tasks, activities, outbox, tickets, security, settings) |
| Direct URL / refresh | Loaded `/app/pipeline` on a fresh document | Rendered the pipeline board |
| Mobile drawer | 390×844: open, scrim, body lock, select Contacts | Drawer opened, scrim present, `body.overflow=hidden`, navigation closed drawer and reached `/app/contacts` |
| Horizontal overflow | 390px and 1440px | `scrollWidth - innerWidth = 0` at both widths |
| Desktop shell | 1440×900 | 264px sidebar, 1176px workspace, footer in document flow |
| Avatar upload | `POST /api/auth/profile/avatar` with 1×1 PNG | 200, file written, `avatar_url` persisted |
| Avatar reject | `text/plain` upload | 400 |
| Avatar delivery | Browser `<img>` | Loaded (`naturalWidth > 0`) from the API origin |
| Avatar remove | `DELETE /api/auth/profile/avatar` | 200, reference cleared |
| SMTP connection | `GET /api/auth/smtp/status` as admin | `configured: true`, `connected: true`, Gmail relay, TLS 465 |
| SMTP real test | `POST /api/auth/smtp/test` to the configured sender | HTTP 200; server accepted the message. Acceptance is not proof of inbox delivery. |
| Non-admin protection | `GET /api/auth/smtp/status` as standard user | 403 |
| Auth guard | Signed out → `/login`; signed in → `/login` redirects to workspace | Confirmed |

Automated frontend component/E2E tests do not exist in the repository; the browser checks above
were manual/scripted through the dev build, not an E2E framework.

---

## 5. Data and migration notes

Additive only, applied at server start by the existing idempotent migration:

1. `users.avatar_url`, `users.cover_url`, `users.bio`, `users.recovery_codes_json` — reserved; the
   last column is not yet used.
2. `invoices` and `tickets` tables, created only when absent, plus model associations.

No table, column or record was dropped or reset. No backup was taken before these additive
changes because they do not modify existing columns; take a backup before the next non-additive
migration. Uploaded files live under `Backend/uploads/` and are excluded from Git.

---

## 6. Remaining work and honest blockers

These items from the specification are **not** complete and are not presented as working:

- **Two-step verification:** authenticator-app TOTP, QR enrolment, single-use recovery codes,
  step-up authentication, attempt lockout and organisation-required MFA.
- **Session revocation:** sign-out revokes the refresh token and clears browser state, but the
  short-lived access JWT remains cryptographically valid until it expires. A server-side token
  version/denylist is required for immediate revocation. Sign-out-all-devices is not implemented.
- **Profile media:** cropping/positioning, server-side image signature inspection, re-encoding and
  metadata stripping.
- **Forms:** Create Lead / Schedule Task / Log Interaction field regrouping, assignee and time-zone
  selectors, reminder configuration, and per-field inline validation.
- **CSV:** guided column mapping, dry-run preview, duplicate policy, row-level error report and
  server-side streaming/audit. Export is client-side and does not neutralise spreadsheet formula
  injection yet.
- **Outbox:** message detail view, retry, delivery-state model based on provider webhooks, and
  server-side pagination.
- **Catalog / Companies:** product-vs-service filtering, archive safeguards, company detail
  relationships and duplicate warnings.
- **Settings:** notifications, appearance/density, team/organisation, sessions list, login history
  and integrations.
- **Signup persistence:** job title, phone and organisation are persisted; time zone, department and
  recorded policy-version consent are not. The consent checkbox is currently client-side only.
- **Password policy:** remains the backend's existing policy (8+ characters with strength checks),
  not the specification's 12-character minimum.
- **Performance:** routes are not code-split; the dashboard still loads all workspace queries on
  first render.
- **Deployment:** no hosting target for the Express/SQL Server backend is configured, so no live
  site was published. GitHub source push only.

---

## 7. Files changed in this pass

**Frontend:** `App.jsx`, `main.jsx`, `Dashboard.jsx`, `Login.jsx`, `Signup.jsx`, `LandingPage.jsx`,
`components/WorkspaceShell.jsx`, `components/WorkspaceSidebar.jsx`, `components/WorkspaceTopBar.jsx`,
`components/AppFooter.jsx`, `components/SettingsView.jsx`, `components/ProtectedRoute.jsx`,
`hooks/useModalAccessibility.js`, `context/AuthContext.jsx`, `services/api.js`, `workspace.css`.

**Backend:** `db.js`, `dbSetup.js`, `server.js`, `routes/auth.js`, `services/emailService.js`.

**Docs:** this audit; `Up_Until_Now.md` and `README.md` receive a short implementation note.

---

## 8. Core CRM model follow-up (November 2026)

The pipeline previously rendered **contact rows with deal stages**, even though a separate `Deal`
model and API existed. Contacts also carried deal value and close dates, so pipeline totals and
conversion results disagreed. This pass separated the two concepts.

### Changes

| Area | Change |
|---|---|
| Pipeline | Kanban columns are grouped by `Deal.stage_name`; cards show deal title, amount, primary contact and close date. Stage moves call `PUT /api/deals/:id`. |
| Deal CRUD | Added a New/Edit Deal dialog (title, value, stage, contact, close date, notes); administrators can delete deals. |
| Dashboard | Open pipeline, won revenue, win count and stage distribution now read deal metrics instead of contact values; the marketing hero and promo band were replaced with an operational header, activity feed and closing-soon list. |
| Contact 360 | Contact names open a record dialog with email/phone/company/owner/tags, linked deals, linked tasks, notes and per-contact activity. Quick actions edit the contact, email it, schedule a task, or convert it when no deal exists. |
| Tasks | Tasks can be edited and re-statused from the task board; the modal supports status, assignee and priority changes. |
| RBAC | `GET /api/deals/metrics` now applies the same owner scope as the pipeline listing for standard users. |
| Copy | Contact forms and tables now describe lifecycle stage and estimated value instead of pipeline value; auth/audit events are excluded from the dashboard activity feed. |

### Verification

- `cd Frontend && npm run build` — passed (chunk-size warning only).
- `cd Backend && node --test tests/api.test.js` — passed, exit 0.
- Seeded a disposable contact, deal and task: dashboard showed `$24,000` open pipeline, Proposal `1`, the closing-soon item and CRM activity; pipeline rendered the deal under Proposal at 1440px.
- Contact 360 showed the linked deal, linked task, owner, tags and activity; no horizontal overflow.
- Created a second deal through the UI: modal closed, `Deal added to the pipeline.` toast shown and the card appeared on the board.
- Edited the task status to In Progress: modal closed, `Task updated.` toast shown and the card badge updated.
- Mobile 390×844: one-column metrics, zero horizontal overflow, footer in document flow.

### Remaining

- Pipeline uses a stage `<select>` rather than pointer drag-and-drop.
- Deal metrics are not time-windowed (no month/quarter filters or forecasting).
- Leads and companies remain workspace-wide; contacts and deals are owner-scoped for standard users.
- No pagination on the contacts table or activity feed.

---

## 9. Company records and deal drag-and-drop (November 2026)

| Area | Change |
|---|---|
| Company 360 | `GET /api/companies/:id` now returns the account, its linked contacts (by `company_id` or legacy company name), linked deals and totals. Company cards open a record dialog with account details, contact/deal lists and open/won revenue. |
| Account actions | From the record: open a linked contact, open a linked deal, add a contact pre-filled with the company, edit the account, or delete it as an administrator. |
| Pipeline | Deal cards are draggable between stage columns; drop updates `Deal.stage_name` through the existing update endpoint. The stage select remains for keyboard and mobile use. |
| UX | Drop target highlights, dragging card fades, empty columns remain drop targets, and no page-level horizontal overflow is introduced. |

**Verified:** build passed; API suite passed; a seeded company record showed 1 linked contact, 1 linked deal, `$24,000` open pipeline and correct account details; a synthetic drag moved the deal from Proposal to Won, showed `Deal updated.`, and updated the column totals; 1440px layout had zero horizontal overflow. Test company, contact, deal, activity, email and user were deleted afterward.

**Remaining:** drag-and-drop is pointer-only (select remains the accessible alternative); company records do not yet aggregate invoices/tickets; no pagination for large account contact lists.

---

## 10. Line-item invoices and quotes (November 2026)

Invoices were previously a single amount with no line items, tax or payment lifecycle. The billing module now stores and renders itemised documents.

| Area | Change |
|---|---|
| Data | Additive columns `subtotal`, `tax_rate`, `tax_amount`, `notes`, `issued_date`, `paid_at`; line items remain in the existing `items` JSON column. |
| Calculation | The API normalizes line items and computes subtotal, tax and total; totals sent by the browser are ignored. |
| Lifecycle | Statuses Draft, Sent, Paid, Overdue and Void. Marking Paid stores `paid_at`; moving away from Paid clears it. |
| UI | Line-item editor with catalog autofill, quantity/unit price, live totals and tax rate; invoice record dialog with lines, totals, notes, print, edit, send and mark-paid actions. |
| List | Invoice table now shows contact, live status/overdue indicator and row actions. |

**Verified:** build passed; API suite passed; a two-line invoice at 10% tax produced `$2,500` subtotal, `$250` tax and `$2,750` total, moved to Paid with `paid_at`, and listed its contact. Browser: detail dialog rendered both lines and totals; editor opened with a line row; zero horizontal overflow. Test invoice, contact, activity, email and user were deleted afterward.

**Remaining:** no PDF renderer (Print uses the browser print dialog), no payment gateway, no partial payments/credits, and no invoice-level attachments.
