# ⚡ SCRM — "Up Until Now"
### Master Blueprint, Architectural Context, User Flows, Design System & Future Expansion Guide

> **Target Audience:** Incoming Large Language Models (LLMs), Principal Software Architects, and Full-Stack Engineers continuing development on this codebase.  
> **Repository:** `https://github.com/farmanullah1/SCRM-CRM-Node-React.js.git` (`main` branch)

---

## 1. 🧭 Executive Summary & Brand Identity

### 1.1 What is SCRM?
**SCRM** stands for **Small Customer Relationship Management**.

The name is intentional: **the "S" stands for Small**.
- **"Small" in footprint:** Zero bloat, rapid boot time, lightweight resource consumption, and no massive monolithic dependencies.
- **Enterprise-grade in capability:** Built from day one with high-salt authentication, Role-Based Access Control (RBAC), SQL Server relational data integrity, automated duplicate merging, 1-click lead-to-deal conversion, transparent email open tracking, automated daily database snapshots, and an interactive 3D halftone background.

### 1.2 Target Audience & Purpose
SCRM is built for high-velocity sales teams, startups, agencies, and small-to-medium businesses that have outgrown disorganized spreadsheets but refuse the slow, expensive, bloated experience of legacy corporate enterprise CRMs. It provides immediate, complete visibility across the customer journey from the first inbound lead to closed-won revenue, invoicing, and post-sale customer support.

---

## 2. 🎨 The Design System ("Electric Obsidian")

The interface adheres to a strict, highly calculated color palette and micro-interaction system called **Electric Obsidian**. Any LLM modifying or extending the UI **must maintain these exact tokens**.

### 2.1 The Chromatic Budget & Color Tokens

```
Obsidian Canvas (#181818)  [~63% of pixel space]
       │
       ├── Warm-Olive Band (#303018)  [~8% section transitions]
       ├── Mid-Grey Surface (#484848)  [~6% card fills/borders]
       └── Electric Neon Accent (#F0FF60 / #FAFF69)  [~10% CTAs, badges, active states]
```

| Token Name | Hex Code | Role & Usage |
| :--- | :--- | :--- |
| `--bg-dark` | `#181818` | Dominant viewport background (~63% of pixels). Not a gradient wash; crisp true background. |
| `--bg-section-transition` | `#303018` | Warm-olive undertone marking section breaks and alert containers. |
| `--surface-raised` | `#202020` | Dark surface for floating cards, tables, and modal dialogs. |
| `--accent` | `#F0FF60` | High-voltage electric cyan/yellow firing on primary CTAs, active nav links, and icons. |
| `--accent-bright` | `#FAFF69` | Hover states, glowing rings, and pulse highlights. |
| `--text-heading` | `#FFFFFF` / `#F9F9F9` | High-contrast headings and prominent values. |
| `--text-body` | `#DFDFDF` | Clean readable secondary body copy. |
| `--text-muted` | `#9E9E9E` | Timestamps, micro-labels, and metadata. |
| `--text-inverted` | `#151515` | Near-black text used **only** on full-panel inverted yellow cards (`#F0FF60`). |
| `--border-hairline` | `#414141` | Subtle 1px boundary lines on dark glass containers. |
| `--border-yellow-adjacent` | `#4F5101` | Olive-toned border used against yellow-adjacent surfaces. |
| `--semantic-error` | `#FB2C36` | **Held strictly in reserve:** Only used for error alerts, overdue warnings, and delete buttons. |
| `--semantic-warning` | `#E17100` | **Held strictly in reserve:** Only used for pending status or urgent tags. |
| `--semantic-success` | `#22C55E` | **Held strictly in reserve:** Only used for won deals and successful actions. |

---

### 2.2 Interactive Background Canvas (`HalftoneBackground.jsx`)
- **Technology:** HTML5 Canvas running on high-DPI `requestAnimationFrame` loop.
- **Layering:** Fixed behind all content (`position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 0; pointer-events: none;`). All layout panels use semi-transparent dark backgrounds (`background: rgba(24, 24, 24, 0.88); backdrop-filter: blur(14px)`) so the dots subtly shine through.
- **Density:** $9\text{px}$ dot grid spacing rendering **30,000+ crisp circular dots** across the viewport.
- **Interactive Magnetic Lens Bulge:** Cursor position triggers a $220\text{px}$ radial influence zone. Dots within this radius dynamically displace outward via vector field calculation:
  $$d_{\text{shift}} = \left(1 - \frac{\text{dist}}{R}\right)^2 \times \text{maxShift}$$
- Dots dynamically expand from $1.2\text{px} \rightarrow 3.5\text{px}$ and morph color from muted blue-grey (`#0E2938`) to vibrant glowing neon yellow (`#F0FF60`) with smooth spring lerp physics returning them to baseline on mouse leave.

---

### 2.3 Dynamic Expanding Cursor (`CustomCursor.jsx`)
- **Physics:** Dual-element cursor composed of an outer spring ring and a high-precision inner dot tracking the mouse with lerp easing ($0.22$).
- **The "Make Dot Bigger" Effect:**
  - Base State: Crisp $6\text{px}$ glowing dot and $30\text{px}$ hairline ring.
  - Interactive Hover State: When hovering over any interactive element (`button`, `a`, `input`, `select`, `textarea`, `.kanban-card`, `.tab-btn`, `.interactive-lift`), the inner dot gracefully expands to $14\text{px}$ and the outer ring expands to $52\text{px}$ with a soft `#F0FF60` glowing fill and halo shadow.
- **Mobile Touch Safeguard:** Automatically disables on touch-only devices (`@media (hover: none)`).

---

### 2.4 Micro-Interactions & Styling Polish
- **Smooth Lift on Hover (`.interactive-lift`):** Cards elevate with `transform: translateY(-2px); box-shadow: 0 10px 28px rgba(0,0,0,0.45);`.
- **Active Focus Glow:** All inputs and textareas illuminate with an `#F0FF60` border and `box-shadow: 0 0 0 2px rgba(240, 255, 96, 0.18), 0 0 14px rgba(240, 255, 96, 0.14)`.
- **Branding Icon:** Dynamic SVG favicon in `Frontend/public/favicon.svg` featuring an industrial shield and trendline growth bars in `#F0FF60`.
- **Mobile Navigation:** Touch-friendly header with hamburger toggle opening a full-viewport mobile drawer menu with 44px+ minimum tap targets.

---

## 3. 🔄 Complete End-to-End User Experience & Features

### 3.1 Authentication & Security Lifecycle
```
[User Signup] ──> [12-Round Bcrypt] ──> [Auto Welcome Email] ──> [Dashboard]
                                                                     │
[Login Flow] ──> [Check Credentials] ──> [2FA Enabled?]              │
                       │                         │                   ▼
                       │                 Yes ────┴───► [Generate 6-Digit OTP]
                       │                                      │
                       ▼                               [Dispatch 2FA Email]
                [Direct Access]                               │
                                                       [Verify 2FA OTP]
                                                              │
                                                              ▼
                                                       [Issue JWT Tokens]
```

1. **User Registration (`/signup`):**
   - User inputs Name, Email, Password, and optional Role (`admin`, `manager`, `standard_user`).
   - Server enforces 12-round bcrypt password hashing and regex email sanitization.
   - **System Trigger:** Automatically dispatches a branded HTML **Welcome Onboarding Email** via Nodemailer (`sendWelcomeEmail`).
2. **User Login (`/login`):**
   - Protected against brute force via `express-rate-limit` (20 attempts per 15 min).
   - If user has **Two-Factor Authentication (2FA)** enabled:
     - Issues a temporary 10-minute token (`twoFactorRequired: true`).
     - Dispatches a time-limited 6-digit numeric OTP to the user's email.
     - Frontend transitions smoothly to the OTP verification screen.
   - Upon successful verification, generates an Access Token (2-hour life) and Refresh Token (7-day life with rotation).
3. **Password Recovery Workflow:**
   - User clicks "Forgot Password?" $\rightarrow$ inputs email.
   - Generates a crypto-secure 64-character token valid for 1 hour.
   - Dispatches a branded HTML **Password Reset Email** (`sendPasswordResetEmail`).
   - User inputs token + new password $\rightarrow$ hashed with 12 salt rounds, triggering a **Security Alert Email**.
4. **2FA Settings & Profile Management:**
   - Users can toggle 2FA on/off from the **Security & Backup** tab.
   - Users can update their name and change passwords, which triggers a **Security Notification Email** confirming account modifications.

---

### 3.2 Role-Based Access Control (RBAC) System
Permissions are enforced at the API route boundary via `Backend/src/middleware/auth.js`:

| Module / Operation | Admin (`admin`) | Manager (`manager`) | Standard User (`standard_user`) |
| :--- | :---: | :---: | :---: |
| View Assigned Records | ✅ | ✅ | ✅ |
| View All Organization Records | ✅ | ✅ | ❌ (Own/Assigned Only) |
| Create / Edit Contacts & Deals | ✅ | ✅ | ✅ |
| 1-Click Convert Lead to Deal | ✅ | ✅ | ✅ |
| Bulk CSV Import & Export | ✅ | ✅ | ❌ |
| Manual Activity & Call Logging | ✅ | ✅ | ✅ |
| Outbox Email Dispatch & Tracking | ✅ | ✅ | ✅ |
| Toggle Personal 2FA & Profile | ✅ | ✅ | ✅ |
| Trigger Database Snapshots | ✅ | ❌ | ❌ |
| Download Full Database Backups | ✅ | ❌ | ❌ |
| Delete Contacts / Deals / Companies| ✅ | ❌ | ❌ |

---

### 3.3 Dashboard Telemetry & High-Impact Metrics
Upon authentication, the user lands on the **Dashboard** view (`activeTab === 'dashboard'`):
- **4-Up Metrics Bar:**
  1. *Total Contacts & Leads* (count).
  2. *Active Pipeline Value* ($\$$ total across active deals + Proposal count).
  3. *Won Deals Revenue* ($\$$ total closed-won revenue + Win Rate %).
  4. *Pending Tasks & Reminders* (overdue warning counter + open tickets).
- **Deal Pipeline Distribution:** Interactive stage-by-stage progress bars showing dollar value and percentage distribution across all 6 stages.
- **Urgent Action Items:** Fast-action mini list of upcoming and overdue tasks with 1-click completion checkmarks.
- **Inverted Yellow Hero Card:** High-contrast CTA section promoting workflow automation and security inspection.

---

### 3.4 Contact & Company Management
- **Navigation:** `activeTab === 'contacts'` and `activeTab === 'companies'`.
- **Search & Multi-Filter:** Real-time search across Name, Email, Phone, Company, and Tags, combinable with Stage and Lead Source dropdowns.
- **Automated Duplicate Engine:**
  - Background scanner checks for matching emails and normalized phone numbers.
  - When matches exist, an eye-catching **Duplicate Alert Banner** renders atop the screen.
  - **1-Click Merge Dialog:** Merges tags, appends notes with timestamp dividers, re-assigns child tasks and deals, and safely purges the duplicate record.
- **1-Click Convert Lead to Deal:**
  - Located on every non-won contact row.
  - Instantly advances stage to `Qualified`, creates a linked deal entry in `leads_deals`, logs an audit activity entry, and generates an automated follow-up proposal task.
- **Activity Stream per Contact:** Modal/view displays calls, emails, stage transitions, and notes in reverse chronological order.

---

### 3.5 Pipeline Kanban Board
- **Navigation:** `activeTab === 'pipeline'`.
- **The 6 Stages:** `New` $\rightarrow$ `Contacted` $\rightarrow$ `Qualified` $\rightarrow$ `Proposal` $\rightarrow$ `Won` $\rightarrow$ `Lost`.
- **Stage Columns:** Each column displays:
  - Column title + stage counter.
  - Real-time aggregated dollar value ($\$$ sum of all deals in that stage).
- **Deal Cards:** Shows Contact Name, Deal Value, Company, Expected Close Date, and quick-move stage switcher.
- **Dynamic Transition Triggers:** Moving a deal across stages automatically:
  - Updates deal record and stage ID.
  - Logs an entry to the `activity_logs` audit trail.
  - Recalculates win rate and stage distribution metrics.

---

### 3.6 Tasks & Reminders Queue
- **Navigation:** `activeTab === 'tasks'`.
- **Priority Categorization:** Badged with `Low`, `Medium`, `High`, or `Urgent`.
- **Status Lifecycle:** `Pending` $\rightarrow$ `In Progress` $\rightarrow$ `Completed` $\rightarrow$ `Cancelled`.
- **Overdue Detection:** Visual red indicator badges for tasks whose `dueDate < Date.now()` that are not yet marked `Completed`.
- **Direct Linking:** Tasks can be linked to a Contact, a Deal, or assigned to a specific team User.

---

### 3.7 Invoicing & Commercial Quotes
- **Navigation:** `activeTab === 'invoices'`.
- **Document Generator:** Generates commercial Quotes and tax Invoices with automated unique IDs (`INV-XXXXXX`).
- **Billing Fields:** Line items, client contact association, due dates, subtotal, and tax calculation.
- **Lifecycle Statuses:** `Draft` $\rightarrow$ `Sent` $\rightarrow$ `Paid` $\rightarrow$ `Overdue` $\rightarrow$ `Cancelled`.

---

### 3.8 Customer Support Ticketing Queue
- **Navigation:** `activeTab === 'tickets'`.
- **Support Workflow:** Handles customer issues and client bug requests.
- **Urgency Levels:** `Low`, `Medium`, `High`, `Urgent`.
- **Resolution Tracking:** Statuses `Open` $\rightarrow$ `In Progress` $\rightarrow$ `Resolved` $\rightarrow$ `Closed` with 1-click resolve button.

---

### 3.9 Email Communications & Pixel Open Tracking
- **Navigation:** `activeTab === 'emails'`.
- **Template Selector:** Pre-loaded templates (Welcome, Deal Follow-Up, Proposal Submission, Support Resolution) with dynamic variable injection (`{{name}}`, `{{company}}`).
- **SMTP Delivery:** Dispatches via configured SMTP server (or transparent simulated delivery when running locally).
- **1x1 Transparent Tracking Pixel (`/api/emails/track/:pixelId`):**
  - Public HTTP endpoint returning a 42-byte transparent GIF with `Cache-Control: no-store`.
  - When the recipient opens the email in their client, the pixel endpoint logs the exact timestamp and flips `is_opened = true`.
  - The Outbox table displays live badges: `✓ Opened (hh:mm)` (green) vs `Delivered / Unread` (grey).

---

### 3.10 Data Portability: Import & Export
- **CSV Bulk Importer:** Modal allows pasting or uploading CSV text with automatic header detection (`Name, Email, Phone, Company, Status, Value, LeadSource, Tags`). Skips duplicates and reports imported vs skipped counts.
- **1-Click Export:** Instantly exports all contacts and deal data to standard CSV or JSON files for zero vendor lock-in.

---

### 3.11 Database Safety & Automated Snapshots
- **Navigation:** `activeTab === 'security'` (strictly restricted to `admin` role).
- **Download Full Database Dump:** 1-click endpoint (`/api/backup/download`) returning a complete structured JSON dump containing all tables, schema version, and timestamps.
- **Manual Server Snapshot:** Button triggers immediate creation of a snapshot file stored on disk in `Backend/backups/`.
- **Automated Daily Snapshot Scheduler:** Background interval automatically snapshots the entire database every 24 hours.

---

### 3.12 Scalability Extensions (Ready for Activation)
Located in `Backend/src/routes/integrations.js` and `Backend/src/routes/attachments.js`:
- **Workflow Automations (`/api/integrations/automations`):** Pre-wired rules for round-robin lead assignment, proposal alerts, and auto-invoice creation when deals are won.
- **Calendar Sync (`/api/integrations/calendar/sync`):** Service endpoints for Google Calendar and Microsoft Outlook event syncing.
- **File & Proposal Attachments (`/api/attachments`):** Multer-based multipart file uploader supporting contracts, proposals, and PDFs stored in `Backend/uploads/`.
- **External Webhooks (`/api/integrations/webhooks`):** Slack message dispatcher and Zapier webhook receiver.

---

## 4. 🏗️ Complete Technical Architecture

### 4.1 Project Directory Structure

```
Small CRM/
├── package.json                   # Root orchestrator (concurrently dev scripts)
├── README.md                      # Detailed technical overview & documentation
├── Up Until Now.md                # THIS MASTER BLUEPRINT & LLM ONBOARDING GUIDE
│
├── Backend/                       # Express 5 API Server (Port 5000)
│   ├── .env                       # Database, JWT, and SMTP credentials
│   ├── package.json               # Backend dependencies (Sequelize, Tedious, Helmet, etc.)
│   ├── backups/                   # Automated & manual database JSON snapshots (.gitkeep)
│   ├── uploads/                   # Multipart file attachment storage (.gitkeep)
│   ├── tests/
│   │   └── api.test.js            # Automated integration test suite (fetches native API)
│   └── src/
│       ├── server.js              # Application entry, Helmet, CORS, Rate Limiters, Routes
│       ├── db.js                  # Sequelize models, associations & MSSQL connection pool
│       ├── dbSetup.js             # Master DB check & idempotent DDL migration runner
│       ├── middleware/
│       │   ├── auth.js            # authenticateToken, requireRole, requirePermission, logAudit
│       │   └── security.js        # authLimiter, apiLimiter, sanitizeString, password validation
│       ├── services/
│       │   └── emailService.js    # Nodemailer SMTP transport, branded HTML templates & triggers
│       └── routes/
│           ├── auth.js            # Signup, login, 2FA OTP, forgot/reset password, profile
│           ├── contacts.js        # Contacts CRUD, duplicates, 1-click convert, CSV bulk/export
│           ├── companies.js       # Companies CRUD
│           ├── deals.js           # Deals pipeline CRUD, stages, velocity metrics
│           ├── tasks.js           # Tasks CRUD, overdue checks, user assignment
│           ├── activities.js      # Activity logging & chronological audit trail
│           ├── emails.js          # Sent history, email dispatch, 1x1 tracking pixel
│           ├── invoices.js        # Line-item quotes & invoices
│           ├── tickets.js         # Customer support tickets
│           ├── backup.js          # DB dump download, server snapshots & daily cron scheduler
│           ├── attachments.js     # Multer file upload/download
│           └── integrations.js    # Automations, calendar sync, Slack/Zapier webhooks
│
└── Frontend/                      # React 19 + Vite 8 SPA (Port 5173)
    ├── package.json               # TanStack Query, Axios, Lucide-React, React Router
    ├── index.html                 # App shell with custom SVG favicon
    ├── public/
    │   └── favicon.svg            # Custom modern CRM graph/shield emblem
    └── src/
        ├── main.jsx               # React root renderer
        ├── App.jsx                # BrowserRouter, AuthProvider, CustomCursor, HalftoneBackground
        ├── App.css                # Component styling, animations, responsive drawer, palette
        ├── index.css              # Global tokens, reset, typography, cursor CSS
        ├── context/
        │   └── AuthContext.jsx    # Auth state, login, 2FA completion, signup, refreshUser, logout
        ├── components/
        │   ├── CustomCursor.jsx   # Sleek expanding cursor with spring physics
        │   ├── HalftoneBackground.jsx # 30,000+ dot 3D magnetic lens background canvas
        │   └── ProtectedRoute.jsx # Route guard redirecting unauthenticated users to /login
        ├── services/
        │   └── api.js             # Axios client with bearer interceptor & token refresh
        └── pages/
            ├── Login.jsx          # Sign In, 2FA 6-digit OTP challenge, Forgot Password
            ├── Signup.jsx         # User registration with password validation
            └── Dashboard.jsx      # Unified tabbed master CRM interface
```

---

### 4.2 Database Schema & Model Definitions

All tables use **Microsoft SQL Server** via **Sequelize ORM** with safe idempotent DDL checks in `dbSetup.js`:

1. **`users`:** `id` (PK), `name`, `email` (Unique), `password` (12-salt bcrypt), `role`, `role_id` (FK), `refresh_token`, `two_factor_enabled`, `two_factor_code`, `two_factor_expires`, `reset_password_token`, `reset_password_expires`, `createdAt`, `updatedAt`
2. **`roles`:** `id` (PK), `role_name` (`admin`, `manager`, `standard_user`), `permissions_json`
3. **`companies`:** `id` (PK), `name`, `domain`, `phone`, `address`, `createdAt`, `updatedAt`
4. **`contacts`:** `id` (PK), `userId` (FK), `owner_id` (FK), `first_name`, `last_name`, `name`, `email`, `phone`, `company`, `company_id` (FK), `status` (New, Contacted, Qualified, Proposal, Won, Lost), `value`, `leadSource`, `tags`, `notes`, `expectedCloseDate`, `customFields`
5. **`pipeline_stages`:** `id` (PK), `name` (Unique), `order_index`
6. **`leads_deals`:** `id` (PK), `title`, `value`, `stage_id` (FK), `stage_name`, `expected_close_date`, `owner_id` (FK), `contact_id` (FK), `notes`
7. **`tasks`:** `id` (PK), `userId` (FK), `assigned_to_user_id` (FK), `contactId` (FK), `related_deal_id` (FK), `title`, `description`, `dueDate`, `priority` (Low, Medium, High, Urgent), `status` (Pending, In Progress, Completed, Cancelled)
8. **`activity_logs`:** `id` (PK), `user_id` (FK), `action`, `target_type`, `target_id`, `timestamp`, `details_json`
9. **`email_logs`:** `id` (PK), `user_id` (FK), `contact_id` (FK), `template_name`, `recipient_email`, `subject`, `body`, `tracking_pixel_id`, `is_opened`, `opened_at`, `status`
10. **`file_attachments`:** `id` (PK), `entity_type`, `entity_id`, `file_name`, `file_path`, `file_type`, `file_size`, `uploaded_by`, `uploaded_at`
11. **`invoices`:** `id` (PK), `userId` (FK), `contactId` (FK), `invoiceNumber`, `type` (Invoice, Quote), `amount`, `status` (Draft, Sent, Paid, Overdue, Cancelled), `dueDate`, `items`
12. **`tickets`:** `id` (PK), `userId` (FK), `contactId` (FK), `ticketNumber`, `subject`, `description`, `priority`, `status` (Open, In Progress, Resolved, Closed)

---

### 4.3 Complete REST API Reference

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | System status, uptime, and active security modules |
| `POST` | `/api/auth/signup` | Public (Rate-limited) | Register user account & trigger Welcome Email |
| `POST` | `/api/auth/login` | Public (Rate-limited) | Authenticate user or trigger 2FA OTP challenge |
| `POST` | `/api/auth/2fa/verify` | Public (Rate-limited) | Verify 6-digit OTP code sent to user email |
| `POST` | `/api/auth/2fa/toggle` | Authenticated | Toggle Two-Factor Authentication on/off |
| `POST` | `/api/auth/forgot-password`| Public (Rate-limited) | Generate reset token & email recovery link |
| `POST` | `/api/auth/reset-password` | Public (Rate-limited) | Verify token & update password |
| `PUT` | `/api/auth/profile` | Authenticated | Update user name / password with security alert |
| `POST` | `/api/auth/refresh` | Public | Rotate refresh token & issue new access token |
| `GET` | `/api/auth/me` | Authenticated | Return current user details, 2FA status & permissions |
| `GET` | `/api/auth/users` | Authenticated | List team users for record assignment |
| `GET` | `/api/auth/roles` | Authenticated | Inspect RBAC role definitions |
| `GET` | `/api/contacts` | Authenticated (RBAC) | List contacts with search indexing & tag filters |
| `POST` | `/api/contacts` | Authenticated | Create new contact record |
| `PUT` | `/api/contacts/:id` | Authenticated | Update contact details or stage |
| `DELETE`| `/api/contacts/:id` | Admin | Delete contact record |
| `GET` | `/api/contacts/duplicates`| Authenticated | Detect duplicate contacts matching email/phone |
| `POST` | `/api/contacts/merge` | Authenticated | Merge two duplicate records |
| `POST` | `/api/contacts/:id/convert`| Authenticated | **1-Click Convert Lead** to Contact + Deal |
| `POST` | `/api/contacts/bulk` | Authenticated | Bulk import contacts via CSV |
| `GET` | `/api/contacts/export` | Authenticated | Export contacts in CSV or JSON |
| `GET` | `/api/companies` | Authenticated | List client companies |
| `POST` | `/api/companies` | Authenticated | Create company record |
| `GET` | `/api/deals` | Authenticated | List pipeline deals & stage value totals |
| `GET` | `/api/deals/stages` | Authenticated | Get pipeline stages (`New` $\rightarrow$ `Won/Lost`) |
| `GET` | `/api/deals/metrics` | Authenticated | Calculate pipeline velocity & win rates |
| `POST` | `/api/deals` | Authenticated | Create new deal |
| `PUT` | `/api/deals/:id` | Authenticated | Transition deal stage & trigger audit log |
| `DELETE`| `/api/deals/:id` | Admin | Delete deal record |
| `GET` | `/api/tasks` | Authenticated (RBAC) | List tasks with overdue & status filters |
| `POST` | `/api/tasks` | Authenticated | Schedule follow-up task |
| `PUT` | `/api/tasks/:id` | Authenticated | Update task status or due date |
| `DELETE`| `/api/tasks/:id` | Authenticated | Delete task |
| `GET` | `/api/activities` | Authenticated | Retrieve chronological audit trail stream |
| `POST` | `/api/activities` | Authenticated | Log interaction (call, meeting, note) |
| `GET` | `/api/invoices` | Authenticated | List invoices & quotes |
| `POST` | `/api/invoices` | Authenticated | Generate line-item invoice/quote |
| `GET` | `/api/tickets` | Authenticated | List support tickets |
| `POST` | `/api/tickets` | Authenticated | Submit support ticket |
| `GET` | `/api/emails/templates` | Authenticated | Retrieve reusable message templates |
| `GET` | `/api/emails` | Authenticated | Sent history with open tracking statuses |
| `POST` | `/api/emails/send` | Authenticated | Dispatch email with branded HTML layout |
| `GET` | `/api/emails/track/:pixelId`| **Public** | **Tracking pixel: logs open timestamp & serves 1x1 GIF** |
| `GET` | `/api/backup/download` | Admin | Download full database JSON dump |
| `POST` | `/api/backup/snapshot` | Admin | Trigger manual server storage snapshot |
| `GET` | `/api/backup/history` | Admin | List recent server snapshots |
| `POST` | `/api/attachments/upload`| Authenticated | Upload document/contract via Multer |
| `GET` | `/api/attachments/:type/:id`| Authenticated | List attachments for entity |
| `GET` | `/api/integrations/automations`| Authenticated | List active workflow automation rules |
| `POST` | `/api/integrations/automations/test`| Authenticated | Test execute automation trigger |
| `GET` | `/api/integrations/calendar/sync`| Authenticated | Check calendar sync status |

---

## 5. 🤖 Guide for Future LLMs: How to Extend SCRM

If you are an AI assistant receiving this file, here are strict guardrails and high-value roadmap opportunities for this codebase:

### 5.1 Non-Negotiable Invariants & Guardrails
1. **Never Fake Anything:** Do NOT introduce `setTimeout()` simulations pretending to be APIs, dummy console logs as button handlers, or lorem ipsum. Everything must connect to real endpoints, database tables, and valid state handlers.
2. **Preserve the "Electric Obsidian" Palette:**
   - Background MUST remain `#181818` dominance.
   - Accents MUST remain `#F0FF60` / `#FAFF69`.
   - Inverted surfaces MUST use `#151515` near-black ink on `#F0FF60`.
   - Never use arbitrary inline colors or introduce random color washes.
   - Red (`#FB2C36`) and amber (`#E17100`) are strictly reserved for errors/status.
3. **Preserve Idempotent Migrations:** If adding tables or columns, always update `Backend/src/dbSetup.js` with `IF NOT EXISTS` constructs so the application boots self-healed on fresh environments.
4. **Preserve RBAC Security:** Always wrap private endpoints behind `authenticateToken` and check roles (`requireRole`) or permissions (`requirePermission`).

---

### 5.2 High-Value Feature Expansion Opportunities
Here is how you (the LLM) can immediately add high-impact features to SCRM:

1. **AI-Powered Sales Copilot & Email Drafter:**
   - Add a Gemini/OpenAI integration endpoint (`/api/ai/draft-email` and `/api/ai/summarize-lead`).
   - Add a button in the Contact and Email modals: *"✨ Draft Personalized Follow-Up with AI"*, passing contact tags, notes, and previous activities to generate custom emails.
2. **HTML5 Drag-and-Drop for Kanban Columns:**
   - Currently, Kanban cards can be moved via a quick dropdown selector.
   - Upgrade `Frontend/src/pages/Dashboard.jsx` with native HTML5 drag events (`onDragStart`, `onDragOver`, `onDrop`) or `@hello-pangea/dnd` for smooth physical card dragging between stage columns.
3. **Stripe / Payment Gateway Integration:**
   - In `Backend/src/routes/invoices.js`, add Stripe payment link generation (`POST /api/invoices/:id/pay`).
   - Let clients pay invoices directly online with webhook listeners marking the invoice as `Paid`.
4. **Global `Cmd+K` / `Ctrl+K` Command Palette:**
   - Add a keyboard-navigable search modal allowing users to instantly find any contact, deal, task, or action from anywhere in the app.
5. **Interactive Data Visualization Charts:**
   - Install `recharts` in Frontend and replace static CSS progress bars with interactive revenue velocity charts, win/loss pie charts, and monthly deal volume trendlines.

---

## 6. 🚀 Verification Commands for Developers

```bash
# 1. Run Complete Automated Backend Test Suite
cd Backend
node tests/api.test.js
# Output:
# ✓ Healthcheck passed: healthy SCRM Enterprise
# ✓ Admin User registered (Welcome Email triggered)
# ✓ 2FA Toggle tested: Two-Factor Authentication is now ENABLED
# ✓ 2FA Login challenge triggered
# ✓ Forgot password trigger tested
# ✓ Contact created ($75,000)
# ✓ 1-Click Convert Lead to Deal executed ($85,000)
# ✓ Duplicate detector verified
# ✓ Deal Pipeline Metrics verified
# ✓ Automated Server Snapshot created
# ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!

# 2. Build Frontend for Production
cd Frontend
npm run build
# Output:
# ✓ built in ~1.00s (0 errors, 0 warnings)

# 3. Launch Development Servers (Backend :5000, Frontend :5173)
npm run dev
```

---

*Document compiled and verified for SCRM (Small Customer Relationship Management) Enterprise Architecture.*
