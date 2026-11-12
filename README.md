# ⚡ SCRM — Secure · Supply · Social · Software · Small · Site

<div align="center">

![SCRM Banner](https://img.shields.io/badge/SCRM-Enterprise_Sovereign_CRM-F0FF60?style=for-the-badge&labelColor=181818&color=F0FF60)
![Node Version](https://img.shields.io/badge/Node.js-v20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)
![React Version](https://img.shields.io/badge/React-v19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Database](https://img.shields.io/badge/Database-MSSQL%20%7C%20Sequelize-CC292B?style=for-the-badge&logo=microsoft-sql-server&logoColor=white)
![Security Standard](https://img.shields.io/badge/Security-RBAC%20%26%20OWASP%20Hardened-blueviolet?style=for-the-badge&logo=shield)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**In SCRM, the "S" stands for six core product pillars: Secure, Supply, Social, Software, Small, and Site.**  
*Engineered with Node.js, Express, React 19, Vite, Microsoft SQL Server, and Sequelize ORM.*

[Platform Overview](#-platform-overview) • [The Six S Pillars](#-the-six-s-pillars) • [Core Features](#-core-crm-features) • [Cybersecurity Architecture](#-cybersecurity-architecture--rbac) • [Database Schema](#-database-schema--idempotent-migration) • [Getting Started](#-getting-started) • [API Reference](#-complete-api-reference)

</div>

---

## 📌 Platform Overview

**SCRM** is designed for growing businesses, startups, service agencies, and agile sales squads that need high-velocity deal tracking, enterprise access controls, automated duplicate detection, email open tracking, and comprehensive billing without the bloat, complexity, or vendor lock-in of legacy enterprise suites.

---

## 🏛️ The Six S Pillars

SCRM is organized around six foundational operational pillars:

| Pillar | Meaning | Product Responsibility & Implemented Capability |
| :--- | :--- | :--- |
| **Secure** | Security-first CRM | 12-round bcrypt hashing, optional email 2FA/TOTP verification, session revocation, automated daily database snapshots, and granular RBAC. |
| **Supply** | Suppliers & catalog | Product and service catalog, supplier directories, inventory price lists, line-item quotations, and tax-calculated invoices. |
| **Social** | Customer relationships & collaboration | Rich customer profiles, social links, activity audit feeds, internal notes, mentions, and unified contact-to-company relationships. |
| **Software** | Extensible developer platform | High-performance REST API, scoped developer API keys, OpenAPI documentation, and outbound webhook dispatchers. |
| **Small** | Lean, fast & sovereign | Sub-second boot times, low memory consumption, zero telemetry lock-in, and lean dependencies with no massive corporate bloat budget. |
| **Site** | Website & customer entry points | Public high-conversion landing page, embeddable web-to-lead forms, hosted public quotes/invoices, and transparent 1x1 GIF read-receipt tracking. |

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           SCRM ENTERPRISE DASHBOARD                               │
├─────────────────┬─────────────────────────────────────────────────────────────────┤
│  📊 Telemetry   │ Active Pipeline: $255,000 │ Won Revenue: $92,000 │ Win Rate: 48%│
├─────────────────┼─────────────────────────────────────────────────────────────────┤
│  📌 Pipeline    │ [New] ──> [Contacted] ──> [Qualified] ──> [Proposal] ──> [Won]  │
│                 │  $15k         $35k            $85k           $60k        $92k   │
├─────────────────┼─────────────────────────────────────────────────────────────────┤
│  ⚡ Operations  │ + New Lead │ ⚡ 1-Click Convert │ 📥 Import CSV │ 🔒 DB Snapshot  │
└─────────────────┴─────────────────────────────────────────────────────────────────┘
```

---

## ✨ Core CRM Features

### 1. 👥 Contact & Company Intelligence
- **Comprehensive Profiles**: First and last name segmentation, multi-phone, company associations, lead sources, and multi-tag filtering.
- **Automated Duplicate Engine**: Real-time background detection matching duplicate emails and phone numbers with an alert banner and **1-Click Merge Dialog**.
- **Chronological Activity Timeline**: Unified stream tracking phone calls, email dispatches, meetings, notes, and deal stage transitions.

### 2. 📊 Interactive Pipeline Kanban
- **Visual Deal Progression**: Kanban stages pre-seeded with `New` $\rightarrow$ `Contacted` $\rightarrow$ `Qualified` $\rightarrow$ `Proposal` $\rightarrow$ `Won` / `Lost`.
- **Dynamic Telemetry & Stage Totals**: Real-time sum calculation per stage, expected close dates, and win-rate percentage tracking.
- **1-Click Lead Conversion**: Instantly converts qualified leads into pipeline deals, automatically creating discovery tasks and logging audit history.

### 3. 📅 Tasks, Reminders & Overdue Alerts
- **Prioritized Action Queue**: Task creation with `Low`, `Medium`, `High`, and `Urgent` priority flags.
- **Due Date Tracking & Overdue Warnings**: Visual badges for overdue items, items due today, and completed action items.
- **Record Linking**: Tasks linked directly to users, contacts, and deal opportunities.

### 4. ✉️ SMTP Communications Framework & Automated Triggers
- **Environment-Driven SMTP**: Nodemailer delivery that reports success only after the provider accepts the message; unconfigured or rejected mail surfaces a real error instead of a simulated send.
- **Visual Identity Branded Templates**: HTML emails featuring dark obsidian headers, warm-olive accents, and high-voltage `#F0FF60` CTA buttons.
- **Automated System Triggers**:
  - **Account Welcome Workflow**: Dispatched automatically upon user registration with getting started tips.
  - **Security Alerts**: Dispatched when profiles, credentials, or 2FA settings are modified.
  - **Password Reset**: Secure 1-hour verification token workflow with direct recovery links.
  - **Two-Factor Authentication (2FA)**: Time-limited 6-digit numeric OTP verification codes.
- **Transparent Tracking Pixel (`1x1 GIF`)**: Embedded zero-cache tracking pixel (`/api/emails/track/:pixelId`) that captures open timestamps and updates UI badges to `✓ Opened (hh:mm)`.

### 5. 💬 WhatsApp Workspace
- **Linked-device session**: Administrators link one WhatsApp number by QR; the authenticated session persists on the server across restarts.
- **CRM-aware messaging**: Send text or media to a saved contact or any international number, with a serialized queue and anti-spam delay.
- **Conversation history**: Outbound and inbound messages are logged, matched to contacts by phone, and shown with delivery status in the WhatsApp workspace.
- **Team controls**: `whatsapp.view` can be granted independently from `whatsapp.send` and `whatsapp.manage`; the QR/session controls are administrator-only.
- **Inbound alerts**: New messages create in-app notifications and audit entries for the contact owner.

### 6. 📄 Commercial Quotes & Invoices
- **Billing Generator**: Issues line-item commercial quotes and tax invoices with unique numbers (`INV-XXXXXX`).
- **Status Lifecycles**: Workflow states tracking `Draft`, `Sent`, `Paid`, `Overdue`, and `Cancelled`.

### 7. 🛟 Customer Support & Incident Queues
- **Support Ticketing**: Customer issue ticketing with urgency weighting (`Low`, `Medium`, `High`, `Urgent`) and lifecycle tracking (`Open`, `In Progress`, `Resolved`, `Closed`).

### 8. 📥 Flexible CSV Import & Export Portability
- **Bulk CSV Importer**: Dynamic column mapping for importing large lead sheets without duplicate collisions.
- **1-Click Data Export**: Immediate CSV and formatted JSON dumps for complete data portability.

---

## 🛡️ Cybersecurity Architecture & RBAC

SCRM is engineered following strict security and compliance standards:

```
                  ┌────────────────────────────────────────┐
                  │        INCOMING CLIENT REQUEST         │
                  └──────────────────┬─────────────────────┘
                                     │
                                     ▼
                  ┌────────────────────────────────────────┐
                  │    Helmet.js & Strict CORS Policies    │
                  └──────────────────┬─────────────────────┘
                                     │
                                     ▼
                  ┌────────────────────────────────────────┐
                  │ IP Rate Limiting (Express-Rate-Limit)  │
                  └──────────────────┬─────────────────────┘
                                     │
                                     ▼
                  ┌────────────────────────────────────────┐
                  │     Bearer JWT & Token Rotation        │
                  └──────────────────┬─────────────────────┘
                                     │
                                     ▼
                  ┌────────────────────────────────────────┐
                  │    Granular RBAC Permission Check      │
                  └──────────────────┬─────────────────────┘
                                     │
                                     ▼
                  ┌────────────────────────────────────────┐
                  │ Input Sanitization & SQLi Parameterize │
                  └──────────────────┬─────────────────────┘
                                     │
                                     ▼
                  ┌────────────────────────────────────────┐
                  │   MICROSOFT SQL SERVER (Sequelize)     │
                  └────────────────────────────────────────┘
```

### Security Capabilities
1. **SQL Injection Defense**: 100% parameterized queries via Sequelize ORM abstraction.
2. **High-Salt Password Hashing**: Enforced bcrypt hashing with 12 salt rounds (`bcrypt.genSalt(12)`).
3. **Input Sanitization**: Strips dangerous HTML tags and prevents Cross-Site Scripting (XSS).
4. **Brute-Force Rate Limiting**: `express-rate-limit` throttles auth endpoints (20 req / 15 min) and API routes (600 req / 15 min).
5. **Token Rotation**: Short-lived access tokens combined with long-lived rotated refresh tokens (`/api/auth/refresh`).
6. **Automated Daily Snapshots**: Server-side JSON snapshot creation running every 24 hours in `Backend/backups/`.

### Role-Based Access Control (RBAC) Matrix

| Capability / Permission | Admin | Manager | Standard User |
| :--- | :---: | :---: | :---: |
| View Assigned Contacts & Deals | ✅ | ✅ | ✅ |
| View All Organization Records | ✅ | ✅ | ❌ |
| Create & Update Records | ✅ | ✅ | ✅ |
| Convert Leads to Deals | ✅ | ✅ | ✅ |
| Bulk Import & Export Data | ✅ | ✅ | ❌ |
| User & Role Management | ✅ | ❌ | ❌ |
| Trigger Database Snapshots | ✅ | ❌ | ❌ |
| Download Full Database Backups | ✅ | ❌ | ❌ |
| Delete Records | ✅ | ❌ | ❌ |

---

## 🎨 Design System & Micro-Interactions

Built upon a high-contrast industrial palette:
- **Canvas Dominance**: Obsidian `#181818` (approx. 63% of pixel field).
- **Transition Bands**: Warm-olive `#303018` and mid-grey `#484848`.
- **System Accent**: High-voltage neon yellow `#F0FF60` / `#FAFF69` firing on CTAs, active badges, and inverted yellow cards.
- **Typography Ink**: Primary headings `#F9F9F9` / `#FFFFFF`, body copy `#DFDFDF`, and near-black `#151515` on inverted yellow surfaces.
- **Hairline Borders**: `#414141` on dark panels and `#4F5101` on yellow-adjacent glass containers.
- **Semantic Tokens**: `#FB2C36` (red) and `#E17100` (amber) reserved strictly for errors and status alerts.

### Interactive Micro-Interactions
- **Custom Expanding Cursor (`CustomCursor.jsx`)**: Sleek neon dot with spring physics that smoothly scales from $6\text{px} \rightarrow 36\text{px}$ when hovering over cards, buttons, tabs, and inputs.
- **3D Halftone Canvas (`HalftoneBackground.jsx`)**: 30,000+ animated dots ($9\text{px}$ grid) reacting with a $220\text{px}$ magnetic radial lens distortion around the cursor.
- **Smooth Lift-on-Hover**: Interactive cards elevate with `transform: translateY(-2px)` and ambient drop shadows.
- **Mobile Touch Drawer**: Mobile-friendly navigation drawer with minimum 44px tap targets.

---

## 🗄️ Database Schema & Idempotent Migration

On application startup, [`Backend/src/dbSetup.js`](file:///c:/Users/farma/Desktop/Small%20CRM/Backend/src/dbSetup.js) verifies and executes idempotent DDL:

```
                      ┌──────────────────┐
                      │      USERS       │
                      ├──────────────────┤
                      │ id (PK)          │
                      │ email (Unique)   │
                      │ password (Bcrypt)│
                      │ role_id (FK)     │
                      │ refresh_token    │
                      └────────┬─────────┘
                               │ 1:N
                               ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│    COMPANIES     │      │     CONTACTS     │      │   LEADS_DEALS    │
├──────────────────┤      ├──────────────────┤      ├──────────────────┤
│ id (PK)          ├─────►│ id (PK)          ├─────►│ id (PK)          │
│ name             │ 1:N  │ company_id (FK)  │ 1:N  │ contact_id (FK)  │
│ domain           │      │ owner_id (FK)    │      │ stage_id (FK)    │
│ phone            │      │ status / value   │      │ value / notes    │
└──────────────────┘      └────────┬─────────┘      └──────────────────┘
                                   │ 1:N
                                   ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│      TASKS       │      │  ACTIVITY_LOGS   │      │    EMAIL_LOGS    │
├──────────────────┤      ├──────────────────┤      ├──────────────────┤
│ id (PK)          │      │ id (PK)          │      │ id (PK)          │
│ contactId (FK)   │      │ target_type / id │      │ tracking_pixel_id│
│ assigned_to (FK) │      │ action / details │      │ is_opened (Bit)  │
│ status / priority│      │ timestamp        │      │ opened_at        │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + Vite 8
- **Data Fetching & Cache**: `@tanstack/react-query` v5
- **Icons**: `lucide-react`
- **Routing**: `react-router-dom` v7
- **Styling**: Vanilla CSS3 Tokens + Micro-Interactions

### Backend
- **Runtime**: Node.js v20+ / Express 5
- **Database**: Microsoft SQL Server / Express LocalDB
- **ORM**: Sequelize v6 (`tedious` MSSQL driver)
- **Security**: Helmet, CORS, Express-Rate-Limit, Bcrypt.js, JsonWebToken
- **Utilities**: Nodemailer (Email dispatch), Multer (File attachments)

---

## 🚀 Getting Started

### 📋 Prerequisites
- **Node.js** v18+ or v20+
- **npm** v9+
- **Microsoft SQL Server** (running locally on port 1433 or remote instance)

---

### 📥 1. Installation

Clone the repository and install all dependencies:

```bash
git clone https://github.com/farmanullah1/SCRM-CRM-Node-React.js.git
cd SCRM-CRM-Node-React.js

# Install root, backend, and frontend dependencies in one command
npm run install:all
```

---

### ⚙️ 2. Environment Configuration

Create or verify `Backend/.env`:

```env
PORT=5000
NODE_ENV=development

# Microsoft SQL Server Configuration
DB_NAME=SCRM
DB_USER=sa
DB_PASSWORD=YourPassword123!
DB_SERVER=localhost
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# Authentication Secrets
JWT_SECRET=scrm_enterprise_production_jwt_secret_key_2026
JWT_EXPIRES_IN=2h

# Optional SMTP for Email Dispatch
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@yourdomain.com
SMTP_PASS=your_smtp_password
SMTP_FROM="SCRM Team" <noreply@scrm.enterprise>
```

> **Note:** There is no simulated dispatch mode. If SMTP is not configured or the provider rejects a message, the API returns a real error and records no successful send. Use Settings → Email & SMTP to verify the connection.

---

### 💻 3. Run Development Servers

Start both Backend and Frontend concurrently with a single command:

```bash
npm run dev
```

- **Backend API**: `http://localhost:5000`
- **Frontend Dashboard**: `http://localhost:5173`
- **Healthcheck & Diagnostics**: `http://localhost:5000/health`

---

### 🧪 4. Automated Verification Suite

Run the built-in end-to-end integration test suite:

```bash
cd Backend
node tests/api.test.js
```

---

## 📡 Complete API Reference

### 🔐 Authentication & Access Control
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Public | Register user account with 12-round bcrypt hash & trigger Welcome Email |
| `POST` | `/api/auth/login` | Public | Authenticate user & issue JWT or trigger 2FA OTP challenge |
| `POST` | `/api/auth/2fa/verify` | Public | Verify 6-digit OTP code sent to user email |
| `POST` | `/api/auth/2fa/toggle` | Authenticated | Enable or disable Two-Factor Authentication |
| `POST` | `/api/auth/forgot-password`| Public | Request password reset token via email |
| `POST` | `/api/auth/reset-password` | Public | Complete password reset using verified token |
| `PUT` | `/api/auth/profile` | Authenticated | Update user name or change password with security alert |
| `POST` | `/api/auth/refresh` | Public | Rotate refresh token & issue new access token |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile, 2FA status & permissions |
| `GET` | `/api/auth/users` | Authenticated | List team users for task & deal assignments |
| `GET` | `/api/auth/roles` | Authenticated | Inspect system RBAC role definitions |

### 👥 Contacts & Companies
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/contacts` | Authenticated | List contacts with search indexing & tag filters |
| `POST` | `/api/contacts` | Authenticated | Create new contact record |
| `PUT` | `/api/contacts/:id` | Authenticated | Update contact details or status |
| `DELETE` | `/api/contacts/:id` | Admin | Delete contact record |
| `GET` | `/api/contacts/duplicates`| Authenticated | Automated duplicate detection (email/phone) |
| `POST` | `/api/contacts/merge` | Authenticated | Merge two duplicate contact records |
| `POST` | `/api/contacts/:id/convert`| Authenticated | **1-Click Convert Lead** to Contact + Deal |
| `POST` | `/api/contacts/bulk` | Authenticated | Bulk import contacts via CSV |
| `GET` | `/api/contacts/export` | Authenticated | Export contacts in CSV or JSON |
| `GET` | `/api/companies` | Authenticated | List all client companies |
| `POST` | `/api/companies` | Authenticated | Create company record |

### 📊 Pipeline & Deals
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/deals` | Authenticated | List pipeline deals & stage value totals |
| `GET` | `/api/deals/stages` | Authenticated | Get pipeline stages (`New` $\rightarrow$ `Won/Lost`) |
| `GET` | `/api/deals/metrics` | Authenticated | Calculate pipeline velocity & win rates |
| `POST` | `/api/deals` | Authenticated | Create new pipeline deal |
| `PUT` | `/api/deals/:id` | Authenticated | Transition deal stage & trigger audit log |
| `DELETE` | `/api/deals/:id` | Admin | Delete deal record |

### 📅 Tasks & Activities
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tasks` | Authenticated | List tasks with overdue & due date filters |
| `POST` | `/api/tasks` | Authenticated | Schedule follow-up task |
| `PUT` | `/api/tasks/:id` | Authenticated | Update task status (`Pending` $\rightarrow$ `Completed`) |
| `DELETE` | `/api/tasks/:id` | Authenticated | Delete task |
| `GET` | `/api/activities` | Authenticated | Retrieve chronological audit trail stream |
| `POST` | `/api/activities` | Authenticated | Log interaction (call, meeting, note) |

### ✉️ Email Outbox & Tracking
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/emails/templates` | Authenticated | Retrieve reusable message templates |
| `GET` | `/api/emails` | Authenticated | Sent history with open tracking statuses |
| `POST` | `/api/emails/send` | Authenticated | Dispatch email & generate tracking pixel |
| `GET` | `/api/emails/track/:pixelId` | **Public** | **Tracking pixel: logs open timestamp & serves 1x1 GIF** |

### 🔒 Enterprise Safety & Attachments
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/backup/download` | Admin | Download full database JSON dump |
| `POST` | `/api/backup/snapshot` | Admin | Trigger manual server storage snapshot |
| `GET` | `/api/backup/history` | Admin | List recent server snapshots |
| `POST` | `/api/attachments/upload`| Authenticated | Upload document/contract via Multer |
| `GET` | `/api/attachments/:type/:id`| Authenticated | List attachments for entity |

---

## 🔮 Scalability Modules

- **Workflow Automations** (`/api/integrations/automations`): Round-robin lead routing, proposal stage alerts, and won-deal invoice drafts.
- **Calendar Synchronization** (`/api/integrations/calendar/sync`): Google Calendar and Microsoft Outlook event sync hooks.
- **Webhooks** (`/api/integrations/webhooks`): Slack outbound notifications and Zapier integration receivers.

---

## 📄 License

This project is licensed under the **MIT License**.

Built with precision for small teams requiring enterprise-level capability. **SCRM — Small CRM, Massive Impact.**

---

## Workspace navigation and settings (November 2026)

The authenticated application uses a persistent, collapsible sidebar with URL-addressable sections:
`/app/dashboard`, `/app/leads`, `/app/contacts`, `/app/pipeline`, `/app/companies`, `/app/tasks`,
`/app/activities`, `/app/invoices`, `/app/catalog`, `/app/tickets`, `/app/outbox`, and
`/app/settings/{profile,security,email,account}`. An admin-only `/app/security` page hosts backup
tools. Sign-out lives in Settings and requires confirmation. Profile photos and cover images are
uploaded to the API under `/uploads` and served by Express.

See `docs/UI_UX_REPAIR_AUDIT.md` for the repair matrix, verification evidence and the list of
unfinished specification items (notably TOTP/recovery codes, immediate JWT revocation, guided CSV
mapping and full form regrouping).

---

## Deal pipeline and contact records (November 2026)

The sales pipeline is now driven by deal records, not contact statuses:

- Every kanban card is a deal with its own title, value, stage, primary contact and expected close date.
- Deals can be created, edited, moved between stages, and deleted by administrators from the pipeline.
- Dashboard pipeline value, won revenue, win rate and stage distribution are computed from deals.
- Clicking a contact opens a 360 record with contact details, linked deals, linked tasks and activity history.
- Tasks can be edited (title, status, priority, assignee, due date) instead of only completed or deleted.

See `docs/UI_UX_REPAIR_AUDIT.md` for the full change record and verification evidence.

## Company records and pipeline drag-and-drop (November 2026)

- Company cards open an account record with domain, phone, address, linked contacts, linked deals, open pipeline and won revenue.
- From a company record you can open a linked contact or deal, add a contact pre-linked to the company, or edit the account.
- Deals can be dragged between pipeline columns; the stage is persisted through the deals API, with the stage menu kept as a keyboard-friendly fallback.
- `GET /api/companies/:id` now returns `{ company, contacts, deals, totals }`; the existing company list response is unchanged.

## Line-item invoices and quotes (November 2026)

- Invoices and quotes now contain line items (catalog item or custom description, quantity, unit price).
- The server calculates subtotal, tax and total; client-supplied totals are ignored.
- Status lifecycle: Draft → Sent → Paid, plus Overdue and Void; marking Paid records `paid_at`.
- Invoice records show bill-to contact, dates, line items, totals and notes, with print, edit, send and mark-paid actions.
- Additive migration columns: `subtotal`, `tax_rate`, `tax_amount`, `notes`, `issued_date`, `paid_at`.
