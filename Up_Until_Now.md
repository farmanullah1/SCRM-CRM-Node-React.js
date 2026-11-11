# ⚡ SCRM ("Small CRM") — Up Until Now
### Master Architectural Blueprint, Design System Specifications, End-to-End User Journeys, Feature Directory & AI Expansion Guide

> **Document Version:** 2.4.0 (Enterprise Release)  
> **Primary Audience:** Large Language Models (LLMs), AI Pair Programmers, Principal Software Architects, and Senior Full-Stack Engineers continuing development on this repository.  
> **Target Repository:** `https://github.com/farmanullah1/SCRM-CRM-Node-React.js.git` (`main` branch)  
> **Working Directory:** `Small CRM/`

---

## 1. 🧭 Executive Summary & Core Identity

### 1.1 What is SCRM?
**SCRM** stands for **Small Customer Relationship Management**.

The name is intentional: **the "S" strictly stands for Small**.
- **"Small" in operational footprint:** Zero enterprise bloatware, sub-second boot times, lean resource consumption, and zero opaque cloud vendor black boxes.
- **Enterprise-grade in power & capability:** Engineered from day one with 12-round bcrypt authentication, Role-Based Access Control (RBAC), Microsoft SQL Server ACID relational data integrity, automated duplicate detection and 1-click contact merging, atomic lead-to-deal conversion, transparent 1x1 GIF email open tracking, automated daily database snapshots, and an interactive 75,000+ dot halftone background with kinetic wave physics.

### 1.2 Target Audience & Core Philosophy
SCRM is built for high-velocity sales squads, agencies, startups, consultancies, and independent enterprises that have outgrown fragmented spreadsheets but categorically reject the sluggish, expensive, feature-bloated legacy CRMs. 

Every single button, route, and input is **100% real and functional**:
- No fake loading timers (`setTimeout` pretending to fetch data).
- No mock data or empty console log handlers.
- No dummy navigation links.
- No unhandled promise rejections.

---

## 2. 🎨 The Design System ("Electric Obsidian")

The visual and interactive identity of SCRM is governed by a strict, scientifically balanced design framework named **Electric Obsidian**. Any engineer or AI modifying the frontend must adhere strictly to these tokens and interaction rules.

### 2.1 The Chromatic Budget
The interface is mathematically balanced across a calculated pixel distribution:

```
┌───────────────────────────────────────────────────────────────────┐
│ Obsidian Canvas (#181818)  ~63% of visible viewport              │
│ ├─ Warm-Olive Transition Band (#303018)  ~8% section dividers    │
│ ├─ Mid-Grey Glass Surface (#484848 / #202020)  ~6% panels/cards  │
│ ├─ Electric Neon Accent (#F0FF60 / #FAFF69)  ~10% CTAs & active  │
│ └─ Text Ink (#DFDFDF body / #FFFFFF headings / #151515 inverted) │
└───────────────────────────────────────────────────────────────────┘
```

| Token Name | Hex Code | Visual Role & Constraints |
| :--- | :--- | :--- |
| `--bg-dark` | `#181818` | Dominant true canvas color (~63% of pixels). Not a muddy gradient. |
| `--bg-section-transition` | `#303018` | Warm-olive accent band marking hero transitions and alert container borders. |
| `--surface-raised` | `#202020` | Dark raised surface for modals, cards, floating preview frames, and kanban columns. |
| `--surface-glass` | `rgba(32, 32, 32, 0.78)` | Translucent glass with `backdrop-filter: blur(12px)` allowing halftone dots to show through. |
| `--accent` | `#F0FF60` | High-voltage electric neon yellow. Used for primary CTAs, active tab indicators, and icon strokes. |
| `--accent-bright` | `#FAFF69` | High-energy hover tint, glowing focus borders, and badge text. |
| `--text-heading` | `#FFFFFF` / `#F9F9F9` | High-contrast typography for primary titles and metrics. |
| `--text-body` | `#DFDFDF` | Soft grey copy for readable body paragraphs and labels. |
| `--text-muted` | `#9E9E9E` | Secondary metadata, dates, and subtle hints. |
| `--text-inverted` | `#151515` / `#1F2014` | Ultra-dark ink used **exclusively** on full-panel inverted yellow surfaces (`#F0FF60`). |
| `--border-hairline` | `#414141` | Crisp 1px boundary lines on dark glass cards and table cells. |
| `--border-yellow-adjacent`| `#4F5101` | Olive-toned 1px border used on surfaces adjacent to electric yellow elements. |
| `--semantic-error` | `#FB2C36` | **Held strictly in reserve:** For error messages, overdue badges, and destructive actions. |
| `--semantic-warning` | `#E17100` | **Held strictly in reserve:** For high-priority reminders and pending alerts. |
| `--semantic-success` | `#22C55E` | **Held strictly in reserve:** For won deals, paid invoices, and successful checks. |

---

### 2.2 Interactive Background Canvas (`HalftoneBackground.jsx`)
The hallmark visual element of SCRM is its interactive, canvas-driven halftone dot matrix:
- **Rendering Technology:** Native HTML5 2D Canvas driven by a 60fps `requestAnimationFrame` loop.
- **Fixed Fullscreen Layer:** Layered behind the document (`position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 0; pointer-events: none`).
- **High-Density Grid:** Dot spacing configured at **$6.5\text{px}$**, rendering **55,000 to 75,000+ distinct dots** across standard high-DPI displays.
- **Base Dot Dimensions:** Base radius of **$1.55\text{px}$** (larger, crisper, and more prominent than typical subtle meshes).
- **Magnetic Lens Hover Effect:** As the user moves their pointer, dots within a $220\text{px}$ radius experience a magnetic displacement force:
  $$d_{\text{shift}} = \left(1 - \frac{\text{dist}}{R}\right)^2 \times \text{maxShift}$$
  Dots under the cursor expand smoothly up to **$4.4\text{px}$** and shift in real-time with spring interpolation lerp physics ($0.16$).
- **Click & Tap Ripple Wave Physics:** Clicking or tapping anywhere generates an active ripple wave that travels radially outward across the canvas at 7px/frame. Dots caught along the ripple wave front dynamically illuminate in electric yellow (`#F0FF60`) before decaying back to baseline.
- **Multi-Band Color Breathing:** Dots subtly pulse on an organic sine wave with multi-band color distribution (charcoal, warm-olive, and mid-grey).

---

### 2.3 Kinetic Floating Animations & Motion System (`App.css`)
SCRM avoids flat, static screens by implementing purposeful, GPU-accelerated motion:
1. **Floating Animations (`@keyframes scrmFloatSlow`, `scrmFloatGentle`):**
   - **Hero Badge:** Uses `.scrm-float-badge` to levitate gently ($0\text{px} \rightarrow -5\text{px}$).
   - **Feature Cards (6 Cards):** Each card uses `.scrm-float-gentle` with staggered animation delays ($0.1\text{s}, 0.3\text{s}, 0.5\text{s}, 0.7\text{s}, 0.9\text{s}, 1.1\text{s}$) creating a natural, floating organic wave across the grid.
   - **Dashboard Preview Frame:** Uses `.scrm-float-card` with an $8$-second smooth cycle.
2. **Universal Interactive Lift (`.interactive-lift`):**
   - Applies to buttons, cards, table rows, and metric widgets.
   - On hover, transforms `translateY(-4px)` with a glowing yellow drop-shadow halo (`box-shadow: 0 12px 30px rgba(0,0,0,0.5), 0 0 16px rgba(240, 255, 96, 0.2)`).
3. **Button Hover States:**
   - `.btn-primary-yellow`: Lifts with `brightness(1.05)` and high-intensity yellow aura.
   - `.btn-ghost-dark`: Lifts with a subtle electric-yellow border tint and backdrop brightening.
   - `.action-icon-btn`: Lifts on hover; standard icons flash yellow, while delete actions illuminate with a semantic red alert aura (`#FB2C36`).
4. **Data Table Hover Rows:**
   - Table rows (`.circuit-table tbody tr`) highlight on hover with a yellow-tinted glass background (`rgba(240, 255, 96, 0.04)`).
5. **Form Input Focus Rings:**
   - All inputs, textareas, and selects glow on hover and focus with an active double-ring in `#F0FF60`.

---

### 2.4 In-App Toast Notification System
All intrusive native browser `alert()` popups have been eradicated and replaced with custom non-blocking floating in-app toasts:
- **Container:** `.scrm-toast-container` fixed at bottom-right (`bottom: 24px; right: 24px; z-index: 9999`).
- **Bubble:** `.scrm-toast-bubble` rendered in dark obsidian glass (`rgba(28, 28, 28, 0.95)`), surrounded by a hairline `#F0FF60` border and soft glow shadow.
- **Feedback:** Accompanied by a glowing electric yellow `<CheckCircle2 />` icon with smooth slide-up entrance animation (`@keyframes slideUp`), automatically dismissing after $4$ seconds.

---

### 2.5 Dynamic Expanding Cursor (`CustomCursor.jsx`)
- Dual-layer tracking cursor consisting of an inner precision dot and an outer trailing spring ring.
- **Make Dot Bigger Effect:** When hovering over interactive elements (`button`, `a`, `input`, `.interactive-lift`, `.kanban-card`), the inner dot expands from $6\text{px} \rightarrow 14\text{px}$ and the ring expands from $30\text{px} \rightarrow 52\text{px}$ with a glowing yellow fill.
- Automatically disables on touch-only devices via CSS media queries.

---

## 3. 🔄 Complete End-to-End User Experience & User Flows

### 3.1 Initial Visit & Public Landing Page Experience
When an unauthenticated user navigates to the root URL (`/`):

```
[Visit /] ──► [LandingPage.jsx]
                ├── Halftone Canvas Pass-Through (Transparent Glass)
                ├── Floating Hero Badge ("ENGINEERED FOR MODERN TEAMS")
                ├── High-Impact Headline with Electric Yellow Highlights
                ├── Staggered Floating Feature Cards (Customer 360, Pipeline, etc.)
                ├── Inverted Yellow Band ("DATA SOVEREIGNTY BY DESIGN")
                ├── 5-Stage Visual Workflow Lifecycle
                ├── Commercial Pricing Cards (Monthly / Annual Toggle)
                ├── Interactive FAQ Accordion
                └── CTAs ──► [/signup] or [/login]
```

- **Transparent Background:** The root div and section wrappers are semi-transparent with backdrop filters, allowing the dense 75,000+ halftone dots to show continuously across the entire landing page.
- **Authenticated User Awareness:** If an already-authenticated user visits `/`, a sleek floating notification banner appears at the top welcoming them back and providing a direct 1-click button into `/app` (Dashboard).
- **Mobile Responsive Drawer:** The navigation header includes a mobile hamburger toggle that reveals a full-screen drawer menu with 44px+ touch targets.

---

### 3.2 User Signup & Automated Onboarding Journey
```
[User on /signup] ──► [Fill Form: Name, Email, Password, Role]
                             │
                             ▼
                     [Client Validation]
                             │
                             ▼
                     [POST /api/auth/signup]
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [Hash PW: 12-round bcrypt]     [Save to users table]
            │                                 │
            └────────────────┬────────────────┘
                             ▼
              [Nodemailer Dispatch: Welcome Email]
                             │
                             ▼
                 [Auto-redirect to /app]
```
1. **Input Submission:** User enters Full Name, Email, Password (minimum 6 characters), and selects an operational Role (`standard_user`, `manager`, or `admin`).
2. **Security Hardening:** Server hashes password using bcrypt with 12 salt rounds.
3. **Automated Welcome Workflow:** Backend immediately triggers an automated, branded HTML **Welcome Onboarding Email** via Nodemailer (`sendWelcomeEmail`), featuring the company identity, quick-start guide, and security recommendations.
4. **Instant Token Issuance:** Returns signed JWT Access and Refresh Tokens, immediately establishing session context in `AuthContext` and directing the user to the CRM workspace.

---

### 3.3 User Login & Two-Factor Authentication (2FA) Challenge
```
[User on /login] ──► [Input Email & Password]
                            │
                            ▼
                    [POST /api/auth/login]
                            │
              [Express Rate Limiter: 20 req/15min]
                            │
              [Bcrypt Password Comparison]
                            │
             ┌──────────────┴──────────────┐
             ▼                             ▼
     [2FA is DISABLED]              [2FA is ENABLED]
             │                             │
             ▼                             ▼
    [Issue JWT Tokens]           [Generate 6-Digit OTP]
             │                             │
             ▼                             ▼
       [Enter App]               [Dispatch OTP Email]
                                           │
                                           ▼
                                 [Render OTP Screen]
                                           │
                                           ▼
                                  [POST /api/auth/2fa/verify]
                                           │
                                           ▼
                                  [Issue JWT Tokens]
```
1. **Brute Force Protection:** Login route is shielded by `express-rate-limit` to prevent credential stuffing.
2. **Conditional 2FA Flow:**
   - If 2FA is **Disabled**: Immediately generates access/refresh tokens and logs user in.
   - If 2FA is **Enabled**: Generates a crypto-secure 6-digit OTP (valid for 10 minutes), dispatches an automated branded email containing the OTP code, and presents an interactive OTP verification form.
3. **Token Management:** Authenticated users receive an Access Token (2-hour life) and Refresh Token (7-day life with automatic rotation on `/api/auth/refresh`).

---

### 3.4 Password Recovery Flow
1. User clicks *"Forgot password?"* on the login screen.
2. Submits email address $\rightarrow$ triggers `POST /api/auth/forgot-password`.
3. Backend generates a 64-character hexadecimal reset token with a 1-hour expiration timestamp.
4. Nodemailer delivers a branded **Password Reset Email** containing the secure URL.
5. User navigates to the reset page, inputs their new password $\rightarrow$ hashed with 12 salt rounds, immediately invalidating the token and sending a **Security Alert Email** confirming the modification.

---

### 3.5 Unified Master Dashboard & Real-Time Telemetry
Once inside `/app`, the user is presented with the SCRM command center:
- **4-Up Metrics Bar:**
  1. **Total Contacts & Leads:** Live count with percentage growth indicator.
  2. **Active Pipeline Value:** Total monetary sum across active deals (formatted as `$XX,XXX.00`).
  3. **Closed-Won Revenue:** Total confirmed revenue from deals in `Won` stage + calculated Win Rate %.
  4. **Actionable Tasks & Urgency:** Total pending tasks + overdue items flagged with red counters.
- **Pipeline Stage Velocity Bar:** Interactive visual progress breakdown showing dollar values and deal counts distributed across New, Contacted, Qualified, Proposal, Won, and Lost.
- **Urgent Action Items Stream:** Quick-action list of overdue and due-today tasks with 1-click completion checkboxes.

---

### 3.6 Contact & Company Management (Customer 360)
- **Universal Multi-Filter Search:** Filter contacts in real time across Name, Email, Phone, Company, Tags, and Pipeline Status.
- **Automated Duplicate Engine:**
  - Background scanner continuously identifies duplicate contacts sharing identical emails or normalized phone numbers.
  - When detected, renders a visible **Duplicate Alert Banner** atop the screen.
  - **1-Click Merge Modal:** Allows the user to select the primary record. Automatically merges tags, appends notes with timestamp dividers, reassigns linked deals and tasks, and purges the duplicate record.
- **Customer Activity Timeline:** Clicking any contact reveals their chronological interaction feed (call notes, sent emails, meetings, and stage changes).

---

### 3.7 Standalone Leads & 1-Click Deal Conversion
- **Dedicated Inbound Leads:** Capture incoming inquiries directly with title, value, lead source, and contact details.
- **Atomic 1-Click Convert to Deal:**
  - On any contact or lead row, clicking **"Convert to Deal"** executes an atomic transaction.
  - Generates or updates the Contact, links or creates the Company, generates a new entry in `leads_deals` linked to stage `Qualified`, creates an automated follow-up proposal Task, and logs an entry to the audit trail.
  - Displays instant floating toast confirmation.

---

### 3.8 Pipeline Kanban Board & Deal Velocity
- **Navigation:** `activeTab === 'pipeline'`.
- **The 6 Stages:** `New` $\rightarrow$ `Contacted` $\rightarrow$ `Qualified` $\rightarrow$ `Proposal` $\rightarrow$ `Won` $\rightarrow$ `Lost`.
- **Column Header Metrics:** Each column displays stage title, count of deals, and exact real-time dollar sum of deals residing in that stage.
- **Deal Cards:** Displays Deal Title, Value in green, Associated Company, Contact, and Expected Close Date.
- **Stage Transitions:** Moving deals between stages immediately triggers audit log creation, recalculates win rates, and updates live metrics without requiring page refreshes.

---

### 3.9 Tasks & Reminders Scheduling Queue
- **Categorization:** Priority badges for `Low`, `Medium`, `High`, and `Urgent`.
- **Status Lifecycle:** `Pending` $\rightarrow$ `In Progress` $\rightarrow$ `Completed` $\rightarrow$ `Cancelled`.
- **Smart Overdue Highlighting:** Any task where `dueDate < Date.now()` that is not yet completed renders an eye-catching red semantic badge (`#FB2C36`).
- **Association:** Direct linking to contacts and deals, with assignment to specific team members.

---

### 3.10 Invoicing & Commercial Quotes
- **Navigation:** `activeTab === 'invoices'`.
- **Document Generator:** Create commercial Quotes and tax Invoices with unique auto-generated serials (`INV-XXXXXX`).
- **Fields:** Client contact picker, line items, quantity, rate, tax rate, and payment due dates.
- **Status Flow:** `Draft` $\rightarrow$ `Sent` $\rightarrow$ `Paid` $\rightarrow$ `Overdue` $\rightarrow$ `Cancelled`.
- **Persisted Commercial Records:** Fully relational SQL Server records connected to the customer ledger.

---

### 3.11 Customer Support Ticketing Queue
- **Navigation:** `activeTab === 'tickets'`.
- **Lifecycle:** `Open` $\rightarrow$ `In Progress` $\rightarrow$ `Resolved` $\rightarrow$ `Closed`.
- **Priority Tiers:** `Low`, `Medium`, `High`, and `Urgent`.
- **Quick Resolution:** 1-click action buttons to advance ticket status and log customer communication notes.

---

### 3.12 Email Communications & Transparent Tracking Pixel
- **Navigation:** `activeTab === 'emails'`.
- **Template Library:** Pre-configured email templates (Welcome, Proposal Follow-up, Meeting Confirmation, Support Resolution) with token substitution (`{{name}}`, `{{company}}`).
- **SMTP Engine:** Dispatches real HTML emails through Nodemailer with responsive Electric Obsidian formatting.
- **1x1 Transparent Read Receipt Pixel (`/api/emails/track/:pixelId`):**
  - Appends `<img src="/api/emails/track/:pixelId" width="1" height="1" />` to the outbound email body.
  - When opened by the recipient, the public tracking endpoint returns a 42-byte transparent GIF with `Cache-Control: no-store`.
  - Flips `is_opened = true` and records the exact timestamp.
  - The Sent Outbox dynamically displays real-time status badges: `✓ Opened (hh:mm)` vs `Delivered / Unread`.

---

### 3.13 Data Portability: Import & Export
- **CSV Bulk Importer:** Modal supporting direct text paste or file upload. Automatically maps headers (`Name, Email, Phone, Company, Status, Value, LeadSource, Tags`), detects duplicate entries, and provides detailed import summaries.
- **1-Click Export:** Instantly exports all contact, company, and deal records into cleanly structured CSV or JSON files for complete customer data sovereignty.

---

### 3.14 Enterprise Security & Automated Database Snapshots
- **Navigation:** `activeTab === 'security'` (strictly restricted to `admin` role).
- **Session Inspector & Remote Revocation:** View all active logged-in sessions with IP address, browser user-agent, and login timestamps. Admins can remotely revoke any session token instantly.
- **Two-Factor Authentication (2FA) Switch:** 1-click toggle to enable or disable mandatory email OTP verification.
- **Profile & Password Updates:** Change user details and credentials securely with immediate security notification emails.
- **On-Demand Server Snapshot:** 1-click button triggers immediate creation of a complete database snapshot stored in `Backend/backups/`.
- **Automated 24-Hour Snapshot Scheduler:** Background cron interval snapshots the full database every 24 hours.
- **Full Database Dump Download:** 1-click endpoint (`/api/backup/download`) returning a complete structured JSON dump containing all tables, schema version, and timestamps.

---

## 4. 🏗️ Complete Technical Architecture & Codebase Map

### 4.1 Monorepo Directory Structure

```
Small CRM/
├── package.json                   # Root orchestrator (concurrent dev scripts)
├── README.md                      # Detailed project documentation & setup
├── Up_Until_Now.md                # THIS COMPREHENSIVE ONBOARDING BLUEPRINT
│
├── Backend/                       # Express API Server (Port 5000)
│   ├── .env                       # Database credentials, JWT secret, SMTP settings
│   ├── package.json               # Backend dependencies (Sequelize, Tedious, Helmet, etc.)
│   ├── backups/                   # Directory storing automated & manual DB JSON dumps
│   ├── uploads/                   # Multipart attachment storage
│   ├── tests/
│   │   └── api.test.js            # Automated 11-step integration test suite
│   └── src/
│       ├── server.js              # Express entrypoint, Helmet, CORS, Rate Limiters, Routers
│       ├── db.js                  # Sequelize models, associations & MSSQL connection pool
│       ├── dbSetup.js             # Idempotent DDL migration runner (CREATE TABLE IF NOT EXISTS)
│       ├── middleware/
│       │   ├── auth.js            # authenticateToken, requireRole, requirePermission, logAudit
│       │   └── security.js        # authLimiter, apiLimiter, sanitizeString, password validation
│       ├── services/
│       │   └── emailService.js    # Nodemailer transport, branded HTML templates & triggers
│       └── routes/
│           ├── auth.js            # Signup, login, 2FA OTP, forgot/reset password, profile, sessions
│           ├── contacts.js        # Contacts CRUD, duplicate scanner, 1-click convert, CSV bulk/export
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
    │   └── favicon.svg            # Custom SCRM geometric shield & graph icon
    └── src/
        ├── main.jsx               # React DOM entrypoint
        ├── App.jsx                # BrowserRouter, AuthProvider, CustomCursor, HalftoneBackground, Routes
        ├── App.css                # Component styling, animations, floating classes, toast, palette
        ├── index.css              # Global tokens, resets, typography, cursor CSS
        ├── context/
        │   └── AuthContext.jsx    # Auth state, login, 2FA challenge, signup, refreshUser, logout
        ├── components/
        │   ├── BrandLogo.jsx      # Reusable vector brand emblem
        │   ├── CustomCursor.jsx   # Dynamic expanding cursor with spring physics
        │   ├── HalftoneBackground.jsx # 75,000+ dot canvas with magnetic lens & click ripple wave
        │   └── ProtectedRoute.jsx # Route guard redirecting unauthenticated users to /
        ├── services/
        │   └── api.js             # Axios client with bearer interceptor & token refresh
        └── pages/
            ├── LandingPage.jsx    # Full public landing page with floating cards & pricing
            ├── Login.jsx          # Sign In, 2FA 6-digit OTP challenge, Forgot Password
            ├── Signup.jsx         # User registration with password validation
            └── Dashboard.jsx      # Unified tabbed master CRM interface with in-app toasts
```

---

### 4.2 Database Relational Schema
All tables run on **Microsoft SQL Server 2022** via **Sequelize ORM** with idempotent migration safeguards in `Backend/src/dbSetup.js`:

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │       │    roles     │       │  companies   │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │◄──────┤ id (PK)      │       │ id (PK)      │
│ email (UQ)   │       │ role_name    │       │ name         │
│ password     │       │ permissions  │       │ domain       │
│ role_id (FK) │       └──────────────┘       │ phone        │
│ refresh_token│                              └──────┬───────┘
│ 2fa fields   │                                     │
└──────┬───────┘                                     │
       │                                             │
       ├──────────────────────┬──────────────────────┤
       │                      │                      │
       ▼                      ▼                      ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   contacts   │       │ leads_deals  │       │    tasks     │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │◄──────┤ id (PK)      │       │ id (PK)      │
│ userId (FK)  │       │ title        │       │ userId (FK)  │
│ companyId(FK)│       │ value ($)    │       │ contactId(FK)│
│ status       │       │ stage_id(FK) ├──────►│ status       │
│ value ($)    │       │ contactId(FK)│       │ priority     │
│ tags / notes │       └──────────────┘       │ dueDate      │
└──────┬───────┘                              └──────────────┘
       │
       ├──────────────────────┬──────────────────────┐
       ▼                      ▼                      ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  email_logs  │       │   invoices   │       │   tickets    │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)      │       │ id (PK)      │
│ contactId(FK)│       │ contactId(FK)│       │ contactId(FK)│
│ is_opened    │       │ amount       │       │ priority     │
│ pixel_id(UQ) │       │ status       │       │ status       │
└──────────────┘       └──────────────┘       └──────────────┘
```

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

### 4.3 REST API Endpoints Overview

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | System status, database health, active security engines |
| `POST` | `/api/auth/signup` | Public (Rate-limited) | Register user account, 12-round bcrypt, sends Welcome Email |
| `POST` | `/api/auth/login` | Public (Rate-limited) | Authenticate user; triggers 2FA OTP email if enabled |
| `POST` | `/api/auth/2fa/verify` | Public (Rate-limited) | Verify 6-digit OTP code & issue JWT tokens |
| `POST` | `/api/auth/2fa/toggle` | Authenticated | Toggle Two-Factor Authentication on/off |
| `POST` | `/api/auth/forgot-password`| Public (Rate-limited) | Generate crypto token & send Password Reset Email |
| `POST` | `/api/auth/reset-password` | Public (Rate-limited) | Verify reset token & update password |
| `PUT` | `/api/auth/profile` | Authenticated | Update user name/password; triggers security alert email |
| `POST` | `/api/auth/refresh` | Public | Rotate refresh token & issue new access token |
| `GET` | `/api/auth/me` | Authenticated | Return user profile, permissions, and 2FA status |
| `GET` | `/api/auth/sessions` | Authenticated | List all active sessions for current user |
| `DELETE`| `/api/auth/sessions/:id` | Authenticated | Remotely terminate and revoke a session |
| `GET` | `/api/contacts` | Authenticated (RBAC) | List contacts with search indexing and tag filtering |
| `POST` | `/api/contacts` | Authenticated | Create new contact record |
| `PUT` | `/api/contacts/:id` | Authenticated | Update contact details or stage |
| `DELETE`| `/api/contacts/:id` | Admin | Delete contact record |
| `GET` | `/api/contacts/duplicates`| Authenticated | Find duplicate contacts matching email or phone |
| `POST` | `/api/contacts/merge` | Authenticated | Merge two duplicate contacts into one |
| `POST` | `/api/contacts/:id/convert`| Authenticated | **1-Click Convert Lead** to Contact, Company, and Deal |
| `POST` | `/api/contacts/bulk` | Authenticated | Bulk import contacts from parsed CSV text |
| `GET` | `/api/contacts/export` | Authenticated | Export contacts to CSV or JSON |
| `GET` | `/api/companies` | Authenticated | List registered companies |
| `POST` | `/api/companies` | Authenticated | Create company record |
| `GET` | `/api/deals` | Authenticated | List pipeline deals and calculate stage dollar sums |
| `GET` | `/api/deals/stages` | Authenticated | Get pipeline stages (`New` $\rightarrow$ `Won/Lost`) |
| `GET` | `/api/deals/metrics` | Authenticated | Calculate pipeline velocity and win rate % |
| `POST` | `/api/deals` | Authenticated | Create new deal |
| `PUT` | `/api/deals/:id` | Authenticated | Transition deal stage & log activity audit |
| `DELETE`| `/api/deals/:id` | Admin | Delete deal record |
| `GET` | `/api/tasks` | Authenticated (RBAC) | List tasks with overdue and status filters |
| `POST` | `/api/tasks` | Authenticated | Schedule follow-up task |
| `PUT` | `/api/tasks/:id` | Authenticated | Update task status, priority, or due date |
| `DELETE`| `/api/tasks/:id` | Authenticated | Delete task |
| `GET` | `/api/activities` | Authenticated | Retrieve chronological audit trail stream |
| `POST` | `/api/activities` | Authenticated | Log interaction (call, meeting, note) |
| `GET` | `/api/invoices` | Authenticated | List commercial quotes and invoices |
| `POST` | `/api/invoices` | Authenticated | Generate line-item invoice/quote |
| `GET` | `/api/tickets` | Authenticated | List support tickets |
| `POST` | `/api/tickets` | Authenticated | Submit new support ticket |
| `GET` | `/api/emails/templates` | Authenticated | Retrieve reusable message templates |
| `GET` | `/api/emails` | Authenticated | Sent email history with live open tracking badges |
| `POST` | `/api/emails/send` | Authenticated | Dispatch HTML email with attached tracking pixel |
| `GET` | `/api/emails/track/:pixelId`| **Public** | **1x1 Tracking Pixel endpoint: logs open timestamp & serves transparent GIF** |
| `GET` | `/api/backup/download` | Admin | Download full database JSON dump |
| `POST` | `/api/backup/snapshot` | Admin | Trigger manual server storage snapshot |
| `GET` | `/api/backup/history` | Admin | List recent server snapshots |
| `POST` | `/api/attachments/upload`| Authenticated | Upload document/contract via Multer |
| `GET` | `/api/attachments/:type/:id`| Authenticated | List attachments for an entity |

---

## 5. 🤖 Guide for Future LLMs: How to Understand & Extend SCRM

If you are an AI assistant receiving this codebase, follow these strict guardrails, architectural invariants, and high-impact extension paths:

### 5.1 Strict Invariants & Architectural Rules
1. **Never Fake Anything:** Do NOT introduce dummy data, fake loading timeouts (`setTimeout`), or placeholder functions. If a button is displayed, it must perform a real API call and modify real state.
2. **Preserve Electric Obsidian Tokens:**
   - Always maintain `#181818` canvas dominance.
   - Use `#F0FF60` / `#FAFF69` strictly for accents, active states, and CTAs.
   - On inverted yellow panels, always use `#151515` ink.
   - Reserve `#FB2C36` (red) and `#E17100` (amber) strictly for errors, warnings, and overdue status.
3. **Keep Database Migrations Idempotent:**
   - Any schema modifications must be updated in `Backend/src/dbSetup.js` with `IF NOT EXISTS` safeguards so the server boots cleanly without migration crashes.
4. **Preserve Route Security & RBAC:**
   - Private API routes must always use `authenticateToken`.
   - Admin-only routes must enforce `requireRole(["admin"])`.
5. **No Disruptive Native Alerts:**
   - Always use the in-app toast notification helper `showToast(message)` rather than native browser `alert()`.

---

### 5.2 High-Value Roadmap Opportunities for Future LLMs

#### 1. AI-Powered Sales Assistant & Email Drafter
- **Target Backend:** Add `/api/ai/draft-email` and `/api/ai/summarize-lead`.
- **Implementation:** Connect to the Gemini API (`@google/genai` or official SDK).
- **Frontend Interaction:** Add a *"✨ Draft with AI"* button in the Email Modal that reads contact tags, previous interaction history, and deal stage to auto-generate customized outreach messages.

#### 2. Drag-and-Drop Pipeline Kanban Board
- **Target Frontend:** `Frontend/src/pages/Dashboard.jsx` (Pipeline section).
- **Implementation:** Implement native HTML5 drag-and-drop (`onDragStart`, `onDragOver`, `onDrop`) or integrate `@hello-pangea/dnd` to allow users to physically drag deal cards between the 6 stage columns.

#### 3. Global `Cmd+K` / `Ctrl+K` Command Palette
- **Implementation:** Create a universal search modal accessible from anywhere via `Ctrl+K` or `Cmd+K` that indexes Contacts, Deals, Tasks, Companies, and Invoices with instant keyboard arrow navigation and `Enter` key execution.

#### 4. Real-Time Interactive Revenue Analytics (`recharts`)
- **Target Frontend:** Dashboard telemetry tab.
- **Implementation:** Install `recharts` to render interactive monthly revenue trendline charts, stage conversion funnel graphs, and deal win/loss ratios.

#### 5. Online Invoicing Payments (Stripe Checkout)
- **Target Backend:** `Backend/src/routes/invoices.js`.
- **Implementation:** Generate Stripe Checkout Sessions (`POST /api/invoices/:id/pay`) allowing clients to pay invoices directly via card, with webhook listeners marking the invoice as `Paid` automatically.

---

## 6. 🚀 Verification Commands for Developers & AI Agents

```powershell
# 1. Run Complete Automated Backend Test Suite (11/11 tests)
cd "c:\Users\farma\Desktop\Small CRM\Backend"
node tests/api.test.js
# Expected Output:
# ✓ Healthcheck passed: healthy SCRM Enterprise
# ✓ User registered (Role enforced): user_... Assigned Role: standard_user
# ✓ Standalone Lead created
# ✓ Transactional Lead Conversion verified
# ✓ Duplicate detector ran
# ✓ Deal Pipeline Metrics verified
# ✓ Active Sessions inspected
# ✓ 2FA Toggle tested: Two-Factor Authentication is now ENABLED.
# ✓ Session Revocation tested
# ALL SCRM ENTERPRISE VERIFICATION TESTS PASSED (11/11)!

# 2. Build Frontend for Production (Zero errors)
cd "c:\Users\farma\Desktop\Small CRM\Frontend"
npm run build
# Expected Output:
# ✓ 2197 modules transformed.
# ✓ built in ~1.39s (0 errors, 0 warnings)

# 3. Start Both Servers for Local Development
cd "c:\Users\farma\Desktop\Small CRM"
npm run dev
# Backend runs on: http://localhost:5000
# Frontend runs on: http://localhost:5173
```

---

*Document compiled, updated, and verified for SCRM (Small Customer Relationship Management) Enterprise Architecture.*
