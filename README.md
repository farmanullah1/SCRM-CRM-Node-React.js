# 🚀 SCRM — Next-Gen Secure Enterprise CRM System

<div align="center">

![SCRM Banner](https://img.shields.io/badge/SCRM-Enterprise_Grade-0052CC?style=for-the-badge&logo=shield&logoColor=white)
![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen?style=for-the-badge)
![Security Standard](https://img.shields.io/badge/Security-OWASP_Top_10_Protected-blueviolet?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**A high-performance, security-first Customer Relationship Management (CRM) platform built with Node.js, Express, React.js, and SQL/MongoDB.**

[Features](#-core-system-features) • [Architecture](#-system-architecture--data-flow) • [Security](#-enterprise-security--compliance) • [Database Schema](#-database-schema--auto-migration) • [Getting Started](#-getting-started) • [API Guide](#-api-endpoints-reference)

</div>

---

## 📸 Platform Interface & Highlights

| **Interactive Kanban Pipeline** | **Smart Contact & Activity Hub** |
| :---: | :---: |
| Dynamic deal drag-and-drop, real-time value calculation, and lead conversion. | Multi-tag filtering, duplicate detection, and chronological activity streams. |

┌──────────────────────────────────────────────────────────────────────────────────┐
│                                 SCRM DASHBOARD                                   │
├──────────────┬───────────────────────────────────────────────────────────────────┤
│  📊 Metrics  │ Total Revenue: $248,500 │ Deals Won: 42 │ Active Leads: 128        │
├──────────────┼───────────────────────────────────────────────────────────────────┤
│  📌 Pipeline │ [New] ──> [Contacted] ──> [Qualified] ──> [Proposal] ──> [Won]   │
│              │  $12k        $45k           $80k           $65k         $248k    │
├──────────────┼───────────────────────────────────────────────────────────────────┤
│  ⚡ Quick Actions │ + New Lead   │  📥 Import CSV  │  🔒 Security Logs │ ⚙️ Settings  │
└──────────────┴───────────────────────────────────────────────────────────────────┘


---

## 🌟 Core System Features

### 👤 Contact & Company Management
* **360° Profile Records:** Comprehensive profile storage including multi-email, phone, organization structure, custom tags, and rich-text notes.
* **Automated Duplicate Engine:** Background matching via phone numbers and email domains with 1-click merge suggestions.
* **Unified Activity Stream:** Aggregates phone logs, email exchanges, calendar meetings, and team notes into an integrated chronological feed.

### 📊 Lead & Deal Pipeline
* **Kanban Workflow Board:** Drag-and-drop pipeline stages: `New` ➔ `Contacted` ➔ `Qualified` ➔ `Proposal` ➔ `Won/Lost`.
* **Lead Conversion Engine:** Transform qualified leads into active contacts, accounts, and deal opportunities with a single click.
* **Deal Analytics:** Revenue forecasting, probability weighting, win/loss rationale logging, and owner assignment.

### 📅 Tasks, Reminders & Timelines
* **Intelligent Task Queue:** Assignable to-dos with due-date tracking, priority flags (`High`, `Medium`, `Low`), and automated alerts.
* **Activity Audit Trail:** Real-time logging of user modifications and interactions per deal and contact card.

### ✉️ Native Email Integration & Tracking
* **In-App Mailer:** Send emails directly using pre-configured team templates (powered by SMTP/Nodemailer).
* **Open & Click Analytics:** Embedded invisible tracking pixels and secure link wrappers for real-time engagement monitoring.

### 📈 Reports & Executive Dashboard
* **Pipeline Velocity & Volume:** Live tracking of deal distribution across all stages.
* **Sales Performance Matrix:** Conversion ratios, deal lifecycle durations, and rep performance leaderboards.
* **Overdue Task Monitor:** Instant alert system for unresolved actions and cold leads.

### 📂 Portable Import/Export Engine
* **Intelligent CSV Importer:** Dynamic field-mapping GUI to onboard existing CRM spreadsheets seamlessly.
* **Zero Lock-In Data Export:** Secure 1-click database dumps to standard CSV and JSON formats at any time.

---

## 🛡️ Enterprise Security & Compliance

       ┌────────────────────────────────────────┐
       │        INCOMING CLIENT REQUEST         │
       └──────────────────┬─────────────────────┘
                          │
                          ▼
       ┌────────────────────────────────────────┐
       │      IP Rate Limiting & Firewall       │
       └──────────────────┬─────────────────────┘
                          │
                          ▼
       ┌────────────────────────────────────────┐
       │  HttpOnly Cookie JWT Auth Verification │
       └──────────────────┬─────────────────────┘
                          │
                          ▼
       ┌────────────────────────────────────────┐
       │  Role-Based Access Control (RBAC Check)│
       └──────────────────┬─────────────────────┘
                          │
                          ▼
       ┌────────────────────────────────────────┐
       │ Input Sanitization (XSS / SQLi Filter) │
       └──────────────────┬─────────────────────┘
                          │
                          ▼
       ┌────────────────────────────────────────┐
       │   DATABASE / PROTECTED CONTROLLER      │
       └────────────────────────────────────────┘

* **Idempotent DB Auto-Migration:** Self-healing backend engine automatically detects missing databases, schemas, or seed tables on boot (`CREATE TABLE IF NOT EXISTS`).
* **Session Hardening:** Stateless JWT authentication delivered exclusively inside secure, `HttpOnly`, `SameSite=Strict` cookies.
* **Password Encryption:** High-work-factor salting and hashing utilizing **Bcrypt / Argon2**.
* **Brute-Force & Flood Defense:** Rate limiting on `/login`, `/signup`, and global API endpoints using Express-Rate-Limit.
* **Injection Defense:** Prepared parameterized SQL statements and Input Sanitization to prevent XSS and SQL Injection.
* **Granular RBAC System:** Contextual authorization middleware supporting **Admin**, **Manager**, and **Standard User** permissions.

---

## 🎨 Design System & Visual Polish

* **Interactive Dot-Cursor:** Custom dynamic dynamic cursor that grows and transforms smoothly when hovering over clickable cards, buttons, and input controls.
* **Micro-Interactions:** Hardware-accelerated CSS animations (`transform: translateY(-3px)`, glassmorphism cards, state transitions).
* **Responsive Touch Interface:** Mobile-optimized layout featuring collapsible drawers, swipeable Kanban columns, and touch-friendly target areas.
* **Dark Mode Aesthetics:** Dark charcoal workspace (`#121212`) accented with high-contrast UI highlights.

---

## 🗄️ Database Schema & Auto-Migration

The backend execution initializes the following database architecture automatically:

                      ┌──────────────────┐
                      │      USERS       │
                      ├──────────────────┤
                      │ id (PK)          │
                      │ email            │
                      │ password_hash    │
                      │ role_id (FK)     │
                      └────────┬─────────┘
                               │ 1:N
                               ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│    COMPANIES     │      │     CONTACTS     │      │   LEADS_DEALS    │
├──────────────────┤      ├──────────────────┤      ├──────────────────┤
│ id (PK)          ├─────►│ id (PK)          ├─────►│ id (PK)          │
│ name             │ 1:N  │ company_id (FK)  │ 1:N  │ contact_id (FK)  │
│ domain           │      │ owner_id (FK)    │      │ stage_id (FK)    │
└──────────────────┘      └────────┬─────────┘      │ value            │
│                └──────────────────┘
│ 1:N
▼
┌──────────────────┐
│ TASKS_ACTIVITIES │
├──────────────────┤
│ id (PK)          │
│ related_id (FK)  │
│ due_date         │
│ status           │
└──────────────────┘


---

## 🛠️ Tech Stack & Dependencies

### Frontend Framework
* **Core:** React.js (v18+)
* **State Management:** React Context API / Redux Toolkit
* **Styling:** Dynamic CSS3 Variables, Glassmorphism, Responsive Grid System
* **Icons & UI Assets:** Lucide-React / React-Icons

### Backend Infrastructure
* **Runtime:** Node.js (v18+) & Express.js
* **Security Middleware:** Helmet.js, CORS, Express-Rate-Limit, Bcrypt.js, JsonWebToken
* **Data Layer:** PostgreSQL / MySQL / MongoDB (Automated Driver Support)
* **Email & Tracking:** Nodemailer & Pixel Tracking Engine

---

## 🚀 Getting Started

### 📋 Prerequisites
* **Node.js** v18.0.0 or higher
* **npm** v9.0.0+ or **yarn**
* **MySQL / PostgreSQL / MongoDB** instance

---

### 📥 1. Clone & Environment Setup

```bash
# Clone repository
git clone [https://github.com/farmanullah1/SCRM-CRM-Node-React.js.git](https://github.com/farmanullah1/SCRM-CRM-Node-React.js.git)
cd SCRM-CRM-Node-React.js