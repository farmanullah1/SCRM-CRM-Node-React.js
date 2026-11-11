# SCRM Implementation & Upgrade Plan

## Phase 0: Baseline & System Audit (COMPLETED)
- [x] Complete codebase and database inspection.
- [x] Verify backend tests (13/13 passing) and frontend build.
- [x] Produce `docs/AUDIT.md` mapping documented claims to real code evidence.
- [x] Produce `docs/DECISIONS.md` recording architectural choices.

## Phase 1: Brand System & 6 S Pillars (COMPLETED)
- [x] Define the six pillars: **Secure**, **Supply**, **Social**, **Software**, **Small**, and **Site**.
- [x] Update `<title>` and `<meta>` tags in `Frontend/index.html`.
- [x] Add 6 Pillars feature section to `Frontend/src/pages/LandingPage.jsx` with real capability badges.
- [x] Add honest pricing notice: relabeled as Planned Deployment Editions with free self-hosting today.
- [x] Update `Frontend/src/components/BrandLogo.jsx` with customizable tagline text.

## Phase 2: UI & UX Master Elevation (COMPLETED)
- [x] Halftone background density upgrade: $5.2\text{px}$ spacing (~80,000+ dots), $1.85\text{px}$ base radius, $5.4\text{px}$ hover expansion, and radial click/tap ripple wave physics.
- [x] Full-site dot visibility: glassmorphic backgrounds allowing dots to shine through all pages.
- [x] Kinetic floating animations (`scrmFloatSlow`, `scrmFloatGentle`) on landing hero badges, preview frames, and feature cards.
- [x] Fix missing dashboard classes in `Frontend/src/App.css` (overview cards, pipeline progress bars, mini task items, kanban columns, tables, timeline).
- [x] Replace all `alert()` calls with custom in-app toast notification system.
- [x] Add Supply Pillar (Products & Services Catalog) tab and modal in `Frontend/src/pages/Dashboard.jsx`.

## Phase 3: Backend Relational Schema & Security Extensions (COMPLETED)
- [x] Idempotent migration in `Backend/src/dbSetup.js` for `products`, `suppliers`, `comments`, `api_keys`, and `web_leads`.
- [x] Sequelize model definitions in `Backend/src/db.js`.
- [x] Routes for Product Catalog (`Backend/src/routes/catalog.js`) mounted on `/api/catalog`.
- [x] Routes for Web-to-Lead Ingestion & API Keys (`Backend/src/routes/webleads.js`) mounted on `/api/site`.
- [x] Automated test suite extended to 13 passing end-to-end integration tests.

## Phase 4: Multi-Tenancy & Enterprise Scaling (ROADMAP)
- [ ] Enforce strict `organization_id` filter across all custom queries via a tenant-scoped query repository.
- [ ] Add drag-and-drop support for pipeline kanban columns using `@hello-pangea/dnd`.
- [ ] Add Stripe subscription billing webhook listener for enterprise cloud tiers.
